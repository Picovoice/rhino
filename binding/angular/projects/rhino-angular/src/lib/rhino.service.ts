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
import {
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
  public inference$: Subject<RhinoInference> = new Subject<RhinoInference>();

  public contextInfo$: Subject<string | null> = new Subject<string | null>();
  public isLoaded$: Subject<boolean> = new Subject<boolean>();
  public isListening$: Subject<boolean> = new Subject<boolean>();
  public error$: Subject<Error | string | null> = new Subject<Error | string | null>();

  private rhino: RhinoWorker | null = null;

  constructor() {}

  public async init(
    accessKey: string,
    context: RhinoContext,
    model: RhinoModel,
    options: RhinoOptions = {}
  ): Promise<void> {
    if (options.processErrorCallback) {
      console.warn('\'processErrorCallback\' is only supported in the Rhino Web SDK. ' +
       'Use the \'error\' state to monitor for errors in the Angular SDK.');
    }

    try {
      if (!this.rhino) {
        this.rhino = await RhinoWorker.create(
          accessKey,
          context,
          this.inferenceCallback,
          model,
          { ...options, processErrorCallback: this.errorCallback }
        );
        this.contextInfo$.next(this.rhino.contextInfo);
        this.isLoaded$.next(true);
        this.error$.next(null);
      }
    } catch (error: any) {
      this.error$.next(error.toString());
    }
  }

  public async process(): Promise<void> {
    if (this.rhino === null) {
      this.error$.next('Rhino has not been initialized or has been released');
      return;
    }

    try {
      await WebVoiceProcessor.subscribe(this.rhino);
      this.isListening$.next(true);
      this.error$.next(null);
    } catch (error: any) {
      this.error$.next(error.toString());
      this.isListening$.next(false);
    }
  }

  public async release(): Promise<void> {
    try {
      if (this.rhino) {
        await WebVoiceProcessor.unsubscribe(this.rhino);
        this.rhino.terminate();
        this.rhino = null;

        this.isListening$.next(false);
        this.isLoaded$.next(false);
        this.error$.next(null);
      }
    } catch (error: any) {
      this.error$.next(error.toString());
    }
  }

  async ngOnDestroy(): Promise<void> {
    await this.release();
  }

  private inferenceCallback = (inference: RhinoInference) => {
    if (inference && inference.isFinalized) {
      if (this.rhino) {
        WebVoiceProcessor.unsubscribe(this.rhino);
      }
      this.isListening$.next(false);
      this.inference$.next(inference);
    }
  };

  private errorCallback = (error: string) => {
    this.error$.next(error);
  };
}
