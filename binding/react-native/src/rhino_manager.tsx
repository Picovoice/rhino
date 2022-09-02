//
// Copyright 2020-2022 Picovoice Inc.
//
// You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
// file accompanying this source.
//
// Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
// an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
// specific language governing permissions and limitations under the License.
//

import {
  VoiceProcessor,
  BufferEmitter,
} from '@picovoice/react-native-voice-processor';
import { EventSubscription, NativeEventEmitter } from 'react-native';

import Rhino, { RhinoInference } from './rhino';
import * as RhinoErrors from './rhino_errors';

export type InferenceCallback = (inference: RhinoInference) => void;
export type ProcessErrorCallback = (error: RhinoErrors.RhinoError) => void;

class RhinoManager {
  private _voiceProcessor: VoiceProcessor;
  private _rhino: Rhino | null;
  private readonly _inferenceCallback: InferenceCallback;
  private readonly _processErrorCallback?: ProcessErrorCallback;
  private _bufferListener?: EventSubscription;
  private _bufferEmitter: NativeEventEmitter;
  private _needsReset: boolean;

  /**
   * Creates an instance of the Rhino Manager.
   * @param accessKey AccessKey obtained from Picovoice Console (https://console.picovoice.ai/.
   * @param contextPath Absolute path to context file.
   * @param inferenceCallback A callback for when Rhino has made an intent inference
   * @param processErrorCallback Reports errors that are encountered while the engine is processing audio.
   * @param modelPath Path to the file containing model parameters. If not set it will be set to the default location.
   * @param sensitivity Inference sensitivity. A higher sensitivity value results in fewer misses at the cost of (potentially) increasing the erroneous inference rate.
   * Sensitivity should be a floating-point number within [0, 1].
   * @param endpointDurationSec Endpoint duration in seconds. An endpoint is a chunk of silence at the end of an
   * utterance that marks the end of spoken command. It should be a positive number within [0.5, 5]. A lower endpoint
   * duration reduces delay and improves responsiveness. A higher endpoint duration assures Rhino doesn't return inference
   * preemptively in case the user pauses before finishing the request.
   * @param requireEndpoint If set to `true`, Rhino requires an endpoint (a chunk of silence) after the spoken command.
   * If set to `false`, Rhino tries to detect silence, but if it cannot, it still will provide inference regardless. Set
   * to `false` only if operating in an environment with overlapping speech (e.g. people talking in the background).
   * @returns An instance of the Rhino Manager
   */

  public static async create(
    accessKey: string,
    contextPath: string,
    inferenceCallback: InferenceCallback,
    processErrorCallback?: ProcessErrorCallback,
    modelPath?: string,
    sensitivity: number = 0.5,
    endpointDurationSec: number = 1.0,
    requireEndpoint: boolean = true
  ) {
    let rhino = await Rhino.create(
      accessKey,
      contextPath,
      modelPath,
      sensitivity,
      endpointDurationSec,
      requireEndpoint
    );
    return new RhinoManager(rhino, inferenceCallback, processErrorCallback);
  }

  private constructor(
    rhino: Rhino,
    inferenceCallback: InferenceCallback,
    processErrorCallback?: ProcessErrorCallback
  ) {
    this._inferenceCallback = inferenceCallback;
    this._processErrorCallback = processErrorCallback;
    this._rhino = rhino;
    this._voiceProcessor = VoiceProcessor.getVoiceProcessor(
      rhino.frameLength,
      rhino.sampleRate
    );
    this._bufferEmitter = new NativeEventEmitter(BufferEmitter);
    this._needsReset = false;

    if (typeof inferenceCallback !== 'function') {
      throw new RhinoErrors.RhinoInvalidArgumentError(
        "'inferenceCallback' must be a function type"
      );
    }

    // function that's executed every time an audio buffer is received
    const processBuffer = async (buffer: number[]) => {
      try {
        if (this._rhino === null) return;

        // don't process if we've already received a result
        if (this._needsReset) return;

        let inference = await this._rhino.process(buffer);

        // throw out result if we've already received one
        if (this._needsReset) return;

        if (inference.isFinalized) {
          // send out result and stop audio
          this._inferenceCallback(inference);
          await this._voiceProcessor.stop();
          this._needsReset = false;
        }
      } catch (e) {
        if (
          this._processErrorCallback !== undefined &&
          this._processErrorCallback !== null &&
          typeof this._processErrorCallback === 'function'
        ) {
          this._processErrorCallback(e as RhinoErrors.RhinoError);
        } else {
          console.error(e);
        }
      }
    };

    this._bufferListener = this._bufferEmitter.addListener(
      BufferEmitter.BUFFER_EMITTER_KEY,
      async (buffer: number[]) => {
        await processBuffer(buffer);
      }
    );
  }

  /**
   * Opens audio input stream and sends audio frames to Rhino
   */
  async process() {
    return await this._voiceProcessor.start();
  }

  /**
   * Releases resources and listeners
   */
  delete() {
    this._bufferListener?.remove();
    if (this._rhino != null) {
      this._rhino.delete();
      this._rhino = null;
    }
  }
}

export default RhinoManager;
