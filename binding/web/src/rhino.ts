/*
  Copyright 2022-2025 Picovoice Inc.

  You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
  file accompanying this source.

  Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
  an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
  specific language governing permissions and limitations under the License.
*/

/* eslint camelcase: 0 */

import { Mutex } from 'async-mutex';

import {
  arrayBufferToStringAtIndex,
  base64ToUint8Array,
  isAccessKeyValid,
  loadModel,
} from '@picovoice/web-utils';

import createModuleSimd from "./lib/pv_rhino_simd";
import createModulePThread from "./lib/pv_rhino_pthread";

import { simd } from 'wasm-feature-detect';

import {
  InferenceCallback,
  RhinoContext,
  RhinoInference,
  RhinoModel,
  RhinoOptions,
  PvStatus
} from './types';

import * as RhinoErrors from "./rhino_errors";
import { pvStatusToException } from './rhino_errors';

/**
 * WebAssembly function types
 */

type pv_rhino_init_type = (
  accessKey: number,
  modelPath: number,
  device: number,
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
) => number;
type pv_rhino_reset_type = (object: number) => number;
type pv_rhino_context_info_type = (
  object: number,
  contextInfo: number
) => number;
type pv_rhino_delete_type = (object: number) => void;
type pv_rhino_frame_length_type = () => number;
type pv_rhino_free_slots_and_values_type = (
  object: number,
  slots: number,
  values: number
) => number;
type pv_rhino_get_intent_type = (
  object: number,
  intent: number,
  numSlots: number,
  slots: number,
  values: number
) => number;
type pv_rhino_is_understood_type = (
  object: number,
  isUnderstood: number
) => number;
type pv_rhino_version_type = () => number;
type pv_sample_rate_type = () => number;
type pv_rhino_list_hardware_devices_type = (
  hardwareDevices: number,
  numHardwareDevices: number
) => number;
type pv_rhino_free_hardware_devices_type = (
  hardwareDevices: number,
  numHardwareDevices: number
) => number;
type pv_set_sdk_type = (sdk: number) => void;
type pv_get_error_stack_type = (messageStack: number, messageStackDepth: number) => number;
type pv_free_error_stack_type = (messageStack: number) => void;


/**
 * JavaScript/WebAssembly Binding for the Picovoice Rhino Speech-to-Intent engine.
 *
 * The instances have JavaScript bindings that wrap the calls to the C library and
 * do some rudimentary type checking and parameter validation.
 */

type RhinoModule = EmscriptenModule & {
  _pv_free: (address: number) => void;

  _pv_rhino_delete: pv_rhino_delete_type;
  _pv_rhino_process: pv_rhino_process_type;
  _pv_rhino_reset: pv_rhino_reset_type;
  _pv_rhino_context_info: pv_rhino_context_info_type;
  _pv_rhino_free_slots_and_values: pv_rhino_free_slots_and_values_type;
  _pv_rhino_get_intent: pv_rhino_get_intent_type;
  _pv_rhino_is_understood: pv_rhino_is_understood_type;
  _pv_rhino_frame_length: pv_rhino_frame_length_type
  _pv_rhino_version: pv_rhino_version_type
  _pv_rhino_list_hardware_devices: pv_rhino_list_hardware_devices_type;
  _pv_rhino_free_hardware_devices: pv_rhino_free_hardware_devices_type;
  _pv_sample_rate: pv_sample_rate_type

  _pv_set_sdk: pv_set_sdk_type;
  _pv_get_error_stack: pv_get_error_stack_type;
  _pv_free_error_stack: pv_free_error_stack_type;

  // em default functions
  addFunction: typeof addFunction;
  ccall: typeof ccall;
  cwrap: typeof cwrap;
}

type RhinoWasmOutput = {
  module: RhinoModule;

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
  messageStackAddressAddressAddress: number;
  messageStackDepthAddress: number;
};

export class Rhino {
  private _module?: RhinoModule;

  private readonly _contextInfo: string;
  private readonly _frameLength: number;
  private readonly _sampleRate: number;
  private readonly _version: string;

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
  private readonly _messageStackAddressAddressAddress: number;
  private readonly _messageStackDepthAddress: number;

  private static _wasmSimd: string;
  private static _wasmSimdLib: string;
  private static _wasmPThread: string;
  private static _wasmPThreadLib: string;

  private static _sdk: string = "web";

  private static _rhinoMutex = new Mutex();

  private readonly _inferenceCallback: InferenceCallback;
  private readonly _processErrorCallback: (error: RhinoErrors.RhinoError) => void;

  private constructor(
    handleWasm: RhinoWasmOutput,
    inferenceCallback: InferenceCallback,
    processErrorCallback: (error: RhinoErrors.RhinoError) => void
  ) {
    this._module = handleWasm.module;

    this._frameLength = handleWasm.frameLength;
    this._sampleRate = handleWasm.sampleRate;
    this._version = handleWasm.version;
    this._contextInfo = handleWasm.contextInfo;

    this._contextAddress = handleWasm.contextAddress;
    this._inputBufferAddress = handleWasm.inputBufferAddress;
    this._intentAddressAddress = handleWasm.intentAddressAddress;
    this._isFinalizedAddress = handleWasm.isFinalizedAddress;
    this._isUnderstoodAddress = handleWasm.isUnderstoodAddress;
    this._numSlotsAddress = handleWasm.numSlotsAddress;
    this._objectAddress = handleWasm.objectAddress;
    this._slotsAddressAddressAddress = handleWasm.slotsAddressAddressAddress;
    this._valuesAddressAddressAddress = handleWasm.valuesAddressAddressAddress;
    this._messageStackAddressAddressAddress = handleWasm.messageStackAddressAddressAddress;
    this._messageStackDepthAddress = handleWasm.messageStackDepthAddress;

    this._processMutex = new Mutex();

    this._inferenceCallback = inferenceCallback;
    this._processErrorCallback = processErrorCallback;
  }

  /**
   * Get Rhino engine version.
   */
  get version(): string {
    return this._version;
  }

  /**
   * Get frame length.
   */
  get frameLength(): number {
    return this._frameLength;
  }

  /**
   * Get sample rate.
   */
  get sampleRate(): number {
    return this._sampleRate;
  }

  /**
   * Get context info.
   */
  get contextInfo(): string {
    return this._contextInfo;
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
   * Set base64 SIMD wasm file in text format.
   * @param wasmSimdLib Base64'd wasm file in text format.
   */
  public static setWasmSimdLib(wasmSimdLib: string): void {
    if (this._wasmSimdLib === undefined) {
      this._wasmSimdLib = wasmSimdLib;
    }
  }

  /**
   * Set base64 wasm file with SIMD and pthread feature.
   * @param wasmPThread Base64'd wasm file to use to initialize wasm.
   */
  public static setWasmPThread(wasmPThread: string): void {
    if (this._wasmPThread === undefined) {
      this._wasmPThread = wasmPThread;
    }
  }

  /**
   * Set base64 SIMD and thread wasm file in text format.
   * @param wasmPThreadLib Base64'd wasm file in text format.
   */
  public static setWasmPThreadLib(wasmPThreadLib: string): void {
    if (this._wasmPThreadLib === undefined) {
      this._wasmPThreadLib = wasmPThreadLib;
    }
  }

  public static setSdk(sdk: string): void {
    Rhino._sdk = sdk;
  }

  /**
   * Creates an instance of the Rhino Speech-to-Intent engine.
   * The model size is large, hence it will try to use the existing one if it exists,
   * otherwise saves the model in storage.
   * Behind the scenes, it requires the WebAssembly code to load and initialize before
   * it can create an instance.
   *
   * @param accessKey AccessKey generated by Picovoice Console.
   * @param context RhinoContext object containing a base64
   * representation of or path to public binary of a Rhino context model .
   * @param inferenceCallback User-defined callback invoked upon processing a frame of audio.
   * The only input argument is an object of type RhinoInference.
   * @param model RhinoModel object containing a base64 string
   * representation of or path to public binary of a Rhino parameter model used to initialize Rhino.
   * @param options Optional configuration arguments.
   * @param options.device String representation of the device (e.g., CPU or GPU) to use. If set to `best`, the most
   * suitable device is selected automatically. If set to `gpu`, the engine uses the first available GPU device. To
   * select a specific GPU device, set this argument to `gpu:${GPU_INDEX}`, where `${GPU_INDEX}` is the index of the
   * target GPU. If set to `cpu`, the engine will run on the CPU with the default number of threads. To specify the
   * number of threads, set this argument to `cpu:${NUM_THREADS}`, where `${NUM_THREADS}` is the desired number of
   * threads.
   * @param options.endpointDurationSec Endpoint duration in seconds.
   * An endpoint is a chunk of silence at the end of an utterance that marks
   * the end of spoken command. It should be a positive number within [0.5, 5].
   * A lower endpoint duration reduces delay and improves responsiveness. A higher endpoint duration
   * assures Rhino doesn't return inference preemptively in case the user pauses before finishing the request.
   * @param options.requireEndpoint If set to `true`, Rhino requires an endpoint (a chunk of silence)
   * after the spoken command. If set to `false`, Rhino tries to detect silence, but if it cannot,
   * it still will provide inference regardless. Set to `false` only if operating in an
   * environment with overlapping speech (e.g. people talking in the background).
   * @param options.processErrorCallback User-defined callback invoked if any error happens
   * while processing the audio stream. Its only input argument is the error message.
   *
   * @returns An instance of the Rhino engine.
   */
  public static async create(
    accessKey: string,
    context: RhinoContext,
    inferenceCallback: InferenceCallback,
    model: RhinoModel,
    options: RhinoOptions = {}
  ): Promise<Rhino> {
    let customWritePath = context.customWritePath
      ? context.customWritePath
      : 'rhino_context';
    const contextPath = await loadModel({ ...context, customWritePath });
    const { sensitivity = 0.5 } = context;

    customWritePath = model.customWritePath
      ? model.customWritePath
      : 'rhino_model';
    const modelPath = await loadModel({ ...model, customWritePath });

    return Rhino._init(
      accessKey,
      contextPath,
      sensitivity,
      inferenceCallback,
      modelPath,
      options
    );
  }

  public static async _init(
    accessKey: string,
    contextPath: string,
    sensitivity: number,
    inferenceCallback: InferenceCallback,
    modelPath: string,
    options: RhinoOptions = {}
  ): Promise<Rhino> {
    if (!isAccessKeyValid(accessKey)) {
      throw new RhinoErrors.RhinoInvalidArgumentError('Invalid AccessKey');
    }

    let { device = "best" } = options;
    const { processErrorCallback } = options;

    const isSimd = await simd();
    if (!isSimd) {
      throw new RhinoErrors.RhinoRuntimeError('Browser not supported.');
    }

    const isWorkerScope =
      typeof WorkerGlobalScope !== 'undefined' &&
      self instanceof WorkerGlobalScope;
    if (
      !isWorkerScope &&
      (device === 'best' || (device.startsWith('cpu') && device !== 'cpu:1'))
    ) {
      // eslint-disable-next-line no-console
      console.warn('Multi-threading is not supported on main thread.');
      device = 'cpu:1';
    }

    const sabDefined = typeof SharedArrayBuffer !== 'undefined'
      && (device !== "cpu:1");

    return new Promise<Rhino>((resolve, reject) => {
      Rhino._rhinoMutex
        .runExclusive(async () => {
          const wasmOutput = await Rhino.initWasm(
            accessKey.trim(),
            contextPath,
            sensitivity,
            modelPath,
            device,
            (sabDefined) ? this._wasmPThread : this._wasmSimd,
            (sabDefined) ? this._wasmPThreadLib : this._wasmSimdLib,
            (sabDefined) ? createModulePThread : createModuleSimd,
            options,
          );
          return new Rhino(wasmOutput, inferenceCallback, processErrorCallback);
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
   */
  public async process(pcm: Int16Array): Promise<void> {
    if (!(pcm instanceof Int16Array)) {
      throw new RhinoErrors.RhinoInvalidArgumentError("The argument 'pcm' must be provided as an Int16Array");
    }

    this._processMutex
      .runExclusive(async () => {
        if (this._module === undefined) {
          throw new RhinoErrors.RhinoInvalidStateError(
            'Attempted to call Rhino process after release.'
          );
        }

        this._module.HEAP16.set(pcm, this._inputBufferAddress / Int16Array.BYTES_PER_ELEMENT);

        let status = this._module._pv_rhino_process(
          this._objectAddress,
          this._inputBufferAddress,
          this._isFinalizedAddress
        );

        if (status !== PvStatus.SUCCESS) {
          const messageStack = await Rhino.getMessageStack(
            this._module._pv_get_error_stack,
            this._module._pv_free_error_stack,
            this._messageStackAddressAddressAddress,
            this._messageStackDepthAddress,
            this._module.HEAP32,
            this._module.HEAPU8
          );

          throw pvStatusToException(status, "Processing failed", messageStack);
        }

        const isFinalized = this._module.HEAPU8[this._isFinalizedAddress];

        if (isFinalized === 1) {
          status = this._module._pv_rhino_is_understood(
            this._objectAddress,
            this._isUnderstoodAddress
          );
          if (status !== PvStatus.SUCCESS) {
            const messageStack = await Rhino.getMessageStack(
              this._module._pv_get_error_stack,
              this._module._pv_free_error_stack,
              this._messageStackAddressAddressAddress,
              this._messageStackDepthAddress,
              this._module.HEAP32,
              this._module.HEAPU8
            );

            throw pvStatusToException(status, "Failed to get inference", messageStack);
          }

          const isUnderstood = this._module.HEAPU8[this._isUnderstoodAddress];

          if (isUnderstood === -1) {
            throw new RhinoErrors.RhinoInvalidStateError('Rhino failed to process the command');
          }

          let intent = null;
          const slots = {};
          if (isUnderstood === 1) {
            status = this._module._pv_rhino_get_intent(
              this._objectAddress,
              this._intentAddressAddress,
              this._numSlotsAddress,
              this._slotsAddressAddressAddress,
              this._valuesAddressAddressAddress
            );
            if (status !== PvStatus.SUCCESS) {
              const messageStack = await Rhino.getMessageStack(
                this._module._pv_get_error_stack,
                this._module._pv_free_error_stack,
                this._messageStackAddressAddressAddress,
                this._messageStackDepthAddress,
                this._module.HEAP32,
                this._module.HEAPU8
              );

              throw pvStatusToException(status, "Failed to get intent", messageStack);
            }

            const intentAddress = this._module.HEAP32[this._intentAddressAddress / Int32Array.BYTES_PER_ELEMENT];
            intent = arrayBufferToStringAtIndex(
              this._module.HEAPU8,
              intentAddress
            );

            const numSlots = this._module.HEAP32[this._numSlotsAddress / Int32Array.BYTES_PER_ELEMENT];
            if (numSlots === -1) {
              throw new RhinoErrors.RhinoInvalidStateError('Rhino failed to get the number of slots');
            }

            for (let i = 0; i < numSlots; i++) {
              const slot = this._getSlot(i);
              if (!slot) {
                throw new RhinoErrors.RhinoInvalidStateError('Rhino failed to get the slot');
              }
              const value = this._getSlotValue(i);
              if (!value) {
                throw new RhinoErrors.RhinoInvalidStateError('Rhino failed to get the slot value');
              }
              slots[slot] = value;
            }

            const slotsAddressAddress = this._module.HEAP32[this._slotsAddressAddressAddress / Int32Array.BYTES_PER_ELEMENT];
            const valuesAddressAddress = this._module.HEAP32[this._valuesAddressAddressAddress / Int32Array.BYTES_PER_ELEMENT];

            status = this._module._pv_rhino_free_slots_and_values(
              this._objectAddress,
              slotsAddressAddress,
              valuesAddressAddress
            );
            if (status !== PvStatus.SUCCESS) {
              const messageStack = await Rhino.getMessageStack(
                this._module._pv_get_error_stack,
                this._module._pv_free_error_stack,
                this._messageStackAddressAddressAddress,
                this._messageStackDepthAddress,
                this._module.HEAP32,
                this._module.HEAPU8
              );

              throw pvStatusToException(status, "Failed to clean up resources", messageStack);
            }
          }

          status = this._module._pv_rhino_reset(this._objectAddress);
          if (status !== PvStatus.SUCCESS) {
            const messageStack = await Rhino.getMessageStack(
              this._module._pv_get_error_stack,
              this._module._pv_free_error_stack,
              this._messageStackAddressAddressAddress,
              this._messageStackDepthAddress,
              this._module.HEAP32,
              this._module.HEAPU8
            );

            throw pvStatusToException(status, "Failed to reset", messageStack);
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
        }
        throw new RhinoErrors.RhinoRuntimeError('Rhino failed to process audio');
      })
      .then((result: RhinoInference) => {
        this._inferenceCallback(result);
      })
      .catch((error: RhinoErrors.RhinoError) => {
        if (this._processErrorCallback) {
          this._processErrorCallback(error);
        } else {
          // eslint-disable-next-line no-console
          console.error(error);
        }
      });
  }

  private _getSlot(index: number): string {
    const slotsAddressAddress = this._module.HEAP32[this._slotsAddressAddressAddress / Int32Array.BYTES_PER_ELEMENT];
    const slotAddress = this._module.HEAP32[(slotsAddressAddress / Int32Array.BYTES_PER_ELEMENT) + index];

    return arrayBufferToStringAtIndex(this._module.HEAPU8, slotAddress);
  }

  private _getSlotValue(index: number): string {
    const valuesAddressAddress = this._module.HEAP32[this._valuesAddressAddressAddress / Int32Array.BYTES_PER_ELEMENT];
    const valueAddress = this._module.HEAP32[(valuesAddressAddress / Int32Array.BYTES_PER_ELEMENT) + index];

    return arrayBufferToStringAtIndex(this._module.HEAPU8, valueAddress);
  }

  /**
   * Resets the internal Rhino state.
   */
  public async reset(): Promise<void> {
    const status = this._module._pv_rhino_reset(this._objectAddress);
    if (status !== PvStatus.SUCCESS) {
      const messageStack = await Rhino.getMessageStack(
        this._module._pv_get_error_stack,
        this._module._pv_free_error_stack,
        this._messageStackAddressAddressAddress,
        this._messageStackDepthAddress,
        this._module.HEAP32,
        this._module.HEAPU8
      );

      throw pvStatusToException(status, "Failed to reset", messageStack);
    }
  }

  /**
   * Releases resources acquired by WebAssembly module.
   */
  public async release(): Promise<void> {
    if (!this._module) {
      return;
    }
    this._module._pv_rhino_delete(this._objectAddress);
    this._module._pv_free(this._messageStackAddressAddressAddress);
    this._module._pv_free(this._messageStackDepthAddress);
    this._module._pv_free(this._contextAddress);
    this._module._pv_free(this._inputBufferAddress);
    this._module._pv_free(this._intentAddressAddress);
    this._module._pv_free(this._isFinalizedAddress);
    this._module._pv_free(this._isUnderstoodAddress);
    this._module._pv_free(this._numSlotsAddress);
    this._module._pv_free(this._slotsAddressAddressAddress);
    this._module._pv_free(this._valuesAddressAddressAddress);
    this._module = undefined;
  }

  public async onmessage(e: MessageEvent): Promise<void> {
    switch (e.data.command) {
      case 'process':
        await this.process(e.data.inputFrame);
        break;
      default:
        // eslint-disable-next-line no-console
        console.warn(`Unrecognized command: ${e.data.command}`);
    }
  }

  private static async initWasm(
    accessKey: string,
    contextPath: string,
    sensitivity: number,
    modelPath: string,
    device: string,
    wasmBase64: string,
    wasmLibBase64: string,
    createModuleFunc: any,
    initConfig: RhinoOptions
  ): Promise<any> {
    const { endpointDurationSec = 1.0, requireEndpoint = true } = initConfig;
    if (sensitivity && !(typeof sensitivity === 'number')) {
      throw new RhinoErrors.RhinoInvalidArgumentError(
        'Rhino sensitivity is not a number (in the range [0, 1])'
      );
    } else if (sensitivity && (sensitivity < 0 || sensitivity > 1)) {
      throw new RhinoErrors.RhinoInvalidArgumentError('Rhino sensitivity is outside of range [0, 1]');
    }
    if (endpointDurationSec && !(typeof endpointDurationSec === 'number')) {
      throw new RhinoErrors.RhinoInvalidArgumentError(
        'Rhino endpointDurationSec is not a number (in the range [0.5, 5.0])'
      );
    } else if (
      endpointDurationSec &&
      (endpointDurationSec < 0.5 || endpointDurationSec > 5.0)
    ) {
      throw new RhinoErrors.RhinoInvalidArgumentError(
        'Rhino endpointDurationSec is outside of range [0.5, 5.0]'
      );
    }

    const blob = new Blob(
      [base64ToUint8Array(wasmLibBase64)],
      { type: 'application/javascript' }
    );
    const module: RhinoModule = await createModuleFunc({
      mainScriptUrlOrBlob: blob,
      wasmBinary: base64ToUint8Array(wasmBase64),
    });

    const pv_rhino_init: pv_rhino_init_type = this.wrapAsyncFunction(
      module,
      "pv_rhino_init",
      8);

    const objectAddressAddress = module._malloc(Int32Array.BYTES_PER_ELEMENT);
    if (objectAddressAddress === 0) {
      throw new RhinoErrors.RhinoOutOfMemoryError(
        'malloc failed: Cannot allocate memory'
      );
    }

    const accessKeyEncoded = new TextEncoder().encode(accessKey);
    const accessKeyAddress = module._malloc((accessKey.length + 1) * Uint8Array.BYTES_PER_ELEMENT);
    if (accessKeyAddress === 0) {
      throw new RhinoErrors.RhinoOutOfMemoryError(
        'malloc failed: Cannot allocate memory'
      );
    }
    module.HEAP8.set(accessKeyEncoded, accessKeyAddress);
    module.HEAP8[accessKeyAddress + accessKeyEncoded.length] = 0;

    const modelPathEncoded = new TextEncoder().encode(modelPath);
    const modelPathAddress = module._malloc((modelPath.length + 1) * Uint8Array.BYTES_PER_ELEMENT);
    if (modelPathAddress === 0) {
      throw new RhinoErrors.RhinoOutOfMemoryError(
        'malloc failed: Cannot allocate memory'
      );
    }
    module.HEAP8.set(modelPathEncoded, modelPathAddress);
    module.HEAP8[modelPathAddress + modelPathEncoded.length] = 0;

    const deviceEncoded = new TextEncoder().encode(device);
    const deviceAddress = module._malloc((device.length + 1) * Uint8Array.BYTES_PER_ELEMENT);
    if (deviceAddress === 0) {
      throw new RhinoErrors.RhinoOutOfMemoryError(
        'malloc failed: Cannot allocate memory'
      );
    }
    module.HEAP8.set(deviceEncoded, deviceAddress);
    module.HEAPU8[deviceAddress + deviceEncoded.length] = 0;

    const contextPathEncoded = new TextEncoder().encode(contextPath);
    const contextPathAddress = module._malloc((contextPath.length + 1) * Uint8Array.BYTES_PER_ELEMENT);
    if (contextPathAddress === 0) {
      throw new RhinoErrors.RhinoOutOfMemoryError(
        'malloc failed: Cannot allocate memory'
      );
    }
    module.HEAP8.set(contextPathEncoded, contextPathAddress);
    module.HEAP8[contextPathAddress + contextPathEncoded.length] = 0;

    const sdkEncoded = new TextEncoder().encode(this._sdk);
    const sdkAddress = module._malloc((sdkEncoded.length + 1) * Uint8Array.BYTES_PER_ELEMENT);
    if (!sdkAddress) {
      throw new RhinoErrors.RhinoOutOfMemoryError(
        'malloc failed: Cannot allocate memory'
      );
    }
    module.HEAP8.set(sdkEncoded, sdkAddress);
    module.HEAP8[sdkAddress + sdkEncoded.length] = 0;
    module._pv_set_sdk(sdkAddress);

    const messageStackDepthAddress = module._malloc(Int32Array.BYTES_PER_ELEMENT);
    if (!messageStackDepthAddress) {
      throw new RhinoErrors.RhinoOutOfMemoryError(
        'malloc failed: Cannot allocate memory'
      );
    }

    const messageStackAddressAddressAddress = module._malloc(Int32Array.BYTES_PER_ELEMENT);
    if (!messageStackAddressAddressAddress) {
      throw new RhinoErrors.RhinoOutOfMemoryError(
        'malloc failed: Cannot allocate memory'
      );
    }

    let status = await pv_rhino_init(
      accessKeyAddress,
      modelPathAddress,
      deviceAddress,
      contextPathAddress,
      sensitivity,
      endpointDurationSec,
      requireEndpoint ? 1 : 0,
      objectAddressAddress
    );

    module._pv_free(accessKeyAddress);
    module._pv_free(modelPathAddress);
    module._pv_free(deviceAddress);
    module._pv_free(contextPathAddress);

    if (status !== PvStatus.SUCCESS) {
      const messageStack = await Rhino.getMessageStack(
        module._pv_get_error_stack,
        module._pv_free_error_stack,
        messageStackAddressAddressAddress,
        messageStackDepthAddress,
        module.HEAP32,
        module.HEAPU8
      );

      throw pvStatusToException(status, 'Initialization failed', messageStack);
    }
    const objectAddress = module.HEAP32[objectAddressAddress / Int32Array.BYTES_PER_ELEMENT];
    module._pv_free(objectAddressAddress);

    const sampleRate = module._pv_sample_rate();
    const frameLength = module._pv_rhino_frame_length();
    const versionAddress = module._pv_rhino_version();
    const version = arrayBufferToStringAtIndex(
      module.HEAPU8,
      versionAddress
    );

    const contextInfoAddressAddress = module._malloc(Int32Array.BYTES_PER_ELEMENT);
    if (contextInfoAddressAddress === 0) {
      throw new RhinoErrors.RhinoOutOfMemoryError('malloc failed: Cannot allocate memory');
    }
    status = module._pv_rhino_context_info(
      objectAddress,
      contextInfoAddressAddress
    );
    if (status !== PvStatus.SUCCESS) {
      const messageStack = await Rhino.getMessageStack(
        module._pv_get_error_stack,
        module._pv_free_error_stack,
        messageStackAddressAddressAddress,
        messageStackDepthAddress,
        module.HEAP32,
        module.HEAPU8
      );

      throw pvStatusToException(status, "Failed to get context info", messageStack);
    }
    const contextInfoAddress = module.HEAP32[contextInfoAddressAddress / Int32Array.BYTES_PER_ELEMENT];
    await module._pv_free(contextInfoAddressAddress);
    const contextInfo = arrayBufferToStringAtIndex(
      module.HEAPU8,
      contextInfoAddress
    );

    const inputBufferAddress = module._malloc(frameLength * Int16Array.BYTES_PER_ELEMENT);
    if (inputBufferAddress === 0) {
      throw new RhinoErrors.RhinoOutOfMemoryError(
        'malloc failed: Cannot allocate memory'
      );
    }

    const isFinalizedAddress = module._malloc(Uint8Array.BYTES_PER_ELEMENT);
    if (isFinalizedAddress === 0) {
      throw new RhinoErrors.RhinoOutOfMemoryError(
        'malloc failed: Cannot allocate memory'
      );
    }

    const isUnderstoodAddress = module._malloc(Uint8Array.BYTES_PER_ELEMENT);
    if (isUnderstoodAddress === 0) {
      throw new RhinoErrors.RhinoOutOfMemoryError(
        'malloc failed: Cannot allocate memory'
      );
    }

    const intentAddressAddress = module._malloc(Int32Array.BYTES_PER_ELEMENT);
    if (intentAddressAddress === 0) {
      throw new RhinoErrors.RhinoOutOfMemoryError(
        'malloc failed: Cannot allocate memory'
      );
    }

    const numSlotsAddress = module._malloc(Int32Array.BYTES_PER_ELEMENT);
    if (numSlotsAddress === 0) {
      throw new RhinoErrors.RhinoOutOfMemoryError(
        'malloc failed: Cannot allocate memory'
      );
    }

    const slotsAddressAddressAddress = module._malloc(Int32Array.BYTES_PER_ELEMENT);
    if (slotsAddressAddressAddress === 0) {
      throw new RhinoErrors.RhinoOutOfMemoryError(
        'malloc failed: Cannot allocate memory'
      );
    }

    const valuesAddressAddressAddress = module._malloc(Int32Array.BYTES_PER_ELEMENT);
    if (valuesAddressAddressAddress === 0) {
      throw new RhinoErrors.RhinoOutOfMemoryError(
        'malloc failed: Cannot allocate memory'
      );
    }

    return {
      module: module,

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
      messageStackAddressAddressAddress: messageStackAddressAddressAddress,
      messageStackDepthAddress: messageStackDepthAddress,
    };
  }

  /**
   * Lists all available devices that Rhino can use for inference.
   * Each entry in the list can be the used as the `device` argument for the `.create` method.
   *
   * @returns List of all available devices that Rhino can use for inference.
   */
  public static async listAvailableDevices(): Promise<string[]> {
    return new Promise<string[]>((resolve, reject) => {
      Rhino._rhinoMutex
        .runExclusive(async () => {
          const isSimd = await simd();
          if (!isSimd) {
            throw new RhinoErrors.RhinoRuntimeError('Unsupported Browser');
          }

          const blob = new Blob(
            [base64ToUint8Array(this._wasmSimdLib)],
            { type: 'application/javascript' }
          );
          const module: RhinoModule = await createModuleSimd({
            mainScriptUrlOrBlob: blob,
            wasmBinary: base64ToUint8Array(this._wasmSimd),
          });

          const hardwareDevicesAddressAddress = module._malloc(Int32Array.BYTES_PER_ELEMENT);
          if (hardwareDevicesAddressAddress === 0) {
            throw new RhinoErrors.RhinoOutOfMemoryError(
              'malloc failed: Cannot allocate memory for hardwareDevices'
            );
          }

          const numHardwareDevicesAddress = module._malloc(Int32Array.BYTES_PER_ELEMENT);
          if (numHardwareDevicesAddress === 0) {
            throw new RhinoErrors.RhinoOutOfMemoryError(
              'malloc failed: Cannot allocate memory for numHardwareDevices'
            );
          }

          const status: PvStatus = module._pv_rhino_list_hardware_devices(
            hardwareDevicesAddressAddress,
            numHardwareDevicesAddress
          );

          const messageStackDepthAddress = module._malloc(Int32Array.BYTES_PER_ELEMENT);
          if (!messageStackDepthAddress) {
            throw new RhinoErrors.RhinoOutOfMemoryError(
              'malloc failed: Cannot allocate memory for messageStackDepth'
            );
          }

          const messageStackAddressAddressAddress = module._malloc(Int32Array.BYTES_PER_ELEMENT);
          if (!messageStackAddressAddressAddress) {
            throw new RhinoErrors.RhinoOutOfMemoryError(
              'malloc failed: Cannot allocate memory messageStack'
            );
          }

          if (status !== PvStatus.SUCCESS) {
            const messageStack = await Rhino.getMessageStack(
              module._pv_get_error_stack,
              module._pv_free_error_stack,
              messageStackAddressAddressAddress,
              messageStackDepthAddress,
              module.HEAP32,
              module.HEAPU8,
            );
            module._pv_free(messageStackAddressAddressAddress);
            module._pv_free(messageStackDepthAddress);

            throw pvStatusToException(
              status,
              'List devices failed',
              messageStack
            );
          }
          module._pv_free(messageStackAddressAddressAddress);
          module._pv_free(messageStackDepthAddress);

          const numHardwareDevices: number = module.HEAP32[numHardwareDevicesAddress / Int32Array.BYTES_PER_ELEMENT];
          module._pv_free(numHardwareDevicesAddress);

          const hardwareDevicesAddress = module.HEAP32[hardwareDevicesAddressAddress / Int32Array.BYTES_PER_ELEMENT];

          const hardwareDevices: string[] = [];
          for (let i = 0; i < numHardwareDevices; i++) {
            const deviceAddress = module.HEAP32[hardwareDevicesAddress / Int32Array.BYTES_PER_ELEMENT + i];
            hardwareDevices.push(arrayBufferToStringAtIndex(module.HEAPU8, deviceAddress));
          }
          module._pv_rhino_free_hardware_devices(
            hardwareDevicesAddress,
            numHardwareDevices
          );
          module._pv_free(hardwareDevicesAddressAddress);

          return hardwareDevices;
        })
        .then((result: string[]) => {
          resolve(result);
        })
        .catch((error: any) => {
          reject(error);
        });
    });
  }

  private static async getMessageStack(
    pv_get_error_stack: pv_get_error_stack_type,
    pv_free_error_stack: pv_free_error_stack_type,
    messageStackAddressAddressAddress: number,
    messageStackDepthAddress: number,
    memoryBufferInt32: Int32Array,
    memoryBufferUint8: Uint8Array,
  ): Promise<string[]> {
    const status = pv_get_error_stack(messageStackAddressAddressAddress, messageStackDepthAddress);
    if (status !== PvStatus.SUCCESS) {
      throw pvStatusToException(status, 'Unable to get Rhino error state');
    }

    const messageStackAddressAddress = memoryBufferInt32[messageStackAddressAddressAddress / Int32Array.BYTES_PER_ELEMENT];

    const messageStackDepth = memoryBufferInt32[messageStackDepthAddress / Int32Array.BYTES_PER_ELEMENT];
    const messageStack: string[] = [];
    for (let i = 0; i < messageStackDepth; i++) {
      const messageStackAddress = memoryBufferInt32[
        (messageStackAddressAddress / Int32Array.BYTES_PER_ELEMENT) + i
      ];
      const message = arrayBufferToStringAtIndex(memoryBufferUint8, messageStackAddress);
      messageStack.push(message);
    }

    pv_free_error_stack(messageStackAddressAddress);

    return messageStack;
  }

  protected static wrapAsyncFunction(module: RhinoModule, functionName: string, numArgs: number): (...args: any[]) => any {
    // @ts-ignore
    return module.cwrap(
      functionName,
      "number",
      Array(numArgs).fill("number"),
      { async: true }
    );
  }
}
