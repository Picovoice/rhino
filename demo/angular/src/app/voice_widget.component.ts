import { Component, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';

import { RhinoInference } from '@picovoice/rhino-web';
import { RhinoService } from '@picovoice/rhino-angular';

import rhinoParams from '../lib/rhino_params';

@Component({
  selector: 'app-voice-widget',
  templateUrl: './voice_widget.component.html',
  styleUrls: ['./voice_widget.component.scss']
})
export class VoiceWidget implements OnDestroy {
  private contextInfoDetection: Subscription;
  private inferenceDetection: Subscription;
  private isLoadedDetection: Subscription;
  private isListeningDetection: Subscription;
  private errorDetection: Subscription;

  contextInfo: string | null = null;
  inference: RhinoInference | null = null;
  isLoaded = false;
  isListening = false;
  error: Error | string | null = null;

  constructor(private rhinoService: RhinoService) {
    this.contextInfoDetection = rhinoService.contextInfo$.subscribe(
      contextInfo => {
        this.contextInfo = contextInfo;
      });
    this.inferenceDetection = rhinoService.inference$.subscribe(
      inference => {
        this.inference = inference;
        console.log(inference);
      });
    this.isLoadedDetection = rhinoService.isLoaded$.subscribe(
      isLoaded => {
        this.isLoaded = isLoaded;
      });
    this.isListeningDetection = rhinoService.isListening$.subscribe(
      isListening => {
        this.isListening = isListening;
      });
    this.errorDetection = rhinoService.error$.subscribe(
      error => {
        this.error = error;
      });
  }

  ngOnDestroy(): void {
    this.contextInfoDetection.unsubscribe();
    this.inferenceDetection.unsubscribe();
    this.isLoadedDetection.unsubscribe();
    this.isListeningDetection.unsubscribe();
    this.errorDetection.unsubscribe();
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
      catch (error) {
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
