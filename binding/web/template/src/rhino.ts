/*
  Copyright 2018-2022 Picovoice Inc.

  You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
  file accompanying this source.

  Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
  an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
  specific language governing permissions and limitations under the License.
*/

/* eslint camelcase: 0 */

// @ts-ignore
import { Mutex } from 'async-mutex';

import { RhinoInference, RhinoContext, RhinoEngine } from '@picovoice/rhino-web-core';

import { 
  aligned_alloc_type, 
  buildWasm,
  arrayBufferToStringAtIndex,
  base64ToUint8Array,
  isAccessKeyValid
} from '@picovoice/web-utils';

// @ts-ignore
import { RHINO_WASM_BASE64 } from './lang/rhino_b64';

const DEFAULT_SENSITIVITY = 0.5;
const PV_STATUS_SUCCESS = 10000;

/**
 * WebAssembly function types
 */

type pv_rhino_context_info_type = (object: number, contextInfo: number) => Promise<number>;
type pv_rhino_delete_type = (object: number) => Promise<void>;
type pv_rhino_frame_length_type = () => Promise<number>;
type pv_rhino_free_slots_and_values_type = (object: number, slots: number, values: number) => Promise<number>;
type pv_rhino_get_intent_type = (object: number, intent: number, numSlots: number, slots: number, values: number) => Promise<number>;
type pv_rhino_init_type = (
  accessKey: number,
  context: number,
  contextSize: number,
  sensitivity: number,
  requireEndpoint: boolean,
  object: number
) => Promise<number>;
type pv_rhino_is_understood_type = (object: number, isUnderstood: number) => Promise<number>;
type pv_rhino_process_type = (object: number, pcm: number, isFinalized: number) => Promise<number>;
type pv_rhino_reset_type = (object: number) => Promise<number>;
type pv_rhino_version_type = () => Promise<number>;
type pv_status_to_string_type = (status: number) => Promise<number>
type pv_sample_rate_type = () => Promise<number>;

/**
 * JavaScript/WebAssembly Binding for the Picovoice Rhino Speech-to-Intent engine.
 *
 * It initializes the WebAssembly module and exposes an async factory method `create` for creating
 * new instances of the engine.
 *
 * The instances have JavaScript bindings that wrap the calls to the C library and
 * do some rudimentary type checking and parameter validation.
 */

type RhinoWasmOutput = {
  memory: WebAssembly.Memory;
  frameLength: number;
  sampleRate: number;
  version: string;
  contextInfo: string;

  objectAddress: number;
  inputBufferAddress: number;
  isFinalizedAddress: number;
  isUnderstoodAddress: number;
  intentAddressAddress: number;
  numSlotsAddress: number;
  slotsAddressAddressAddress: number;
  valuesAddressAddressAddress: number;

  pvRhinoDelete: pv_rhino_delete_type;
  pvRhinoFreeSlotsAndValues: pv_rhino_free_slots_and_values_type;
  pvRhinoGetIntent: pv_rhino_get_intent_type;
  pvRhinoIsUnderstood: pv_rhino_is_understood_type;
  pvRhinoProcess: pv_rhino_process_type;
  pvRhinoReset: pv_rhino_reset_type;
  pvStatusToString: pv_status_to_string_type;
};

export class Rhino implements RhinoEngine {
  private _pvRhinoDelete: pv_rhino_delete_type;
  private _pvRhinoFreeSlotsAndValues: pv_rhino_free_slots_and_values_type;
  private _pvRhinoGetIntent: pv_rhino_get_intent_type;
  private _pvRhinoIsUnderstood: pv_rhino_is_understood_type;
  private _pvRhinoProcess: pv_rhino_process_type;
  private _pvRhinoReset: pv_rhino_reset_type;
  private _pvStatusToString: pv_status_to_string_type;

  private _wasmMemory: WebAssembly.Memory;
  private _memoryBuffer: Int16Array;
  private _memoryBufferUint8: Uint8Array;
  private _memoryBufferView: DataView;
  private _processMutex: Mutex;

  private _objectAddress: number;
  private _inputBufferAddress: number;
  private _isFinalizedAddress: number;
  private _isUnderstoodAddress: number;
  private _intentAddressAddress: number;
  private _numSlotsAddress: number;
  private _slotsAddressAddressAddress: number;
  private _valuesAddressAddressAddress: number;

  private static _frameLength: number;
  private static _sampleRate: number;
  private static _version: string;
  private static _contextInfo: string;

  private static _rhinoMutex = new Mutex;

  private constructor(handleWasm: RhinoWasmOutput) {
    Rhino._frameLength = handleWasm.frameLength;
    Rhino._sampleRate = handleWasm.sampleRate;
    Rhino._version = handleWasm.version;
    Rhino._contextInfo = handleWasm.contextInfo;

    this._pvRhinoDelete = handleWasm.pvRhinoDelete;
    this._pvRhinoFreeSlotsAndValues = handleWasm.pvRhinoFreeSlotsAndValues;
    this._pvRhinoGetIntent = handleWasm.pvRhinoGetIntent;
    this._pvRhinoIsUnderstood = handleWasm.pvRhinoIsUnderstood;
    this._pvRhinoProcess = handleWasm.pvRhinoProcess;
    this._pvRhinoReset = handleWasm.pvRhinoReset;
    this._pvStatusToString = handleWasm.pvStatusToString;

    this._wasmMemory = handleWasm.memory;
    this._memoryBuffer = new Int16Array(handleWasm.memory.buffer);
    this._memoryBufferUint8 = new Uint8Array(handleWasm.memory.buffer);
    this._memoryBufferView = new DataView(handleWasm.memory.buffer);

    this._objectAddress = handleWasm.objectAddress;
    this._inputBufferAddress = handleWasm.inputBufferAddress;
    this._isFinalizedAddress = handleWasm.isFinalizedAddress;
    this._isUnderstoodAddress = handleWasm.isUnderstoodAddress;
    this._intentAddressAddress = handleWasm.intentAddressAddress;
    this._numSlotsAddress = handleWasm.numSlotsAddress;
    this._slotsAddressAddressAddress = handleWasm.slotsAddressAddressAddress;
    this._valuesAddressAddressAddress = handleWasm.valuesAddressAddressAddress;

    this._processMutex = new Mutex();
  }

  /**
   * Releases resources acquired by WebAssembly module.
   */
  public async release(): Promise<void> {
    await this._pvRhinoDelete(this._objectAddress);
  }

  /**
   * Processes a frame of audio.
   *
   * @param pcm A frame of audio. The required sample rate can be retrieved from `.sampleRate` and the length
   * of frame (number of audio samples per frame) can be retrieved from `.frameLength`. The audio needs to be
   * 16-bit linearly-encoded. Furthermore, the engine operates on single-channel audio.
   * @returns the Rhino inference (`isFinalized` will always be present: when it's true the entire object will be populated)
   */
  public async process(pcm: Int16Array): Promise<RhinoInference> {
    if (!(pcm instanceof Int16Array)) {
      throw new Error("The argument 'pcm' must be provided as an Int16Array");
    }
    const returnPromise = new Promise<RhinoInference>((resolve, reject) => {
      this._processMutex.runExclusive(async () => {
        this._memoryBuffer.set(
          pcm,
          this._inputBufferAddress / Int16Array.BYTES_PER_ELEMENT
        );

        let status = await this._pvRhinoProcess(
          this._objectAddress,
          this._inputBufferAddress,
          this._isFinalizedAddress
        );
        if (status !== PV_STATUS_SUCCESS) {
          throw new Error(
            `'pv_rhino_process' failed with status ${arrayBufferToStringAtIndex(
              this._memoryBufferUint8,
              await this._pvStatusToString(status)
            )}`
          );
        }

        const isFinalized = this._memoryBufferView.getUint8(
          this._isFinalizedAddress
        );

        if (isFinalized === 1) {
          status = await this._pvRhinoIsUnderstood(
            this._objectAddress,
            this._isUnderstoodAddress
          );
          if (status !== PV_STATUS_SUCCESS) {
            throw new Error(
              `'pv_rhino_is_understood' failed with status ${arrayBufferToStringAtIndex(
                this._memoryBufferUint8,
                await this._pvStatusToString(status)
              )}`
            );
          }

          const isUnderstood = this._memoryBufferView.getUint8(
            this._isUnderstoodAddress
          );

          if (isUnderstood === -1) {
            throw new Error('Rhino failed to process the command');
          }

          let intent = null;
          const slots = {};
          if (isUnderstood === 1) {
            status = await this._pvRhinoGetIntent(
              this._objectAddress,
              this._intentAddressAddress,
              this._numSlotsAddress,
              this._slotsAddressAddressAddress,
              this._valuesAddressAddressAddress,
            );
            if (status !== PV_STATUS_SUCCESS) {
              throw new Error(
                `'pv_rhino_get_intent' failed with status ${arrayBufferToStringAtIndex(
                  this._memoryBufferUint8,
                  await this._pvStatusToString(status)
                )}`
              );
            }

            const intentAddress = this._memoryBufferView.getInt32(
              this._intentAddressAddress,
              true
            )
            intent = arrayBufferToStringAtIndex(
              this._memoryBufferUint8,
              intentAddress
            );

            const numSlots = this._memoryBufferView.getInt32(
              this._numSlotsAddress,
              true
            );
            if (numSlots === -1) {
              throw new Error('Rhino failed to get the number of slots');
            }

            for (let i = 0; i < numSlots; i++) {
              const slot = await this._getSlot(i);
              if (!slot) {
                throw new Error('Rhino failed to get the slot');
              }
              const value = await this._getSlotValue(i);
              if (!value) {
                throw new Error('Rhino failed to get the slot value');
              }
              slots[slot] = value;
            }

            const slotsAddressAddress = this._memoryBufferView.getInt32(
              this._slotsAddressAddressAddress,
              true
            );

            const valuesAddressAddress = this._memoryBufferView.getInt32(
              this._valuesAddressAddressAddress,
              true
            );

            status = await this._pvRhinoFreeSlotsAndValues(
              this._objectAddress,
              slotsAddressAddress,
              valuesAddressAddress,
            );
            if (status !== PV_STATUS_SUCCESS) {
              throw new Error(
                `'pv_rhino_free_slots_values' failed with status ${arrayBufferToStringAtIndex(
                  this._memoryBufferUint8,
                  await this._pvStatusToString(status)
                )}`
              );
            }
          }

          status = await this._pvRhinoReset(this._objectAddress);
          if (status !== PV_STATUS_SUCCESS) {
            throw new Error(
              `'pv_rhino_process' failed with status ${arrayBufferToStringAtIndex(
                this._memoryBufferUint8,
                await this._pvStatusToString(status)
              )}`
            );
          }

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
      }).then((result: RhinoInference) => {
        resolve(result);
      }).catch((error: any) => {
        reject(error);
      });
    });
    return returnPromise;
  }

  private _getSlot(index: number): string {
    const slotsAddressAddress = this._memoryBufferView.getInt32(
      this._slotsAddressAddressAddress,
      true
    );

    const slotAddress = this._memoryBufferView.getInt32(
      slotsAddressAddress + (index * Int32Array.BYTES_PER_ELEMENT),
      true
    )

    const slot = arrayBufferToStringAtIndex(
      this._memoryBufferUint8,
      slotAddress
    );
    return slot;
  }

  private _getSlotValue(index: number): string {
    const valuesAddressAddress = this._memoryBufferView.getInt32(
      this._valuesAddressAddressAddress,
      true
    );

    const valueAddress = this._memoryBufferView.getInt32(
      valuesAddressAddress + (index * Int32Array.BYTES_PER_ELEMENT),
      true
    )

    const slotValue = arrayBufferToStringAtIndex(
      this._memoryBufferUint8,
      valueAddress
    );
    return slotValue;
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
    return Rhino._contextInfo;
  }

  /**
   * Creates an instance of the Rhino speech-to-intent engine.
   * Behind the scenes, it requires the WebAssembly code to load and initialize before
   * it can create an instance.
   *
   * @param accessKey - AccessKey obtained from Picovoice Console (https://picovoice.ai/console/).
   * @param contextInfo - Base64 representation of the context and it's sensitivity.
   * @param requireEndpoint - Boolean. If set to `true`, Rhino requires an endpoint (chunk of silence) before finishing inference.
   *
   * @returns An instance of the Rhino engine.
   */
  public static async create(
    accessKey: string,
    contextInfo: RhinoContext,
    requireEndpoint?: boolean,
  ): Promise<Rhino> {
    if (!isAccessKeyValid(accessKey)) {
      throw new Error('Invalid AccessKey');
    }

    const {base64, sensitivity} = contextInfo;

    if (sensitivity && !(typeof sensitivity === 'number')) {
      throw new Error('Rhino sensitivity is not a number (in the range [0,1])');
    } else if (sensitivity && (sensitivity < 0 || sensitivity > 1)) {
        throw new Error('Rhino sensitivity is outside of range [0,1]');
    }

    const returnPromise = new Promise<Rhino>((resolve, reject) => {
      Rhino._rhinoMutex.runExclusive(async () => {
        const wasmOutput = await Rhino.initWasm(
          accessKey,
          base64,
          sensitivity ?? 0.5,
          requireEndpoint ?? true
        );
        return new Rhino(wasmOutput);
      }).then((result: Rhino) => {
        resolve(result);
      }).catch((error: any) => {
        reject(error);
      });
    });
    return returnPromise;
  }

  private static async initWasm(
    accessKey: string,
    context: string,
    sensitivity: number,
    requireEndpoint: boolean): Promise<any> {
    const memory = new WebAssembly.Memory({ initial: 10, maximum: 300 });

    const memoryBufferUint8 = new Uint8Array(memory.buffer);

    const exports = await buildWasm(memory, RHINO_WASM_BASE64);

    const aligned_alloc = exports.aligned_alloc as aligned_alloc_type;
    const pv_rhino_context_info = exports.pv_rhino_context_info as pv_rhino_context_info_type;
    const pv_rhino_delete = exports.pv_rhino_delete as pv_rhino_delete_type;
    const pv_rhino_frame_length = exports.pv_rhino_frame_length as pv_rhino_frame_length_type;
    const pv_rhino_free_slots_and_values = exports.pv_rhino_free_slots_and_values as pv_rhino_free_slots_and_values_type;
    const pv_rhino_get_intent = exports.pv_rhino_get_intent as pv_rhino_get_intent_type;
    const pv_rhino_init = exports.pv_rhino_init as pv_rhino_init_type;
    const pv_rhino_is_understood = exports.pv_rhino_is_understood as pv_rhino_is_understood_type;
    const pv_rhino_process = exports.pv_rhino_process as pv_rhino_process_type;
    const pv_rhino_reset = exports.pv_rhino_reset as pv_rhino_reset_type;
    const pv_rhino_version = exports.pv_rhino_version as pv_rhino_version_type;
    const pv_sample_rate = exports.pv_sample_rate as pv_sample_rate_type;
    const pv_status_to_string = exports.pv_status_to_string as pv_status_to_string_type;

    const objectAddressAddress = await aligned_alloc(
      Int32Array.BYTES_PER_ELEMENT,
      Int32Array.BYTES_PER_ELEMENT
    );
    if (objectAddressAddress === 0) {
      throw new Error('malloc failed: Cannot allocate memory');
    }

    const accessKeyAddress = await aligned_alloc(
      Uint8Array.BYTES_PER_ELEMENT,
      (accessKey.length + 1) * Uint8Array.BYTES_PER_ELEMENT
    );
    if (accessKeyAddress === 0) {
      throw new Error('malloc failed: Cannot allocate memory');
    }
    for (let i = 0; i < accessKey.length; i++) {
      memoryBufferUint8[accessKeyAddress + i] = accessKey.charCodeAt(i);
    }
    memoryBufferUint8[accessKeyAddress + accessKey.length] = 0;

    const contextAddress = await aligned_alloc(
      Uint8Array.BYTES_PER_ELEMENT,
      (context.length) * Uint8Array.BYTES_PER_ELEMENT
    )
    if (contextAddress === 0) {
      throw new Error('malloc failed: Cannot allocate memory');
    }
    memoryBufferUint8.set(
      base64ToUint8Array(context),
      contextAddress / Uint8Array.BYTES_PER_ELEMENT
    );

    let status = await pv_rhino_init(
      accessKeyAddress,
      contextAddress,
      context.length,
      sensitivity,
      requireEndpoint,
      objectAddressAddress);
    if (status !== PV_STATUS_SUCCESS) {
      throw new Error(
        `'pv_rhino_init' failed with status ${arrayBufferToStringAtIndex(
          memoryBufferUint8,
          await pv_status_to_string(status)
        )}`
      );
    }
    const memoryBufferView = new DataView(memory.buffer);
    const objectAddress = memoryBufferView.getInt32(
      objectAddressAddress,
      true
    );

    const sampleRate = await pv_sample_rate();
    const frameLength = await pv_rhino_frame_length();
    const versionAddress = await pv_rhino_version();
    const version = arrayBufferToStringAtIndex(
      memoryBufferUint8,
      versionAddress
    );

    const contextInfoAddressAddress = await aligned_alloc(
      Uint8Array.BYTES_PER_ELEMENT,
      Uint8Array.BYTES_PER_ELEMENT
    )
    if (contextAddress === 0) {
      throw new Error('malloc failed: Cannot allocate memory');
    }
    status = await pv_rhino_context_info(
      objectAddress,
      contextInfoAddressAddress
    );
    if (status !== PV_STATUS_SUCCESS) {
      throw new Error(
        `'pv_rhino_context_info' failed with status ${arrayBufferToStringAtIndex(
          memoryBufferUint8,
          await pv_status_to_string(status)
        )}`
      );
    }
    const contextInfoAddress = memoryBufferView.getInt32(
      contextInfoAddressAddress,
      true
    );
    const contextInfo = arrayBufferToStringAtIndex(
      memoryBufferUint8,
      contextInfoAddress
    );

    const inputBufferAddress = await aligned_alloc(
      Int16Array.BYTES_PER_ELEMENT,
      frameLength * Int16Array.BYTES_PER_ELEMENT
    );
    if (inputBufferAddress === 0) {
      throw new Error('malloc failed: Cannot allocate memory');
    }

    const isFinalizedAddress = await aligned_alloc(
      Uint8Array.BYTES_PER_ELEMENT,
      Uint8Array.BYTES_PER_ELEMENT,
    )
    if (isFinalizedAddress === 0) {
      throw new Error('malloc failed: Cannot allocate memory');
    }

    const isUnderstoodAddress = await aligned_alloc(
      Uint8Array.BYTES_PER_ELEMENT,
      Uint8Array.BYTES_PER_ELEMENT,
    )
    if (isUnderstoodAddress === 0) {
      throw new Error('malloc failed: Cannot allocate memory');
    }

    const intentAddressAddress = await aligned_alloc(
      Uint8Array.BYTES_PER_ELEMENT,
      Uint8Array.BYTES_PER_ELEMENT,
    )
    if (intentAddressAddress === 0) {
      throw new Error('malloc failed: Cannot allocate memory');
    }

    const numSlotsAddress = await aligned_alloc(
      Uint8Array.BYTES_PER_ELEMENT,
      Uint8Array.BYTES_PER_ELEMENT,
    )
    if (numSlotsAddress === 0) {
      throw new Error('malloc failed: Cannot allocate memory');
    }

    const slotsAddressAddressAddress = await aligned_alloc(
      Uint8Array.BYTES_PER_ELEMENT,
      Uint8Array.BYTES_PER_ELEMENT,
    )
    if (slotsAddressAddressAddress === 0) {
      throw new Error('malloc failed: Cannot allocate memory');
    }

    const valuesAddressAddressAddress = await aligned_alloc(
      Uint8Array.BYTES_PER_ELEMENT,
      Uint8Array.BYTES_PER_ELEMENT,
    )
    if (valuesAddressAddressAddress === 0) {
      throw new Error('malloc failed: Cannot allocate memory');
    }

    return {
      memory: memory,
      frameLength: frameLength,
      sampleRate: sampleRate,
      version: version,
      contextInfo: contextInfo,

      objectAddress: objectAddress,
      inputBufferAddress: inputBufferAddress,
      isFinalizedAddress: isFinalizedAddress,
      isUnderstoodAddress: isUnderstoodAddress,
      intentAddressAddress: intentAddressAddress,
      numSlotsAddress: numSlotsAddress,
      slotsAddressAddressAddress: slotsAddressAddressAddress,
      valuesAddressAddressAddress: valuesAddressAddressAddress,

      pvRhinoDelete: pv_rhino_delete,
      pvRhinoFreeSlotsAndValues: pv_rhino_free_slots_and_values,
      pvRhinoGetIntent: pv_rhino_get_intent,
      pvRhinoIsUnderstood: pv_rhino_is_understood,
      pvRhinoProcess: pv_rhino_process,
      pvRhinoReset: pv_rhino_reset,
      pvStatusToString: pv_status_to_string,
    };
  }
}

export default Rhino;
