//
// Copyright 2022 Picovoice Inc.
//
// You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
// file accompanying this source.
//
// Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
// an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
// specific language governing permissions and limitations under the License.
//
"use strict";

import Rhino from "../src/rhino";

import * as fs from "fs";
import {performance} from "perf_hooks";
import {getInt16Frames} from "../src";
import {WaveFile} from "wavefile";
import {getPlatform} from "../src/platforms";

const ACCESS_KEY = process.argv.filter((x) => x.startsWith('--access_key='))[0]?.split('--access_key=')[1] ?? "";
const NUM_TEST_ITERATIONS = Number(process.argv.filter((x) => x.startsWith('--num_test_iterations='))[0]?.split('--num_test_iterations=')[1] ?? 0);
const PERFORMANCE_THRESHOLD_SEC = Number(process.argv.filter((x) => x.startsWith('--performance_threshold_sec='))[0]?.split('--performance_threshold_sec=')[1] ?? 0);

const platform = getPlatform();

const contextPathCoffeeMaker =
  `../../resources/contexts/${platform}/coffee_maker_${platform}.rhn`;
const WAV_PATH_COFFEE_MAKER_IN_CONTEXT =
  "../../../resources/audio_samples/test_within_context.wav";

describe("performance", () => {
  test("process", () => {
    const rhinoEngine = new Rhino(ACCESS_KEY, contextPathCoffeeMaker);

    const path = require("path");
    const waveFilePath = path.join(__dirname, WAV_PATH_COFFEE_MAKER_IN_CONTEXT);
    const waveBuffer = fs.readFileSync(waveFilePath);
    const waveAudioFile = new WaveFile(waveBuffer);

    const frames = getInt16Frames(waveAudioFile, rhinoEngine.frameLength);

    let perf_results = []
    for (let i = 0; i < NUM_TEST_ITERATIONS; i++) {
      let total = 0;
      for (let j = 0; j < frames.length; j++) {
        const frame = frames[j];
        const before = performance.now();
        rhinoEngine.process(frame)
        total += (performance.now() - before);
      }

      if (i > 0) {
        perf_results.push(total)
      }
    }

    rhinoEngine.release();

    let avgPerfMs = perf_results.reduce((acc, a) => acc + a, 0) / NUM_TEST_ITERATIONS
    let avgPerfSec = Number((avgPerfMs / 1000).toFixed(3))
    console.log("Average Performance: " + avgPerfSec)
    expect(avgPerfSec).toBeLessThanOrEqual(PERFORMANCE_THRESHOLD_SEC);
  });
});
