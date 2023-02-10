//
// Copyright 2022-2023 Picovoice Inc.
//
// You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
// file accompanying this source.
//
// Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
// an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
// specific language governing permissions and limitations under the License.
//
import * as path from "path";
import {getPlatform} from "../src/platforms";

const ROOT_DIR = path.join(__dirname, "../../..");
const TEST_DATA_JSON = require(path.join(ROOT_DIR, 'resources/test/test_data.json'));

function appendLanguage(
    s: string,
    language: string): string {
    if (language === "en") {
        return s;
    } else {
        return s + "_" + language;
    }
}

export function getModelPathByLanguage(language: string): string {
    return path.join(ROOT_DIR, `${appendLanguage('lib/common/rhino_params', language)}.pv`);
}

export function getContextPathsByLanguage(
    language: string,
    context: string): string {

    return path.join(
        ROOT_DIR,
        appendLanguage('resources/contexts', language),
        getPlatform(),
        `${context}_${getPlatform()}.rhn`);
}

export function getAudioFileByLanguage(
    language: string,
    is_within_context: boolean): string {

    let audioFileName = "";
    if (is_within_context) {
        audioFileName = `${appendLanguage('test_within_context', language)}.wav`;
    } else {
        audioFileName = `${appendLanguage('test_out_of_context', language)}.wav`;
    }

    return path.join(
        ROOT_DIR,
        'resources/audio_samples',
        audioFileName);
}

export function getWithinContextParameters(): [string, string, string, Record<string, string>][] {
  let withinContextJson = TEST_DATA_JSON.tests.within_context;
  return withinContextJson.map(
    (x: any) => [x.language, x.context_name, x.inference.intent, x.inference.slots]
  );
}

export function getOutOfContextParameters(): [string, string][] {
  let outOfContextJson = TEST_DATA_JSON.tests.out_of_context;
  return outOfContextJson.map(
    (x: any) => [x.language, x.context_name]
  );
}
