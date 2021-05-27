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

import 'dart:async';

import 'package:flutter/services.dart';
import 'package:flutter_voice_processor/flutter_voice_processor.dart';
import 'package:rhino/rhino.dart';
import 'package:rhino/rhino_error.dart';

/// type for function that receives inference result from Rhino
typedef InferenceCallback(Map<String, dynamic> inference);

/// type for PvError that occurs while recording audio
typedef ErrorCallback(PvError error);

class RhinoManager {
  VoiceProcessor? _voiceProcessor;
  Rhino? _rhino;

  final InferenceCallback _inferenceCallback;
  RemoveListener? _removeVoiceProcessorListener;

  bool _awaitingStop = false;

  /// Static creator for initializing Rhino
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
  /// Thows a `PvError` if not initialized correctly
  ///
  /// returns an instance of the speech-to-intent engine
  static Future<RhinoManager> create(
      String contextPath, InferenceCallback inferenceCallback,
      {String? modelPath,
      double sensitivity = 0.5,
      ErrorCallback? errorCallback}) async {
    Rhino rhino = await Rhino.create(contextPath,
        modelPath: modelPath, sensitivity: sensitivity);
    return new RhinoManager._(rhino, inferenceCallback, errorCallback);
  }

  // private constructor
  RhinoManager._(
      this._rhino, this._inferenceCallback, ErrorCallback? errorCallback)
      : _voiceProcessor = VoiceProcessor.getVoiceProcessor(
            Rhino.frameLength, Rhino.sampleRate) {
    if (_voiceProcessor == null) {
      throw new PvError("flutter_voice_processor not available.");
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
        PvError castError = new PvError(
            "flutter_voice_processor sent an unexpected data type.");
        errorCallback == null
            ? print(castError.message)
            : errorCallback(castError);
        return;
      }

      // process frame with Rhino
      try {
        Map<String, dynamic>? rhinoResult = _rhino?.process(rhinoFrame);
        if (rhinoResult?['isFinalized']) {
          _awaitingStop = true;

          // send inference minus isFinalized
          rhinoResult!.remove('isFinalized');
          _inferenceCallback(rhinoResult);
          // stop audio processing
          await _voiceProcessor?.stop();
        }
      } on PvError catch (error) {
        errorCallback == null ? print(error.message) : errorCallback(error);
      } finally {
        _awaitingStop = false;
      }
    });
  }

  /// Opens audio input stream and sends audio frames to Rhino until a inference
  /// result is sent via inference callback
  /// Throws a `PvAudioException` if there was a problem starting the audio engine
  Future<void> process() async {
    if (_rhino == null || _voiceProcessor == null) {
      throw new PvStateError(
          "Cannot start RhinoManager - resources have already been released");
    }

    if (await _voiceProcessor?.hasRecordAudioPermission() == true) {
      try {
        await _voiceProcessor!.start();
      } on PlatformException {
        throw new PvAudioException(
            "Audio engine failed to start. Hardware may not be supported.");
      }
    } else {
      throw new PvAudioException(
          "User did not give permission to record audio.");
    }
  }

  /// Releases Rhino and audio resouces
  void delete() async {
    if (_voiceProcessor != null) {
      if (_voiceProcessor!.isRecording) {
        await _voiceProcessor!.stop();
      }
      _removeVoiceProcessorListener?.call();
      _voiceProcessor = null;
    }

    if (_rhino != null) {
      _rhino!.delete();
      _rhino = null;
    }
  }
}
