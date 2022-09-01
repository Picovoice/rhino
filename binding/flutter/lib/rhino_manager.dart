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

import 'package:flutter/services.dart';
import 'package:flutter_voice_processor/flutter_voice_processor.dart';
import 'package:rhino_flutter/rhino.dart';
import 'package:rhino_flutter/rhino_error.dart';

/// type for function that receives inference result from Rhino
typedef InferenceCallback = Function(RhinoInference inference);

/// type for RhinoException that occurs while recording audio
typedef ProcessErrorCallback = Function(RhinoException error);

class RhinoManager {
  final VoiceProcessor? _voiceProcessor;
  Rhino? _rhino;

  final InferenceCallback _inferenceCallback;
  RemoveListener? _removeVoiceProcessorListener;
  RemoveListener? _removeErrorListener;

  bool _awaitingStop = false;

  /// Static creator for initializing Rhino
  ///
  /// [accessKey] AccessKey obtained from Picovoice Console (https://console.picovoice.ai/).
  ///
  /// [contextPath] Absolute path to the Rhino context file (.rhn).
  ///
  /// [inferenceCallback] A callback for when Rhino has made an intent inference
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
  /// [processErrorCallback] (Optional) Reports errors that are encountered while
  /// the engine is processing audio.
  ///
  /// Throws a `RhinoException` if not initialized correctly
  ///
  /// returns an instance of the speech-to-intent engine
  static Future<RhinoManager> create(
      String accessKey, String contextPath, InferenceCallback inferenceCallback,
      {String? modelPath,
      double sensitivity = 0.5,
      double endpointDurationSec = 1.0,
      bool requireEndpoint = true,
      ProcessErrorCallback? processErrorCallback}) async {
    Rhino rhino = await Rhino.create(accessKey, contextPath,
        modelPath: modelPath,
        sensitivity: sensitivity,
        endpointDurationSec: endpointDurationSec,
        requireEndpoint: requireEndpoint);
    return RhinoManager._(rhino, inferenceCallback, processErrorCallback);
  }

  // private constructor
  RhinoManager._(this._rhino, this._inferenceCallback,
      ProcessErrorCallback? processErrorCallback)
      : _voiceProcessor = VoiceProcessor.getVoiceProcessor(
            _rhino!.frameLength, _rhino.sampleRate) {
    if (_voiceProcessor == null) {
      throw RhinoRuntimeException("flutter_voice_processor not available.");
    }
    _removeVoiceProcessorListener =
        _voiceProcessor!.addListener((buffer) async {
      if (_awaitingStop) {
        return;
      }

      // cast from dynamic to int array
      List<int> rhinoFrame;
      try {
        rhinoFrame = (buffer as List<dynamic>).cast<int>();
      } on Error {
        RhinoException castError = RhinoException(
            "flutter_voice_processor sent an unexpected data type.");
        processErrorCallback == null
            ? print(castError.message)
            : processErrorCallback(castError);
        return;
      }

      // process frame with Rhino
      try {
        RhinoInference? rhinoResult = await _rhino?.process(rhinoFrame);
        if ((rhinoResult != null) && (rhinoResult.isFinalized)) {
          _awaitingStop = true;

          _inferenceCallback(rhinoResult);
          // stop audio processing
          await _voiceProcessor?.stop();
        }
      } on RhinoException catch (error) {
        processErrorCallback == null
            ? print(error.message)
            : processErrorCallback(error);
      } finally {
        _awaitingStop = false;
      }
    });

    _removeErrorListener = _voiceProcessor!.addErrorListener((errorMsg) {
      RhinoException nativeError = RhinoException(errorMsg as String);
      processErrorCallback == null
          ? print(nativeError.message)
          : processErrorCallback(nativeError);
    });
  }

  /// Opens audio input stream and sends audio frames to Rhino until a inference
  /// result is sent via inference callback
  /// Throws a `RhinoException` if there was a problem starting the audio engine
  Future<void> process() async {
    if (_rhino == null || _voiceProcessor == null) {
      throw RhinoInvalidStateException(
          "Cannot start Rhino - resources have already been released");
    }

    if (await _voiceProcessor?.hasRecordAudioPermission() ?? false) {
      try {
        await _voiceProcessor!.start();
      } on PlatformException {
        throw RhinoRuntimeException(
            "Audio engine failed to start. Hardware may not be supported.");
      }
    } else {
      throw RhinoRuntimeException(
          "User did not give permission to record audio.");
    }
  }

  /// Releases Rhino and audio resources
  Future<void> delete() async {
    if (_voiceProcessor?.isRecording ?? false) {
      await _voiceProcessor!.stop();
    }
    _removeVoiceProcessorListener?.call();
    _removeErrorListener?.call();
    _rhino?.delete();
    _rhino = null;
  }
}
