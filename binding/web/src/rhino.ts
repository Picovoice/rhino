/*
  Copyright 2022-2023 Picovoice Inc.

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
  isAccessKeyValid,
  loadModel,
  pv_free_type,
  PvError
} from '@picovoice/web-utils';

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
type pv_rhino_reset_type = (object: number) => Promise<number>;
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
type pv_rhino_version_type = () => Promise<number>;
type pv_sample_rate_type = () => Promise<number>;
type pv_status_to_string_type = (status: number) => Promise<number>;
type pv_set_sdk_type = (sdk: number) => Promise<void>;
type pv_get_error_stack_type = (messageStack: number, messageStackDepth: number) => Promise<number>;
type pv_free_error_stack_type = (messageStack: number) => Promise<void>;


/**
 * JavaScript/WebAssembly Binding for the Picovoice Rhino Speech-to-Intent engine.
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
  messageStackAddressAddressAddress: number;
  messageStackDepthAddress: number;

  pvRhinoDelete: pv_rhino_delete_type;
  pvRhinoFreeSlotsAndValues: pv_rhino_free_slots_and_values_type;
  pvRhinoGetIntent: pv_rhino_get_intent_type;
  pvRhinoIsUnderstood: pv_rhino_is_understood_type;
  pvRhinoProcess: pv_rhino_process_type;
  pvRhinoReset: pv_rhino_reset_type;
  pvStatusToString: pv_status_to_string_type;
  pvGetErrorStack: pv_get_error_stack_type;
  pvFreeErrorStack: pv_free_error_stack_type;
};

export class Rhino {
  private readonly _pvRhinoDelete: pv_rhino_delete_type;
  private readonly _pvRhinoFreeSlotsAndValues: pv_rhino_free_slots_and_values_type;
  private readonly _pvRhinoGetIntent: pv_rhino_get_intent_type;
  private readonly _pvRhinoIsUnderstood: pv_rhino_is_understood_type;
  private readonly _pvRhinoProcess: pv_rhino_process_type;
  private readonly _pvRhinoReset: pv_rhino_reset_type;
  private readonly _pvStatusToString: pv_status_to_string_type;
  private readonly _pvGetErrorStack: pv_get_error_stack_type;
  private readonly _pvFreeErrorStack: pv_free_error_stack_type;

  private _wasmMemory: WebAssembly.Memory | undefined;
  private readonly _pvFree: pv_free_type;
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

  private static _frameLength: number;
  private static _sampleRate: number;
  private static _contextInfo: string;
  private static _version: string;
  private static _wasm: string;
  private static _wasmSimd: string;
  private static _sdk: string = "web";

  private readonly _inferenceCallback: InferenceCallback;
  private readonly _processErrorCallback: (error: RhinoErrors.RhinoError) => void;

  private static _rhinoMutex = new Mutex();

  private constructor(
    handleWasm: RhinoWasmOutput,
    inferenceCallback: InferenceCallback,
    processErrorCallback: (error: RhinoErrors.RhinoError) => void
  ) {
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
    this._pvGetErrorStack = handleWasm.pvGetErrorStack;
    this._pvFreeErrorStack = handleWasm.pvFreeErrorStack;

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

    return new Promise<Rhino>((resolve, reject) => {
      Rhino._rhinoMutex
        .runExclusive(async () => {
          const isSimd = await simd();
          const wasmOutput = await Rhino.initWasm(
            accessKey.trim(),
            contextPath,
            sensitivity,
            isSimd ? this._wasmSimd : this._wasm,
            modelPath,
            options
          );
          const { processErrorCallback } = options;
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
        if (this._wasmMemory === undefined) {
          throw new RhinoErrors.RhinoInvalidStateError('Attempted to call Rhino process after release.');
        }
        const memoryBuffer = new Int16Array(this._wasmMemory.buffer);

        memoryBuffer.set(
          pcm,
          this._inputBufferAddress / Int16Array.BYTES_PER_ELEMENT
        );

        let status = await this._pvRhinoProcess(
          this._objectAddress,
          this._inputBufferAddress,
          this._isFinalizedAddress
        );

        const memoryBufferUint8 = new Uint8Array(this._wasmMemory.buffer);
        const memoryBufferView = new DataView(this._wasmMemory.buffer);

        if (status !== PvStatus.SUCCESS) {
          const messageStack = await Rhino.getMessageStack(
            this._pvGetErrorStack,
            this._pvFreeErrorStack,
            this._messageStackAddressAddressAddress,
            this._messageStackDepthAddress,
            memoryBufferView,
            memoryBufferUint8
          );

          throw pvStatusToException(status, "Processing failed", messageStack);
        }

        const isFinalized = memoryBufferView.getUint8(
          this._isFinalizedAddress
        );

        if (isFinalized === 1) {
          status = await this._pvRhinoIsUnderstood(
            this._objectAddress,
            this._isUnderstoodAddress
          );
          if (status !== PvStatus.SUCCESS) {
            const messageStack = await Rhino.getMessageStack(
              this._pvGetErrorStack,
              this._pvFreeErrorStack,
              this._messageStackAddressAddressAddress,
              this._messageStackDepthAddress,
              memoryBufferView,
              memoryBufferUint8
            );

            throw pvStatusToException(status, "Failed to get inference", messageStack);
          }

          const isUnderstood = memoryBufferView.getUint8(
            this._isUnderstoodAddress
          );

          if (isUnderstood === -1) {
            throw new RhinoErrors.RhinoInvalidStateError('Rhino failed to process the command');
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
            if (status !== PvStatus.SUCCESS) {
              const messageStack = await Rhino.getMessageStack(
                this._pvGetErrorStack,
                this._pvFreeErrorStack,
                this._messageStackAddressAddressAddress,
                this._messageStackDepthAddress,
                memoryBufferView,
                memoryBufferUint8
              );

              throw pvStatusToException(status, "Failed to get intent", messageStack);
            }

            const intentAddress = memoryBufferView.getInt32(
              this._intentAddressAddress,
              true
            );
            intent = arrayBufferToStringAtIndex(
              memoryBufferUint8,
              intentAddress
            );

            const numSlots = memoryBufferView.getInt32(
              this._numSlotsAddress,
              true
            );
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

            const slotsAddressAddress = memoryBufferView.getInt32(
              this._slotsAddressAddressAddress,
              true
            );

            const valuesAddressAddress = memoryBufferView.getInt32(
              this._valuesAddressAddressAddress,
              true
            );

            status = await this._pvRhinoFreeSlotsAndValues(
              this._objectAddress,
              slotsAddressAddress,
              valuesAddressAddress
            );
            if (status !== PvStatus.SUCCESS) {
              const messageStack = await Rhino.getMessageStack(
                this._pvGetErrorStack,
                this._pvFreeErrorStack,
                this._messageStackAddressAddressAddress,
                this._messageStackDepthAddress,
                memoryBufferView,
                memoryBufferUint8
              );

              throw pvStatusToException(status, "Failed to clean up resources", messageStack);
            }
          }

          status = await this._pvRhinoReset(this._objectAddress);
          if (status !== PvStatus.SUCCESS) {
            const messageStack = await Rhino.getMessageStack(
              this._pvGetErrorStack,
              this._pvFreeErrorStack,
              this._messageStackAddressAddressAddress,
              this._messageStackDepthAddress,
              memoryBufferView,
              memoryBufferUint8
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
    const memoryBufferUint8 = new Uint8Array(this._wasmMemory.buffer);
    const memoryBufferView = new DataView(this._wasmMemory.buffer);

    const slotsAddressAddress = memoryBufferView.getInt32(
      this._slotsAddressAddressAddress,
      true
    );

    const slotAddress = memoryBufferView.getInt32(
      slotsAddressAddress + index * Int32Array.BYTES_PER_ELEMENT,
      true
    );

    return arrayBufferToStringAtIndex(memoryBufferUint8, slotAddress);
  }

  private _getSlotValue(index: number): string {
    const memoryBufferUint8 = new Uint8Array(this._wasmMemory.buffer);
    const memoryBufferView = new DataView(this._wasmMemory.buffer);

    const valuesAddressAddress = memoryBufferView.getInt32(
      this._valuesAddressAddressAddress,
      true
    );

    const valueAddress = memoryBufferView.getInt32(
      valuesAddressAddress + index * Int32Array.BYTES_PER_ELEMENT,
      true
    );

    return arrayBufferToStringAtIndex(memoryBufferUint8, valueAddress);
  }

  /**
   * Resets the internal Rhino state.
   */
  public async reset(): Promise<void> {
    const status = await this._pvRhinoReset(this._objectAddress);
    if (status !== PvStatus.SUCCESS) {
      const memoryBufferView = new DataView(this._wasmMemory.buffer);
      const memoryBufferUint8 = new Uint8Array(this._wasmMemory.buffer);
      const messageStack = await Rhino.getMessageStack(
        this._pvGetErrorStack,
        this._pvFreeErrorStack,
        this._messageStackAddressAddressAddress,
        this._messageStackDepthAddress,
        memoryBufferView,
        memoryBufferUint8
      );

      throw pvStatusToException(status, "Failed to reset", messageStack);
    }
  }

  /**
   * Releases resources acquired by WebAssembly module.
   */
  public async release(): Promise<void> {
    await this._pvRhinoDelete(this._objectAddress);
    await this._pvFree(this._messageStackAddressAddressAddress);
    await this._pvFree(this._messageStackDepthAddress);
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
    wasmBase64: string,
    modelPath: string,
    initConfig: RhinoOptions
  ): Promise<any> {
    // A WebAssembly page has a constant size of 64KiB. -> 1MiB ~= 16 pages
    // minimum memory requirements for init: 17 pages
    const memory = new WebAssembly.Memory({ initial: 128 });

    const memoryBufferUint8 = new Uint8Array(memory.buffer);

    const pvError = new PvError();

    const exports = await buildWasm(memory, wasmBase64, pvError);

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
    const pv_set_sdk = exports.pv_set_sdk as pv_set_sdk_type;
    const pv_get_error_stack = exports.pv_get_error_stack as pv_get_error_stack_type;
    const pv_free_error_stack = exports.pv_free_error_stack as pv_free_error_stack_type;

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

    // acquire and init memory for c_object
    const objectAddressAddress = await aligned_alloc(
      Int32Array.BYTES_PER_ELEMENT,
      Int32Array.BYTES_PER_ELEMENT
    );
    if (objectAddressAddress === 0) {
      throw new RhinoErrors.RhinoOutOfMemoryError('malloc failed: Cannot allocate memory');
    }

    // acquire and init memory for c_access_key
    const accessKeyAddress = await aligned_alloc(
      Uint8Array.BYTES_PER_ELEMENT,
      (accessKey.length + 1) * Uint8Array.BYTES_PER_ELEMENT
    );
    if (accessKeyAddress === 0) {
      throw new RhinoErrors.RhinoOutOfMemoryError('malloc failed: Cannot allocate memory');
    }
    for (let i = 0; i < accessKey.length; i++) {
      memoryBufferUint8[accessKeyAddress + i] = accessKey.charCodeAt(i);
    }
    memoryBufferUint8[accessKeyAddress + accessKey.length] = 0;

    // acquire and init memory for c_model_path
    const encodedModelPath = new TextEncoder().encode(modelPath);
    const modelPathAddress = await aligned_alloc(
      Uint8Array.BYTES_PER_ELEMENT,
      (encodedModelPath.length + 1) * Uint8Array.BYTES_PER_ELEMENT
    );
    if (modelPathAddress === 0) {
      throw new RhinoErrors.RhinoOutOfMemoryError('malloc failed: Cannot allocate memory');
    }
    memoryBufferUint8.set(encodedModelPath, modelPathAddress);
    memoryBufferUint8[modelPathAddress + encodedModelPath.length] = 0;

    // acquire and init memory for c_context_path
    const encodedContextPath = new TextEncoder().encode(contextPath);
    const contextPathAddress = await aligned_alloc(
      Uint8Array.BYTES_PER_ELEMENT,
      (encodedContextPath.length + 1) * Uint8Array.BYTES_PER_ELEMENT
    );
    if (contextPathAddress === 0) {
      throw new RhinoErrors.RhinoOutOfMemoryError('malloc failed: Cannot allocate memory');
    }
    memoryBufferUint8.set(encodedContextPath, contextPathAddress);
    memoryBufferUint8[contextPathAddress + encodedContextPath.length] = 0;

    const sdkEncoded = new TextEncoder().encode(this._sdk);
    const sdkAddress = await aligned_alloc(
      Uint8Array.BYTES_PER_ELEMENT,
      (sdkEncoded.length + 1) * Uint8Array.BYTES_PER_ELEMENT
    );
    if (!sdkAddress) {
      throw new RhinoErrors.RhinoOutOfMemoryError('malloc failed: Cannot allocate memory');
    }
    memoryBufferUint8.set(sdkEncoded, sdkAddress);
    memoryBufferUint8[sdkAddress + sdkEncoded.length] = 0;
    await pv_set_sdk(sdkAddress);

    const messageStackDepthAddress = await aligned_alloc(
      Int32Array.BYTES_PER_ELEMENT,
      Int32Array.BYTES_PER_ELEMENT
    );
    if (!messageStackDepthAddress) {
      throw new RhinoErrors.RhinoOutOfMemoryError('malloc failed: Cannot allocate memory');
    }

    const messageStackAddressAddressAddress = await aligned_alloc(
      Int32Array.BYTES_PER_ELEMENT,
      Int32Array.BYTES_PER_ELEMENT
    );
    if (!messageStackAddressAddressAddress) {
      throw new RhinoErrors.RhinoOutOfMemoryError('malloc failed: Cannot allocate memory');
    }

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

    const memoryBufferView = new DataView(memory.buffer);

    if (status !== PvStatus.SUCCESS) {
      const messageStack = await Rhino.getMessageStack(
        pv_get_error_stack,
        pv_free_error_stack,
        messageStackAddressAddressAddress,
        messageStackDepthAddress,
        memoryBufferView,
        memoryBufferUint8
      );

      throw pvStatusToException(status, "Initialization failed", messageStack, pvError);
    }
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
      throw new RhinoErrors.RhinoOutOfMemoryError('malloc failed: Cannot allocate memory');
    }
    status = await pv_rhino_context_info(
      objectAddress,
      contextInfoAddressAddress
    );
    if (status !== PvStatus.SUCCESS) {
      const messageStack = await Rhino.getMessageStack(
        pv_get_error_stack,
        pv_free_error_stack,
        messageStackAddressAddressAddress,
        messageStackDepthAddress,
        memoryBufferView,
        memoryBufferUint8
      );

      throw pvStatusToException(status, "Failed to get context info", messageStack, pvError);
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
      throw new RhinoErrors.RhinoOutOfMemoryError('malloc failed: Cannot allocate memory');
    }

    const isFinalizedAddress = await aligned_alloc(
      Uint8Array.BYTES_PER_ELEMENT,
      Uint8Array.BYTES_PER_ELEMENT
    );
    if (isFinalizedAddress === 0) {
      throw new RhinoErrors.RhinoOutOfMemoryError('malloc failed: Cannot allocate memory');
    }

    const isUnderstoodAddress = await aligned_alloc(
      Uint8Array.BYTES_PER_ELEMENT,
      Uint8Array.BYTES_PER_ELEMENT
    );
    if (isUnderstoodAddress === 0) {
      throw new RhinoErrors.RhinoOutOfMemoryError('malloc failed: Cannot allocate memory');
    }

    const intentAddressAddress = await aligned_alloc(
      Int32Array.BYTES_PER_ELEMENT,
      Int32Array.BYTES_PER_ELEMENT
    );
    if (intentAddressAddress === 0) {
      throw new RhinoErrors.RhinoOutOfMemoryError('malloc failed: Cannot allocate memory');
    }

    const numSlotsAddress = await aligned_alloc(
      Int32Array.BYTES_PER_ELEMENT,
      Int32Array.BYTES_PER_ELEMENT
    );
    if (numSlotsAddress === 0) {
      throw new RhinoErrors.RhinoOutOfMemoryError('malloc failed: Cannot allocate memory');
    }

    const slotsAddressAddressAddress = await aligned_alloc(
      Int32Array.BYTES_PER_ELEMENT,
      Int32Array.BYTES_PER_ELEMENT
    );
    if (slotsAddressAddressAddress === 0) {
      throw new RhinoErrors.RhinoOutOfMemoryError('malloc failed: Cannot allocate memory');
    }

    const valuesAddressAddressAddress = await aligned_alloc(
      Int32Array.BYTES_PER_ELEMENT,
      Int32Array.BYTES_PER_ELEMENT
    );
    if (valuesAddressAddressAddress === 0) {
      throw new RhinoErrors.RhinoOutOfMemoryError('malloc failed: Cannot allocate memory');
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
      messageStackAddressAddressAddress: messageStackAddressAddressAddress,
      messageStackDepthAddress: messageStackDepthAddress,

      pvRhinoDelete: pv_rhino_delete,
      pvRhinoFreeSlotsAndValues: pv_rhino_free_slots_and_values,
      pvRhinoGetIntent: pv_rhino_get_intent,
      pvRhinoIsUnderstood: pv_rhino_is_understood,
      pvRhinoProcess: pv_rhino_process,
      pvRhinoReset: pv_rhino_reset,
      pvStatusToString: pv_status_to_string,
      pvGetErrorStack: pv_get_error_stack,
      pvFreeErrorStack: pv_free_error_stack,
    };
  }

  private static async getMessageStack(
    pv_get_error_stack: pv_get_error_stack_type,
    pv_free_error_stack: pv_free_error_stack_type,
    messageStackAddressAddressAddress: number,
    messageStackDepthAddress: number,
    memoryBufferView: DataView,
    memoryBufferUint8: Uint8Array,
  ): Promise<string[]> {
    const status = await pv_get_error_stack(messageStackAddressAddressAddress, messageStackDepthAddress);
    if (status !== PvStatus.SUCCESS) {
      throw pvStatusToException(status, "Unable to get Rhino error state");
    }

    const messageStackAddressAddress = memoryBufferView.getInt32(messageStackAddressAddressAddress, true);

    const messageStackDepth = memoryBufferView.getInt32(messageStackDepthAddress, true);
    const messageStack: string[] = [];
    for (let i = 0; i < messageStackDepth; i++) {
      const messageStackAddress = memoryBufferView.getInt32(
        messageStackAddressAddress + (i * Int32Array.BYTES_PER_ELEMENT), true);
      const message = arrayBufferToStringAtIndex(memoryBufferUint8, messageStackAddress);
      messageStack.push(message);
    }

    await pv_free_error_stack(messageStackAddressAddress);

    return messageStack;
  }
}
