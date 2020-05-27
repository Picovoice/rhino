import WebVoiceProcessor from "./web_voice_processor"

const PPN_KEYWORD_MIN_INTERVAL_MS = 1000

class PorcupineRhinoManager {
  constructor(porcupineWorkerScript, rhinoWorkerScript, downsamplingScript) {
    this.porcupineWorker = null
    this.rhinoWorker = null
    this.rhinoWorker = null
    this.isWakeWordDetected = false
    this.webVp = new WebVoiceProcessor()
    this.porcupineWorkerScript = porcupineWorkerScript
    this.rhinoWorkerScript = rhinoWorkerScript
    this.downsamplingScript = downsamplingScript
    this.ppnListeningStartTime = Date.now() - PPN_KEYWORD_MIN_INTERVAL_MS
  }

  start(
    keywordsID,
    keywordSensitivities,
    keywordDetectionCallback,
    context,
    inferenceCallback,
    errorCallback
  ) {
    this.porcupineWorker = new Worker(this.porcupineWorkerScript)
    this.porcupineWorker.postMessage({
      command: "init",
      keywordIDs: keywordsID,
      sensitivities: keywordSensitivities,
    })
    this.rhinoWorker = new Worker(this.rhinoWorkerScript)
    this.rhinoWorker.postMessage({ command: "init", context: context })

    const ppnWorker = this.porcupineWorker
    const rhnWorker = this.rhinoWorker

    this.porcupineWorker.onmessage = function (e) {
      if (e.data === "ppn-init") {
        document.dispatchEvent(new CustomEvent("ppn-init"))
      } else if (!this.isWakeWordDetected) {
        let wakeWordDetected = e.data.keyword !== null

        // Handle multi-wake word 'duplicate' keyword events by adding a minimum time between detections
        if (wakeWordDetected) {
          let elapsedTimeMs = Date.now() - this.ppnListeningStartTime

          if (elapsedTimeMs > PPN_KEYWORD_MIN_INTERVAL_MS) {
            this.isWakeWordDetected = true
            keywordDetectionCallback(e.data.keyword)
            ppnWorker.postMessage({ command: "pause" })
            rhnWorker.postMessage({ command: "resume" })
          }
        }
      }
    }.bind(this)

    this.rhinoWorker.onmessage = function (e) {
      if (e.data === "rhn-init") {
        document.dispatchEvent(new CustomEvent("rhn-init"))
      } else {
        inferenceCallback(e.data)
        this.isWakeWordDetected = false
        this.ppnListeningStartTime = Date.now()
        rhnWorker.postMessage({ command: "pause" })
        ppnWorker.postMessage({ command: "resume" })
      }
    }.bind(this)

    this.webVp.start(
      [this.porcupineWorker, this.rhinoWorker],
      this.downsamplingScript,
      errorCallback
    )
  }

  stop() {
    this.webVp.stop()
    this.porcupineWorker.postMessage({ command: "release" })
    this.rhinoWorker.postMessage({ command: "release" })
  }
}

export default PorcupineRhinoManager
