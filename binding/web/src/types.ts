/*
  Copyright 2022 Picovoice Inc.

  You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
  file accompanying this source.

  Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
  an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
  specific language governing permissions and limitations under the License.
*/

export type RhinoOptions = {
  processErrorCallback?: (error: string) => void;
  /** @defaultValue 'porcupine_model' */
  customWritePath?: string;
  /** @defaultValue false */
  forceWrite?: boolean;
  /** @defaultValue 1 */
  version?: number;
  /** @defaultValue '1.0' */
  endpointDurationSec?: number;
  /** @defaultValue 'false' */
  requireEndpoint?: boolean;
};

export type RhinoContext = {
  /** Base64 representation of a trained Rhino context (`.rhn` file) */
  base64?: string;
  /** The Rhino context (`.rhn` file) path relative to the public directory */
  rhnPath?: string;
  /** Value in range [0,1] that trades off miss rate for false alarm. @defaultValue '0.5' */
  sensitivity?: number;
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

export type RhinoWorkerInitRequest = {
  command: 'init';
  accessKey: string;
  contextPath: string;
  modelPath: string;
  wasm: string;
  wasmSimd: string;
  options: RhinoOptions;
};

export type RhinoWorkerProcessRequest = {
  command: 'process';
  inputFrame: Int16Array;
};

export type RhinoWorkerReleaseRequest = {
  command: 'release';
};

export type RhinoWorkerRequest =
  | RhinoWorkerInitRequest
  | RhinoWorkerProcessRequest
  | RhinoWorkerReleaseRequest;

export type RhinoWorkerFailureResponse = {
  command: 'failed' | 'error';
  message: string;
};

export type RhinoWorkerInitResponse =
  | PorcupineWorkerFailureResponse
  | {
      command: 'ok';
      frameLength: number;
      sampleRate: number;
      version: string;
      contextInfo: string;
    };

export type RhinoWorkerProcessResponse =
  | PorcupineWorkerFailureResponse
  | {
      command: 'ok';
      keywordIndex: number;
    };

export type RhinoWorkerReleaseResponse =
  | PorcupineWorkerFailureResponse
  | {
      command: 'ok';
      inference: RhinoInference;
    };

export type RhinoWorkerResponse =
  | RhinoWorkerInitResponse
  | RhinoWorkerProcessResponse
  | RhinoWorkerReleaseResponse;
