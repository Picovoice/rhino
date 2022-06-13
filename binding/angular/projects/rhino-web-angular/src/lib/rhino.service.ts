/*
  Copyright 2022 Picovoice Inc.

  You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
  file accompanying this source.

  Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
  an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
  specific language governing permissions and limitations under the License.
*/

import { Injectable, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';

import { WebVoiceProcessor } from '@picovoice/web-voice-processor';
import type {
  RhinoContext,
  RhinoInference,
  RhinoWorker,
  RhinoWorkerFactory,
  RhinoWorkerResponse,
} from '@picovoice/rhino-web-core';

export type RhinoServiceArgs = {
  /** AccessKey obtained from Picovoice Console (https://console.picovoice.ai/) */
  accessKey: string;
  /** The context to instantiate */
  context: RhinoContext;
  /** Endpoint duration in seconds. An endpoint is a chunk of silence at the end of an utterance that marks the end
   * of spoken command. It should be a positive number within [0.5, 5]. A lower endpoint duration reduces delay and
   * improves responsiveness. A higher endpoint duration assures Rhino doesn't return inference pre-emptively in case
   * the user pauses before finishing the request. */
  endpointDurationSec?: number;
  /** If set to `true`, Rhino requires an endpoint (a chunk of silence) after the spoken command. If set to `false`,
   * Rhino tries to detect silence, but if it cannot, it still will provide inference regardless. Set to `false` only
   * if operating in an environment with overlapping speech (e.g. people talking in the background) **/
  requireEndpoint?: boolean;
  /** Immediately start the microphone upon initialization */
  start?: boolean;
};

@Injectable({
  providedIn: 'root',
})
export class RhinoService implements OnDestroy {
  public webVoiceProcessor: WebVoiceProcessor | null = null;
  public isInit = false;
  public contextInfo: string | null = null;
  public inference$: Subject<RhinoInference> = new Subject<RhinoInference>();
  public listening$: Subject<boolean> = new Subject<boolean>();
  public isError$: Subject<boolean> = new Subject<boolean>();
  public isTalking$: Subject<boolean> = new Subject<boolean>();
  public error$: Subject<Error | string> = new Subject<Error | string>();
  private rhinoWorker: RhinoWorker | null = null;
  private isTalking = false;

  constructor() {}

  public pause(): boolean {
    if (this.webVoiceProcessor !== null) {
      this.webVoiceProcessor.pause();
      this.listening$.next(false);
      return true;
    }
    return false;
  }

  public async start(): Promise<boolean> {
    if (this.webVoiceProcessor !== null) {
      await this.webVoiceProcessor.start();
      this.listening$.next(true);
      return true;
    } else {
      return false;
    }
  }

  public async stop(): Promise<boolean> {
    if (this.webVoiceProcessor !== null) {
      await this.webVoiceProcessor.stop();
      this.listening$.next(false);
      return true;
    } else {
      return false;
    }
  }

  public async release(): Promise<void> {
    if (this.rhinoWorker !== null) {
      this.rhinoWorker.postMessage({ command: 'release' });
    }
    if (this.webVoiceProcessor !== null) {
      await this.webVoiceProcessor.release();
    }
    this.isInit = false;
  }

  public pushToTalk(): boolean {
    if (!this.isTalking && this.rhinoWorker !== null) {
      this.isTalking = true;
      this.isTalking$.next(true);
      this.rhinoWorker.postMessage({ command: 'resume' });
      return true;
    }
    return false;
  }

  public async init(
    rhinoWorkerFactory: RhinoWorkerFactory,
    rhinoServiceArgs: RhinoServiceArgs
  ): Promise<void> {
    if (this.isInit) {
      throw new Error('Rhino is already initialized');
    }
    const {
      accessKey,
      context,
      endpointDurationSec,
      requireEndpoint,
      start = true,
    } = rhinoServiceArgs;
    this.isInit = true;

    try {
      this.rhinoWorker = await rhinoWorkerFactory.create({
        accessKey,
        context,
        endpointDurationSec,
        requireEndpoint,
        start: false,
      });
      this.rhinoWorker.onmessage = (
        message: MessageEvent<RhinoWorkerResponse>
      ) => {
        switch (message.data.command) {
          case 'rhn-inference': {
            this.inference$.next(message.data.inference as RhinoInference);
            this.isTalking = false;
            this.isTalking$.next(false);
            break;
          }
          case 'rhn-info': {
            this.contextInfo = message.data.info;
            break;
          }
        }
      };
      this.rhinoWorker.postMessage({ command: 'info' });
    } catch (error) {
      this.isInit = false;
      this.isError$.next(true);
      this.error$.next(error as Error);
      throw error;
    }

    try {
      this.webVoiceProcessor = await WebVoiceProcessor.init({
        engines: [this.rhinoWorker],
        start,
      });
      this.listening$.next(start);
    } catch (error) {
      this.rhinoWorker.postMessage({ command: 'release' });
      this.rhinoWorker.terminate();
      this.rhinoWorker = null;
      this.isInit = false;
      this.isError$.next(true);
      this.error$.next(error as Error);
      throw error;
    }
  }

  async ngOnDestroy() {
    this.release();
  }
}
