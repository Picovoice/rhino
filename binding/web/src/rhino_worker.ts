/*
  Copyright 2022 Picovoice Inc.

  You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
  file accompanying this source.

  Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
  an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
  specific language governing permissions and limitations under the License.
*/

import { fromBase64, fromPublicDirectory } from '@picovoice/web-utils';

import PvWorker from 'web-worker:./rhino_worker_handler.ts';

import { contextProcess } from './utils';

import {
  InferenceCallback,
  RhinoContext,
  RhinoInference,
  RhinoOptions,
  RhinoWorkerInitResponse,
  RhinoWorkerProcessResponse,
  RhinoWorkerReleaseResponse,
} from './types';

export class RhinoWorker {
  private readonly _worker: Worker;
  private readonly _version: string;
  private readonly _frameLength: number;
  private readonly _sampleRate: number;
  private readonly _contextInfo: string;

  private static _wasm: string;
  private static _wasmSimd: string;

  private constructor(
    worker: Worker,
    version: string,
    frameLength: number,
    sampleRate: number,
    contextInfo: string
  ) {
    this._worker = worker;
    this._version = version;
    this._frameLength = frameLength;
    this._sampleRate = sampleRate;
    this._contextInfo = contextInfo;
  }

  /**
   * Get Rhino engine version.
   */
  get version(): string {
    return this._version;
  }

  /**
   * Get Rhino frame length.
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
   * Get Rhino worker instance.
   */
  get worker(): Worker {
    return this._worker;
  }

  /**
   * Get context info.
   */
  get contextInfo(): string {
    return this._contextInfo;
  }

  /**
   * Creates an instance of the Rhino sppech-to-intent engine using a base64'd string
   * of the model file. The model size is large, hence it will try to use the
   * existing one if it exists, otherwise saves the model in storage.
   *
   * @param accessKey AccessKey generated by Picovoice Console.
   * @param context RhinoContext object containing a base64
   * representation of or path to public binary of a Rhino context model .
   * @param inferenceCallback User-defined callback invoked upon processing a frame of audio.
   * The only input argument is an object of type RhinoInference.
   * @param modelBase64 The model in base64 string to initialize Rhino.
   * @param options Optional configuration arguments.
   * @param options.sensitivity Inference sensitivity. It should be a number within [0, 1].
   * A higher sensitivity value results in fewer misses at the cost of (potentially)
   * increasing the erroneous inference rate.
   * @param options.endpointDurationSec Endpoint duration in seconds.
   * An endpoint is a chunk of silence at the end of an utterance that marks
   * the end of spoken command. It should be a positive number within [0.5, 5].
   * A lower endpoint duration reduces delay and improves responsiveness. A higher endpoint duration
   * assures Rhino doesn't return inference pre-emptively in case the user pauses before finishing the request.
   * @param options.requireEndpoint If set to `true`, Rhino requires an endpoint (a chunk of silence)
   * after the spoken command. If set to `false`, Rhino tries to detect silence, but if it cannot,
   * it still will provide inference regardless. Set to `false` only if operating in an
   * environment with overlapping speech (e.g. people talking in the background).
   * @param options.processErrorCallback User-defined callback invoked if any error happens
   * while processing the audio stream. Its only input argument is the error message.
   * @param options.customWritePath Custom path to save the model in storage.
   * Set to a different name to use multiple models across `rhino` instances.
   * @param options.forceWrite Flag to overwrite the model in storage even if it exists.
   * @param options.version Rhino model version. Set to a higher number to update the model file.
   * @returns An instance of the Rhino engine.
   */

  public static async fromBase64(
    accessKey: string,
    context: RhinoContext,
    inferenceCallback: InferenceCallback,
    modelBase64: string,
    options: RhinoOptions = {}
  ): Promise<RhinoWorker> {
    const {
      customWritePath = 'rhino_model',
      forceWrite = false,
      version = 1,
      ...rest
    } = options;
    await fromBase64(customWritePath, modelBase64, forceWrite, version);
    const contextPath = await contextProcess(context);
    return this.create(
      accessKey,
      contextPath,
      inferenceCallback,
      customWritePath,
      rest
    );
  }

  /**
   * Creates a worker instance of the Rhino speech-to-intent engine using '.pv' file in
   * public directory. The model size is large, hence it will try to use the existing one if it exists,
   * otherwise saves the model in storage.
   *
   * @param accessKey AccessKey generated by Picovoice Console.
   * @param context RhinoContext object containing a base64
   * representation of or path to public binary of a Rhino context model .
   * @param inferenceCallback User-defined callback invoked upon processing a frame of audio.
   * The only input argument is an object of type RhinoInference.
   * @param publicPath The model path relative to the public directory.
   * @param options Optional configuration arguments.
   * @param options.sensitivity Inference sensitivity. It should be a number within [0, 1].
   * A higher sensitivity value results in fewer misses at the cost of (potentially)
   * increasing the erroneous inference rate.
   * @param options.endpointDurationSec Endpoint duration in seconds.
   * An endpoint is a chunk of silence at the end of an utterance that marks
   * the end of spoken command. It should be a positive number within [0.5, 5].
   * A lower endpoint duration reduces delay and improves responsiveness. A higher endpoint duration
   * assures Rhino doesn't return inference pre-emptively in case the user pauses before finishing the request.
   * @param options.requireEndpoint If set to `true`, Rhino requires an endpoint (a chunk of silence)
   * after the spoken command. If set to `false`, Rhino tries to detect silence, but if it cannot,
   * it still will provide inference regardless. Set to `false` only if operating in an
   * environment with overlapping speech (e.g. people talking in the background).
   * @param options.processErrorCallback User-defined callback invoked if any error happens
   * while processing the audio stream. Its only input argument is the error message.
   * @param options.customWritePath Custom path to save the model in storage.
   * Set to a different name to use multiple models across `rhino` instances.
   * @param options.forceWrite Flag to overwrite the model in storage even if it exists.
   * @param options.version Rhino model version. Set to a higher number to update the model file.
   * @returns An instance of RhinoWorker.
   */
  public static async fromPublicDirectory(
    accessKey: string,
    context: RhinoContext,
    inferenceCallback: InferenceCallback,
    publicPath: string,
    options: RhinoOptions = {}
  ): Promise<RhinoWorker> {
    const {
      customWritePath = 'rhino_model',
      forceWrite = false,
      version = 1,
      ...rest
    } = options;
    await fromPublicDirectory(customWritePath, publicPath, forceWrite, version);
    const contextPath = await contextProcess(context);
    return this.create(
      accessKey,
      contextPath,
      inferenceCallback,
      customWritePath,
      rest
    );
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

  private static async create(
    accessKey: string,
    contextPath: string,
    inferenceCallback: InferenceCallback,
    modelPath: string,
    options: RhinoOptions = {}
  ): Promise<RhinoWorker> {
    const { processErrorCallback } = options;

    const worker = new PvWorker();
    const returnPromise: Promise<RhinoWorker> = new Promise(
      (resolve, reject) => {
        // @ts-ignore - block from GC
        this.worker = worker;
        worker.onmessage = (
          event: MessageEvent<RhinoWorkerInitResponse>
        ): void => {
          switch (event.data.command) {
            case 'ok':
              worker.onmessage = (
                ev: MessageEvent<RhinoWorkerProcessResponse>
              ): void => {
                switch (ev.data.command) {
                  case 'ok':
                    inferenceCallback(ev.data.inference);
                    break;
                  case 'failed':
                  case 'error':
                    if (processErrorCallback) {
                      processErrorCallback(ev.data.message);
                    } else {
                      // eslint-disable-next-line no-console
                      console.error(ev.data.message);
                    }
                    break;
                  default:
                    // @ts-ignore
                    processErrorCallback(
                      `Unrecognized command: ${event.data.command}`
                    );
                }
              };
              resolve(
                new RhinoWorker(
                  worker,
                  event.data.version,
                  event.data.frameLength,
                  event.data.sampleRate,
                  event.data.contextInfo
                )
              );
              break;
            case 'failed':
            case 'error':
              reject(event.data.message);
              break;
            default:
              // @ts-ignore
              reject(`Unrecognized command: ${event.data.command}`);
          }
        };
      }
    );

    worker.postMessage({
      command: 'init',
      accessKey: accessKey,
      modelPath: modelPath,
      contextPath: contextPath,
      wasm: this._wasm,
      wasmSimd: this._wasmSimd,
      options: options,
    });

    return returnPromise;
  }

  /**
   * Processes a frame of audio in a worker.
   * The transcript result will be supplied with the callback provided when initializing the worker either
   * by 'fromBase64' or 'fromPublicDirectory'.
   * Can also send a message directly using 'this.worker.postMessage({command: "process", pcm: [...]})'.
   *
   * @param pcm A frame of audio sample.
   */
  public process(pcm: Int16Array): void {
    this._worker.postMessage({
      command: 'process',
      inputFrame: pcm,
    });
  }

  /**
   * Releases resources acquired by WebAssembly module.
   */
  public release(): Promise<void> {
    const returnPromise: Promise<void> = new Promise((resolve, reject) => {
      this._worker.onmessage = (
        event: MessageEvent<RhinoWorkerReleaseResponse>
      ): void => {
        switch (event.data.command) {
          case 'ok':
            resolve();
            break;
          case 'failed':
          case 'error':
            reject(event.data.message);
            break;
          default:
            // @ts-ignore
            reject(`Unrecognized command: ${event.data.command}`);
        }
      };
    });

    this._worker.postMessage({
      command: 'release',
    });

    return returnPromise;
  }

  /**
   * Terminates the active worker. Stops all requests being handled by worker.
   */
  public terminate(): void {
    this._worker.terminate();
  }
}
