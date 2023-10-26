//
// Copyright 2020-2023 Picovoice Inc.
//
// You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
// file accompanying this source.
//
// Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
// an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
// specific language governing permissions and limitations under the License.
//
'use strict';

import Rhino, { RhinoInference } from '../src/rhino';

import * as fs from 'fs';
import { checkWaveFile, getInt16Frames } from '../src';
import { WaveFile } from 'wavefile';

import { RhinoInvalidArgumentError } from '../src/errors';
import {
  getAudioFileByLanguage,
  getContextPathsByLanguage,
  getModelPathByLanguage,
  getWithinContextParameters,
  getOutOfContextParameters,
} from './test_utils';

const WITHIN_CONTEXT_PARAMETERS = getWithinContextParameters();
const OUT_OF_CONTEXT_PARAMETERS = getOutOfContextParameters();

const ACCESS_KEY =
  process.argv
    .filter(x => x.startsWith('--access_key='))[0]
    ?.split('--access_key=')[1] ?? '';

function processFileHelper(rhino: Rhino, audioFile: string, maxProcessCount: number = -1) {
  let processed = 0;

  const waveBuffer = fs.readFileSync(audioFile);
  const waveAudioFile = new WaveFile(waveBuffer);

  if (!checkWaveFile(waveAudioFile, rhino.sampleRate)) {
    fail(
      'Audio file did not meet requirements. Wave file must be 16KHz, 16-bit, linear PCM (mono).'
    );
  }

  const frames = getInt16Frames(waveAudioFile, rhino.frameLength);

  let isFinalized = false;
  for (let i = 0; i < frames.length; i++) {
    const frame = frames[i];
    isFinalized = rhino.process(frame);

    if (isFinalized) {
      break;
    }
    if (maxProcessCount !== -1 && processed >= maxProcessCount) {
      break;
    }
    processed++;
  }

  return isFinalized;
}

function testRhinoDetection(
  language: string,
  context: string,
  isWithinContext: boolean,
  groundTruth: RhinoInference | null = null
): void {
  const contextPath = getContextPathsByLanguage(language, context);

  const modelPath = getModelPathByLanguage(language);
  const engineInstance = new Rhino(
    ACCESS_KEY,
    contextPath,
    0.5,
    1.0,
    true,
    modelPath
  );

  const waveFilePath = getAudioFileByLanguage(language, isWithinContext);
  const isFinalized = processFileHelper(engineInstance, waveFilePath);
  if (isFinalized) {
    if (groundTruth !== null) {
      expect(engineInstance.getInference()).toEqual(groundTruth);
    } else {
      expect(engineInstance.getInference().isUnderstood).toBe(false);
    }
  }
}

describe("Reset", () => {
  test("Rhino reset works successfully", () => {
    const contextPath = getContextPathsByLanguage("en", "coffee_maker");
    const waveFilePath = getAudioFileByLanguage("en", true);
  
    const rhino = new Rhino(
      ACCESS_KEY,
      contextPath
    );

    let isFinalized = processFileHelper(rhino, waveFilePath, 15);
    expect(isFinalized).toBe(false);

    rhino.reset();
    isFinalized = processFileHelper(rhino, waveFilePath);
    expect(isFinalized).toBe(true);
    expect(rhino.getInference().isUnderstood).toBe(true);
  })
})

describe("error message stack", () => {
  test("message stack cleared after read", () => {    
    let error: string[] = [];
    try {
      new Rhino(
        "invalid",
        getContextPathsByLanguage('en', 'coffee_maker'));
    } catch (e: any) {
      error = e.messageStack;
    }

    expect(error.length).toBeGreaterThan(0);
    expect(error.length).toBeLessThanOrEqual(8);

    try {
      new Rhino(
        "invalid",
        getContextPathsByLanguage('en', 'coffee_maker'));
    } catch (e: any) {
      for (let i = 0; i < error.length; i++) {
        expect(error[i]).toEqual(e.messageStack[i]);
      }
    }
  });
});

describe('intent detection', () => {
  it.each(WITHIN_CONTEXT_PARAMETERS)(
    'successful inference for %p with %p',
    (
      language: string,
      context: string,
      intent: string,
      slots: Record<string, string>
    ) => {
      const inference: RhinoInference = {
        isUnderstood: true,
        intent: intent,
        slots: slots,
      };
      testRhinoDetection(language, context, true, inference);
    }
  );

  it.each(OUT_OF_CONTEXT_PARAMETERS)(
    'out-of-context phrase for %p with %p',
    (language: string, context: string) => {
      testRhinoDetection(language, context, false);
    }
  );
});

describe('basic parameter validation', () => {
  test('invalid sensitivity range', () => {
    expect(() => {
      new Rhino(
        ACCESS_KEY,
        getContextPathsByLanguage('en', 'coffee_maker'),
        2.99
      );
    }).toThrow(RangeError);
  });

  test('invalid sensitivity type', () => {
    expect(() => {
      new Rhino(
        ACCESS_KEY,
        getContextPathsByLanguage('en', 'coffee_maker'),
        // @ts-expect-error
        'invalid_sensitivity'
      );
    }).toThrow(RangeError);
  });
});

describe('frame validation', () => {
  test('accepts non Int16Array if array is valid', () => {
    const rhinoEngine = new Rhino(
      ACCESS_KEY,
      getContextPathsByLanguage('en', 'coffee_maker')
    );
    const emptyArray = Array.apply(null, Array(rhinoEngine.frameLength)).map(
      (x, i) => i
    );
    // @ts-expect-error
    rhinoEngine.process(emptyArray);
    rhinoEngine.release();
  });

  test('mismatched frameLength throws error', () => {
    const rhinoEngine = new Rhino(
      ACCESS_KEY,
      getContextPathsByLanguage('en', 'coffee_maker')
    );
    expect(() => {
      // @ts-expect-error
      rhinoEngine.process([1, 2, 3]);
    }).toThrow(RhinoInvalidArgumentError);
    rhinoEngine.release();
  });

  test('null/undefined frames throws error', () => {
    const rhinoEngine = new Rhino(
      ACCESS_KEY,
      getContextPathsByLanguage('en', 'coffee_maker')
    );
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

  test('passing floating point frame values throws RhinoInvalidArgumentError', () => {
    const rhinoEngine = new Rhino(
      ACCESS_KEY,
      getContextPathsByLanguage('en', 'coffee_maker')
    );
    const floatFrames = Array.from({ length: rhinoEngine.frameLength }).map(
      () => 3.1415
    );
    expect(() => {
      // @ts-expect-error
      rhinoEngine.process(floatFrames);
    }).toThrow(RhinoInvalidArgumentError);
    rhinoEngine.release();
  });
});

describe('getContextInfo', () => {
  test('coffee maker expressions and slots are returned', () => {
    const rhinoEngine = new Rhino(
      ACCESS_KEY,
      getContextPathsByLanguage('en', 'coffee_maker')
    );

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
