//
// Copyright 2020-2025 Picovoice Inc.
//
// You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
// file accompanying this source.
//
// Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
// an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
// specific language governing permissions and limitations under the License.
//
'use strict';

import * as fs from 'fs';
import * as path from 'path';

import PvStatus from './pv_status_t';
import {
  RhinoInvalidArgumentError,
  RhinoInvalidStateError,
  pvStatusToException,
} from './errors';
import {
  RhinoInputOptions,
  RhinoOptions,
} from './types';
import { getSystemLibraryPath } from './platforms';

const MODEL_PATH_DEFAULT = '../lib/common/rhino_params.pv';

export type RhinoInference = {
  isUnderstood: boolean;
  intent?: string;
  slots?: Record<string, string>;
};

type RhinoHandleAndStatus = {
  handle: any;
  status: PvStatus
};
type FinalizedAndStatus = {
  is_finalized: number;
  status: PvStatus
};
type InferenceAndStatus = {
  is_understood: number;
  intent?: string;
  slots?: Record<string, string>;
  status: PvStatus;
};
type ContextAndStatus = {
  context_info: string;
  status: PvStatus
};
type RhinoHardwareDevicesResult = {
  hardware_devices: string[];
  status: PvStatus;
};

/**
 * Wraps the Rhino engine and context.
 *
 * Performs the calls to the Rhino node library. Does some basic parameter validation to prevent
 * errors occurring in the library layer. Provides clearer error messages in native JavaScript.
 */
export default class Rhino {
  private _pvRhino: any;

  private _handle: any;

  private readonly _version: string;
  private readonly _sampleRate: number;
  private readonly _frameLength: number;
  private isFinalized: boolean;

  /**
   * Creates an instance of Rhino with a specific context.
   * @param {string} accessKey AccessKey obtained from Picovoice Console (https://console.picovoice.ai/).
   * @param {string} contextPath the path to the Rhino context file (.rhn extension)
   * @param {number} options.sensitivity [0.5] the sensitivity in the range [0,1]
   * @param {number} options.endpointDurationSec Endpoint duration in seconds. An endpoint is a chunk of silence at the end of an
   * utterance that marks the end of spoken command. It should be a positive number within [0.5, 5]. A lower endpoint
   * duration reduces delay and improves responsiveness. A higher endpoint duration assures Rhino doesn't return inference
   * preemptively in case the user pauses before finishing the request.
   * @param {boolean} options.requireEndpoint If set to `true`, Rhino requires an endpoint (a chunk of silence) after the spoken command.
   * If set to `false`, Rhino tries to detect silence, but if it cannot, it still will provide inference regardless. Set
   * to `false` only if operating in an environment with overlapping speech (e.g. people talking in the background).
   * @param {string} options.device String representation of the device (e.g., CPU or GPU) to use for inference.
   * If set to `best`, the most suitable device is selected automatically. If set to `gpu`, the engine uses the
   * first available GPU device. To select a specific GPU device, set this argument to `gpu:${GPU_INDEX}`, where
   * `${GPU_INDEX}` is the index of the target GPU. If set to `cpu`, the engine will run on the CPU with the
   * default number of threads. To specify the number of threads, set this argument to `cpu:${NUM_THREADS}`,
   * where `${NUM_THREADS}` is the desired number of threads.
   * @param {string} options.modelPath the path to the Rhino model (.pv extension)
   * @param {string} options.libraryPath the path to the Rhino dynamic library (platform-dependent extension)
   */
  constructor(
    accessKey: string,
    contextPath: string,
    options: RhinoOptions = {}
  ) {
    if (
      accessKey === null ||
      accessKey === undefined ||
      accessKey.length === 0
    ) {
      throw new RhinoInvalidArgumentError(`No AccessKey provided to Rhino`);
    }

    const {
      modelPath = path.resolve(__dirname, MODEL_PATH_DEFAULT),
      device = "best",
      sensitivity = 0.5,
      endpointDurationSec = 1.0,
      requireEndpoint = true,
      libraryPath = getSystemLibraryPath(),
    } = options;

    if (!fs.existsSync(libraryPath)) {
      throw new RhinoInvalidArgumentError(
        `File not found at 'libraryPath': ${libraryPath}`
      );
    }

    if (!fs.existsSync(modelPath)) {
      throw new RhinoInvalidArgumentError(
        `File not found at 'modelPath': ${modelPath}`
      );
    }

    if (!fs.existsSync(contextPath)) {
      throw new RhinoInvalidArgumentError(
        `File not found at 'contextPath': ${contextPath}`
      );
    }

    if (sensitivity < 0 || sensitivity > 1 || isNaN(sensitivity)) {
      throw new RangeError(
        `Sensitivity value in 'sensitivities' not in range [0,1]: ${sensitivity}`
      );
    }

    if (
      endpointDurationSec < 0.5 ||
      endpointDurationSec > 5.0 ||
      isNaN(endpointDurationSec)
    ) {
      throw new RangeError(
        `Endpoint duration should be within [0.5, 5]: ${endpointDurationSec}`
      );
    }

    if (
      device === null ||
      device === undefined ||
      device.length === 0
    ) {
      throw new RhinoInvalidArgumentError(`No device provided to Rhino`);
    }

    const pvRhino = require(libraryPath); // eslint-disable-line
    this._pvRhino = pvRhino;

    let rhinoHandleAndStatus: RhinoHandleAndStatus | null = null;
    try {
      pvRhino.set_sdk("nodejs");

      rhinoHandleAndStatus = pvRhino.init(
        accessKey,
        modelPath,
        device,
        contextPath,
        sensitivity,
        endpointDurationSec,
        requireEndpoint
      );
    } catch (err: any) {
      pvStatusToException(<PvStatus>err.code, err);
    }

    const status = rhinoHandleAndStatus!.status;
    if (status !== PvStatus.SUCCESS) {
      this.handlePvStatus(status, "Rhino failed to initialize");
    }

    this._handle = rhinoHandleAndStatus!.handle;
    this._frameLength = pvRhino.frame_length();
    this._sampleRate = pvRhino.sample_rate();
    this._version = pvRhino.version();

    this.isFinalized = false;
  }

  /**
   * @returns number of audio samples per frame (i.e. the length of the array provided to the process function)
   * @see {@link process}
   */
  get frameLength(): number {
    return this._frameLength;
  }

  /**
   * @returns the audio sampling rate accepted by Rhino
   */
  get sampleRate(): number {
    return this._sampleRate;
  }

  /**
   * @returns the version of the Rhino engine
   */
  get version(): string {
    return this._version;
  }

  /**
   * Process a frame of pcm audio.
   *
   * @param {Array} frame 16-bit integers of 16kHz linear PCM mono audio.
   * The specific array length is obtained from Rhino via the frameLength field.
   * @returns {boolean} true when Rhino has concluded processing audio and determined the intent (or that the intent was not understood), false otherwise.
   */
  process(frame: Int16Array): boolean {
    if (
      this._handle === 0 ||
      this._handle === null ||
      this._handle === undefined
    ) {
      throw new RhinoInvalidStateError('Rhino is not initialized');
    }

    if (frame === undefined || frame === null) {
      throw new RhinoInvalidArgumentError(
        `Frame array provided to process() is undefined or null`
      );
    } else if (frame.length !== this.frameLength) {
      throw new RhinoInvalidArgumentError(
        `Size of frame array provided to 'process' (${frame.length}) does not match the engine 'frameLength' (${this.frameLength})`
      );
    }

    // sample the first frame to check for non-integer values
    if (!Number.isInteger(frame[0])) {
      throw new RhinoInvalidArgumentError(
        `Non-integer frame values provided to process(): ${frame[0]}. Rhino requires 16-bit integers`
      );
    }

    const frameBuffer = new Int16Array(frame);

    let finalizedAndStatus: FinalizedAndStatus | null = null;
    try {
      finalizedAndStatus = this._pvRhino.process(this._handle, frameBuffer);
    } catch (err: any) {
      pvStatusToException(<PvStatus>err.code, err);
    }

    const status = finalizedAndStatus!.status;
    if (status !== PvStatus.SUCCESS) {
      this.handlePvStatus(status, "Rhino failed to process the frame");
    }

    this.isFinalized = finalizedAndStatus!.is_finalized === 1;
    return this.isFinalized;
  }

  /** 
   * Resets the internal state of Rhino. It should be called before the engine can be used to infer intent from a new
   * stream of audio
   */
  reset(): void {
    if (
      this._handle === 0 ||
      this._handle === null ||
      this._handle === undefined
    ) {
      throw new RhinoInvalidStateError('Rhino is not initialized');
    }

    let status: number | null = null;
    try {
      status = this._pvRhino.reset(this._handle);
    } catch (err: any) {
      pvStatusToException(<PvStatus>err.code, err);
    }

    if (status && status !== PvStatus.SUCCESS) {
      this.handlePvStatus(status, "Rhino failed to reset");
    }
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
  getInference(): RhinoInference {
    if (!this.isFinalized) {
      throw new RhinoInvalidStateError(
        "'getInference' was called but Rhino has not yet reached a conclusion. Use the results of calling process to determine if Rhino has concluded"
      );
    }

    if (
      this._handle === 0 ||
      this._handle === null ||
      this._handle === undefined
    ) {
      throw new RhinoInvalidStateError('Rhino is not initialized');
    }

    let inferenceAndStatus: InferenceAndStatus | null = null;
    try {
      inferenceAndStatus = this._pvRhino.get_inference(this._handle);
    } catch (err: any) {
      pvStatusToException(<PvStatus>err.code, err);
    }

    const status = inferenceAndStatus!.status;
    if (status !== PvStatus.SUCCESS) {
      this.handlePvStatus(status, "Rhino failed to get inference");
    }

    const inference: RhinoInference = {
      isUnderstood: inferenceAndStatus!.is_understood === 1,
      intent: inferenceAndStatus!.intent,
      slots: inferenceAndStatus!.slots,
    };

    return inference;
  }

  /**
   * Gets the source of the Rhino context in YAML format. Shows the list of intents,
   * which expressions map to those intents, as well as slots and their possible values.
   *
   * @returns {string} the context YAML
   */
  getContextInfo(): string {
    if (
      this._handle === 0 ||
      this._handle === null ||
      this._handle === undefined
    ) {
      throw new RhinoInvalidStateError('Rhino is not initialized');
    }

    let contextAndStatus: ContextAndStatus | null = null;
    try {
      contextAndStatus = this._pvRhino.context_info(this._handle);
    } catch (err: any) {
      pvStatusToException(<PvStatus>err.code, err);
    }

    const status = contextAndStatus!.status;
    if (status !== PvStatus.SUCCESS) {
      this.handlePvStatus(status, "Rhino failed to get context info");
    }

    return contextAndStatus!.context_info;
  }

  /**
   * Releases the resources acquired by Rhino.
   *
   * Be sure to call this when finished with the instance
   * to reclaim the memory that was allocated by the C library.
   */
  release(): void {
    if (this._handle !== 0) {
      this._pvRhino.delete(this._handle);
      this._handle = 0;
    } else {
      // eslint-disable-next-line no-console
      console.warn('Rhino is not initialized; nothing to destroy');
    }
  }

  /**
   * Lists all available devices that Rhino can use for inference. Each entry in the list can be the `device` argument
   * of the constructor.
   *
   * @returns List of all available devices that Rhino can use for inference.
   */
  static listAvailableDevices(options: RhinoInputOptions = {}): string[] {
    const {
      libraryPath = getSystemLibraryPath(),
    } = options;

    const pvRhino = require(libraryPath); // eslint-disable-line

    let rhinoHardwareDevicesResult: RhinoHardwareDevicesResult | null = null;
    try {
      rhinoHardwareDevicesResult = pvRhino.list_hardware_devices();
    } catch (err: any) {
      pvStatusToException(<PvStatus>err.code, err);
    }

    const status = rhinoHardwareDevicesResult!.status;
    if (status !== PvStatus.SUCCESS) {
      const errorObject = pvRhino.get_error_stack();
      if (errorObject.status === PvStatus.SUCCESS) {
        pvStatusToException(status, 'Rhino failed to get available devices', errorObject.message_stack);
      } else {
        pvStatusToException(status, 'Unable to get Rhino error state');
      }
    }

    return rhinoHardwareDevicesResult!.hardware_devices;
  }

  private handlePvStatus(status: PvStatus, message: string): void {
    const errorObject = this._pvRhino.get_error_stack();
    if (errorObject.status === PvStatus.SUCCESS) {
      pvStatusToException(status, message, errorObject.message_stack);
    } else {
      pvStatusToException(status, "Unable to get Rhino error state");
    }
  }
}
