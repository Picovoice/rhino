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
"use strict";

const fs = require("fs");
const path = require("path");

const PV_STATUS_T = require("./pv_status_t");
const {
  PvArgumentError,
  PvStateError,
  pvStatusToException,
} = require("./errors");
const { getSystemLibraryPath } = require("./platforms");

const MODEL_PATH_DEFAULT = "lib/common/rhino_params.pv";

/**
 * Wraps the Rhino engine and context.
 *
 * Performs the calls to the Rhino node library. Does some basic parameter validation to prevent
 * errors occurring in the library layer. Provides clearer error messages in native JavaScript.
 */
class Rhino {
  /**
   * Creates an instance of Rhino with a specific context.
   * @param {string} accessKey AccessKey obtained from Picovoice Console (https://console.picovoice.ai/).
   * @param {string} contextPath the path to the Rhino context file (.rhn extension)
   * @param {number} sensitivity [0.5] the sensitivity in the range [0,1]
   * @param {boolean} requireEndpoint If set to `true`, Rhino requires an endpoint (chunk of silence) before finishing inference.
   * @param {string} manualModelPath the path to the Rhino model (.pv extension)
   * @param {string} manualLibraryPath the path to the Rhino dynamic library (platform-dependent extension)
   */
  constructor(
    accessKey,
    contextPath,
    sensitivity = 0.5,
    requireEndpoint = true,
    manualModelPath,
    manualLibraryPath
  ) {
    if (
      accessKey === null ||
      accessKey === undefined ||
      accessKey.length === 0
    ) {
      throw new PvArgumentError(`No AccessKey provided to Rhino`);
    }

    let modelPath = manualModelPath;
    if (modelPath === undefined || modelPath === null) {
      modelPath = path.resolve(__dirname, MODEL_PATH_DEFAULT);
    }

    let libraryPath = manualLibraryPath;
    if (libraryPath === undefined || modelPath === null) {
      libraryPath = getSystemLibraryPath();
    }

    if (!fs.existsSync(libraryPath)) {
      throw new PvArgumentError(
        `File not found at 'libraryPath': ${libraryPath}`
      );
    }

    if (!fs.existsSync(modelPath)) {
      throw new PvArgumentError(`File not found at 'modelPath': ${modelPath}`);
    }

    if (!fs.existsSync(contextPath)) {
      throw new PvArgumentError(
        `File not found at 'contextPath': ${contextPath}`
      );
    }

    if (sensitivity < 0 || sensitivity > 1 || isNaN(sensitivity)) {
      throw new RangeError(
        `Sensitivity value in 'sensitivities' not in range [0,1]: ${sensitivity}`
      );
    }

    const pvRhino = require(libraryPath);

    let rhinoHandleAndStatus = null;
    try {
      rhinoHandleAndStatus = pvRhino.init(accessKey, modelPath, contextPath, sensitivity, requireEndpoint);
    } catch (err) {
      pvStatusToException(PV_STATUS_T[err.code], err);
    }

    const status = rhinoHandleAndStatus.status;
    if (status !== PV_STATUS_T.SUCCESS) {
      pvStatusToException(status, "Rhino failed to initialize");
    }

    this._handle = rhinoHandleAndStatus.handle;
    this._pvRhino = pvRhino;
    this._frameLength = pvRhino.frame_length();
    this._sampleRate = pvRhino.sample_rate();
    this._version = pvRhino.version();

    this.isFinalized = false;
  }

  /**
   * @returns number of audio samples per frame (i.e. the length of the array provided to the process function)
   * @see {@link process}
   */
  get frameLength() {
    return this._frameLength;
  }

  /**
   * @returns the audio sampling rate accepted by Rhino
   */
  get sampleRate() {
    return this._sampleRate;
  }

  /**
   * @returns the version of the Rhino engine
   */
  get version() {
    return this._version;
  }

  /**
   * Process a frame of pcm audio.
   *
   * @param {Array} frame 16-bit integers of 16kHz linear PCM mono audio.
   * The specific array length is obtained from Rhino via the frameLength field.
   * @returns {boolean} true when Rhino has concluded processing audio and determined the intent (or that the intent was not understood), false otherwise.
   */
  process(frame) {
    if (
      this._handle === 0 ||
      this._handle === null ||
      this._handle === undefined
    ) {
      throw new PvStateError("Rhino is not initialized");
    }

    if (frame === undefined || frame === null) {
      throw new PvArgumentError(
        `Frame array provided to process() is undefined or null`
      );
    } else if (frame.length !== this.frameLength) {
      throw new PvArgumentError(
        `Size of frame array provided to 'process' (${frame.length}) does not match the engine 'frameLength' (${this.frameLength})`
      );
    }

    // sample the first frame to check for non-integer values
    if (!Number.isInteger(frame[0])) {
      throw new PvArgumentError(
        `Non-integer frame values provided to process(): ${frame[0]}. Rhino requires 16-bit integers`
      );
    }

    const frameBuffer = new Int16Array(frame);

    let finalizedAndStatus = null;
    try {
      finalizedAndStatus = this._pvRhino.process(this._handle, frameBuffer);
    } catch (err) {
      pvStatusToException(PV_STATUS_T[err.code], err);
    }

    const status = finalizedAndStatus.status;
    if (status !== PV_STATUS_T.SUCCESS) {
      pvStatusToException(status, "Rhino failed to process the frame");
    }

    this.isFinalized = finalizedAndStatus.is_finalized === 1;
    return this.isFinalized;
  }

  /**
   * Gets inference results from Rhino. If the phrase was understood, it includes the specific intent name
   * that was inferred, and (if applicable) slot keys and specific slot values.
   *
   * Should only be called after the process function returns true, otherwise Rhino
   * has not yet reached an inference conclusion.
   * @see {@link process}
   *
   *
   * @returns {Object} with inference information (isUnderstood, intent, slots)
   *
   * e.g.:
   *
   * {
   *   isUnderstood: true,
   *   intent: 'orderDrink',
   *   slots: {
   *     size: 'medium',
   *     numberOfShots: 'double shot',
   *     coffeeDrink: 'americano',
   *     milkAmount: 'lots of milk',
   *     sugarAmount: 'some sugar'
   *   }
   * }
   */
  getInference() {
    if (!this.isFinalized) {
      throw new PvStateError(
        "'getInference' was called but Rhino has not yet reached a conclusion. Use the results of calling process to determine if Rhino has concluded"
      );
    }

    if (
      this._handle === 0 ||
      this._handle === null ||
      this._handle === undefined
    ) {
      throw new PvStateError("Rhino is not initialized");
    }

    let inferenceAndStatus = null;
    try {
      inferenceAndStatus = this._pvRhino.get_inference(this._handle);
    } catch (err) {
      pvStatusToException(PV_STATUS_T[err.code], err);
    }

    const status = inferenceAndStatus.status;
    if (status !== PV_STATUS_T.SUCCESS) {
      pvStatusToException(status, `Rhino failed to get inference: ${status}`);
    }

    let inference = {
      isUnderstood: inferenceAndStatus.is_understood === 1,
      intent: inferenceAndStatus.intent,
      slots: inferenceAndStatus.slots,
    };

    return inference;
  }

  /**
   * Gets the source of the Rhino context in YAML format. Shows the list of intents,
   * which expressions map to those intents, as well as slots and their possible values.
   *
   * @returns {string} the context YAML
   */
  getContextInfo() {
    if (
      this._handle === 0 ||
      this._handle === null ||
      this._handle === undefined
    ) {
      throw new PvStateError("Rhino is not initialized");
    }

    let contextAndStatus = null;
    try {
      contextAndStatus = this._pvRhino.context_info(this._handle);
    } catch (err) {
      pvStatusToException(PV_STATUS_T[err.code], err);
    }

    const status = contextAndStatus.status;
    if (status !== PV_STATUS_T.SUCCESS) {
      pvStatusToException(status, `Rhino failed to get context info: ${status}`);
    }

    return contextAndStatus.context_info;
  }

  /**
   * Releases the resources acquired by Rhino.
   *
   * Be sure to call this when finished with the instance
   * to reclaim the memory that was allocated by the C library.
   */
  release() {
    if (this._handle !== 0) {
      this._pvRhino.delete(this._handle);
      this._handle = 0;
    } else {
      console.warn("Rhino is not initialized; nothing to destroy");
    }
  }
}

module.exports = Rhino;
