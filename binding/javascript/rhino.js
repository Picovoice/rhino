/*
    Copyright 2018-2020 Picovoice Inc.
    You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
    file accompanying this source.
    Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
    an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
    specific language governing permissions and limitations under the License.
*/

let Rhino = (function () {
  /**
   * Binding for Speech-to-Intent object. It initializes the JavaScript binding for WebAssembly module and exposes
   * a factory method for creating new instances of speech-to-intent engine.
   *
   * When the WebAssembly module has finished loading, if a callback function was provided via the RhinoOptions object,
   * it will be invoked. Otherwise, use `.isLoaded()` to determine if Rhino is ready.
   */

  let callback = null;
  let contextInfoWasm = null;
  let frameLength = null;
  let getIntentWasm = null;
  let getNumSlotsWasm = null;
  let getSlotValueWasm = null;
  let getSlotWasm = null;
  let initWasm = null;
  let isUnderstoodWasm = null;
  let processWasm = null;
  let releaseWasm = null;
  let resetWasm = null;
  let sampleRate = null;
  let version = null;

  if (typeof RhinoOptions !== "undefined") {
    if (
      RhinoOptions !== null &&
      typeof RhinoOptions.callback !== "undefined"
    ) {
      callback = RhinoOptions.callback;
    }
  }

  let rhinoModule = RhinoModule();
  rhinoModule.then(function (Module) {
    initWasm = Module.cwrap("pv_rhino_wasm_init", "number", [
      "number",
      "number",
      "number",
    ]);
    releaseWasm = Module.cwrap("pv_rhino_wasm_delete", ["number"]);
    processWasm = Module.cwrap("pv_rhino_wasm_process", "number", [
      "number",
      "number",
    ]);
    isUnderstoodWasm = Module.cwrap("pv_rhino_wasm_is_understood", "number", [
      "number",
    ]);
    getIntentWasm = Module.cwrap("pv_rhino_wasm_get_intent", "string", [
      "number",
    ]);
    getNumSlotsWasm = Module.cwrap("pv_rhino_wasm_get_num_slots", "number", [
      "number",
    ]);
    getSlotWasm = Module.cwrap("pv_rhino_wasm_get_slot", "string", [
      "number",
      "number",
    ]);
    getSlotValueWasm = Module.cwrap("pv_rhino_wasm_get_slot_value", "string", [
      "number",
      "number",
    ]);
    resetWasm = Module.cwrap("pv_rhino_wasm_reset", "bool", ["number"]);
    contextInfoWasm = Module.cwrap("pv_rhino_wasm_context_info", "string", [
      "number",
    ]);
    frameLength = Module.cwrap("pv_rhino_wasm_frame_length", "number", [])();
    version = Module.cwrap("pv_rhino_wasm_version", "string", [])();
    sampleRate = Module.cwrap("pv_wasm_sample_rate", "number", [])();

    if (callback !== undefined && callback !== null) {
      callback();
    }
  });

  let isLoaded = function () {
    /**
     * Flag indicating if 'RhinoModule' is loaded. .create() can only be called after loading is finished.
     */

    return initWasm != null;
  };

  let create = function (context, sensitivity = 0.5) {
    /**
     * Creates an instance of speech-to-intent engine (aka rhino). Can be called only after .isLoaded()
     * returns true.
     * @param {Uint8Array} A context represents the set of expressions (spoken commands), intents, and intent
     * arguments (slots) within a domain of interest.
     * @returns An instance of speech-to-intent engine.
     */

    let contextSize = context.byteLength;

    let heapPointer = rhinoModule._malloc(contextSize);
    let heapBuffer = new Uint8Array(
      rhinoModule.HEAPU8.buffer,
      heapPointer,
      contextSize
    );
    heapBuffer.set(context);

    let handleWasm = initWasm(heapPointer, contextSize, sensitivity);
    if (handleWasm === 0) {
      throw new Error("failed to initialize rhino");
    }

    let pcmWasmPointer = rhinoModule._malloc(frameLength * 2);

    let release = function () {
      releaseWasm(handleWasm);
      rhinoModule._free(pcmWasmPointer);
    };

    let process = function (pcmInt16Array) {
      /**
       * Processes a frame of audio.
       * @param {Int16Array} A frame of audio.
       * @returns A dictionary containing inference information. If inference is not complete yet an empty
       * dictionary is returned. If inference is finalized the dictionary contains the key 'isUnderstood' indicating
       * if the spoken command is understood. If 'isUnderstood' is set to true there is will be a key 'intent'
       * describing the inferred intent and a key 'slots' containing a dictionary of inferred slots and their
       * corresponding values.
       */

      let pcmWasmBuffer = new Uint8Array(
        rhinoModule.HEAPU8.buffer,
        pcmWasmPointer,
        pcmInt16Array.byteLength
      );
      pcmWasmBuffer.set(new Uint8Array(pcmInt16Array.buffer));

      let isFinalized = processWasm(handleWasm, pcmWasmPointer);
      if (isFinalized === 1) {
        let isUnderstood = isUnderstoodWasm(handleWasm);
        if (isUnderstood === -1) {
          throw new Error("rhino failed to process the command");
        }

        let intent = null;
        let slots = {};
        if (isUnderstood === 1) {
          intent = getIntentWasm(handleWasm);

          let numSlots = getNumSlotsWasm(handleWasm);
          if (numSlots === -1) {
            throw new Error("rhino failed to get the number of slots");
          }

          for (let i = 0; i < numSlots; i++) {
            let slot = getSlotWasm(handleWasm, i);
            if (!slot) {
              throw new Error("rhino failed to get the slot");
            }
            let value = getSlotValueWasm(handleWasm, i);
            if (!value) {
              throw new Error("rhino failed to get the slot value");
            }
            slots[slot] = value;
          }
        }

        resetWasm(handleWasm);

        return {
          isUnderstood: isUnderstood === 1,
          intent: intent,
          slots: slots,
        };
      } else if (isFinalized === 0) {
        return {};
      } else {
        throw new Error("rhino failed to process audio");
      }
    };

    return {
      release: release,
      process: process,
      sampleRate: sampleRate,
      frameLength: frameLength,
      version: version,
      contextInfo: contextInfoWasm(handleWasm),
    };
  };

  return { isLoaded: isLoaded, create: create };
})();
