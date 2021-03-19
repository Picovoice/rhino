/*
    Copyright 2018-2021 Picovoice Inc.

    You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
    file accompanying this source.

    Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
    an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
    specific language governing permissions and limitations under the License.
*/

// @ts-ignore
import RhinoEmscriptenModule from './lang/pv_rhino_b64';
import { RhinoContext, RhinoEngine, RhinoInference } from './rhino_types';

const DEFAULT_SENSITIVITY = 0.5;

type EmptyPromise = (value: void) => void;

/**
 * JavaScript/WebAssembly Binding for the Picovoice Rhino Speech-to-Intent engine.
 *
 * It initializes the WebAssembly module and exposes an async factory method `create` for creating
 * new instances of the engine.
 *
 * The instances have JavaScript bindings that wrap the calls to the C library and
 * do some rudimentary type checking and parameter validation.
 */
class Rhino implements RhinoEngine {
  public static _frameLength = null;
  public static _initWasm = null;
  public static _processWasm = null;
  public static _releaseWasm = null;
  public static _sampleRate = null;
  public static _version = null;
  public static _rhinoModule = null;
  public static _contextInfoWasm = null;
  public static _getIntentWasm = null;
  public static _getNumSlotsWasm = null;
  public static _getSlotValueWasm = null;
  public static _getSlotWasm = null;
  public static _isUnderstoodWasm = null;
  public static _resetWasm = null;
  public static _emscriptenPromise: Promise<any> = RhinoEmscriptenModule({});
  public static _wasmReadyResolve: EmptyPromise;
  public static _wasmReadyReject: EmptyPromise;
  private static _wasmPromise: Promise<void> = new Promise(
    (resolve, reject) => {
      Rhino._wasmReadyResolve = resolve;
      Rhino._wasmReadyReject = reject;
    }
  );

  private _handleWasm: number;
  private _pcmWasmPointer: number;

  private constructor(handleWasm: number, pcmWasmPointer: number) {
    this._handleWasm = handleWasm;
    this._pcmWasmPointer = pcmWasmPointer;
  }

  /**
   * Releases the resources acquired by the WebAssembly module.
   */
  public release(): void {
    Rhino._releaseWasm(this._handleWasm);
    Rhino._rhinoModule._free(this._pcmWasmPointer);
  }

  /**
   * Processes a frame of audio.
   *
   * @param pcm A frame of audio. The required sample rate can be retrieved from `.sampleRate` and the length
   * of frame (number of audio samples per frame) can be retrieved from `.frameLength`. The audio needs to be
   * 16-bit linearly-encoded. Furthermore, the engine operates on single-channel audio.
   * @returns the Rhino inference (`isFinalized` will always be present: when it's true the entire object will be populated)
   */
  process(pcm: Int16Array): RhinoInference {
    if (!(pcm instanceof Int16Array)) {
      throw new Error("The argument 'pcm' must be provided as an Int16Array");
    }

    const pcmWasmBuffer = new Uint8Array(
      Rhino._rhinoModule.HEAPU8.buffer,
      this._pcmWasmPointer,
      pcm.byteLength
    );
    pcmWasmBuffer.set(new Uint8Array(pcm.buffer));

    const isFinalized = Rhino._processWasm(
      this._handleWasm,
      this._pcmWasmPointer
    );
    if (isFinalized === 1) {
      const isUnderstood = Rhino._isUnderstoodWasm(this._handleWasm);
      if (isUnderstood === -1) {
        throw new Error('Rhino failed to process the command');
      }

      let intent = null;
      const slots = {};
      if (isUnderstood === 1) {
        intent = Rhino._getIntentWasm(this._handleWasm);

        const numSlots = Rhino._getNumSlotsWasm(this._handleWasm);
        if (numSlots === -1) {
          throw new Error('Rhino failed to get the number of slots');
        }

        for (let i = 0; i < numSlots; i++) {
          const slot = Rhino._getSlotWasm(this._handleWasm, i);
          if (!slot) {
            throw new Error('Rhino failed to get the slot');
          }
          const value = Rhino._getSlotValueWasm(this._handleWasm, i);
          if (!value) {
            throw new Error('Rhino failed to get the slot value');
          }
          slots[slot] = value;
        }
      }

      Rhino._resetWasm(this._handleWasm);

      return {
        isFinalized: true,
        isUnderstood: isUnderstood === 1,
        intent: intent,
        slots: slots,
      };
    } else if (isFinalized === 0) {
      return {
        isFinalized: false,
      };
    } else {
      throw new Error('Rhino failed to process audio');
    }
  }

  get version(): string {
    return Rhino._version;
  }

  get sampleRate(): number {
    return Rhino._sampleRate;
  }

  get frameLength(): number {
    return Rhino._frameLength;
  }

  get contextInfo(): string {
    return Rhino._contextInfoWasm(this._handleWasm);
  }

  /**
   * Creates an instance of the Rhino engine.
   * Behind the scenes, it requires the WebAssembly code to load and initialize before
   * it can create an instance.
   *
   * @param rhinoContext The trained model representing a domain-specific set of natural langauge commands
   * @param rhinoContext.base64 Base64 representation of context (`.rhn` file)
   * @param rhinoContext.sensitivity Sensitivity in [0,1]
   *
   * @returns An instance of the Rhino engine.
   */
  public static async create(rhinoContext: RhinoContext): Promise<Rhino> {
    // WASM initialization is asynchronous; wait until Emscripten is done loading,
    // then we will be able to create an instance of Rhino.
    await Rhino._wasmPromise;

    const context = Uint8Array.from(atob(rhinoContext.base64), c =>
      c.charCodeAt(0)
    );

    const { sensitivity = DEFAULT_SENSITIVITY } = rhinoContext

    if (!(typeof sensitivity !== "number")) {
      throw new Error("Invalid Rhino sensitivity type: Must be a number (in the range [0,1])")
    } else {
      if (sensitivity < 0 || sensitivity > 1) {
        throw new Error("Invalid Rhino sensitivity value: Must be in the range [0,1]")
      }
    }

    const contextSize = context.byteLength;

    const heapPointer = Rhino._rhinoModule._malloc(contextSize);
    const heapBuffer = new Uint8Array(
      Rhino._rhinoModule.HEAPU8.buffer,
      heapPointer,
      contextSize
    );
    heapBuffer.set(context);

    const handleWasm = Rhino._initWasm(heapPointer, contextSize, sensitivity);
    if (handleWasm === 0) {
      throw new Error('Failed to initialize rhino');
    }

    const pcmWasmPointer = Rhino._rhinoModule._malloc(Rhino._frameLength * 2);

    return new Rhino(handleWasm, pcmWasmPointer);
  }
}

// Emscripten has fully loaded and initialized its WebAssembly module
Rhino._emscriptenPromise.then(function (Module: any): void {
  Rhino._initWasm = Module.cwrap('pv_rhino_wasm_init', 'number', [
    'number',
    'number',
    'number',
  ]);
  Rhino._releaseWasm = Module.cwrap('pv_rhino_wasm_delete', ['number']);
  Rhino._processWasm = Module.cwrap('pv_rhino_wasm_process', 'number', [
    'number',
    'number',
  ]);
  Rhino._isUnderstoodWasm = Module.cwrap(
    'pv_rhino_wasm_is_understood',
    'number',
    ['number']
  );
  Rhino._getIntentWasm = Module.cwrap('pv_rhino_wasm_get_intent', 'string', [
    'number',
  ]);
  Rhino._getNumSlotsWasm = Module.cwrap(
    'pv_rhino_wasm_get_num_slots',
    'number',
    ['number']
  );
  Rhino._getSlotWasm = Module.cwrap('pv_rhino_wasm_get_slot', 'string', [
    'number',
    'number',
  ]);
  Rhino._getSlotValueWasm = Module.cwrap(
    'pv_rhino_wasm_get_slot_value',
    'string',
    ['number', 'number']
  );
  Rhino._resetWasm = Module.cwrap('pv_rhino_wasm_reset', 'bool', ['number']);
  Rhino._contextInfoWasm = Module.cwrap(
    'pv_rhino_wasm_context_info',
    'string',
    ['number']
  );
  Rhino._frameLength = Module.cwrap(
    'pv_rhino_wasm_frame_length',
    'number',
    []
  )();
  Rhino._version = Module.cwrap('pv_rhino_wasm_version', 'string', [])();
  Rhino._sampleRate = Module.cwrap('pv_wasm_sample_rate', 'number', [])();
  Rhino._rhinoModule = Module;

  // Rhino is ready to create instances!
  Rhino._wasmReadyResolve();
});

export default Rhino;
