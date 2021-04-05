import { Component } from "@angular/core"
import { Subscription } from "rxjs"

import { RhinoService } from "@picovoice/rhino-web-angular"
import { RhinoInference, RhinoServiceArgs } from "@picovoice/rhino-web-angular/lib/rhino_types"
import { ALARM_CLOCK_64 } from "./rhino_context"

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
  isChunkLoaded: boolean = false
  isLoaded: boolean = false
  isError: boolean = false
  error: Error | string | null = null
  isListening: boolean | null = null
  isTalking: boolean = false
  errorMessage: string
  inference: RhinoInference | null = null
  rhinoServiceArgs: RhinoServiceArgs = {
    context: {
      base64:
        ALARM_CLOCK_64
    }
  }

  constructor(private rhinoService: RhinoService) {
    // Subscribe to Rhino Keyword detections
    // Store each detection so we can display it in an HTML list
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
    // Load Rhino worker chunk with specific language model (large ~3-4MB chunk; needs to be dynamically imported)
    const rhinoFactoryEn = (await import('@picovoice/rhino-web-en-worker')).RhinoWorkerFactory
    this.isChunkLoaded = true
    console.info("Rhino EN is loaded.")
    // Initialize Rhino Service
    try {
      await this.rhinoService.init(rhinoFactoryEn, this.rhinoServiceArgs)
      console.info("Rhino is ready!")
      this.isLoaded = true;
    }
    catch (error) {
      console.error(error)
      this.isError = true;
      this.errorMessage = error.toString();
    }
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

  public resume() {
    this.rhinoService.resume();
  }

  public start() {
    this.rhinoService.start();
  }

  public pushToTalk() {
    this.inference = null
    this.rhinoService.pushToTalk()
  }
}
