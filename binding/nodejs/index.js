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
"use strict";

const ArrayType = require("ref-array-napi");
const ffi = require("ffi-napi");
const fs = require("fs");
const path = require("path");
const ref = require("ref-napi");

const PV_STATUS_T = require("./pv_status_t");
const {
  PvArgumentError,
  PvStateError,
  pvStatusToException,
} = require("./errors");
const { getSystemLibraryPath } = require("./platforms");

const MODEL_PATH_DEFAULT = "lib/common/rhino_params.pv";

// ffi types
const int16Array = ArrayType(ref.types.int16);
const int32Ptr = ref.refType(ref.types.int32);
const rhnObjPtr = ref.refType(ref.types.void);
const rhnObjPtrPtr = ref.refType(rhnObjPtr);
const boolPtr = ref.refType(ref.types.bool);
const cStringArrayPtr = ArrayType(ref.types.CString);

/**
 * Wraps the Rhino engine and context.
 *
 * Performs the calls to the Rhino dynamic library via FFI. Does some basic parameter validation to prevent
 * errors occurring in the library layer. Provides clearer error messages in native JavaScript.
 */
class Rhino {
  /**
   * Creates an instance of Rhino with a specific context.
   *
   * @param {string} contextPath the path to the Rhino context file (.rhn extension)
   * @param {number} sensitivity [0.5] the sensitivity in the range [0,1]
   * @param {string} manualModelPath the path to the Rhino model (.pv extension)
   * @param {string} manualLibraryPath the path to the Rhino dynamic library (platform-dependent extension)
   */
  constructor(
    contextPath,
    sensitivity = 0.5,
    manualModelPath,
    manualLibraryPath
  ) {
    let modelPath = manualModelPath;
    if (modelPath === undefined) {
      modelPath = path.resolve(__dirname, MODEL_PATH_DEFAULT);
    }

    let libraryPath = manualLibraryPath;
    if (libraryPath === undefined) {
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

    this.rhnPtrPtr = ref.alloc(rhnObjPtrPtr);
    this.isFinalizedPtr = ref.alloc(ref.types.bool);

    this.libRhn = ffi.Library(libraryPath, {
      pv_rhino_context_info: [ref.types.int32, [rhnObjPtr, ref.types.CString]],
      pv_rhino_delete: [ref.types.void, [rhnObjPtr]],
      pv_rhino_frame_length: [ref.types.int32, []],
      pv_rhino_free_slots_and_values: [
        ref.types.int32,
        [rhnObjPtr, cStringArrayPtr, cStringArrayPtr],
      ],
      pv_rhino_get_intent: [
        ref.types.int32,
        [
          rhnObjPtr,
          ref.types.CString,
          int32Ptr,
          cStringArrayPtr,
          cStringArrayPtr,
        ],
      ],
      pv_rhino_init: [
        ref.types.int32,
        [ref.types.CString, ref.types.CString, ref.types.float, rhnObjPtrPtr],
      ],
      pv_rhino_is_understood: [ref.types.int32, [rhnObjPtr, boolPtr]],
      pv_rhino_process: [ref.types.int32, [rhnObjPtr, int16Array, boolPtr]],
      pv_sample_rate: [ref.types.int32, []],
      pv_rhino_reset: [ref.types.int32, [rhnObjPtr]],
      pv_rhino_version: [ref.types.CString, []],
    });

    this._frameLength = this.libRhn.pv_rhino_frame_length();
    this._sampleRate = this.libRhn.pv_sample_rate();
    this._version = this.libRhn.pv_rhino_version();

    const initStatus = this.libRhn.pv_rhino_init(
      modelPath,
      contextPath,
      sensitivity,
      this.rhnPtrPtr
    );

    if (initStatus !== PV_STATUS_T.SUCCESS) {
      pvStatusToException(initStatus, "Rhino failed to initialize");
    }

    this.rhnPtr = this.rhnPtrPtr.deref();
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
   * Process a frame of audio.
   *
   * @param {Array} frame 16-bit integers of 16kHz linear PCM mono audio.
   * The specific array length is obtained from Rhino via the framelength field.
   * @returns {boolean} true when Rhino has concluded processing audio and determined the intent (or that the intent was not understood), false otherwise.
   */
  process(frame) {
    if (this.rhnPtr === null) {
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

    const frameBuffer = int16Array(this.frameLength);
    for (let i = 0; i < this.frameLength; i++) {
      frameBuffer[i] = frame[i];
    }

    const status = this.libRhn.pv_rhino_process(
      this.rhnPtr,
      frameBuffer,
      this.isFinalizedPtr
    );

    if (status !== PV_STATUS_T.SUCCESS) {
      pvStatusToException(status, "Rhino failed to process the frame");
    }

    return this.isFinalizedPtr.deref();
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
    if (!this.isFinalizedPtr.deref()) {
      throw new PvStateError(
        "'getInference' was called but Rhino has not yet reached a conclusion. Use the results of calling process to determine if Rhino has concluded"
      );
    }

    let isUnderstoodPtr = ref.alloc(ref.types.bool);
    let isUnderstoodStatus = this.libRhn.pv_rhino_is_understood(
      this.rhnPtr,
      isUnderstoodPtr
    );

    if (isUnderstoodStatus !== PV_STATUS_T.SUCCESS) {
      pvStatusToException(
        isUnderstoodStatus,
        "Rhino failed to check if intent was understood"
      );
    }

    let isUnderstood = isUnderstoodPtr.deref();
    let inference = { isUnderstood: isUnderstood };

    if (isUnderstood) {
      let numSlotsPtr = ref.alloc(ref.types.int32);
      let intentPtr = ref.alloc(ref.types.CString);
      let slotsPtr = ref.alloc(cStringArrayPtr);
      let valuesPtr = ref.alloc(cStringArrayPtr);

      let getIntentStatus = this.libRhn.pv_rhino_get_intent(
        this.rhnPtr,
        intentPtr,
        numSlotsPtr,
        slotsPtr,
        valuesPtr
      );

      if (getIntentStatus !== PV_STATUS_T.SUCCESS) {
        pvStatusToException(getIntentStatus, "Rhino failed to get intent");
      }

      inference["intent"] = intentPtr.deref();
      inference["slots"] = {};

      let numSlots = numSlotsPtr.deref();

      if (numSlots > 0) {
        let slotData = slotsPtr.deref();
        let valueData = valuesPtr.deref();

        // We need to use the number of slots returned to tell the ref ArrayType
        // how many array entries are present in slots/values before we can
        // iterate over the array
        slotData.length = numSlots;
        valueData.length = numSlots;

        let slots = {};

        for (let i = 0; i < numSlots; i++) {
          slots[slotData[i]] = valueData[i];
        }

        inference["slots"] = slots;
      }

      let freeSlotsAndValuesStatus = this.libRhn.pv_rhino_free_slots_and_values(
        this.rhnPtr,
        slotsPtr.deref(),
        valuesPtr.deref()
      );

      if (freeSlotsAndValuesStatus !== PV_STATUS_T.SUCCESS) {
        pvStatusToException(
          freeSlotsAndValuesStatus,
          "Rhino failed to free intent resources"
        );
      }
    }

    let resetStatus = this.libRhn.pv_rhino_reset(this.rhnPtr);
    if (resetStatus !== PV_STATUS_T.SUCCESS) {
      pvStatusToException(resetStatus, "Rhino failed to reset");
    }

    return inference;
  }

  /**
   * Gets the source of the Rhino context in YAML format. Shows the list of intents,
   * which expressions map to those intents, as well as slots and their possible values.
   *
   * @returns {string} the context YAML
   */
  getContextInfo() {
    let contextInfoPtr = ref.alloc(ref.types.CString);

    let contextInfoStatus = this.libRhn.pv_rhino_context_info(
      this.rhnPtr,
      contextInfoPtr
    );

    if (contextInfoStatus !== PV_STATUS_T.SUCCESS) {
      pvStatusToException(resetStatus, "Rhino failed to get the context info");
    }

    return contextInfoPtr.deref();
  }

  /**
   * Releases the resources acquired by Rhino.
   *
   * Be sure to call this when finished with the instance
   * to reclaim the memory that was allocated by the C library.
   */
  release() {
    if (this.rhnPtr !== null) {
      this.libRhn.pv_rhino_delete(this.rhnPtr);
      this.rhnPtr = null;
      this.rhnPtrPtr = null;
    } else {
      console.warn("Rhino is not initialized; nothing to destroy");
    }
  }
}

module.exports = Rhino;
