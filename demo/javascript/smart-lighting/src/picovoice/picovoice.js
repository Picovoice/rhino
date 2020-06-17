import { LIGHTING_CONTEXT, PICO_HOUSE, PICO_HOME} from "./smart_lighting_64"

const porcupineWorkerUrl = `${process.env.PUBLIC_URL}/scripts/porcupine_worker.js`
const rhinoWorkerUrl = `${process.env.PUBLIC_URL}/scripts/rhino_worker.js`
// const downsamplingWorkerUrl = `/node_modules/@picovoice/web-voice-processor/src/downsampling_worker.js`
const downsamplingWorkerUrl = `${process.env.PUBLIC_URL}/scripts/downsampling_worker.js`

console.log("Picovoice")

class Picovoice {
  constructor ()  {
    this.ppnRhnMgr = window.PorcupineRhinoManager
    this.keywordIDs = {
      picohouse_0: Buffer.from(PICO_HOME, "base64"),
      picohome_0: Buffer.from(PICO_HOUSE, "base64"),
    }

    this.sensitivities = new Float32Array([0.6, 0.6])

    this.context = Buffer.from(LIGHTING_CONTEXT, "base64")
  }

  errorCallback = function (ex) {
    alert(ex.toString())
  }

  start = (initCallback, ppnCallback, rhnCallback) => {
    this.ppnRhnMgr.start(
      this.keywordIDs,
      this.sensitivities,
      ppnCallback,
      this.context,
      rhnCallback,
      this.errorCallback,
      initCallback,
      porcupineWorkerUrl,
      rhinoWorkerUrl,
      downsamplingWorkerUrl
    );
    console.log("started")

  }

  refresh = (initCallback, ppnCallback, rhnCallback) => {
    if (this.ppnRhnMgr !== null) {
      this.ppnRhnMgr.initCallback = initCallback
      this.ppnRhnMgr.ppnCallback = ppnCallback
      this.ppnRhnMgr.rhnCallback = rhnCallback
    }
  }

  stop = () => {
    if (this.ppnRhnMgr !== null) {
      this.ppnRhnMgr.stop()
    }
    this.ppnRhnMgr = null
  }
}

export default Picovoice
