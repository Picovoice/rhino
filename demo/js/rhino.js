let Rhino = (function () {
    let initWasm = null;
    let releaseWasm = null;
    let processWasm = null;
    let isUnderstoodWasm = null;
    let getIntentWasm = null;
    let getNumSlotsWasm = null;
    let getSlotWasm = null;
    let getSlotValueWasm = null;
    let resetWasm = null;
    let contextInfoWasm = null;
    let frameLength = null;
    let version = null;
    let sampleRate = null;

    let rhinoModule = RhinoModule();
    rhinoModule.then(function (Module) {
        initWasm = Module.cwrap('pv_rhino_wasm_init', 'number', ['number', 'number']);
        releaseWasm = Module.cwrap('pv_rhino_wasm_delete', ['number']);
        processWasm = Module.cwrap('pv_rhino_wasm_process', 'number', ['number', 'number']);
        isUnderstoodWasm = Module.cwrap('pv_rhino_wasm_is_understood', 'number', ['number']);
        getIntentWasm = Module.cwrap('pv_rhino_wasm_get_intent', 'string', ['number']);
        getNumSlotsWasm = Module.cwrap('pv_rhino_wasm_get_num_slots', 'number', ['number']);
        getSlotWasm = Module.cwrap('pv_rhino_wasm_slot', 'string', ['number', 'number']);
        getSlotValueWasm = Module.cwrap('pv_rhino_wasm_get_slot_value', 'string', ['number', 'number']);
        resetWasm = Module.cwrap('pv_rhino_wasm_reset', 'bool', ['number']);
        contextInfoWasm = Module.cwrap('pv_rhino_wasm_context_info', 'string', ['number']);
        frameLength = Module.cwrap('pv_rhino_wasm_frame_length', 'number', [])();
        version = Module.cwrap('pv_rhino_wasm_version', 'string', [])();
        sampleRate = Module.cwrap('pv_wasm_sample_rate', 'number', [])();
    });

    let isLoaded = function () {
        return initWasm != null;
    };

    let create = function (context) {
        let contextSize = context.byteLength;

        let heapPointer = rhinoModule._malloc(contextSize);
        let heapBuffer = new Uint8Array(rhinoModule.HEAPU8.buffer, heapPointer, contextSize);
        heapBuffer.set(context);

        let handleWasm = initWasm(heapPointer, contextSize);
        if (handleWasm === 0) {
            throw new Error("failed to initialize rhino");
        }

        let pcmWasmPointer = rhinoModule._malloc(this.frameLength * 2);

        let release = function () {
            releaseWasm(handleWasm);
            rhinoModule._free(pcmWasmPointer);
        };

        let process = function (pcmInt16Array) {
            let pcmWasmBuffer = new Uint8Array(rhinoModule.HEAPU8.buffer, pcmWasmPointer, pcmInt16Array.byteLength);
            pcmWasmBuffer.set(new Uint8Array(pcmInt16Array.buffer));

            let isFinalized = processWasm(handleWasm, pcmWasmPointer);
            console.log(isFinalized);
            if (isFinalized === 1) {
                let isUnderstood = isUnderstoodWasm(handleWasm);
                if (isUnderstood === -1) {
                    throw new Error("rhino failed to process the command");
                }

                let intent = {};
                if (isUnderstood === 1) {
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
                        intent[slot] = value;
                    }
                }

                return {isUnderstood: (isUnderstood === 1), intent: intent}
            } else if (isFinalized === 0) {
                return {}
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
        }
    };

    return {isLoaded: isLoaded, create: create}
})();
