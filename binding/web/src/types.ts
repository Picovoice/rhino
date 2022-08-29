/*
  Copyright 2022 Picovoice Inc.

  You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
  file accompanying this source.

  Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
  an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
  specific language governing permissions and limitations under the License.
*/

import { PvModel } from '@picovoice/web-utils';

export type RhinoContext = PvModel & {
  /** @defaultValue '0.5' */
  sensitivity?: number;
};

export type RhinoModel = PvModel;

export type RhinoOptions = {
  /** @defaultValue '1.0' */
  endpointDurationSec?: number;
  /** @defaultValue 'false' */
  requireEndpoint?: boolean;
  /** @defaultValue '(error) => {}' */
  processErrorCallback?: (error: string) => void;
};

export type RhinoInference = {
  /** Rhino has concluded the inference (isUnderstood is now set) */
  isFinalized: boolean;
  /** The intent was understood (it matched an expression in the context) */
  isUnderstood?: boolean;
  /** The name of the intent */
  intent?: string;
  /** Map of the slot variables and values extracted from the utterance */
  slots?: Record<string, string>;
};

export type InferenceCallback = (inference: RhinoInference) => void;

export type RhinoWorkerInitRequest = {
  command: 'init';
  accessKey: string;
  contextPath: string;
  sensitivity: number;
  wasm: string;
  wasmSimd: string;
  modelPath: string;
  options: RhinoOptions;
};

export type RhinoWorkerProcessRequest = {
  command: 'process';
  inputFrame: Int16Array;
};

export type RhinoWorkerResetRequest = {
  command: 'reset';
};

export type RhinoWorkerReleaseRequest = {
  command: 'release';
};

export type RhinoWorkerRequest =
  | RhinoWorkerInitRequest
  | RhinoWorkerProcessRequest
  | RhinoWorkerResetRequest
  | RhinoWorkerReleaseRequest;

export type RhinoWorkerFailureResponse = {
  command: 'failed' | 'error';
  message: string;
};

export type RhinoWorkerInitResponse =
  | RhinoWorkerFailureResponse
  | {
      command: 'ok';
      frameLength: number;
      sampleRate: number;
      version: string;
      contextInfo: string;
    };

export type RhinoWorkerProcessResponse =
  | RhinoWorkerFailureResponse
  | {
      command: 'ok-process';
      inference: RhinoInference;
    };

export type RhinoWorkerResetResponse =
  | RhinoWorkerFailureResponse
  | {
      command: 'ok';
    };

export type RhinoWorkerReleaseResponse =
  | RhinoWorkerFailureResponse
  | {
      command: 'ok';
    };

export type RhinoWorkerResponse =
  | RhinoWorkerInitResponse
  | RhinoWorkerProcessResponse
  | RhinoWorkerResetResponse
  | RhinoWorkerReleaseResponse;
