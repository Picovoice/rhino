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

import { NativeModules } from 'react-native';

import * as RhinoErrors from './rhino_errors';

export class RhinoInference {
  private readonly _isFinalized: boolean;
  private readonly _isUnderstood?: boolean;
  private readonly _intent?: string;
  private readonly _slots?: { [key: string]: string };

  public constructor(
    isFinalized: boolean,
    isUnderstood?: boolean,
    intent?: string,
    slots?: { [key: string]: string }
  ) {
    this._isFinalized = isFinalized;
    this._isUnderstood = isUnderstood;
    this._intent = intent;
    this._slots = slots;
  }

  /**
   * whether Rhino has made an inference
   */
  get isFinalized() {
    return this._isFinalized;
  }

  /**
   * if isFinalized, whether Rhino understood what it heard based on the context
   */
  get isUnderstood() {
    return this._isUnderstood;
  }

  /**
   * if isUnderstood, name of intent that was inferred
   */
  get intent() {
    return this._intent;
  }

  /**
   * if isUnderstood, dictionary of slot keys and values that were inferred
   */
  get slots() {
    return this._slots;
  }
}

type NativeError = {
  code: string;
  message: string;
};

const RCTRhino = NativeModules.PvRhino;

class Rhino {
  private readonly _handle: string;
  private readonly _frameLength: number;
  private readonly _sampleRate: number;
  private readonly _version: string;
  private readonly _contextInfo: string;

  /**
   * Creates an instance of the Rhino Speech-to-Intent engine.
   * @param accessKey AccessKey obtained from Picovoice Console (https://console.picovoice.ai/.
   * @param contextPath Absolute path to context file.
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
   * @returns An instance of the engine.
   */
  public static async create(
    accessKey: string,
    contextPath: string,
    modelPath?: string,
    sensitivity: number = 0.5,
    endpointDurationSec: number = 1.0,
    requireEndpoint: boolean = true
  ): Promise<Rhino> {
    try {
      let { handle, frameLength, sampleRate, version, contextInfo } =
        await RCTRhino.create(
          accessKey,
          modelPath,
          contextPath,
          sensitivity,
          endpointDurationSec,
          requireEndpoint
        );
      return new Rhino(handle, frameLength, sampleRate, version, contextInfo);
    } catch (err) {
      if (err instanceof RhinoErrors.RhinoError) {
        throw err;
      } else {
        const nativeError = err as NativeError;
        throw this.codeToError(nativeError.code, nativeError.message);
      }
    }
  }

  private constructor(
    handle: string,
    frameLength: number,
    sampleRate: number,
    version: string,
    contextInfo: string
  ) {
    this._handle = handle;
    this._frameLength = frameLength;
    this._sampleRate = sampleRate;
    this._version = version;
    this._contextInfo = contextInfo;
  }

  /**
   * Process a frame of pcm audio with the speech-to-intent engine.
   * @param frame frame 16-bit integers of 16kHz linear PCM mono audio.
   * The specific array length is obtained from Rhino via the frameLength field.
   * @returns {RhinoInference} inference result at time of frame being processed with fields:
   *  - isFinalized: whether Rhino has made an inference
   *  - isUnderstood: if isFinalized, whether Rhino understood what it heard based on the context
   *  - intent: if isUnderstood, name of intent that were inferred
   *  - slots: if isUnderstood, dictionary of slot keys and values that were inferred
   */
  async process(frame: number[]): Promise<RhinoInference> {
    if (frame === undefined || frame === null) {
      throw new RhinoErrors.RhinoInvalidArgumentError(
        `Frame array provided to process() is undefined or null`
      );
    } else if (frame.length !== this._frameLength) {
      throw new RhinoErrors.RhinoInvalidArgumentError(
        `Size of frame array provided to 'process' (${frame.length}) does not match the engine 'frameLength' (${this._frameLength})`
      );
    }

    // sample the first frame to check for non-integer values
    if (!Number.isInteger(frame[0])) {
      throw new RhinoErrors.RhinoInvalidArgumentError(
        `Non-integer frame values provided to process(): ${frame[0]}. Rhino requires 16-bit integers`
      );
    }

    try {
      const { isFinalized, isUnderstood, intent, slots } =
        await RCTRhino.process(this._handle, frame);
      return new RhinoInference(isFinalized, isUnderstood, intent, slots);
    } catch (err) {
      const nativeError = err as NativeError;
      throw Rhino.codeToError(nativeError.code, nativeError.message);
    }
  }

  /**
   * Frees memory that was allocated for Rhino
   */
  async delete() {
    return RCTRhino.delete(this._handle);
  }

  /**
   * Gets the source of the Rhino context in YAML format. Shows the list of intents,
   * which expressions map to those intents, as well as slots and their possible values.
   * @returns The context YAML
   */
  get contextInfo() {
    return this._contextInfo;
  }

  /**
   * Gets the required number of audio samples per frame.
   * @returns Required frame length.
   */
  get frameLength() {
    return this._frameLength;
  }

  /**
   * Get the audio sample rate required by Rhino.
   * @returns Required sample rate.
   */
  get sampleRate() {
    return this._sampleRate;
  }

  /**
   * Gets the version number of the Rhino library.
   * @returns Version of Rhino
   */
  get version() {
    return this._version;
  }

  /**
   * Gets the Error type given a code.
   * @param code Code name of native Error.
   * @param message Detailed message of the error.
   */
  private static codeToError(code: string, message: string) {
    switch (code) {
      case 'RhinoException':
        return new RhinoErrors.RhinoError(message);
      case 'RhinoMemoryException':
        return new RhinoErrors.RhinoMemoryError(message);
      case 'RhinoIOException':
        return new RhinoErrors.RhinoIOError(message);
      case 'RhinoInvalidArgumentException':
        return new RhinoErrors.RhinoInvalidArgumentError(message);
      case 'RhinoStopIterationException':
        return new RhinoErrors.RhinoStopIterationError(message);
      case 'RhinoKeyException':
        return new RhinoErrors.RhinoKeyError(message);
      case 'RhinoInvalidStateException':
        return new RhinoErrors.RhinoInvalidStateError(message);
      case 'RhinoRuntimeException':
        return new RhinoErrors.RhinoRuntimeError(message);
      case 'RhinoActivationException':
        return new RhinoErrors.RhinoActivationError(message);
      case 'RhinoActivationLimitException':
        return new RhinoErrors.RhinoActivationLimitError(message);
      case 'RhinoActivationThrottledException':
        return new RhinoErrors.RhinoActivationThrottledError(message);
      case 'RhinoActivationRefusedException':
        return new RhinoErrors.RhinoActivationRefusedError(message);
      default:
        throw new RhinoErrors.RhinoError(
          `unexpected code: ${code}, message: ${message}`
        );
    }
  }
}

export default Rhino;
