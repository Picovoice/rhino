//
// Copyright 2020-2021 Picovoice Inc.
//
// You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
// file accompanying this source.
//
// Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
// an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
// specific language governing permissions and limitations under the License.
//
"use strict";

const Rhino = require("./index.js");
const fs = require("fs");
const { getInt16Frames, checkWaveFile } = require("./wave_util");
const WaveFile = require("wavefile").WaveFile;

const { PvArgumentError, PvStateError } = require("./errors");
const { getPlatform, getSystemLibraryPath } = require("./platforms");

const MODEL_PATH = "./lib/common/rhino_params.pv";
const MODEL_PATH_DE = "../../lib/common/rhino_params_de.pv";
const MODEL_PATH_ES = "../../lib/common/rhino_params_es.pv";
const MODEL_PATH_FR = "../../lib/common/rhino_params_fr.pv";

const WAV_PATH_COFFEE_MAKER_IN_CONTEXT =
  "../../resources/audio_samples/test_within_context.wav";
const WAV_PATH_COFFEE_MAKER_OUT_OF_CONTEXT =
  "../../resources/audio_samples/test_out_of_context.wav";
const WAV_PATH_IN_CONTEXT_DE =
  "../../resources/audio_samples/test_within_context_de.wav";
const WAV_PATH_OUT_OF_CONTEXT_DE =
  "../../resources/audio_samples/test_out_of_context_de.wav";
const WAV_PATH_IN_CONTEXT_ES =
  "../../resources/audio_samples/test_within_context_es.wav";
const WAV_PATH_OUT_OF_CONTEXT_ES =
  "../../resources/audio_samples/test_out_of_context_es.wav";
const WAV_PATH_IN_CONTEXT_FR =
  "../../resources/audio_samples/test_within_context_fr.wav";
const WAV_PATH_OUT_OF_CONTEXT_FR =
  "../../resources/audio_samples/test_out_of_context_fr.wav";  


const platform = getPlatform();
const libraryPath = getSystemLibraryPath();

const contextPathCoffeeMaker =
  `../../resources/contexts/${platform}/coffee_maker_${platform}.rhn`;
const contextPathBeleuchtungDe =
  `../../resources/contexts_de/${platform}/beleuchtung_${platform}.rhn`;
const contextPathLuzEs =
  `../../resources/contexts_es/${platform}/luz_${platform}.rhn`;


const ACCESS_KEY = process.argv
  .filter((x) => x.startsWith("--access_key="))[0]
  .split("--access_key=")[1];

function rhinoProcessWaveFile(
  engineInstance,
  relativeWaveFilePath,
  ignoreIsFinalized = false
) {
  const path = require("path");
  const waveFilePath = path.join(__dirname, relativeWaveFilePath);
  const waveBuffer = fs.readFileSync(waveFilePath);
  const waveAudioFile = new WaveFile(waveBuffer);

  if (!checkWaveFile(waveAudioFile, engineInstance.sampleRate)) {
    console.error(
      "Audio file did not meet requirements. Wave file must be 16KHz, 16-bit, linear PCM (mono)."
    );
    return null;
  }

  const frames = getInt16Frames(waveAudioFile, engineInstance.frameLength);

  let isFinalized = false;
  for (let i = 0; i < frames.length; i++) {
    const frame = frames[i];
    isFinalized = engineInstance.process(frame) || ignoreIsFinalized;

    if (isFinalized) {
      return engineInstance.getInference();
    }
  }
}

describe("intent detection (coffee maker)", () => {
  test("successful inference", () => {
    let rhinoEngine = new Rhino(ACCESS_KEY, contextPathCoffeeMaker);

    let inference = rhinoProcessWaveFile(
      rhinoEngine,
      WAV_PATH_COFFEE_MAKER_IN_CONTEXT
    );

    expect(inference["isUnderstood"]).toBe(true);
    expect(inference["intent"]).toEqual("orderBeverage");
    expect(inference["slots"]["beverage"]).toEqual("americano");

    rhinoEngine.release();
  });

  test("out-of-context phrase is not understood", () => {
    let rhinoEngine = new Rhino(ACCESS_KEY, contextPathCoffeeMaker);

    let inference = rhinoProcessWaveFile(
      rhinoEngine,
      WAV_PATH_COFFEE_MAKER_OUT_OF_CONTEXT
    );

    expect(inference["isUnderstood"]).toBe(false);
    expect(inference["intent"]).toBe(undefined);

    rhinoEngine.release();
  });

  test("getInference throws PvStateError if called before isFinalized is true", () => {
    let rhinoEngine = new Rhino(ACCESS_KEY, contextPathCoffeeMaker);

    expect(() => {
      let inference = rhinoProcessWaveFile(
        rhinoEngine,
        WAV_PATH_COFFEE_MAKER_IN_CONTEXT,
        true
      );
    }).toThrow(PvStateError);

    rhinoEngine.release();
  });

  test("process method returns boolean", () => {
    let rhinoEngine = new Rhino(ACCESS_KEY, contextPathCoffeeMaker);
    let isFinalized = rhinoEngine.process(
      new Int16Array(rhinoEngine.frameLength)
    );
    expect(isFinalized).toEqual(false);
    rhinoEngine.release();
  });

  test("successful inference object does not contain extraneous junk", () => {
    let rhinoEngine = new Rhino(ACCESS_KEY, contextPathCoffeeMaker);
    let inference = rhinoProcessWaveFile(
      rhinoEngine,
      WAV_PATH_COFFEE_MAKER_IN_CONTEXT
    );
    expect(inference.isUnderstood).toEqual(true);

    for (const [key, value] of Object.entries(inference.slots)) {
      expect(key).not.toEqual("orderBeverage");
      expect(key).not.toEqual("");
      expect(value).not.toEqual(undefined);
    }

    rhinoEngine.release();
  });
});

describe("manual paths", () => {
  test("manual model path", () => {
    let rhinoEngine = new Rhino(
      ACCESS_KEY,
      contextPathCoffeeMaker,
      0.5,
      true,
      MODEL_PATH
    );

    let inference = rhinoProcessWaveFile(
      rhinoEngine,
      WAV_PATH_COFFEE_MAKER_IN_CONTEXT
    );

    expect(inference["isUnderstood"]).toBe(true);
    expect(inference["intent"]).toEqual("orderBeverage");
    expect(inference["slots"]["beverage"]).toEqual("americano");

    rhinoEngine.release();
  });

  test("manual model and library path", () => {
    let rhinoEngine = new Rhino(
      ACCESS_KEY,
      contextPathCoffeeMaker,
      0.5,
      true,
      MODEL_PATH,
      libraryPath
    );

    let inference = rhinoProcessWaveFile(
      rhinoEngine,
      WAV_PATH_COFFEE_MAKER_IN_CONTEXT
    );

    expect(inference["isUnderstood"]).toBe(true);
    expect(inference["intent"]).toEqual("orderBeverage");
    expect(inference["slots"]["beverage"]).toEqual("americano");

    rhinoEngine.release();
  });
});

describe("intent detection in DE", () => {
  test("successful inference beleuchtung", () => {
    let rhinoEngine = new Rhino(
      ACCESS_KEY,
      contextPathBeleuchtungDe,
      0.5,
      true,
      MODEL_PATH_DE
    );

    let inference = rhinoProcessWaveFile(
      rhinoEngine,
      WAV_PATH_IN_CONTEXT_DE
    );

    expect(inference["isUnderstood"]).toBe(true);
    expect(inference["intent"]).toEqual("changeState");
    expect(inference["slots"]["state"]).toEqual("aus");

    rhinoEngine.release();
  });

  test("out-of-context phrase is not understood", () => {
    let rhinoEngine = new Rhino(
      ACCESS_KEY,
      contextPathBeleuchtungDe,
      0.5,
      true,
      MODEL_PATH_DE
    );

    let inference = rhinoProcessWaveFile(
      rhinoEngine,
      WAV_PATH_OUT_OF_CONTEXT_DE
    );
    expect(inference["isUnderstood"]).toBe(false);
    expect(inference["intent"]).toBe(undefined);

    rhinoEngine.release();
  });
});

describe("intent detection in ES", () => {
  test("successful inference luz", () => {
    let rhinoEngine = new Rhino(
      ACCESS_KEY,
      contextPathLuzEs,
      0.5,
      true,
      MODEL_PATH_ES
    );

    let inference = rhinoProcessWaveFile(
      rhinoEngine,
      WAV_PATH_IN_CONTEXT_ES
    );

    expect(inference["isUnderstood"]).toBe(true);
    expect(inference["intent"]).toEqual("changeColor");
    expect(inference["slots"]["location"]).toEqual("habitación");
    expect(inference["slots"]["color"]).toEqual("rosado");

    rhinoEngine.release();
  });

  test("out-of-context phrase is not understood", () => {
    let rhinoEngine = new Rhino(
      ACCESS_KEY,
      contextPathLuzEs,
      0.5,
      true,
      MODEL_PATH_ES
    );

    let inference = rhinoProcessWaveFile(
      rhinoEngine,
      WAV_PATH_OUT_OF_CONTEXT_ES
    );
    expect(inference["isUnderstood"]).toBe(false);
    expect(inference["intent"]).toBe(undefined);

    rhinoEngine.release();
  });
});

describe("basic parameter validation", () => {
  test("custom sensitivity", () => {
    let rhinoEngine = new Rhino(ACCESS_KEY, contextPathCoffeeMaker, 0.65);

    let inference = rhinoProcessWaveFile(
      rhinoEngine,
      WAV_PATH_COFFEE_MAKER_IN_CONTEXT
    );

    expect(inference["isUnderstood"]).toBe(true);

    rhinoEngine.release();
  });

  test("invalid sensitivity range", () => {
    expect(() => {
      let rhinoEngine = new Rhino(ACCESS_KEY, contextPathCoffeeMaker, 2.99);
    }).toThrow(RangeError);
  });

  test("invalid sensitivity type", () => {
    expect(() => {
      let rhinoEngine = new Rhino(
        ACCESS_KEY,
        contextPathCoffeeMaker,
        "they told me I was daft to build a castle on a swamp"
      );
    }).toThrow(RangeError);
  });
});

describe("frame validation", () => {
  test("mismatched frameLength throws error", () => {
    let rhinoEngine = new Rhino(ACCESS_KEY, contextPathCoffeeMaker);
    expect(() => {
      rhinoEngine.process([1, 2, 3]);
    }).toThrow(PvArgumentError);
    rhinoEngine.release();
  });

  test("null/undefined frames throws error", () => {
    let rhinoEngine = new Rhino(ACCESS_KEY, contextPathCoffeeMaker);
    expect(() => {
      rhinoEngine.process(null);
    }).toThrow(PvArgumentError);
    expect(() => {
      rhinoEngine.process(undefined);
    }).toThrow(PvArgumentError);
    rhinoEngine.release();
  });

  test("passing floating point frame values throws PvArgumentError", () => {
    let rhinoEngine = new Rhino(ACCESS_KEY, contextPathCoffeeMaker);
    let floatFrames = Array.from({ length: rhinoEngine.frameLength }).map(
      (x) => 3.1415
    );
    expect(() => {
      rhinoEngine.process(floatFrames);
    }).toThrow(PvArgumentError);
    rhinoEngine.release();
  });
});

describe("getContextInfo", () => {
  test("coffee maker expressions and slots are returned", () => {
    let rhinoEngine = new Rhino(ACCESS_KEY, contextPathCoffeeMaker);

    let contextInfo = rhinoEngine.getContextInfo();

    expect(contextInfo).toMatch(
      /(\[brew, can I get, can I have, I want, get me, give me, I'd like, make me, may I have)/i
    );
    expect(contextInfo).toMatch(/(- "triple shot")/i);
    expect(contextInfo).not.toMatch(
      /(the third one burned down, fell over, and sank into the swamp)/i
    );

    rhinoEngine.release();
  });
});

describe("invalid state", () => {
  test("attempt to process after release throws PvStateError", () => {
    let rhinoEngine = new Rhino(ACCESS_KEY, contextPathCoffeeMaker);

    let inference = rhinoProcessWaveFile(
      rhinoEngine,
      WAV_PATH_COFFEE_MAKER_IN_CONTEXT
    );

    expect(inference["isUnderstood"]).toBe(true);
    expect(inference["intent"]).toEqual("orderBeverage");
    expect(inference["slots"]["beverage"]).toEqual("americano");

    rhinoEngine.release();

    expect(() => {
      count = rhinoProcessWaveFile(
        rhinoEngine,
        WAV_PATH_COFFEE_MAKER_IN_CONTEXT
      );
    }).toThrow(PvStateError);
  });
});
