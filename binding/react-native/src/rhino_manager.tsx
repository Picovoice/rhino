//
// Copyright 2020-2023 Picovoice Inc.
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
  VoiceProcessorError,
  VoiceProcessorErrorListener,
  VoiceProcessorFrameListener,
} from '@picovoice/react-native-voice-processor';

import Rhino, { RhinoInference } from './rhino';
import * as RhinoErrors from './rhino_errors';

export type InferenceCallback = (inference: RhinoInference) => void;
export type ProcessErrorCallback = (error: RhinoErrors.RhinoError) => void;

class RhinoManager {
  private _voiceProcessor: VoiceProcessor;
  private readonly _errorListener: VoiceProcessorErrorListener;
  private readonly _frameListener: VoiceProcessorFrameListener;
  private _rhino: Rhino | null;

  private _isListening: boolean = false;

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
  ): Promise<RhinoManager> {
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
    this._rhino = rhino;
    this._voiceProcessor = VoiceProcessor.instance;
    this._frameListener = async (frame: number[]) => {
      if (this._rhino === null || !this._isListening) {
        return;
      }
      try {
        let inference = await this._rhino.process(frame);

        if (inference.isFinalized) {
          inferenceCallback(inference);
          await this._stop();
        }
      } catch (e) {
        if (processErrorCallback) {
          processErrorCallback(e as RhinoErrors.RhinoError);
        } else {
          console.error(e);
        }
      }
    };

    this._errorListener = (error: VoiceProcessorError) => {
      if (processErrorCallback) {
        processErrorCallback(new RhinoErrors.RhinoError(error.message));
      } else {
        console.error(error);
      }
    };

    if (typeof inferenceCallback !== 'function') {
      throw new RhinoErrors.RhinoInvalidArgumentError(
        "'inferenceCallback' must be a function type"
      );
    }
  }

  /**
   * Opens audio input stream and sends audio frames to Rhino.
   */
  public async process(): Promise<void> {
    if (this._isListening) {
      return;
    }

    if (this._rhino === null) {
      throw new RhinoErrors.RhinoInvalidStateError(
        'Cannot start Rhino - resources have already been released'
      );
    }

    if (await this._voiceProcessor.hasRecordAudioPermission()) {
      this._voiceProcessor.addFrameListener(this._frameListener);
      this._voiceProcessor.addErrorListener(this._errorListener);
      try {
        await this._voiceProcessor.start(
          this._rhino.frameLength,
          this._rhino.sampleRate
        );
      } catch (e: any) {
        throw new RhinoErrors.RhinoRuntimeError(
          `Failed to start audio recording: ${e.message}`
        );
      }
    } else {
      throw new RhinoErrors.RhinoRuntimeError(
        'User did not give permission to record audio.'
      );
    }

    this._isListening = true;
  }

  /**
   * Closes audio stream.
   */
  private async _stop(): Promise<void> {
    if (!this._isListening) {
      return;
    }

    this._voiceProcessor.removeErrorListener(this._errorListener);
    this._voiceProcessor.removeFrameListener(this._frameListener);

    if (this._voiceProcessor.numFrameListeners === 0) {
      try {
        await this._voiceProcessor.stop();
      } catch (e: any) {
        throw new RhinoErrors.RhinoRuntimeError(
          `Failed to stop audio recording: ${e.message}`
        );
      }
    }

    this._isListening = false;
  }

  /**
   * Releases resources and listeners.
   */
  public async delete(): Promise<void> {
    if (this._rhino !== null) {
      await this._rhino.delete();
      this._rhino = null;
    }
  }

  /**
   * Gets the source of the Rhino context in YAML format. Shows the list of intents,
   * which expressions map to those intents, as well as slots and their possible values.
   * @returns The context YAML
   */
  public get contextInfo(): string | undefined {
    return this._rhino?.contextInfo;
  }

  /**
   * Gets the required number of audio samples per frame.
   * @returns Required frame length.
   */
  public get frameLength(): number | undefined {
    return this._rhino?.frameLength;
  }

  /**
   * Get the audio sample rate required by Rhino.
   * @returns Required sample rate.
   */
  public get sampleRate(): number | undefined {
    return this._rhino?.sampleRate;
  }

  /**
   * Gets the version number of the Rhino library.
   * @returns Version of Rhino
   */
  public get version(): string | undefined {
    return this._rhino?.version;
  }
}

export default RhinoManager;
