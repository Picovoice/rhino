/*
  Copyright 2022 Picovoice Inc.

  You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
  file accompanying this source.

  Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
  an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
  specific language governing permissions and limitations under the License.
*/

export type RhinoInference = {
  /** Rhino has concluded the inference (isUnderstood is now set) */
  isFinalized: boolean
  /** The intent was understood (it matched an expression in the context) */
  isUnderstood?: boolean
  /** The name of the intent */
  intent?: string
  /** Map of the slot variables and values extracted from the utterance */
  slots?: Record<string, string>
}

export interface RhinoEngine {
  /** Release all resources acquired by Rhino */
  release(): void;
  /** Process a single frame of 16-bit 16kHz PCM audio */
  process(frame: Int16Array): Promise<RhinoInference>;
  /** The version of the Rhino engine */
  readonly version: string;
  /** The sampling rate of audio expected by the Rhino engine */
  readonly sampleRate: number;
  /** The frame length of audio expected by the Rhino engine */
  readonly frameLength: number;
  /** The source of the Rhino context (YAML format) */
  readonly contextInfo: string;
}

export type RhinoContext = {
  /** Base64 representation of a trained Rhino context (`.rhn` file) */
  base64: string,
  /** Value in range [0,1] that trades off miss rate for false alarm */
  sensitivity?: number
}

export type WorkerRequestProcess = {
  command: 'process';
  inputFrame: Int16Array;
};

export type WorkerRequestVoid = {
  command: 'reset' | 'pause' | 'resume' | 'release';
};

export type RhinoArgs = {
  accessKey: string;
  context: RhinoContext;
  endpointDurationSec?: number;
  requireEndpoint?: boolean;
  start: boolean;
}

export type RhinoWorkerRequestInit = {
  command: 'init';
  rhinoArgs: RhinoArgs;
}

export type RhinoWorkerRequestInfo = {
  command: 'info'
}

export type RhinoWorkerResponseReady = {
  command: 'rhn-ready';
};

export type RhinoWorkerResponseError = {
  command: 'rhn-error';
  error: Error | string
};

export type RhinoWorkerResponseInitError = {
  command: 'rhn-error-init';
  error: Error | string
};

export type RhinoWorkerResponseInference = {
  command: 'rhn-inference';
  inference: RhinoInference
};

export type RhinoWorkerResponseInfo = {
  command: 'rhn-info';
  info: string
};

export type RhinoWorkerRequest =
  | WorkerRequestVoid
  | WorkerRequestProcess
  | RhinoWorkerRequestInit
  | RhinoWorkerRequestInfo;

export type RhinoWorkerResponse =
  | RhinoWorkerResponseReady
  | RhinoWorkerResponseInference
  | RhinoWorkerResponseError
  | RhinoWorkerResponseInitError
  | RhinoWorkerResponseInfo;


export interface RhinoWorker extends Omit<Worker, 'postMessage'> {
  postMessage(command: RhinoWorkerRequest): void
};

export interface RhinoWorkerFactory {
  create: (rhinoArgs: RhinoArgs) => Promise<RhinoWorker>;
}
