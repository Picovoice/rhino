/*
  Copyright 2022 Picovoice Inc.

  You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
  file accompanying this source.

  Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
  an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
  specific language governing permissions and limitations under the License.
*/

/* eslint camelcase: 0 */

import { Mutex } from 'async-mutex';

import {
  aligned_alloc_type,
  arrayBufferToStringAtIndex,
  buildWasm,
  fromBase64,
  fromPublicDirectory,
  isAccessKeyValid,
  pv_free_type,
} from '@picovoice/web-utils';

import { simd } from 'wasm-feature-detect';

import {
  RhinoContext,
  RhinoInference,
  RhinoInitConfig,
  RhinoOptions,
} from './types';

import { contextProcess } from './utils';

/**
 * WebAssembly function types
 */

type pv_rhino_init_type = (
  accessKey: number,
  modelPath: number,
  contextPath: number,
  sensitivity: number,
  endpointDurationSec: number,
  requireEndpoint: number,
  object: number
) => Promise<number>;
type pv_rhino_process_type = (
  object: number,
  pcm: number,
  isFinalized: number
) => Promise<number>;
type pv_rhino_context_info_type = (
  object: number,
  contextInfo: number
) => Promise<number>;
type pv_rhino_delete_type = (object: number) => Promise<void>;
type pv_rhino_frame_length_type = () => Promise<number>;
type pv_rhino_free_slots_and_values_type = (
  object: number,
  slots: number,
  values: number
) => Promise<number>;
type pv_rhino_get_intent_type = (
  object: number,
  intent: number,
  numSlots: number,
  slots: number,
  values: number
) => Promise<number>;
type pv_rhino_is_understood_type = (
  object: number,
  isUnderstood: number
) => Promise<number>;
type pv_rhino_reset_type = (object: number) => Promise<number>;
type pv_rhino_version_type = () => Promise<number>;
type pv_sample_rate_type = () => Promise<number>;
type pv_status_to_string_type = (status: number) => Promise<number>;

/**
 * JavaScript/WebAssembly Binding for the Picovoice Rhino speech-to-intent engine.
 *
 * The instances have JavaScript bindings that wrap the calls to the C library and
 * do some rudimentary type checking and parameter validation.
 */

type RhinoWasmOutput = {
  aligned_alloc: aligned_alloc_type;
  memory: WebAssembly.Memory;
  pvFree: pv_free_type;

  contextInfo: string;
  frameLength: number;
  sampleRate: number;
  version: string;

  contextAddress: number;
  inputBufferAddress: number;
  intentAddressAddress: number;
  isFinalizedAddress: number;
  isUnderstoodAddress: number;
  numSlotsAddress: number;
  objectAddress: number;
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

const PV_STATUS_SUCCESS = 10000;

export class Rhino {
  private readonly _pvRhinoDelete: pv_rhino_delete_type;
  private readonly _pvRhinoFreeSlotsAndValues: pv_rhino_free_slots_and_values_type;
  private readonly _pvRhinoGetIntent: pv_rhino_get_intent_type;
  private readonly _pvRhinoIsUnderstood: pv_rhino_is_understood_type;
  private readonly _pvRhinoProcess: pv_rhino_process_type;
  private readonly _pvRhinoReset: pv_rhino_reset_type;
  private readonly _pvStatusToString: pv_status_to_string_type;

  private _wasmMemory: WebAssembly.Memory | undefined;
  private readonly _pvFree: pv_free_type;
  private readonly _memoryBuffer: Int16Array;
  private readonly _memoryBufferUint8: Uint8Array;
  private readonly _memoryBufferView: DataView;
  private readonly _processMutex: Mutex;

  private readonly _contextAddress: number;
  private readonly _inputBufferAddress: number;
  private readonly _intentAddressAddress: number;
  private readonly _isFinalizedAddress: number;
  private readonly _isUnderstoodAddress: number;
  private readonly _numSlotsAddress: number;
  private readonly _objectAddress: number;
  private readonly _slotsAddressAddressAddress: number;
  private readonly _valuesAddressAddressAddress: number;

  private static _frameLength: number;
  private static _sampleRate: number;
  private static _contextInfo: string;
  private static _version: string;
  private static _wasm: string;
  private static _wasmSimd: string;

  private static _rhinoMutex = new Mutex();

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
    this._pvFree = handleWasm.pvFree;
    this._contextAddress = handleWasm.contextAddress;
    this._inputBufferAddress = handleWasm.inputBufferAddress;
    this._intentAddressAddress = handleWasm.intentAddressAddress;
    this._isFinalizedAddress = handleWasm.isFinalizedAddress;
    this._isUnderstoodAddress = handleWasm.isUnderstoodAddress;
    this._numSlotsAddress = handleWasm.numSlotsAddress;
    this._objectAddress = handleWasm.objectAddress;
    this._slotsAddressAddressAddress = handleWasm.slotsAddressAddressAddress;
    this._valuesAddressAddressAddress = handleWasm.valuesAddressAddressAddress;

    this._memoryBuffer = new Int16Array(handleWasm.memory.buffer);
    this._memoryBufferUint8 = new Uint8Array(handleWasm.memory.buffer);
    this._memoryBufferView = new DataView(handleWasm.memory.buffer);
    this._processMutex = new Mutex();
  }

  /**
   * Get Rhino engine version.
   */
  get version(): string {
    return Rhino._version;
  }

  /**
   * Get frame length.
   */
  get frameLength(): number {
    return Rhino._frameLength;
  }

  /**
   * Get sample rate.
   */
  get sampleRate(): number {
    return Rhino._sampleRate;
  }

  /**
   * Get context info.
   */
  get contextInfo(): string {
    return Rhino._contextInfo;
  }

  /**
   * Creates an instance of the Rhino speech-to-intent engine using a base64'd string
   * of the model file. The model size is large, hence it will try to use the
   * existing one if it exists, otherwise saves the model in storage.
   *
   * @param accessKey AccessKey generated by Picovoice Console.
   * @param keywords - Built-in or Base64
   * representations of keywords and their sensitivities.
   * Can be provided as an array or a single keyword.
   * @param modelBase64 The model in base64 string to initialize Porcupine.
   * @param options Optional configuration arguments.
   * @param options.customWritePath Custom path to save the model in storage.
   * Set to a different name to use multiple models across `porcupine` instances.
   * @param options.forceWrite Flag to overwrite the model in storage even if it exists.
   * @param options.version Porcupine model version. Set to a higher number to update the model file.
   * @returns An instance of the Porcupine engine.
   */
  public static async fromBase64(
    accessKey: string,
    context: RhinoContext,
    modelBase64: string,
    options: RhinoOptions = {}
  ): Promise<Rhino> {
    const {
      customWritePath = 'rhino_model',
      forceWrite = false,
      version = 1,
      ...rest
    } = options;
    await fromBase64(customWritePath, modelBase64, forceWrite, version);
    const contextPath = await contextProcess(context);
    return this.create(accessKey, contextPath, customWritePath, rest);
  }

  /**
   * Creates an instance of the Porcupine wake word engine using '.pv' file in
   * public directory. The model size is large, hence it will try to use the existing one if it exists,
   * otherwise saves the model in storage.
   *
   * @param accessKey AccessKey generated by Picovoice Console.
   * @param keywords - Built-in or Base64
   * representations of keywords and their sensitivities.
   * Can be provided as an array or a single keyword.
   * @param publicPath The model path relative to the public directory.
   * @param options Optional configuration arguments.
   * @param options.customWritePath Custom path to save the model in storage.
   * Set to a different name to use multiple models across `porcupine` instances.
   * @param options.forceWrite Flag to overwrite the model in storage even if it exists.
   * @param options.version Porcupine model version. Set to a higher number to update the model file.
   *
   * @returns An instance of the Porcupine engine.
   */
  public static async fromPublicDirectory(
    accessKey: string,
    context: RhinoContext,
    publicPath: string,
    options: RhinoOptions = {}
  ): Promise<Rhino> {
    const {
      customWritePath = 'rhino_model',
      forceWrite = false,
      version = 1,
      ...rest
    } = options;
    await fromPublicDirectory(customWritePath, publicPath, forceWrite, version);
    const contextPath = await contextProcess(context);
    return this.create(accessKey, contextPath, customWritePath, rest);
  }

  /**
   * Set base64 wasm file.
   * @param wasm Base64'd wasm file to use to initialize wasm.
   */
  public static setWasm(wasm: string): void {
    if (this._wasm === undefined) {
      this._wasm = wasm;
    }
  }

  /**
   * Set base64 wasm file with SIMD feature.
   * @param wasmSimd Base64'd wasm file to use to initialize wasm.
   */
  public static setWasmSimd(wasmSimd: string): void {
    if (this._wasmSimd === undefined) {
      this._wasmSimd = wasmSimd;
    }
  }

  /**
   * Creates an instance of the Rhino speech-to-intent engine.
   * Behind the scenes, it requires the WebAssembly code to load and initialize before
   * it can create an instance.
   *
   * @param accessKey AccessKey obtained from Picovoice Console (https://console.picovoice.ai/)
   * @param keywordPaths - The path to the keyword file saved in indexedDB.
   * @param sensitivities - Sensitivity of the keywords.
   * @param modelPath Path to the model saved in indexedDB.
   *
   * @returns An instance of the Porcupine engine.
   */
  public static async create(
    accessKey: string,
    contextPath: string,
    modelPath: string,
    initConfig: RhinoInitConfig
  ): Promise<Rhino> {
    if (!isAccessKeyValid(accessKey)) {
      throw new Error('Invalid AccessKey');
    }

    return new Promise<Rhino>((resolve, reject) => {
      Rhino._rhinoMutex
        .runExclusive(async () => {
          const isSimd = await simd();
          const wasmOutput = await Rhino.initWasm(
            accessKey.trim(),
            contextPath,
            isSimd ? this._wasmSimd : this._wasm,
            modelPath,
            initConfig
          );
          return new Rhino(wasmOutput);
        })
        .then((result: Rhino) => {
          resolve(result);
        })
        .catch((error: any) => {
          reject(error);
        });
    });
  }

  /**
   * Processes a frame of audio. The required sample rate can be retrieved from '.sampleRate' and the length
   * of frame (number of audio samples per frame) can be retrieved from '.frameLength' The audio needs to be
   * 16-bit linearly-encoded. Furthermore, the engine operates on single-channel audio.
   *
   * @param pcm A frame of audio with properties described above.
   * @return Index of detected keyword (phrase). When no keyword is detected, it returns -1.
   */
  public async process(pcm: Int16Array): Promise<RhinoInference> {
    if (!(pcm instanceof Int16Array)) {
      throw new Error("The argument 'pcm' must be provided as an Int16Array");
    }

    const returnPromise = new Promise<RhinoInference>((resolve, reject) => {
      this._processMutex
        .runExclusive(async () => {
          if (this._wasmMemory === undefined) {
            throw new Error(
              'Attempted to call Porcupine process after release.'
            );
          }

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
                this._valuesAddressAddressAddress
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
              );
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
                valuesAddressAddress
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
        })
        .then((result: RhinoInference) => {
          resolve(result);
        })
        .catch((error: any) => {
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
      slotsAddressAddress + index * Int32Array.BYTES_PER_ELEMENT,
      true
    );

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
      valuesAddressAddress + index * Int32Array.BYTES_PER_ELEMENT,
      true
    );

    const slotValue = arrayBufferToStringAtIndex(
      this._memoryBufferUint8,
      valueAddress
    );
    return slotValue;
  }

  /**
   * Releases resources acquired by WebAssembly module.
   */
  public async release(): Promise<void> {
    await this._pvRhinoDelete(this._objectAddress);
    await this._pvFree(this._contextAddress);
    await this._pvFree(this._inputBufferAddress);
    await this._pvFree(this._intentAddressAddress);
    await this._pvFree(this._isFinalizedAddress);
    await this._pvFree(this._isUnderstoodAddress);
    await this._pvFree(this._numSlotsAddress);
    await this._pvFree(this._slotsAddressAddressAddress);
    await this._pvFree(this._valuesAddressAddressAddress);
    delete this._wasmMemory;
    this._wasmMemory = undefined;
  }

  private static async initWasm(
    accessKey: string,
    contextPath: string,
    wasmBase64: string,
    modelPath: string,
    initConfig: RhinoInitConfig
  ): Promise<any> {
    // A WebAssembly page has a constant size of 64KiB. -> 1MiB ~= 16 pages
    // minimum memory requirements for init: 17 pages
    const memory = new WebAssembly.Memory({ initial: 128 });

    const memoryBufferUint8 = new Uint8Array(memory.buffer);
    const memoryBufferInt32 = new Int32Array(memory.buffer);
    const memoryBufferFloat32 = new Float32Array(memory.buffer);

    const exports = await buildWasm(memory, wasmBase64);

    const aligned_alloc = exports.aligned_alloc as aligned_alloc_type;
    const pv_free = exports.pv_free as pv_free_type;
    const pv_rhino_version = exports.pv_rhino_version as pv_rhino_version_type;
    const pv_rhino_context_info =
      exports.pv_rhino_context_info as pv_rhino_context_info_type;
    const pv_rhino_frame_length =
      exports.pv_rhino_frame_length as pv_rhino_frame_length_type;
    const pv_rhino_process = exports.pv_rhino_process as pv_rhino_process_type;
    const pv_rhino_is_understood =
      exports.pv_rhino_is_understood as pv_rhino_is_understood_type;
    const pv_rhino_get_intent =
      exports.pv_rhino_get_intent as pv_rhino_get_intent_type;
    const pv_rhino_delete = exports.pv_rhino_delete as pv_rhino_delete_type;
    const pv_rhino_free_slots_and_values =
      exports.pv_rhino_free_slots_and_values as pv_rhino_free_slots_and_values_type;
    const pv_rhino_init = exports.pv_rhino_init as pv_rhino_init_type;
    const pv_rhino_reset = exports.pv_rhino_reset as pv_rhino_reset_type;
    const pv_status_to_string =
      exports.pv_status_to_string as pv_status_to_string_type;
    const pv_sample_rate = exports.pv_sample_rate as pv_sample_rate_type;

    const {
      sensitivity = 0.5,
      endpointDurationSec = 1.0,
      requireEndpoint = false,
    } = initConfig;
    if (sensitivity && !(typeof sensitivity === 'number')) {
      throw new Error(
        'Rhino sensitivity is not a number (in the range [0, 1])'
      );
    } else if (sensitivity && (sensitivity < 0 || sensitivity > 1)) {
      throw new Error('Rhino sensitivity is outside of range [0, 1]');
    }
    if (endpointDurationSec && !(typeof endpointDurationSec === 'number')) {
      throw new Error(
        'Rhino endpointDurationSec is not a number (in the range [0.5, 5.0])'
      );
    } else if (
      endpointDurationSec &&
      (endpointDurationSec < 0.5 || endpointDurationSec > 5.0)
    ) {
      throw new Error(
        'Rhino endpointDurationSec is outside of range [0.5, 5.0]'
      );
    }

    // acquire and init memory for c_object
    const objectAddressAddress = await aligned_alloc(
      Int32Array.BYTES_PER_ELEMENT,
      Int32Array.BYTES_PER_ELEMENT
    );
    if (objectAddressAddress === 0) {
      throw new Error('malloc failed: Cannot allocate memory');
    }

    // acquire and init memory for c_access_key
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

    // acquire and init memory for c_model_path
    const modelPathAddress = await aligned_alloc(
      Uint8Array.BYTES_PER_ELEMENT,
      (modelPath.length + 1) * Uint8Array.BYTES_PER_ELEMENT
    );
    if (modelPathAddress === 0) {
      throw new Error('malloc failed: Cannot allocate memory');
    }
    for (let i = 0; i < modelPath.length; i++) {
      memoryBufferUint8[modelPathAddress + i] = modelPath.charCodeAt(i);
    }
    memoryBufferUint8[modelPathAddress + modelPath.length] = 0;

    // acquire and init memory for c_context_path
    const contextPathAddress = await aligned_alloc(
      Uint8Array.BYTES_PER_ELEMENT,
      (contextPath.length + 1) * Uint8Array.BYTES_PER_ELEMENT
    );
    if (contextPathAddress === 0) {
      throw new Error('malloc failed: Cannot allocate memory');
    }
    for (let i = 0; i < contextPath.length; i++) {
      memoryBufferUint8[contextPathAddress + i] = contextPath.charCodeAt(i);
    }
    memoryBufferUint8[contextPathAddress + contextPath.length] = 0;

    let status = await pv_rhino_init(
      accessKeyAddress,
      modelPathAddress,
      contextPathAddress,
      sensitivity,
      endpointDurationSec,
      requireEndpoint ? 1 : 0,
      objectAddressAddress
    );

    await pv_free(accessKeyAddress);
    await pv_free(modelPathAddress);
    await pv_free(contextPathAddress);

    if (status !== PV_STATUS_SUCCESS) {
      throw new Error(
        `'pv_rhino_init' failed with status ${arrayBufferToStringAtIndex(
          memoryBufferUint8,
          await pv_status_to_string(status)
        )}`
      );
    }
    const memoryBufferView = new DataView(memory.buffer);
    const objectAddress = memoryBufferView.getInt32(objectAddressAddress, true);
    await pv_free(objectAddressAddress);

    const sampleRate = await pv_sample_rate();
    const frameLength = await pv_rhino_frame_length();
    const versionAddress = await pv_rhino_version();
    const version = arrayBufferToStringAtIndex(
      memoryBufferUint8,
      versionAddress
    );

    const contextInfoAddressAddress = await aligned_alloc(
      Int32Array.BYTES_PER_ELEMENT,
      Int32Array.BYTES_PER_ELEMENT
    );
    if (contextInfoAddressAddress === 0) {
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
    await pv_free(contextInfoAddressAddress);
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
      Uint8Array.BYTES_PER_ELEMENT
    );
    if (isFinalizedAddress === 0) {
      throw new Error('malloc failed: Cannot allocate memory');
    }

    const isUnderstoodAddress = await aligned_alloc(
      Uint8Array.BYTES_PER_ELEMENT,
      Uint8Array.BYTES_PER_ELEMENT
    );
    if (isUnderstoodAddress === 0) {
      throw new Error('malloc failed: Cannot allocate memory');
    }

    const intentAddressAddress = await aligned_alloc(
      Int32Array.BYTES_PER_ELEMENT,
      Int32Array.BYTES_PER_ELEMENT
    );
    if (intentAddressAddress === 0) {
      throw new Error('malloc failed: Cannot allocate memory');
    }

    const numSlotsAddress = await aligned_alloc(
      Int32Array.BYTES_PER_ELEMENT,
      Int32Array.BYTES_PER_ELEMENT
    );
    if (numSlotsAddress === 0) {
      throw new Error('malloc failed: Cannot allocate memory');
    }

    const slotsAddressAddressAddress = await aligned_alloc(
      Int32Array.BYTES_PER_ELEMENT,
      Int32Array.BYTES_PER_ELEMENT
    );
    if (slotsAddressAddressAddress === 0) {
      throw new Error('malloc failed: Cannot allocate memory');
    }

    const valuesAddressAddressAddress = await aligned_alloc(
      Int32Array.BYTES_PER_ELEMENT,
      Int32Array.BYTES_PER_ELEMENT
    );
    if (valuesAddressAddressAddress === 0) {
      throw new Error('malloc failed: Cannot allocate memory');
    }

    return {
      aligned_alloc,
      memory: memory,
      pvFree: pv_free,

      contextInfo: contextInfo,
      frameLength: frameLength,
      sampleRate: sampleRate,
      version: version,

      inputBufferAddress: inputBufferAddress,
      intentAddressAddress: intentAddressAddress,
      isFinalizedAddress: isFinalizedAddress,
      isUnderstoodAddress: isUnderstoodAddress,
      numSlotsAddress: numSlotsAddress,
      objectAddress: objectAddress,
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
