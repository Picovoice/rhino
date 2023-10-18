//
// Copyright 2021-2023 Picovoice Inc.
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
  VoiceProcessor? _voiceProcessor;
  Rhino? _rhino;

  late VoiceProcessorFrameListener _frameListener;
  late VoiceProcessorErrorListener _errorListener;

  bool _isListening;

  /// Rhino version string
  String? get version => _rhino?.version;

  /// The number of audio samples per frame required by Rhino
  int? get frameLength => _rhino?.frameLength;

  /// The audio sample rate required by Rhino
  int? get sampleRate => _rhino?.sampleRate;

  /// Gets the source of the Rhino context in YAML format. Shows the list of intents,
  /// which expressions map to those intents, as well as slots and their possible values.
  String? get contextInfo => _rhino?.contextInfo;

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
  RhinoManager._(this._rhino, InferenceCallback inferenceCallback,
      ProcessErrorCallback? processErrorCallback)
      : _voiceProcessor = VoiceProcessor.instance,
        _isListening = false {
    _frameListener = (List<int> frame) async {
      if (!_isListening) {
        return;
      }

      try {
        RhinoInference? rhinoResult = await _rhino?.process(frame);
        if ((rhinoResult != null) && (rhinoResult.isFinalized)) {
          inferenceCallback(rhinoResult);
          await _stop();
        }
      } on RhinoException catch (error) {
        processErrorCallback == null
            ? print("RhinoException: ${error.message}")
            : processErrorCallback(error);
      }
    };
    _errorListener = (VoiceProcessorException error) {
      processErrorCallback == null
          ? print("RhinoException: ${error.message}")
          : processErrorCallback(RhinoException(error.message));
    };
  }

  Future<void> _stop() async {
    if (!_isListening) {
      return;
    }

    _voiceProcessor?.removeErrorListener(_errorListener);
    _voiceProcessor?.removeFrameListener(_frameListener);

    if (_voiceProcessor?.numFrameListeners == 0) {
      try {
        await _voiceProcessor?.stop();
      } on PlatformException catch (e) {
        throw RhinoRuntimeException(
            "Failed to stop audio recording: ${e.message}");
      }
    }

    _isListening = false;
  }

  /// Starts audio recording and processing with the Rhino engine until a
  /// inference result is sent via the `inferenceCallback`
  /// Throws a `RhinoException` if there was a problem starting audio recording.
  Future<void> process() async {
    if (_isListening) {
      return;
    }

    if (_rhino == null || _voiceProcessor == null) {
      throw RhinoInvalidStateException(
          "Cannot start Rhino - resources have already been released");
    }

    if (await _voiceProcessor?.hasRecordAudioPermission() ?? false) {
      _voiceProcessor?.addFrameListener(_frameListener);
      _voiceProcessor?.addErrorListener(_errorListener);
      try {
        await _voiceProcessor?.start(_rhino!.frameLength, _rhino!.sampleRate);
      } on PlatformException catch (e) {
        throw RhinoRuntimeException(
            "Failed to start audio recording: ${e.message}");
      }
    } else {
      throw RhinoRuntimeException(
          "User did not give permission to record audio.");
    }

    _isListening = true;
  }

  /// Releases Rhino and audio resources.
  /// Throws a `RhinoException` if there was a problem stopping audio recording.
  Future<void> delete() async {
    await _stop();
    _voiceProcessor = null;

    _rhino?.delete();
    _rhino = null;
  }
}
