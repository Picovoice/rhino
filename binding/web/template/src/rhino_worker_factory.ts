/*
    Copyright 2018-2021 Picovoice Inc.

    You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
    file accompanying this source.

    Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
    an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
    specific language governing permissions and limitations under the License.
*/

import RhinoWorker from 'web-worker:./rhino_worker.ts';
import {
  RhinoArgs,
  RhinoWorkerRequestInit,
  RhinoWorkerResponseReady,
  RhinoWorkerResponseInference,
} from './rhino_types';

export default class RhinoWorkerFactory {
  private constructor() { }

  /**
   * Create Rhino web worker instances. The promise resolves when the worker is ready to process
   * voice data (perhaps from WebVoiceProcessor).
   *
   * @param rhinoArgs - Includes Base64 representations of a context and its sensitivity in [0,1],
   * as well as whether to start processing audio immediately upon instantiation, or to start paused.
   *
   */
  public static async create(rhinoArgs: RhinoArgs
  ): Promise<Worker> {
    // n.b. The *worker* creation is itself synchronous. But, inside the worker is an async
    // method of RhinoFactory which is initializing. This means the worker is not actually ready
    // for voice processing immediately after intantiation. When its initialization completes,
    // we receive a special RhinoWorkerMessageOut message and resolve the worker promise.
    const rhinoWorker = new RhinoWorker();

    const rhinoInitCommand: RhinoWorkerRequestInit = {
      command: 'init',
      rhinoArgs: rhinoArgs
    };
    rhinoWorker.postMessage(rhinoInitCommand);

    const workerPromise = new Promise<Worker>((resolve, reject) => {
      rhinoWorker.onmessage = function (
        event: MessageEvent<
          RhinoWorkerResponseReady | RhinoWorkerResponseInference
        >
      ): void {
        if (event.data.command === 'rhn-ready') {
          resolve(rhinoWorker);
        } else if (event.data.command === 'rhn-inference') {
          // The default inference event event logs to console
          // eslint-disable-line
          console.log(event.data.inference);
        }
      };
    });

    return workerPromise;
  }
}
