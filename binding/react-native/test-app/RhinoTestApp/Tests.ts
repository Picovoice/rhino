import {Platform} from 'react-native';
import fs from 'react-native-fs';
import {decode as atob} from 'base-64';

import {Rhino} from '@picovoice/rhino-react-native';

const testData = require('./test_data.json');
const platform = Platform.OS;

const accessKey: string = '{TESTING_ACCESS_KEY_HERE}';

export type Result = {
  testName: string;
  success: boolean;
  errorString?: string;
};

function getPath(filePath) {
  if (platform === "ios") {
    return `Assets.bundle/${filePath}`;
  }
  return filePath;
}

async function getBinaryFile(audioFilePath) {
  let fileBase64;
  if (platform === "ios") {
    fileBase64 = await fs.readFile(`${fs.MainBundlePath}/${audioFilePath}`, 'base64');
  } else {
    fileBase64 = await fs.readFileAssets(audioFilePath, 'base64');
  }
  const fileBinary = atob(fileBase64);

  const bytes = new Uint8Array(fileBinary.length);
  for (let i = 0; i < fileBinary.length; i++) {
    bytes[i] = fileBinary.charCodeAt(i);
  }
  return bytes;
}

async function getPcmFromFile(audioFilePath, expectedSampleRate) {
  const headerSampleRateOffset = 24;
  const headerOffset = 44;

  const fileBytes = await getBinaryFile(audioFilePath);
  const dataView = new DataView(fileBytes.buffer);

  const fileSampleRate = dataView.getInt32(headerSampleRateOffset, true);
  if (fileSampleRate !== expectedSampleRate) {
    throw new Error(
      `Specified sample rate did not match test file: '${fileSampleRate}' != '${expectedSampleRate}'`,
    );
  }

  const pcm = [];
  for (let i = headerOffset; i < fileBytes.length; i += 2) {
    pcm.push(dataView.getInt16(i, true));
  }

  return pcm;
}

async function getInference(rhino, audioFilePath) {
  const pcm = await getPcmFromFile(audioFilePath, rhino.sampleRate);
  const frameLength = rhino.frameLength;
  for (let i = 0; i < pcm.length - frameLength; i += frameLength) {
    const inference = await rhino.process(pcm.slice(i, i + frameLength));
    if (inference.isFinalized) {
      return inference;
    }
  }

  return null;
}

function inferencesEqual(inference, groundTruth) {
  if (inference.isUnderstood === false && groundTruth === null) {
    return true;
  }

  if (inference.intent !== groundTruth.intent) {
    return false;
  }

  for (const key of Object.keys(groundTruth.slots)) {
    if (groundTruth.slots[key] !== inference.slots[key]) {
      return false;
    }
  }

  for (const key of Object.keys(inference.slots)) {
    if (inference.slots[key] !== groundTruth.slots[key]) {
      return false;
    }
  }

  return true;
}

async function runTestcase(
  language,
  contextName,
  audioFilePath,
  groundTruth,
): Result {
  const result = {testName: '', success: false};
  let rhino = null;
  try {
    const contextPath = getPath(`context_files/${language}/${contextName}_${platform}.rhn`)
    const modelPath =
      language === 'en'
        ? getPath('model_files/rhino_params.pv')
        : getPath(`model_files/rhino_params_${language}.pv`);
    rhino = await Rhino.create(
      accessKey,
      contextPath,
      modelPath,
    );
    const inference = await getInference(rhino, audioFilePath);
    if (inferencesEqual(inference, groundTruth)) {
      result.success = true;
    } else {
      result.success = false;
      result.errorString = `Inference '${JSON.stringify(
        inference,
      )}' does not equal ground truth '${JSON.stringify(groundTruth)}'`;
    }
    await rhino.delete();
  } catch (error) {
    result.success = false;
    result.errorString = `${error}`;
  }
  return result;
}

async function withinContextTest(testcases): Result[] {
  const results = [];
  for (const testcase of testcases) {
    const audioFilePath = testcase.language === 'en'
        ? getPath('audio_samples/test_within_context.wav')
        : getPath(`audio_samples/test_within_context_${testcase.language}.wav`);
    const result = await runTestcase(
      testcase.language,
      testcase.context_name,
      audioFilePath,
      testcase.inference,
    );
    result.testName = `Within context test for ${testcase.language} ${testcase.context_name}`;
    results.push(result);
  }
  return results;
}

async function outOfContextTest(testcases): Result[] {
  const results = [];
  for (const testcase of testcases) {
    const audioFilePath =
      testcase.language === 'en'
        ? getPath('audio_samples/test_out_of_context.wav')
        : getPath(`audio_samples/test_out_of_context_${testcase.language}.wav`);
    const result = await runTestcase(
      testcase.language,
      testcase.context_name,
      audioFilePath,
      null,
    );
    result.testName = `Out of context test for ${testcase.language} ${testcase.context_name}`;
    results.push(result);
  }
  return results;
}

export async function runRhinoTests(): Result[] {
  const withinContextResults = await withinContextTest(
    testData.tests.within_context,
  );
  const outOfContextResults = await outOfContextTest(
    testData.tests.out_of_context,
  );
  return [...withinContextResults, ...outOfContextResults];
}
