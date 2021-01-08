//
// Copyright 2021 Picovoice Inc.
//
// You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
// file accompanying this source.
//
// Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
// an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
// specific language governing permissions and limitations under the License.
//

import 'dart:ffi';
import 'dart:async';
import 'dart:io';
import 'dart:typed_data';

import 'package:flutter/services.dart';
import 'package:ffi/ffi.dart';
import 'package:flutter/services.dart' show rootBundle;
import 'package:path_provider/path_provider.dart';
import 'package:rhino/rhino_error.dart';

class Rhino {
  static bool _resourcesExtracted = false;
  static String _defaultModelPath;

  int _handle;
  final int _frameLength;
  final int _sampleRate;
  final String _version;
  final String _contextInfo;
  final Pointer<Int16> _cFrame;

  /// The required number of audio samples per frame
  int get frameLength => _frameLength;

  /// The required audio sample rate
  int get sampleRate => _sampleRate;

  /// The version of rhino
  String get version => _version;

  /// Gets the source of the Rhino context in YAML format. Shows the list of intents,
  /// which expressions map to those intents, as well as slots and their possible values.
  String get contextInfo => _contextInfo;

  /// Static creator for initializing Rhino
  ///
  /// [contextPath] (Optional) Absolute path to the Rhino context file (.rhn).
  ///
  /// [modelPath] (Optional) Path to the file containing model parameters.
  /// If not set it will be set to the default location.
  ///
  /// [sensitivity] Inference sensitivity. A higher sensitivity value results in
  /// fewer misses at the cost of (potentially) increasing the erroneous inference rate.
  /// Sensitivity should be a floating-point number within 0 and 1.
  ///
  /// Thows a `PvError` if not initialized correctly
  ///
  /// returns an instance of the speech-to-intent engine
  static Future<Rhino> create(String contextPath,
      {String modelPath, double sensitivity = 0.5}) async {
    if (!_resourcesExtracted) {
      await _extractRhinoResources();
      _resourcesExtracted = true;
    }

    if (contextPath == null || contextPath.isEmpty) {
      throw new PvArgumentError("No context file provided.");
    }

    modelPath ??= _defaultModelPath;

    if (sensitivity < 0 || sensitivity > 1 || sensitivity.isNaN) {
      throw new PvArgumentError(
          "Sensitivity value ($sensitivity) in given 'sensitivities' not in range [0,1]");
    }

    // generate arguments for ffi
    Pointer<Utf8> cModelPath = Utf8.toUtf8(modelPath);
    Pointer<Utf8> cContextPath = Utf8.toUtf8(contextPath);
    Pointer<IntPtr> handlePtr = allocate<IntPtr>(count: 1);

    // init rhino
    int status = _rhinoInit(cModelPath, cContextPath, sensitivity, handlePtr);
    PvStatus pvStatus = PvStatus.values[status];
    if (pvStatus != PvStatus.SUCCESS) {
      pvStatusToException(pvStatus, "Failed to initialize Rhino.");
    }

    int handle = handlePtr.value;
    int frameLength = _rhinoFrameLength();
    int sampleRate = _rhinoSampleRate();
    String version = Utf8.fromUtf8(_rhinoVersion());

    Pointer<Pointer<Utf8>> cContextInfo = allocate(count: 1);
    status = _rhinoContextInfo(handle, cContextInfo);
    pvStatus = PvStatus.values[status];
    if (pvStatus != PvStatus.SUCCESS) {
      pvStatusToException(pvStatus, "Failed to get Rhino context info.");
    }
    String contextInfo = Utf8.fromUtf8(cContextInfo[0]);

    return new Rhino._(handle, frameLength, sampleRate, version, contextInfo);
  }

  // private constructor
  Rhino._(this._handle, this._frameLength, this._sampleRate, this._version,
      this._contextInfo)
      : _cFrame = allocate<Int16>(count: _frameLength);

  /// Process a frame of pcm audio with the speech-to-intent engine.
  ///
  /// [frame] frame of 16-bit integers of 16kHz linear PCM mono audio.
  /// The specific array length is obtained from Rhino via the frameLength field.
  ///
  /// returns a map object with the following fields:
  ///   - isFinalized: whether Rhino has made an inference
  ///   - isUnderstood: if isFinalized, whether Rhino understood what it heard based on the context
  ///   - intent: if isUnderstood, name of intent that were inferred
  ///   - slots: if isUnderstood, dictionary of slot keys and values that were inferred
  Map<String, dynamic> process(List<int> frame) {
    if (_handle == null) {
      throw new PvStateError(
          "Attempted to process an audio frame after Rhino was been deleted.");
    }

    if (frame == null) {
      throw new PvArgumentError(
          "Frame array provided to Rhino process was null.");
    }

    if (frame.length != _frameLength) {
      throw new PvArgumentError(
          "Size of frame array provided to 'process' (${frame.length}) does not match the engine 'frameLength' ($_frameLength)");
    }

    // call to process lib function
    _cFrame.asTypedList(frame.length).setAll(0, frame);
    Pointer<Uint8> isFinalized = allocate(count: 1);

    int status = _rhinoProcess(_handle, _cFrame, isFinalized);
    PvStatus pvStatus = PvStatus.values[status];
    if (pvStatus != PvStatus.SUCCESS) {
      pvStatusToException(pvStatus, "Rhino failed to process an audio frame.");
    }

    // return if not finalized
    if (isFinalized.value == 0) {
      return {'isFinalized': false};
    }

    Map<String, dynamic> inference = {'isFinalized': true};

    // get isUnderstood
    Pointer<Uint8> isUnderstood = allocate(count: 1);
    status = _rhinoIsUnderstood(_handle, isUnderstood);
    pvStatus = PvStatus.values[status];
    if (pvStatus != PvStatus.SUCCESS) {
      pvStatusToException(pvStatus, "Rhino failed to get IsUnderstood value.");
    }

    if (isUnderstood.value == 1) {
      inference['isUnderstood'] = true;

      // get intent
      Pointer<Pointer<Utf8>> cIntent = allocate(count: 1);
      Pointer<Int32> cNumSlots = allocate(count: 1);
      Pointer<Pointer<Pointer<Utf8>>> cSlots = allocate(count: 1);
      Pointer<Pointer<Pointer<Utf8>>> cValues = allocate(count: 1);
      status = _rhinoGetIntent(_handle, cIntent, cNumSlots, cSlots, cValues);
      pvStatus = PvStatus.values[status];
      if (pvStatus != PvStatus.SUCCESS) {
        pvStatusToException(pvStatus, "Rhino failed to get intent.");
      }
      inference['intent'] = Utf8.fromUtf8(cIntent[0]);

      // decode slot map
      Map<String, String> slots = new Map();
      for (var i = 0; i < cNumSlots.value; i++) {
        final String slot = Utf8.fromUtf8(cSlots[0][i]);
        final String value = Utf8.fromUtf8(cValues[0][i]);
        slots[slot] = value;
      }
      inference['slots'] = slots;

      // free slots
      status = _rhinoFreeSlotsAndValues(_handle, cSlots[0], cValues[0]);
      pvStatus = PvStatus.values[status];
      if (pvStatus != PvStatus.SUCCESS) {
        pvStatusToException(pvStatus, "Rhino failed to free slots.");
      }
    } else {
      inference['isUnderstood'] = false;
    }

    // reset Rhino
    status = _rhinoReset(_handle);
    pvStatus = PvStatus.values[status];
    if (pvStatus != PvStatus.SUCCESS) {
      pvStatusToException(pvStatus, "Rhino failed to reset.");
    }

    return inference;
  }

  /// Frees memory that was allocated for Rhino
  void delete() {
    if (_handle != null) {
      _rhinoDelete(_handle);
      _handle = null;
    }
  }

  static const String _assetDir = "packages/rhino/assets";
  static Future<void> _extractRhinoResources() async {
    _defaultModelPath =
        await _extractResource("$_assetDir/lib/common/rhino_params.pv");
  }

  static Future<String> _extractResource(String filePath) async {
    String resourceDirectory = (await getApplicationDocumentsDirectory()).path;
    String outputPath = '$resourceDirectory/$filePath';
    File outputFile = new File(outputPath);

    ByteData data = await rootBundle.load(filePath);
    final buffer = data.buffer;

    await outputFile.create(recursive: true);
    await outputFile.writeAsBytes(
        buffer.asUint8List(data.offsetInBytes, data.lengthInBytes));
    return outputPath;
  }
}

// loads lib
final _rhinoLib = _load();
DynamicLibrary _load() {
  if (Platform.isAndroid) {
    return DynamicLibrary.open("libpv_rhino.so");
  } else {
    return DynamicLibrary.process();
  }
}

// pv_rhino_init
typedef NativeInit = Int32 Function(
    Pointer<Utf8>, Pointer<Utf8>, Float, Pointer<IntPtr>);
typedef Init = int Function(
    Pointer<Utf8>, Pointer<Utf8>, double, Pointer<IntPtr>);
final Init _rhinoInit =
    _rhinoLib.lookup<NativeFunction<NativeInit>>('pv_rhino_init').asFunction();

// pv_rhino_process
typedef NativeProcess = Int32 Function(IntPtr, Pointer<Int16>, Pointer<Uint8>);
typedef Process = int Function(int, Pointer<Int16>, Pointer<Uint8>);
final Process _rhinoProcess = _rhinoLib
    .lookup<NativeFunction<NativeProcess>>('pv_rhino_process')
    .asFunction();

// pv_rhino_is_understood
typedef NativeIsUnderstood = Int32 Function(IntPtr, Pointer<Uint8>);
typedef IsUnderstood = int Function(int, Pointer<Uint8>);
final IsUnderstood _rhinoIsUnderstood = _rhinoLib
    .lookup<NativeFunction<NativeIsUnderstood>>('pv_rhino_is_understood')
    .asFunction();

// pv_rhino_get_intent
typedef NativeGetIntent = Int32 Function(
    IntPtr,
    Pointer<Pointer<Utf8>>,
    Pointer<Int32>,
    Pointer<Pointer<Pointer<Utf8>>>,
    Pointer<Pointer<Pointer<Utf8>>>);
typedef GetIntent = int Function(int, Pointer<Pointer<Utf8>>, Pointer<Int32>,
    Pointer<Pointer<Pointer<Utf8>>>, Pointer<Pointer<Pointer<Utf8>>>);
final GetIntent _rhinoGetIntent = _rhinoLib
    .lookup<NativeFunction<NativeGetIntent>>('pv_rhino_get_intent')
    .asFunction();

// pv_rhino_free_slots_and_values
typedef NativeFreeSlotsAndValues = Int32 Function(
    IntPtr, Pointer<Pointer<Utf8>>, Pointer<Pointer<Utf8>>);
typedef FreeSlotsAndValues = int Function(
    int, Pointer<Pointer<Utf8>>, Pointer<Pointer<Utf8>>);
final FreeSlotsAndValues _rhinoFreeSlotsAndValues = _rhinoLib
    .lookup<NativeFunction<NativeFreeSlotsAndValues>>(
        'pv_rhino_free_slots_and_values')
    .asFunction();

// pv_rhino_reset
typedef NativeReset = Int32 Function(IntPtr);
typedef Reset = int Function(int);
final Reset _rhinoReset = _rhinoLib
    .lookup<NativeFunction<NativeReset>>('pv_rhino_reset')
    .asFunction();

// pv_rhino_delete
typedef NativeDelete = Void Function(IntPtr);
typedef Delete = void Function(int);
final Delete _rhinoDelete = _rhinoLib
    .lookup<NativeFunction<NativeDelete>>('pv_rhino_delete')
    .asFunction();

// pv_rhino_context_info
typedef NativeContextInfo = Int32 Function(IntPtr, Pointer<Pointer<Utf8>>);
typedef ContextInfo = int Function(int, Pointer<Pointer<Utf8>>);
final ContextInfo _rhinoContextInfo = _rhinoLib
    .lookup<NativeFunction<NativeContextInfo>>('pv_rhino_context_info')
    .asFunction();

// pv_rhino_version
typedef NativeVersion = Pointer<Utf8> Function();
typedef Version = Pointer<Utf8> Function();
final Version _rhinoVersion = _rhinoLib
    .lookup<NativeFunction<NativeVersion>>('pv_rhino_version')
    .asFunction();

// pv_rhino_frame_length
typedef NativeFrameLength = Int32 Function();
typedef FrameLength = int Function();
final FrameLength _rhinoFrameLength = _rhinoLib
    .lookup<NativeFunction<NativeFrameLength>>('pv_rhino_frame_length')
    .asFunction();

// pv_sample_rate
typedef NativeSampleRate = Int32 Function();
typedef SampleRate = int Function();
final SampleRate _rhinoSampleRate = _rhinoLib
    .lookup<NativeFunction<NativeSampleRate>>('pv_sample_rate')
    .asFunction();
