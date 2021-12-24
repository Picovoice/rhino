/*
    Copyright 2018-2021 Picovoice Inc.

    You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
    file accompanying this source.

    Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
    an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
    specific language governing permissions and limitations under the License.
*/

/* eslint camelcase: 0 */

// @ts-ignore
import * as Asyncify from 'asyncify-wasm';
import { Mutex } from 'async-mutex';

import { RhinoInference, RhinoContext, RhinoEngine } from './rhino_types';

// @ts-ignore
import { RHINO_WASM_BASE64 } from './lang/rhino_b64';
import { wasiSnapshotPreview1Emulator } from './wasi_snapshot';

import {
  arrayBufferToBase64AtIndex,
  arrayBufferToStringAtIndex,
  base64ToUint8Array,
  fetchWithTimeout,
  getRuntimeEnvironment,
  isAccessKeyValid,
  stringHeaderToObject,
} from './utils';

const DEFAULT_SENSITIVITY = 0.5;
const PV_STATUS_SUCCESS = 10000;

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

  pvRhinoDelete: CallableFunction;
  pvRhinoFreeSlotsAndValues: CallableFunction;
  pvRhinoGetIntent: CallableFunction;
  pvRhinoIsUnderstood: CallableFunction;
  pvRhinoProcess: CallableFunction;
  pvRhinoReset: CallableFunction;
  pvStatusToString: CallableFunction;
};

export class Rhino implements RhinoEngine {
  private _pvRhinoDelete: CallableFunction;
  private _pvRhinoFreeSlotsAndValues: CallableFunction;
  private _pvRhinoGetIntent: CallableFunction;
  private _pvRhinoIsUnderstood: CallableFunction;
  private _pvRhinoProcess: CallableFunction;
  private _pvRhinoReset: CallableFunction;
  private _pvStatusToString: CallableFunction;

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

  private static _resolvePromise: EmptyPromise | null;
  private static _rejectPromise: EmptyPromise | null;
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

  public static clearFilePromises(): void {
    Rhino._rejectPromise = null;
    Rhino._resolvePromise = null;
  }

  // eslint-disable-next-line
  public static resolveFilePromise(args: any): void {
    if (Rhino._resolvePromise != null) {
      Rhino._resolvePromise(args);
    }
  }

  // eslint-disable-next-line
  public static rejectFilePromise(args: any): void {
    if (Rhino._rejectPromise != null) {
      Rhino._rejectPromise(args);
    }
  }

  private static async initWasm(
    accessKey: string,
    context: string,
    sensitivity: number,
    requireEndpoint: boolean): Promise<any> {
    const memory = new WebAssembly.Memory({ initial: 1000, maximum: 2000 });

    const memoryBufferUint8 = new Uint8Array(memory.buffer);
    const memoryBufferInt32 = new Int32Array(memory.buffer);
    const memoryBufferFloat32 = new Float32Array(memory.buffer);

    const pvConsoleLogWasm = function (index: number): void {
      // eslint-disable-next-line no-console
      console.log(arrayBufferToStringAtIndex(memoryBufferUint8, index));
    };

    const pvFileOperationHelper = function (args: any): Promise<any> {
      let promise: any;
      const runtimeEnvironment = getRuntimeEnvironment();
      if (runtimeEnvironment === 'worker') {
        promise = new Promise((resolve, reject) => {
          Rhino._resolvePromise = resolve;
          Rhino._rejectPromise = reject;
        });
        self.postMessage(
          {
            command: args.command,
            path: args.path,
            content: args.content,
          },
          // @ts-ignore
          undefined
        );
      } else if (runtimeEnvironment === 'browser') {
        promise = new Promise<string>((resolve, reject) => {
          try {
            switch (args.command) {
              case 'file-save':
                localStorage.setItem(args.path, args.content);
                resolve('saved');
                break;
              case 'file-exists':
                {
                  const content = localStorage.getItem(args.path);
                  resolve(content as string);
                }
                break;
              case 'file-load':
                {
                  const content = localStorage.getItem(args.path);
                  if (content === null) {
                    reject(`${args.path} does not exist`);
                  } else {
                    resolve(content as string);
                  }
                }
                break;
              case 'file-delete':
                localStorage.removeItem(args.path);
                resolve('deleted');
                break;
              default:
                // eslint-disable-next-line no-console
                console.warn(`Unexpected command: ${args.command}`);
                reject();
            }
          } catch (error) {
            reject();
          }
        });
      } else {
        // eslint-disable-next-line no-console
        console.error(`Unexpected environment: ${runtimeEnvironment}`);
        return Promise.reject();
      }
      return promise;
    };

    const pvAssertWasm = function (
      expr: number,
      line: number,
      fileNameAddress: number
    ): void {
      if (expr === 0) {
        const fileName = arrayBufferToStringAtIndex(
          memoryBufferUint8,
          fileNameAddress
        );
        throw new Error(`assertion failed at line ${line} in "${fileName}"`);
      }
    };

    const pvTimeWasm = function (): number {
      return Date.now() / 1000;
    };

    const pvHttpsRequestWasm = async function (
      httpMethodAddress: number,
      serverNameAddress: number,
      endpointAddress: number,
      headerAddress: number,
      bodyAddress: number,
      timeoutMs: number,
      responseAddressAddress: number,
      responseSizeAddress: number,
      responseCodeAddress: number
    ): Promise<void> {
      const httpMethod = arrayBufferToStringAtIndex(
        memoryBufferUint8,
        httpMethodAddress
      );
      const serverName = arrayBufferToStringAtIndex(
        memoryBufferUint8,
        serverNameAddress
      );
      const endpoint = arrayBufferToStringAtIndex(
        memoryBufferUint8,
        endpointAddress
      );
      const header = arrayBufferToStringAtIndex(
        memoryBufferUint8,
        headerAddress
      );
      const body = arrayBufferToStringAtIndex(memoryBufferUint8, bodyAddress);

      const headerObject = stringHeaderToObject(header);

      let response: Response;
      let responseText: string;
      let statusCode: number;

      try {
        response = await fetchWithTimeout(
          'https://' + serverName + endpoint,
          {
            method: httpMethod,
            headers: headerObject,
            body: body,
          },
          timeoutMs
        );
        statusCode = response.status;
      } catch (error) {
        statusCode = 0;
      }
      // @ts-ignore
      if (response !== undefined) {
        try {
          responseText = await response.text();
        } catch (error) {
          responseText = '';
          statusCode = 1;
        }
        // eslint-disable-next-line
        const responseAddress = await aligned_alloc(
          Int8Array.BYTES_PER_ELEMENT,
          (responseText.length + 1) * Int8Array.BYTES_PER_ELEMENT
        );
        if (responseAddress === 0) {
          throw new Error('malloc failed: Cannot allocate memory');
        }

        memoryBufferInt32[
          responseSizeAddress / Int32Array.BYTES_PER_ELEMENT
        ] = responseText.length + 1;
        memoryBufferInt32[
          responseAddressAddress / Int32Array.BYTES_PER_ELEMENT
        ] = responseAddress;

        for (let i = 0; i < responseText.length; i++) {
          memoryBufferUint8[responseAddress + i] = responseText.charCodeAt(i);
        }
        memoryBufferUint8[responseAddress + responseText.length] = 0;
      }

      memoryBufferInt32[
        responseCodeAddress / Int32Array.BYTES_PER_ELEMENT
      ] = statusCode;
    };

    const pvFileLoadWasm = async function (
      pathAddress: number,
      numContentBytesAddress: number,
      contentAddressAddress: number,
      succeededAddress: number
    ): Promise<void> {
      const path = arrayBufferToStringAtIndex(memoryBufferUint8, pathAddress);
      try {
        const contentBase64 = await pvFileOperationHelper({
          command: 'file-load',
          path: path,
        });
        const contentBuffer = base64ToUint8Array(contentBase64);
        // eslint-disable-next-line
        const contentAddress = await aligned_alloc(
          Uint8Array.BYTES_PER_ELEMENT,
          contentBuffer.length * Uint8Array.BYTES_PER_ELEMENT
        );

        if (contentAddress === 0) {
          throw new Error('malloc failed: Cannot allocate memory');
        }

        memoryBufferInt32[
          numContentBytesAddress / Int32Array.BYTES_PER_ELEMENT
        ] = contentBuffer.byteLength;
        memoryBufferInt32[
          contentAddressAddress / Int32Array.BYTES_PER_ELEMENT
        ] = contentAddress;
        memoryBufferUint8.set(contentBuffer, contentAddress);
        memoryBufferInt32[
          succeededAddress / Int32Array.BYTES_PER_ELEMENT
        ] = 1;
      } catch (error) {
        memoryBufferInt32[
          succeededAddress / Int32Array.BYTES_PER_ELEMENT
        ] = 0;
      }
    };

    const pvFileSaveWasm = async function (
      pathAddress: number,
      numContentBytes: number,
      contentAddress: number,
      succeededAddress: number
    ): Promise<void> {
      const path = arrayBufferToStringAtIndex(memoryBufferUint8, pathAddress);
      const content = arrayBufferToBase64AtIndex(
        memoryBufferUint8,
        numContentBytes,
        contentAddress
      );
      try {
        await pvFileOperationHelper({
          command: 'file-save',
          path: path,
          content: content,
        });
        memoryBufferInt32[
          succeededAddress / Int32Array.BYTES_PER_ELEMENT
        ] = 1;
      } catch (error) {
        memoryBufferInt32[
          succeededAddress / Int32Array.BYTES_PER_ELEMENT
        ] = 0;
      }
    };

    const pvFileExistsWasm = async function (
      pathAddress: number,
      isExistsAddress: number,
      succeededAddress: number
    ): Promise<void> {
      const path = arrayBufferToStringAtIndex(memoryBufferUint8, pathAddress);

      try {
        const isExists = await pvFileOperationHelper({
          command: 'file-exists',
          path: path,
        });
        memoryBufferUint8[isExistsAddress] = isExists === null ? 0 : 1;
        memoryBufferInt32[
          succeededAddress / Int32Array.BYTES_PER_ELEMENT
        ] = 1;
      } catch (error) {
        memoryBufferInt32[
          succeededAddress / Int32Array.BYTES_PER_ELEMENT
        ] = 0;
      }
    };

    const pvFileDeleteWasm = async function (
      pathAddress: number,
      succeededAddress: number
    ): Promise<void> {
      const path = arrayBufferToStringAtIndex(memoryBufferUint8, pathAddress);
      try {
        await pvFileOperationHelper({
          command: 'file-delete',
          path: path,
        });
        memoryBufferInt32[
          succeededAddress / Int32Array.BYTES_PER_ELEMENT
        ] = 1;
      } catch (error) {
        memoryBufferInt32[
          succeededAddress / Int32Array.BYTES_PER_ELEMENT
        ] = 0;
      }
    };

    const pvGetBrowserInfo = async function (browserInfoAddressAddress: number): Promise<void> {
      const userAgent =
        navigator.userAgent !== undefined ? navigator.userAgent : 'unknown';
      // eslint-disable-next-line
      const browserInfoAddress = await aligned_alloc(
        Uint8Array.BYTES_PER_ELEMENT,
        (userAgent.length + 1) * Uint8Array.BYTES_PER_ELEMENT
      );

      if (browserInfoAddress === 0) {
        throw new Error('malloc failed: Cannot allocate memory');
      }

      memoryBufferInt32[
        browserInfoAddressAddress / Int32Array.BYTES_PER_ELEMENT
      ] = browserInfoAddress;
      for (let i = 0; i < userAgent.length; i++) {
        memoryBufferUint8[browserInfoAddress + i] = userAgent.charCodeAt(i);
      }
      memoryBufferUint8[browserInfoAddress + userAgent.length] = 0;
    };

    const pvGetOriginInfo = async function(originInfoAddressAddress: number): Promise<void> {
      const origin = self.origin ?? self.location.origin;
      // eslint-disable-next-line
      const originInfoAddress = await aligned_alloc(
        Uint8Array.BYTES_PER_ELEMENT,
        (origin.length + 1) * Uint8Array.BYTES_PER_ELEMENT
      );

      if (originInfoAddress === 0) {
        throw new Error('malloc failed: Cannot allocate memory');
      }

      memoryBufferInt32[
        originInfoAddressAddress / Int32Array.BYTES_PER_ELEMENT
      ] = originInfoAddress;
      for (let i = 0; i < origin.length; i++) {
        memoryBufferUint8[originInfoAddress + i] = origin.charCodeAt(i);
      }
      memoryBufferUint8[originInfoAddress + origin.length] = 0;
    };

    const importObject = {
      // eslint-disable-next-line camelcase
      wasi_snapshot_preview1: wasiSnapshotPreview1Emulator,
      env: {
        memory: memory,
        // eslint-disable-next-line camelcase
        pv_console_log_wasm: pvConsoleLogWasm,
        // eslint-disable-next-line camelcase
        pv_assert_wasm: pvAssertWasm,
        // eslint-disable-next-line camelcase
        pv_time_wasm: pvTimeWasm,
        // eslint-disable-next-line camelcase
        pv_https_request_wasm: pvHttpsRequestWasm,
        // eslint-disable-next-line camelcase
        pv_file_load_wasm: pvFileLoadWasm,
        // eslint-disable-next-line camelcase
        pv_file_save_wasm: pvFileSaveWasm,
        // eslint-disable-next-line camelcase
        pv_file_exists_wasm: pvFileExistsWasm,
        // eslint-disable-next-line camelcase
        pv_file_delete_wasm: pvFileDeleteWasm,
        // eslint-disable-next-line camelcase
        pv_get_browser_info: pvGetBrowserInfo,
        // eslint-disable-next-line camelcase
        pv_get_origin_info: pvGetOriginInfo,
      },
    };

    const wasmCodeArray = base64ToUint8Array(RHINO_WASM_BASE64);
    const { instance } = await Asyncify.instantiate(
      wasmCodeArray,
      importObject
    );
    const aligned_alloc = instance.exports.aligned_alloc as CallableFunction;
    const pv_rhino_context_info = instance.exports.pv_rhino_context_info as CallableFunction;
    const pv_rhino_delete = instance.exports.pv_rhino_delete as CallableFunction;
    const pv_rhino_frame_length = instance.exports.pv_rhino_frame_length as CallableFunction;
    const pv_rhino_free_slots_and_values = instance.exports.pv_rhino_free_slots_and_values as CallableFunction;
    const pv_rhino_get_intent = instance.exports.pv_rhino_get_intent as CallableFunction;
    const pv_rhino_init = instance.exports.pv_rhino_init as CallableFunction;
    const pv_rhino_is_understood = instance.exports.pv_rhino_is_understood as CallableFunction;
    const pv_rhino_process = instance.exports.pv_rhino_process as CallableFunction;
    const pv_rhino_reset = instance.exports.pv_rhino_reset as CallableFunction;
    const pv_rhino_version = instance.exports.pv_rhino_version as CallableFunction;
    const pv_sample_rate = instance.exports.pv_sample_rate as CallableFunction;
    const pv_status_to_string = instance.exports.pv_status_to_string as CallableFunction;

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
