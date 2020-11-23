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

import { NativeModules } from 'react-native';
const RCTRhino = NativeModules.PvRhino;

class Rhino {
  private _handle: string;
  private _frameLength: number;
  private _sampleRate: number;
  private _version: string;
  private _contextInfo: string;

  constructor(
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
   * Creates an instance of the Rhino Speech-to-Intent engine.
   * @param contextPath Absolute path to context file.
   * @param modelPath Path to the file containing model parameters. If not set it will be set to the default location.
   * @param sensitivity Inference sensitivity. A higher sensitivity value results in fewer misses at the cost of (potentially) increasing the erroneous inference rate.
   * Sensitivity should be a floating-point number within [0, 1].
   * @returns An instance of the engine.
   */
  public static async create(
    contextPath: string,
    modelPath?: string,
    sensitivity?: number
  ) {
    if (modelPath === undefined) {
      modelPath = RCTRhino.DEFAULT_MODEL_PATH;
    }

    if (sensitivity === undefined) {
      sensitivity = 0.5;
    }

    if (sensitivity < 0 || sensitivity > 1 || isNaN(sensitivity)) {
      return Promise.reject(
        `Sensitivity value in 'sensitivities' not in range [0,1]: ${sensitivity}`
      );
    }

    let {
      handle,
      frameLength,
      sampleRate,
      version,
      contextInfo,
    } = await RCTRhino.create(modelPath, contextPath, sensitivity);
    return new Rhino(handle, frameLength, sampleRate, version, contextInfo);
  }

  /**
   * Process a frame of pcm audio with the speech-to-intent engine.
   * @param frame frame 16-bit integers of 16kHz linear PCM mono audio.
   * The specific array length is obtained from Rhino via the frameLength field.
   * @returns {object} inference result at time of frame being processed
   * JSON object had fields:
   *  - isFinalized: whether Rhino has made an inference
   *  - isUnderstood: if isFinalized, whether Rhino understood what it heard based on the context,
   *  - intent: if isUnderstood, name of intent that were inferred
   *  - slots: if isUnderstood, dictionary of slot keys and values that were inferred
   */
  async process(frame: number[]) {
    if (frame === undefined) {
      return Promise.reject(
        `Frame array provided to process() is undefined or null`
      );
    } else if (frame.length !== this._frameLength) {
      return Promise.reject(
        `Size of frame array provided to 'process' (${frame.length}) does not match the engine 'frameLength' (${this._frameLength})`
      );
    }

    // sample the first frame to check for non-integer values
    if (!Number.isInteger(frame[0])) {
      return Promise.reject(
        `Non-integer frame values provided to process(): ${frame[0]}. Rhino requires 16-bit integers`
      );
    }
    
    return RCTRhino.process(this._handle, frame);
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
}

export default Rhino;
