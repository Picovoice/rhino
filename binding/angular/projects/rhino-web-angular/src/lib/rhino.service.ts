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
  InferenceCallback,
  RhinoContext,
  RhinoOptions,
  RhinoInference,
  RhinoModel,
  RhinoWorker,
} from '@picovoice/rhino-web';

@Injectable({
  providedIn: 'root',
})
export class RhinoService implements OnDestroy {
  public contextInfo: string | null = null;
  public inference$: Subject<RhinoInference> = new Subject<RhinoInference>();
  public isLoaded: Subject<boolean> = new Subject<boolean>();
  public isListening: Subject<boolean> = new Subject<boolean>();
  public error$: Subject<Error | string | null> = new Subject<Error | string | null>();

  constructor() {}

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

  public async pushToTalk(): Promise<boolean> {
    if (!this.isTalking && this.rhinoWorker !== null) {
      this.isTalking = true;
      this.isTalking$.next(true);
      this.rhinoWorker.postMessage({ command: 'resume' });
      return true;
    }
    return false;
  }

  private InferenceCallback(inference: RhinoInference): void {
    this.inference$.next(inference)
  }

  public async init(
    accessKey: string,
    context: RhinoContext,
    model: RhinoModel,
    options: RhinoOptions = {}
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
