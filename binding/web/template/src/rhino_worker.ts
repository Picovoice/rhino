/*
  Copyright 2018-2021 Picovoice Inc.

  You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
  file accompanying this source.

  Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
  an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
  specific language governing permissions and limitations under the License.
*/

import Rhino from './rhino';
import {
  RhinoEngine,
  RhinoArgs,
  RhinoWorkerResponseReady,
  RhinoWorkerResponseInference,
  RhinoWorkerRequest,
  RhinoWorkerResponseInitError,
  RhinoWorkerResponseInfo
} from './rhino_types';

let paused = true;
let rhinoEngine: RhinoEngine = null;

async function init(rhinoArgs: RhinoArgs): Promise<void> {
  try {
    rhinoEngine = await Rhino.create(
      rhinoArgs.accessKey,
      rhinoArgs.context,
      rhinoArgs.requireEndpoint
    );
  } catch (error) {
    const rhnErrorMessage: RhinoWorkerResponseInitError = {
      command: 'rhn-error-init',
      error: error.toString()
    };
    postMessage(rhnErrorMessage, undefined);
    return;
  }

  paused = !rhinoArgs.start;
  const rhnReadyMessage: RhinoWorkerResponseReady = {
    command: 'rhn-ready',
  };
  postMessage(rhnReadyMessage, undefined);
}

function info(): void {
  const infoResonse: RhinoWorkerResponseInfo = { command: 'rhn-info', info: rhinoEngine.contextInfo };
  postMessage(infoResonse, undefined);
}

async function process(inputFrame: Int16Array): Promise<void> {
  if (rhinoEngine !== null && !paused) {
    const inference = await rhinoEngine.process(inputFrame);
    if (inference.isFinalized) {
      const rhinoInferenceMessage: RhinoWorkerResponseInference = {
        command: 'rhn-inference',
        inference: inference
      };
      postMessage(rhinoInferenceMessage, undefined);
    }
  }
}

function release(): void {
  if (rhinoEngine !== null) {
    rhinoEngine.release();
  }

  rhinoEngine = null;
  close();
}

onmessage = function (
  event: MessageEvent<RhinoWorkerRequest>
): void {
  switch (event.data.command) {
    case 'init':
      init(event.data.rhinoArgs);
      break;
    case 'process':
      process(event.data.inputFrame);
      break;
    case 'pause':
      paused = true;
      break;
    case 'resume':
      paused = false;
      break;
    case 'release':
      release();
      break;
    case 'info':
      info();
      break;
    default:
      // eslint-disable-next-line no-console
      console.warn(
        'Unhandled command in rhino_worker: ' + event.data.command
      );
  }
};
