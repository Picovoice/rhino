//
// Copyright 2021-2022 Picovoice Inc.
//
// You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
// file accompanying this source.
//
// Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
// an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
// specific language governing permissions and limitations under the License.
//

import 'dart:async';
import 'dart:io';

import 'package:flutter/services.dart';
import 'package:path_provider/path_provider.dart';
import 'package:rhino_flutter/rhino_error.dart';

class RhinoInference {
  final bool _isFinalized;
  final bool? _isUnderstood;
  final String? _intent;
  final Map<String, String>? _slots;

  /// private constructor + basic checks
  RhinoInference(
      this._isFinalized, this._isUnderstood, this._intent, this._slots) {
    if (isFinalized) {
      if (_isUnderstood == null) {
        throw RhinoInvalidStateException(
            "field 'isUnderstood' must be present if inference was finalized.");
      }

      if (_isUnderstood!) {
        if (_intent == null || _slots == null) {
          throw RhinoInvalidStateException(
              "fields 'intent' and 'slots' must be present if inference was understood");
        }
      }
    }
  }

  /// whether Rhino has made an inference
  bool get isFinalized => _isFinalized;

  /// if isFinalized, whether Rhino understood what it heard based on the context
  bool? get isUnderstood => _isUnderstood;

  /// if isUnderstood, name of intent that was inferred
  String? get intent => _intent;

  /// if isUnderstood, dictionary of slot keys and values that were inferred
  Map<String, String>? get slots => _slots;
}

class Rhino {
  static final MethodChannel _channel = MethodChannel("rhino");

  String? _handle;
  final String _contextInfo;
  final int _frameLength;
  final int _sampleRate;
  final String _version;

  /// Rhino version string
  String get version => _version;

  /// The number of audio samples per frame required by Rhino
  int get frameLength => _frameLength;

  /// The audio sample rate required by Rhino
  int get sampleRate => _sampleRate;

  /// Gets the source of the Rhino context in YAML format. Shows the list of intents,
  /// which expressions map to those intents, as well as slots and their possible values.
  String get contextInfo => _contextInfo;

  /// Static creator for initializing Rhino
  ///
  /// [accessKey] AccessKey obtained from Picovoice Console (https://console.picovoice.ai/).
  ///
  /// [contextPath] Absolute path to the Rhino context file (.rhn).
  ///
  /// [modelPath] (Optional) Path to the file containing model parameters.
  /// If not set it will be set to the default location.
  ///
  /// [sensitivity] (Optional) Inference sensitivity. A higher sensitivity value results in
  /// fewer misses at the cost of (potentially) increasing the erroneous inference rate.
  /// Sensitivity should be a floating-point number within 0 and 1.
  ///
  /// [endpointDurationSec] (Optional) Endpoint duration in seconds. An endpoint is a chunk of silence at the end of an
  /// utterance that marks the end of spoken command. It should be a positive number within [0.5, 5]. A lower endpoint
  /// duration reduces delay and improves responsiveness. A higher endpoint duration assures Rhino doesn't return inference
  /// preemptively in case the user pauses before finishing the request.
  ///
  /// [requireEndpoint] (Optional) If set to `true`, Rhino requires an endpoint (a chunk of silence) after the spoken command.
  /// If set to `false`, Rhino tries to detect silence, but if it cannot, it still will provide inference regardless. Set
  /// to `false` only if operating in an environment with overlapping speech (e.g. people talking in the background).
  ///
  /// Throws a `RhinoException` if not initialized correctly
  ///
  /// returns an instance of the speech-to-intent engine
  static Future<Rhino> create(String accessKey, String contextPath,
      {String? modelPath,
      double sensitivity = 0.5,
      double endpointDurationSec = 1.0,
      bool requireEndpoint = true}) async {
    if (modelPath != null) {
      modelPath = await _tryExtractFlutterAsset(modelPath);
    }

    contextPath = await _tryExtractFlutterAsset(contextPath);

    try {
      Map<String, dynamic> result =
          Map<String, dynamic>.from(await _channel.invokeMethod('create', {
        'accessKey': accessKey,
        'contextPath': contextPath,
        'modelPath': modelPath,
        'sensitivity': sensitivity,
        'endpointDurationSec': endpointDurationSec,
        'requireEndpoint': requireEndpoint
      }));

      return Rhino._(result['handle'], result['contextInfo'],
          result['frameLength'], result['sampleRate'], result['version']);
    } on PlatformException catch (error) {
      throw rhinoStatusToException(error.code, error.message);
    } on Exception catch (error) {
      throw RhinoException(error.toString());
    }
  }

  // private constructor
  Rhino._(this._handle, this._contextInfo, this._frameLength, this._sampleRate,
      this._version);

  /// Process a frame of pcm audio with the speech-to-intent engine.
  ///
  /// [frame] frame of 16-bit integers of 16kHz linear PCM mono audio.
  /// The specific array length is obtained from Rhino via the frameLength field.
  ///
  /// returns RhinoInference object.
  Future<RhinoInference> process(List<int>? frame) async {
    try {
      Map<String, dynamic> inference = Map<String, dynamic>.from(await _channel
          .invokeMethod('process', {'handle': _handle, 'frame': frame}));

      if (inference['isFinalized'] == null) {
        throw RhinoInvalidStateException(
            "field 'isFinalized' must be always present");
      }

      if (inference['slots'] != null) {
        inference['slots'] = Map<String, String>.from(inference['slots']);
      }

      return RhinoInference(inference['isFinalized'], inference['isUnderstood'],
          inference['intent'], inference['slots']);
    } on PlatformException catch (error) {
      throw rhinoStatusToException(error.code, error.message);
    } on Exception catch (error) {
      throw RhinoException(error.toString());
    }
  }

  /// Frees memory that was allocated for Rhino
  Future<void> delete() async {
    if (_handle != null) {
      await _channel.invokeMethod('delete', {'handle': _handle});
      _handle = null;
    }
  }

  static Future<String> _tryExtractFlutterAsset(String filePath) async {
    ByteData data;
    try {
      data = await rootBundle.load(filePath);
    } catch (_) {
      // In flutter, a resource can be added through flutter's assets directory
      // or natively (res for android; bundle for iOS). We try to extract
      // a resource in flutter's assets directory and if it fails, try to load
      // the resource using native modules.
      return filePath;
    }

    try {
      String resourceDirectory =
          (await getApplicationDocumentsDirectory()).path;
      String outputPath = '$resourceDirectory/$filePath';
      File outputFile = File(outputPath);
      final buffer = data.buffer;

      await outputFile.create(recursive: true);
      await outputFile.writeAsBytes(
          buffer.asUint8List(data.offsetInBytes, data.lengthInBytes));
      return outputPath;
    } catch (_) {
      throw RhinoIOException("failed to extract '$filePath'");
    }
  }
}
