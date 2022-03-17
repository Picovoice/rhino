import { Component } from "@angular/core"
import { Subscription } from "rxjs"

import { RhinoService, RhinoServiceArgs } from "@picovoice/rhino-web-angular"
import { RhinoInference } from "@picovoice/rhino-web-core"
import { CLOCK_EN_64 } from "../dist/rhn_contexts_base64"

@Component({
  selector: 'voice-widget',
  templateUrl: './voice_widget.component.html',
  styleUrls: ['./voice_widget.component.scss']
})
export class VoiceWidget {
  private inferenceDetection: Subscription
  private isTalkingDetection: Subscription
  private listeningDetection: Subscription
  private errorDetection: Subscription
  private isErrorDetection: Subscription

  title: "voice-widget"
  contextInfo: string | null
  isChunkLoaded: boolean = false
  isLoaded: boolean = false
  isError: boolean = false
  error: Error | string | null = null
  isListening: boolean | null = null
  isTalking: boolean = false
  errorMessage: string
  inference: RhinoInference | null = null

  constructor(private rhinoService: RhinoService) {
    // Subscribe to Rhino inference events
    this.inferenceDetection = rhinoService.inference$.subscribe(
      inference => {
        this.inference = inference
        console.log(inference)
      })

    // Subscribe to listening, isError, and error message
    this.listeningDetection = rhinoService.listening$.subscribe(
      listening => {
        this.isListening = listening
      })
    this.errorDetection = rhinoService.error$.subscribe(
      error => {
        this.error = error
      })
    this.isErrorDetection = rhinoService.isError$.subscribe(
      isError => {
        this.isError = isError
      })
    this.isTalkingDetection = rhinoService.isTalking$.subscribe(
      isTalking => {
        this.isTalking = isTalking
      })
  }

  async ngOnInit() {

  }

  ngOnDestroy() {
    this.inferenceDetection.unsubscribe()
    this.listeningDetection.unsubscribe()
    this.errorDetection.unsubscribe()
    this.isErrorDetection.unsubscribe()
    this.isTalkingDetection.unsubscribe()
    this.rhinoService.release()
  }

  public pause() {
    this.rhinoService.pause();
  }

  public start() {
    this.rhinoService.start();
  }

  public stop() {
    this.rhinoService.stop();
  }

  public pushToTalk() {
    this.inference = null
    this.rhinoService.pushToTalk()
  }

  public async initEngine(accessKey: string) {
    if (accessKey.length >= 0) {
      this.rhinoService.release();
      const rhinoServiceArgs: RhinoServiceArgs = {accessKey: accessKey, context: {base64: CLOCK_EN_64}};

      // Load Rhino worker chunk with specific language model (large ~3-4MB chunk; needs to be dynamically imported)
      const rhinoFactoryEn = (await import('@picovoice/rhino-web-en-worker')).RhinoWorkerFactory;
      this.isChunkLoaded = true;
      console.info("Rhino EN is loaded.");
      // Initialize Rhino Service
      try {
        await this.rhinoService.init(rhinoFactoryEn, rhinoServiceArgs);
        console.info("Rhino is ready!");
        this.isError = false;
        this.isLoaded = true;
        this.contextInfo = this.rhinoService.contextInfo;
      }
      catch (error) {
        console.error(error);
        this.isError = true;
        this.errorMessage = error.toString();
      }
    }
  }
}
