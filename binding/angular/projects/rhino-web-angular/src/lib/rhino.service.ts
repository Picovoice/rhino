import { Injectable, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';

import { WebVoiceProcessor } from '@picovoice/web-voice-processor';
import type {
  RhinoInferenceFinalized,
  RhinoServiceArgs,
  RhinoWorker,
  RhinoWorkerFactory,
  RhinoWorkerResponse,
} from './rhino_types';

@Injectable({
  providedIn: 'root',
})
export class RhinoService implements OnDestroy {
  public webVoiceProcessor: WebVoiceProcessor | null = null;
  public isInit = false;
  public contextInfo: string | null = null;
  public inference$: Subject<RhinoInferenceFinalized> = new Subject<RhinoInferenceFinalized>();
  public listening$: Subject<boolean> = new Subject<boolean>();
  public isError$: Subject<boolean> = new Subject<boolean>();
  public isTalking$: Subject<boolean> = new Subject<boolean>();
  public error$: Subject<Error | string> = new Subject<Error | string>();
  private rhinoWorker: RhinoWorker | null = null;
  private isTalking = false;

  constructor() { }

  public pause(): boolean {
    if (this.webVoiceProcessor !== null) {
      this.webVoiceProcessor.pause();
      this.listening$.next(false);
      return true;
    }
    return false;
  }

  public start(): boolean {
    if (this.webVoiceProcessor !== null) {
      this.webVoiceProcessor.start();
      this.listening$.next(true);
      return true;
    }
    return false;
  }

  public resume(): boolean {
    if (this.webVoiceProcessor !== null) {
      this.webVoiceProcessor.resume();
      this.listening$.next(true);
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
    const { accessKey, context, start = true } = rhinoServiceArgs;
    this.isInit = true;

    try {
      this.rhinoWorker = await rhinoWorkerFactory.create({
        accessKey,
        context,
        start: false,
      });
      this.rhinoWorker.onmessage = (
        message: MessageEvent<RhinoWorkerResponse>
      ) => {
        switch (message.data.command) {
          case 'rhn-inference': {
            this.inference$.next(message.data.inference as RhinoInferenceFinalized);
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
      this.error$.next(error);
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
      this.rhinoWorker = null;
      this.isInit = false;
      this.isError$.next(true);
      this.error$.next(error);
      throw error;
    }
  }

  async ngOnDestroy() {
    this.release();
  }
}
