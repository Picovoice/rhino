/*
    Copyright 2018-2021 Picovoice Inc.

    You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
    file accompanying this source.

    Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
    an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
    specific language governing permissions and limitations under the License.
*/

import Worker from 'web-worker:./rhino_worker.ts';
import {
  RhinoArgs,
  RhinoWorker,
  RhinoWorkerRequestInit,
  RhinoWorkerResponse,
} from './rhino_types';

export class RhinoWorkerFactory {
  private constructor() {}

  /**
   * Create Rhino web worker instances. The promise resolves when the worker is ready to process
   * voice data (perhaps from WebVoiceProcessor).
   *
   * @param rhinoArgs Includes `base64` representations of a context and its `sensitivity` in [0,1],
   * as well as whether to `start` processing audio immediately upon instantiation, or to start paused.
   *
   */
  public static async create(rhinoArgs: RhinoArgs): Promise<RhinoWorker> {
    // n.b. The *Worker* creation is itself synchronous. But, inside the worker is an async
    // method of RhinoFactory which is initializing. This means the worker is not actually ready
    // for voice processing immediately after intantiation. When its initialization completes,
    // we receive a 'rhn-ready' message and resolve the promise with the Worker.
    const rhinoWorker = new Worker() as RhinoWorker;

    const rhinoInitCommand: RhinoWorkerRequestInit = {
      command: 'init',
      rhinoArgs: rhinoArgs,
    };
    rhinoWorker.postMessage(rhinoInitCommand);

    const workerPromise = new Promise<RhinoWorker>((resolve, reject) => {
      rhinoWorker.onmessage = function (
        event: MessageEvent<RhinoWorkerResponse>
      ): void {
        switch (event.data.command) {
          case 'rhn-ready': {
            // Rhino worker is fully initialized and ready to receive audio frames
            resolve(rhinoWorker);
            break;
          }
          case 'rhn-inference': {
            // The default inference event event logs to console
            // eslint-disable-next-line no-console
            console.log(event.data.inference);
            rhinoWorker.postMessage({ command: 'pause' });
            break;
          }
          case 'rhn-error-init': {
            // The Rhino initialization failed
            reject(event.data.error);
            break;
          }
          case 'rhn-error': {
            // The default inference event event logs to console
            // eslint-disable-next-line no-console
            console.error('Error reported from Rhino worker:');
            // eslint-disable-next-line no-console
            console.error(event.data.error);
            break;
          }
          default: {
            // eslint-disable-next-line no-console
            console.warn('Unhandled resonse from RhinoWorker: ' + event);
            return;
          }
        }
      };
    });

    return workerPromise;
  }
}
