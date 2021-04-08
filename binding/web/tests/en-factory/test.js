/*
    Copyright 2021 Picovoice Inc.
    You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
    file accompanying this source.
    Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
    an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
    specific language governing permissions and limitations under the License.
*/

import { Rhino } from "../dist/esm/index.js";
import { readFileSync } from "fs";
import { getInt16Frames, checkWaveFile } from "./wave_util";
import { WaveFile } from "wavefile";
import fs from "fs";

const WAV_PATH_COFFEE_MAKER_IN_CONTEXT =
  "../../../resources/audio_samples/test_within_context.wav";
const WAV_PATH_COFFEE_MAKER_OUT_OF_CONTEXT =
  "../../../resources/audio_samples/test_out_of_context.wav";

const contextPathCoffeeMaker = `../../../resources/contexts/wasm/coffee_maker_wasm.rhn`;
let coffeeMaker64 = fs.readFileSync(contextPathCoffeeMaker).toString("base64");

function rhinoProcessWaveFile(handle, waveFilePath) {
  const waveBuffer = readFileSync(waveFilePath);
  const waveAudioFile = new WaveFile(waveBuffer);

  if (!checkWaveFile(waveAudioFile, handle.sampleRate)) {
    console.error(
      "Audio file did not meet requirements. Wave file must be 16KHz, 16-bit, linear PCM (mono)."
    );
    return null;
  }

  const frames = getInt16Frames(waveAudioFile, handle.frameLength);

  for (let i = 0; i < frames.length; i++) {
    const frame = frames[i];
    const inference = handle.process(frame);
    if (inference.isFinalized) {
      console.log(inference);
      return inference;
    }
  }
}

describe("intent detection (coffee maker)", () => {
  test("successful inference", async () => {
    const handle = await Rhino.create({ base64: coffeeMaker64 });

    const inference = rhinoProcessWaveFile(
      handle,
      WAV_PATH_COFFEE_MAKER_IN_CONTEXT
    );

    expect(inference["isFinalized"]).toBe(true);
    expect(inference["isUnderstood"]).toBe(true);
    expect(inference["intent"]).toEqual("orderBeverage");
    expect(inference["slots"]["beverage"]).toEqual("americano");

    handle.release();
  });

  test("out-of-context phrase is not understood", async () => {
    const handle = await Rhino.create({ base64: coffeeMaker64 });

    const inference = rhinoProcessWaveFile(
      handle,
      WAV_PATH_COFFEE_MAKER_OUT_OF_CONTEXT
    );

    expect(inference["isFinalized"]).toBe(true);
    expect(inference["isUnderstood"]).toBe(false);
    expect(inference["intent"]).toBe(null);
    expect(inference["slots"]).toEqual({});

    handle.release();
  });
});
