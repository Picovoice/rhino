class WebVoiceProcessor {
  constructor() {
    this.audioContext = null
    this.audioContext = null
    this.downsampler = null
    this.engines = null
    this.isRecording = false
  }

  start(engines, downsamplerScript, errorCallback) {
    this.engines = engines
    if (this.downsampler === null) {
      this.downsampler = new Worker(downsamplerScript)
      navigator.mediaDevices
        .getUserMedia({ audio: true })
        .then(stream => this.connect(stream))
        .catch(errorCallback)
    }

    this.isRecording = true
  }

  connect(stream) {
    this.audioContext = new (window.AudioContext || window.webkitAudioContext)()
    let audioSource = this.audioContext.createMediaStreamSource(stream)
    let node = this.audioContext.createScriptProcessor(4096, 1, 1)
    node.onaudioprocess = function (e) {
      if (!this.isRecording) {
        return
      }

      this.downsampler.postMessage({
        command: "process",
        inputFrame: e.inputBuffer.getChannelData(0),
      })
    }.bind(this)
    audioSource.connect(node)
    node.connect(this.audioContext.destination)

    this.downsampler.postMessage({
      command: "init",
      inputSampleRate: audioSource.context.sampleRate,
    })

    let engines2 = this.engines

    this.downsampler.onmessage = function (e) {
      engines2.forEach(function (engine) {
        engine.postMessage({ command: "process", inputFrame: e.data })
      })
    }
  }

  stop() {
    this.isRecording = false
    if (this.downsampler !== null) {
      this.downsampler.postMessage({ command: "reset" })
      this.downsampler.terminate()
      this.downsampler = null
      if (this.audioContext !== null) {
        try {
          this.audioContext.close()
        } catch (e) {
          console.error(e)
        }
      }
    }
  }
}

export default WebVoiceProcessor
