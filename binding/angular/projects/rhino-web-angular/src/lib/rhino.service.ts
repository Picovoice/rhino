import { Injectable, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';

import WebVoiceProcessor from '@picovoice/web-voice-processor';
import type {
  RhinoInference,
  RhinoServiceArgs,
  RhinoWorker,
  RhinoWorkerFactory,
  RhinoWorkerResponse,
} from './rhino_types';

@Injectable({
  providedIn: 'root',
})
export class RhinoService implements OnDestroy {
  public webVoiceProcessor: WebVoiceProcessor;
  public isInit = false;
  public inference$: Subject<RhinoInference> = new Subject<RhinoInference>();
  private rhinoWorker: RhinoWorker;
  private isTalking: boolean = false;

  constructor() {}

  public pause(): boolean {
    if (this.webVoiceProcessor !== null) {
      this.webVoiceProcessor.pause();
      return true;
    }
    return false;
  }

  public start(): boolean {
    if (this.webVoiceProcessor !== null) {
      this.webVoiceProcessor.start();
      return true;
    }
    return false;
  }

  public resume(): boolean {
    if (this.webVoiceProcessor !== null) {
      this.webVoiceProcessor.resume();
      return true;
    }
    return false;
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
    const { rhinoFactoryArgs, start = true } = rhinoServiceArgs;
    this.isInit = true;

    try {
      this.rhinoWorker = await rhinoWorkerFactory.create({
        ...rhinoFactoryArgs,
        start: false,
      });
      this.rhinoWorker.onmessage = (
        message: MessageEvent<RhinoWorkerResponse>
      ) => {
        switch (message.data.command) {
          case 'rhn-inference': {
            this.inference$.next(message.data.inference);
            this.isTalking = false;
          }
        }
      };
    } catch (error) {
      this.isInit = false;
      throw error;
    }

    try {
      this.webVoiceProcessor = await WebVoiceProcessor.init({
        engines: [this.rhinoWorker],
        start: start,
      });
    } catch (error) {
      this.rhinoWorker.postMessage({ command: 'release' });
      this.rhinoWorker = null;
      this.isInit = false;
      throw error;
    }
  }

  async ngOnDestroy() {
    this.release();
  }
}
