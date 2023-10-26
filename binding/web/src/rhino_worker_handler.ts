/*
  Copyright 2022-2023 Picovoice Inc.

  You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
  file accompanying this source.

  Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
  an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
  specific language governing permissions and limitations under the License.
*/

/// <reference no-default-lib="false"/>
/// <reference lib="webworker" />

import { Rhino } from './rhino';
import { RhinoError } from './rhino_errors';
import { RhinoWorkerRequest, RhinoInference, PvStatus } from './types';

function inferenceCallback(inference: RhinoInference): void {
  self.postMessage({
    command: 'ok-process',
    inference: inference,
  });
}

function processErrorCallback(error: RhinoError): void {
  self.postMessage({
    command: 'error',
    status: error.status,
    shortMessage: error.shortMessage,
    messageStack: error.messageStack
  });
}

/**
 * Rhino worker handler.
 */
let rhino: Rhino | null = null;
self.onmessage = async function (
  event: MessageEvent<RhinoWorkerRequest>
): Promise<void> {
  switch (event.data.command) {
    case 'init':
      if (rhino !== null) {
        self.postMessage({
          command: 'error',
          status: PvStatus.INVALID_STATE,
          shortMessage: 'Rhino already initialized',
        });
        return;
      }
      try {
        Rhino.setWasm(event.data.wasm);
        Rhino.setWasmSimd(event.data.wasmSimd);
        Rhino.setSdk(event.data.sdk);
        rhino = await Rhino._init(
          event.data.accessKey,
          event.data.contextPath,
          event.data.sensitivity,
          inferenceCallback,
          event.data.modelPath,
          { ...event.data.options, processErrorCallback }
        );
        self.postMessage({
          command: 'ok',
          version: rhino.version,
          frameLength: rhino.frameLength,
          sampleRate: rhino.sampleRate,
          contextInfo: rhino.contextInfo,
        });
      } catch (e: any) {        
        if (e instanceof RhinoError) {
          self.postMessage({
            command: 'error',
            status: e.status,
            shortMessage: e.shortMessage,
            messageStack: e.messageStack
          });
        } else {
          self.postMessage({
            command: 'error',
            status: PvStatus.RUNTIME_ERROR,
            shortMessage: e.message
          });
        }
      }
      break;
    case 'process':
      if (rhino === null) {
        self.postMessage({
          command: 'error',
          status: PvStatus.INVALID_STATE,
          shortMessage: 'Rhino not initialized',
        });
        return;
      }
      await rhino.process(event.data.inputFrame);
      break;
    case 'reset':
      if (rhino === null) {
        self.postMessage({
          command: 'error',
          status: PvStatus.INVALID_STATE,
          shortMessage: 'Rhino not initialized',
        });
        return;
      }
      await rhino.reset();
      self.postMessage({
        command: 'ok',
      });
      break;
    case 'release':
      if (rhino !== null) {
        await rhino.release();
        rhino = null;
        close();
      }
      self.postMessage({
        command: 'ok',
      });
      break;
    default:
      self.postMessage({
        command: 'failed',
        status: PvStatus.RUNTIME_ERROR,
        // @ts-ignore
        shortMessage: `Unrecognized command: ${event.data.command}`,
      });
  }
};
