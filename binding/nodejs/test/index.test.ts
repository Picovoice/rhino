//
// Copyright 2020-2022 Picovoice Inc.
//
// You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
// file accompanying this source.
//
// Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
// an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
// specific language governing permissions and limitations under the License.
//
"use strict";

import Rhino, { RhinoInference } from "../src/rhino";

import * as fs from "fs";
import * as path from "path";
import { performance } from "perf_hooks";
import { getInt16Frames, checkWaveFile } from "../src/wave_util";
import { WaveFile } from "wavefile";

import { RhinoInvalidArgumentError, RhinoInvalidStateError } from "../src/errors";
import { getPlatform, getSystemLibraryPath } from "../src/platforms";

const MODEL_PATH = "./lib/common/rhino_params.pv";
const MODEL_PATH_DE = "../../lib/common/rhino_params_de.pv";
const MODEL_PATH_ES = "../../lib/common/rhino_params_es.pv";
const MODEL_PATH_FR = "../../lib/common/rhino_params_fr.pv";

const WAV_PATH_COFFEE_MAKER_IN_CONTEXT =
  "../../../resources/audio_samples/test_within_context.wav";
const WAV_PATH_COFFEE_MAKER_OUT_OF_CONTEXT =
  "../../../resources/audio_samples/test_out_of_context.wav";
const WAV_PATH_IN_CONTEXT_DE =
  "../../../resources/audio_samples/test_within_context_de.wav";
const WAV_PATH_OUT_OF_CONTEXT_DE =
  "../../../resources/audio_samples/test_out_of_context_de.wav";
const WAV_PATH_IN_CONTEXT_ES =
  "../../../resources/audio_samples/test_within_context_es.wav";
const WAV_PATH_OUT_OF_CONTEXT_ES =
  "../../../resources/audio_samples/test_out_of_context_es.wav";
const WAV_PATH_IN_CONTEXT_FR =
  "../../../resources/audio_samples/test_within_context_fr.wav";
const WAV_PATH_OUT_OF_CONTEXT_FR =
  "../../../resources/audio_samples/test_out_of_context_fr.wav";


const platform = getPlatform();
const libraryPath = getSystemLibraryPath();

const contextPathCoffeeMaker =
  `../../resources/contexts/${platform}/coffee_maker_${platform}.rhn`;
const contextPathBeleuchtungDe =
  `../../resources/contexts_de/${platform}/beleuchtung_${platform}.rhn`;
const contextPathIluminacionInteligenteEs =
  `../../resources/contexts_es/${platform}/iluminación_inteligente_${platform}.rhn`;


const ACCESS_KEY = process.argv.filter((x) => x.startsWith('--access_key='))[0]?.split('--access_key=')[1] ?? "";
const PERFORMANCE_THRESHOLD_SEC = Number(process.argv.filter((x) => x.startsWith('--performance_threshold_sec='))[0]?.split('--performance_threshold_sec=')[1] ?? 0);
const describe_if = (condition: boolean) => condition ? describe : describe.skip;

function rhinoProcessWaveFile(
  engineInstance: Rhino,
  relativeWaveFilePath: string,
  ignoreIsFinalized: boolean = false
): RhinoInference {
  const waveFilePath = path.join(__dirname, relativeWaveFilePath);
  const waveBuffer = fs.readFileSync(waveFilePath);
  const waveAudioFile = new WaveFile(waveBuffer);

  if (!checkWaveFile(waveAudioFile, engineInstance.sampleRate)) {
    fail(
      "Audio file did not meet requirements. Wave file must be 16KHz, 16-bit, linear PCM (mono)."
    );
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

  fail("hehehehe");
}

describe("intent detection (coffee maker)", () => {
  test("successful inference", () => {
    const rhinoEngine = new Rhino(ACCESS_KEY, contextPathCoffeeMaker);

    const inference = rhinoProcessWaveFile(
      rhinoEngine,
      WAV_PATH_COFFEE_MAKER_IN_CONTEXT
    );

    expect(inference["isUnderstood"]).toBe(true);
    expect(inference["intent"]).toEqual("orderBeverage");
    expect(inference.slots?.beverage).toEqual("americano");

    rhinoEngine.release();
  });

  test("out-of-context phrase is not understood", () => {
    const rhinoEngine = new Rhino(ACCESS_KEY, contextPathCoffeeMaker);

    const inference = rhinoProcessWaveFile(
      rhinoEngine,
      WAV_PATH_COFFEE_MAKER_OUT_OF_CONTEXT
    );

    expect(inference["isUnderstood"]).toBe(false);
    expect(inference["intent"]).toBe(undefined);

    rhinoEngine.release();
  });

  test("getInference throws RhinoInvalidStateError if called before isFinalized is true", () => {
    const rhinoEngine = new Rhino(ACCESS_KEY, contextPathCoffeeMaker);

    expect(() => {
      const inference = rhinoProcessWaveFile(
        rhinoEngine,
        WAV_PATH_COFFEE_MAKER_IN_CONTEXT,
        true
      );
    }).toThrow(RhinoInvalidStateError);

    rhinoEngine.release();
  });

  test("process method returns boolean", () => {
    const rhinoEngine = new Rhino(ACCESS_KEY, contextPathCoffeeMaker);
    const isFinalized = rhinoEngine.process(
      new Int16Array(rhinoEngine.frameLength)
    );
    expect(isFinalized).toEqual(false);
    rhinoEngine.release();
  });

  test("successful inference object does not contain extraneous junk", () => {
    const rhinoEngine = new Rhino(ACCESS_KEY, contextPathCoffeeMaker);
    const inference = rhinoProcessWaveFile(
      rhinoEngine,
      WAV_PATH_COFFEE_MAKER_IN_CONTEXT
    );
    expect(inference.isUnderstood).toEqual(true);

    for (const [key, value] of Object.entries({...inference.slots})) {
      expect(key).not.toEqual("orderBeverage");
      expect(key).not.toEqual("");
      expect(value).not.toEqual(undefined);
    }

    rhinoEngine.release();
  });
});

describe("manual paths", () => {
  test("manual model path", () => {
    const rhinoEngine = new Rhino(
      ACCESS_KEY,
      contextPathCoffeeMaker,
      0.5,
      true,
      MODEL_PATH
    );

    const inference = rhinoProcessWaveFile(
      rhinoEngine,
      WAV_PATH_COFFEE_MAKER_IN_CONTEXT
    );

    expect(inference["isUnderstood"]).toBe(true);
    expect(inference["intent"]).toEqual("orderBeverage");
    expect(inference.slots?.beverage).toEqual("americano");

    rhinoEngine.release();
  });

  test("manual model and library path", () => {
    const rhinoEngine = new Rhino(
      ACCESS_KEY,
      contextPathCoffeeMaker,
      0.5,
      true,
      MODEL_PATH,
      libraryPath
    );

    const inference = rhinoProcessWaveFile(
      rhinoEngine,
      WAV_PATH_COFFEE_MAKER_IN_CONTEXT
    );

    expect(inference["isUnderstood"]).toBe(true);
    expect(inference["intent"]).toEqual("orderBeverage");
    expect(inference.slots?.beverage).toEqual("americano");

    rhinoEngine.release();
  });
});

describe("intent detection in DE", () => {
  test("successful inference beleuchtung", () => {
    const rhinoEngine = new Rhino(
      ACCESS_KEY,
      contextPathBeleuchtungDe,
      0.5,
      true,
      MODEL_PATH_DE
    );

    const inference = rhinoProcessWaveFile(
      rhinoEngine,
      WAV_PATH_IN_CONTEXT_DE
    );

    expect(inference["isUnderstood"]).toBe(true);
    expect(inference["intent"]).toEqual("changeState");
    expect(inference.slots?.state).toEqual("aus");

    rhinoEngine.release();
  });

  test("out-of-context phrase is not understood", () => {
    const rhinoEngine = new Rhino(
      ACCESS_KEY,
      contextPathBeleuchtungDe,
      0.5,
      true,
      MODEL_PATH_DE
    );

    const inference = rhinoProcessWaveFile(
      rhinoEngine,
      WAV_PATH_OUT_OF_CONTEXT_DE
    );
    expect(inference["isUnderstood"]).toBe(false);
    expect(inference["intent"]).toBe(undefined);

    rhinoEngine.release();
  });
});

describe("intent detection in ES", () => {
  test("successful inference iluminación inteligente", () => {
    const rhinoEngine = new Rhino(
      ACCESS_KEY,
      contextPathIluminacionInteligenteEs,
      0.5,
      true,
      MODEL_PATH_ES
    );

    const inference = rhinoProcessWaveFile(
      rhinoEngine,
      WAV_PATH_IN_CONTEXT_ES
    );

    expect(inference["isUnderstood"]).toBe(true);
    expect(inference["intent"]).toEqual("changeColor");
    expect(inference.slots?.location).toEqual("habitación");
    expect(inference.slots?.color).toEqual("rosado");

    rhinoEngine.release();
  });

  test("out-of-context phrase is not understood", () => {
    const rhinoEngine = new Rhino(
      ACCESS_KEY,
      contextPathIluminacionInteligenteEs,
      0.5,
      true,
      MODEL_PATH_ES
    );

    const inference = rhinoProcessWaveFile(
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
    const rhinoEngine = new Rhino(ACCESS_KEY, contextPathCoffeeMaker, 0.65);

    const inference = rhinoProcessWaveFile(
      rhinoEngine,
      WAV_PATH_COFFEE_MAKER_IN_CONTEXT
    );

    expect(inference["isUnderstood"]).toBe(true);

    rhinoEngine.release();
  });

  test("invalid sensitivity range", () => {
    expect(() => {
      const rhinoEngine = new Rhino(ACCESS_KEY, contextPathCoffeeMaker, 2.99);
    }).toThrow(RangeError);
  });

  test("invalid sensitivity type", () => {
    expect(() => {
      const rhinoEngine = new Rhino(
        ACCESS_KEY,
        contextPathCoffeeMaker,
        // @ts-expect-error
        "they told me I was daft to build a castle on a swamp"
      );
    }).toThrow(RangeError);
  });
});

describe("frame validation", () => {
  test("accepts non Int16Array if array is valid", () => {
    const rhinoEngine = new Rhino(ACCESS_KEY, contextPathCoffeeMaker);
    const emptyArray = Array.apply(null, Array(rhinoEngine.frameLength)).map((x, i) => i)
    // @ts-expect-error
    rhinoEngine.process(emptyArray);
    rhinoEngine.release();
  });

  test("mismatched frameLength throws error", () => {
    const rhinoEngine = new Rhino(ACCESS_KEY, contextPathCoffeeMaker);
    expect(() => {
      // @ts-expect-error
      rhinoEngine.process([1, 2, 3]);
    }).toThrow(RhinoInvalidArgumentError);
    rhinoEngine.release();
  });

  test("null/undefined frames throws error", () => {
    const rhinoEngine = new Rhino(ACCESS_KEY, contextPathCoffeeMaker);
    expect(() => {
      // @ts-expect-error
      rhinoEngine.process(null);
    }).toThrow(RhinoInvalidArgumentError);
    expect(() => {
      // @ts-expect-error
      rhinoEngine.process(undefined);
    }).toThrow(RhinoInvalidArgumentError);
    rhinoEngine.release();
  });

  test("passing floating point frame values throws RhinoInvalidArgumentError", () => {
    const rhinoEngine = new Rhino(ACCESS_KEY, contextPathCoffeeMaker);
    const floatFrames = Array.from({ length: rhinoEngine.frameLength }).map(
      (x) => 3.1415
    );
    expect(() => {
      // @ts-expect-error
      rhinoEngine.process(floatFrames);
    }).toThrow(RhinoInvalidArgumentError);
    rhinoEngine.release();
  });
});

describe("getContextInfo", () => {
  test("coffee maker expressions and slots are returned", () => {
    const rhinoEngine = new Rhino(ACCESS_KEY, contextPathCoffeeMaker);

    const contextInfo = rhinoEngine.getContextInfo();

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
  test("attempt to process after release throws RhinoInvalidStateError", () => {
    const rhinoEngine = new Rhino(ACCESS_KEY, contextPathCoffeeMaker);

    const inference = rhinoProcessWaveFile(
      rhinoEngine,
      WAV_PATH_COFFEE_MAKER_IN_CONTEXT
    );

    expect(inference["isUnderstood"]).toBe(true);
    expect(inference["intent"]).toEqual("orderBeverage");
    expect(inference.slots?.beverage).toEqual("americano");

    rhinoEngine.release();

    expect(() => {
      const inference = rhinoProcessWaveFile(
        rhinoEngine,
        WAV_PATH_COFFEE_MAKER_IN_CONTEXT
      );
    }).toThrow(RhinoInvalidStateError);
  });
});


describe_if(PERFORMANCE_THRESHOLD_SEC > 0)("performance", () => {
  test("process", () => {
    const rhinoEngine = new Rhino(ACCESS_KEY, contextPathCoffeeMaker);

    const path = require("path");
    const waveFilePath = path.join(__dirname, WAV_PATH_COFFEE_MAKER_IN_CONTEXT);
    const waveBuffer = fs.readFileSync(waveFilePath);
    const waveAudioFile = new WaveFile(waveBuffer);

    const frames = getInt16Frames(waveAudioFile, rhinoEngine.frameLength);
    let total = 0;
    for (let i = 0; i < frames.length; i++) {
      const frame = frames[0];
      const before = performance.now();
      rhinoEngine.process(frame);
      const after = performance.now();
      total += (after - before);
    }

    rhinoEngine.release();

    total = Number((total / 1000).toFixed(3));
    expect(total).toBeLessThanOrEqual(PERFORMANCE_THRESHOLD_SEC);
  });
});
