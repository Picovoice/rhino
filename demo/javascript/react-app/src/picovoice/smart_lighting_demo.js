import { LIGHTING_CONTEXT } from "./lighting_context.js";
import { PICOVOICE_64 } from "./picovoice_64.js";

const porcupineWorkerUrl = `${process.env.PUBLIC_URL}/scripts/porcupine_worker.js`;
const rhinoWorkerUrl = `${process.env.PUBLIC_URL}/scripts/rhino_worker.js`;
const downsamplingWorkerUrl = `${process.env.PUBLIC_URL}/scripts/downsampling_worker.js`;

class SmartLightingDemo {
  constructor() {
    this.ppnRhnMgr = window.PorcupineRhinoManager;
    this.keywordIDs = {
      picovoice: Buffer.from(PICOVOICE_64, "base64"),
    };

    this.sensitivities = new Float32Array([0.6]);

    this.context = Buffer.from(LIGHTING_CONTEXT, "base64");
  }

  errorCallback = function (ex) {
    alert(ex.toString());
  };

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
  };

  refresh = (initCallback, ppnCallback, rhnCallback) => {
    if (this.ppnRhnMgr !== null) {
      this.ppnRhnMgr.refresh(initCallback, ppnCallback, rhnCallback);
    }
  };

  stop = () => {
    if (this.ppnRhnMgr !== null) {
      this.ppnRhnMgr.stop();
    }
  };
}

export default SmartLightingDemo;
