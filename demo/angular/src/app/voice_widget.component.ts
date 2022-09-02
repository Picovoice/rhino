import { Component, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';

import { RhinoInference } from '@picovoice/rhino-web';
import { RhinoService } from '@picovoice/rhino-angular';

// @ts-ignore
import rhinoParams from '../lib/rhino_params';

@Component({
  selector: 'app-voice-widget',
  templateUrl: './voice_widget.component.html',
  styleUrls: ['./voice_widget.component.scss']
})
export class VoiceWidget implements OnDestroy {
  private contextInfoSubscription: Subscription;
  private inferenceSubscription: Subscription;
  private isLoadedSubscription: Subscription;
  private isListeningSubscription: Subscription;
  private errorSubscription: Subscription;

  contextInfo: string | null = null;
  inference: RhinoInference | null = null;
  isLoaded = false;
  isListening = false;
  error: Error | string | null = null;

  constructor(private rhinoService: RhinoService) {
    this.contextInfoSubscription = rhinoService.contextInfo$.subscribe(
      contextInfo => {
        this.contextInfo = contextInfo;
      });
    this.inferenceSubscription = rhinoService.inference$.subscribe(
      inference => {
        this.inference = inference;
      });
    this.isLoadedSubscription = rhinoService.isLoaded$.subscribe(
      isLoaded => {
        this.isLoaded = isLoaded;
      });
    this.isListeningSubscription = rhinoService.isListening$.subscribe(
      isListening => {
        this.isListening = isListening;
      });
    this.errorSubscription = rhinoService.error$.subscribe(
      error => {
        this.error = error;
      });
  }

  ngOnDestroy(): void {
    this.contextInfoSubscription.unsubscribe();
    this.inferenceSubscription.unsubscribe();
    this.isLoadedSubscription.unsubscribe();
    this.isListeningSubscription.unsubscribe();
    this.errorSubscription.unsubscribe();
    this.rhinoService.release();
  }

  public async rhnInit(accessKey: string): Promise<void> {
    if (accessKey.length >= 0) {
      await this.rhinoService.release();
      try {
        await this.rhinoService.init(
          accessKey,
          { publicPath: 'assets/clock_wasm.rhn' },
          { base64: rhinoParams }
        );
      }
      catch (error: any) {
        this.error = error;
      }
    }
  }

  public async rhnProcess(): Promise<void> {
    await this.rhinoService.process();
  }

  public async rhnRelease(): Promise<void> {
    await this.rhinoService.release();
  }
}
