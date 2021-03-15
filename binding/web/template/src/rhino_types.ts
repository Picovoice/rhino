/*
    Copyright 2021 Picovoice Inc.

    You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
    file accompanying this source.

    Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
    an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
    specific language governing permissions and limitations under the License.
*/

export type RhinoInference = {
  isFinalized: boolean
  isUnderstood?: boolean
  intent?: string
  slots?: object
}

export interface RhinoEngine {
  release(): void;
  process(frames: Int16Array): RhinoInference;
  version: string;
  sampleRate: number;
  frameLength: number;
}

export type RhinoContext = {
  base64: string,
  sensitivty?: number
}

export type WorkerRequestProcess = {
  command: 'process';
  inputFrame: Int16Array;
};

export type WorkerRequestVoid = {
  command: 'reset' | 'pause' | 'resume' | 'release';
};

export type RhinoArgs = {
  context: RhinoContext;
  start: boolean;
}

export type RhinoWorkerRequestInit = {
  command: 'init';
  rhinoArgs: RhinoArgs;
}

export type RhinoWorkerResponseReady = {
  command: 'rhn-ready';
};

export type RhinoWorkerResponseInference = {
  command: 'rhn-inference';
  inference: RhinoInference
};

