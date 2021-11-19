//
// Copyright 2020 Picovoice Inc.
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
import * as RhinoExceptions from './rhino_exceptions';

export type InferenceCallback = (inference: RhinoInference) => void;
export type ProcessErrorCallback = (error: RhinoExceptions.RhinoException) => void;

class RhinoManager {
  private _voiceProcessor: VoiceProcessor;
  private _rhino: Rhino | null;
  private _inferenceCallback: InferenceCallback;
  private _processErrorCallback?: ProcessErrorCallback;
  private _bufferListener?: EventSubscription;
  private _bufferEmitter: NativeEventEmitter;
  private _needsReset: boolean;

  /**
   * Creates an instance of the Rhino Manager.
   * @param accessKey AccessKey obtained from Picovoice Console (https://console.picovoice.ai/.
   * @param contextPath Absolute path to context file.
   * @param inferenceCallback A callback for when Rhino has made an intent inference
   * @param modelPath Path to the file containing model parameters. If not set it will be set to the default location.
   * @param sensitivity Inference sensitivity. A higher sensitivity value results in fewer misses at the cost of (potentially) increasing the erroneous inference rate.
   * Sensitivity should be a floating-point number within [0, 1].
   * @param requireEndpoint If true, Rhino requires an endpoint (chunk of silence) before finishing inference.
   * @param processErrorCallback Reports errors that are encountered while the engine is processing audio.
   * @returns An instance of the Rhino Manager
   */

  public static async create(
    accessKey: string,
    contextPath: string,
    inferenceCallback: InferenceCallback,
    modelPath?: string,
    sensitivity: number = 0.5,
    requireEndpoint: boolean = true,
    processErrorCallback?: ProcessErrorCallback
  ) {
    let rhino = await Rhino.create(accessKey, contextPath, modelPath, sensitivity, requireEndpoint);
    return new RhinoManager(rhino, inferenceCallback, processErrorCallback);
  }

  private constructor(rhino: Rhino, inferenceCallback: InferenceCallback, processErrorCallback?: ProcessErrorCallback) {
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
      throw new RhinoExceptions.RhinoInvalidArgumentException("'inferenceCallback' must be a function type");
    }

    // function that's executed every time an audio buffer is received
    const processBuffer = async (buffer: number[]) => {
      try {
        if (this._rhino === null) return;

        // don't process if we've already already received a result
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
        if (this._processErrorCallback !== undefined && 
            this._processErrorCallback !== null &&
            typeof this._processErrorCallback === 'function') {
          this._processErrorCallback(e as RhinoExceptions.RhinoException);
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
