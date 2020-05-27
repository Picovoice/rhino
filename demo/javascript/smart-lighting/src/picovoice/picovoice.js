import PorcupineRhinoManager from "./ppn_rhn_manager"

import {
  LIGHTING_CONTEXT_64,
  PICO_HOUSE_0,
  PICO_HOME_0

} from "./smart_lighting_64"

const porcupineWorkerUrl = `/scripts/porcupine_worker.js`
const rhinoWorkerUrl = `/scripts/rhino_worker.js`
const downsamplingWorkerUrl = `/scripts/downsampling_worker.js`

class Picovoice {
  constructor() {
    this.ppnRhnMgr = null
    this.keywordIDs = {
      picohouse_0: Buffer.from(PICO_HOUSE_0, "base64"),
      picohome_0: Buffer.from(PICO_HOME_0, "base64"),
    }

    this.sensitivities = new Float32Array([0.6, 0.6])

    this.context = Buffer.from(LIGHTING_CONTEXT_64, "base64")
  }

  ppnCallback = function (information) {
    let pvEvent = new CustomEvent("zoo-ppn", {
      detail: information,
    })
    document.dispatchEvent(pvEvent)
  }

  rhnCallback = function (information) {
    let pvEvent = new CustomEvent("zoo-rhn", {
      detail: information,
    })
    document.dispatchEvent(pvEvent)
  }

  errorCallback = function (ex) {
    alert(ex.toString())
  }

  start() {
    this.ppnRhnMgr = new PorcupineRhinoManager(
      porcupineWorkerUrl,
      rhinoWorkerUrl,
      downsamplingWorkerUrl
    )
    this.ppnRhnMgr.start(
      this.keywordIDs,
      this.sensitivities,
      this.ppnCallback,
      this.context,
      this.rhnCallback,
      this.errorCallback
    )
  }

  stop() {
    this.ppnRhnMgr.stop()
  }
}

export default Picovoice
