#! /usr/bin/env node
//
// Copyright 2020 Picovoice Inc.
//
// You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
// file accompanying this source.
//
// Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
// an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
// specific language governing permissions and limitations under the License.
//
"use strict";

const { program } = require("commander");
const fs = require("fs");

const WaveFile = require("wavefile").WaveFile;
const {
  Rhino,
  getInt16Frames,
  checkWaveFile
} = require("@picovoice/rhino-node");
const { RhinoInvalidArgumentError } = require("@picovoice/rhino-node/dist/errors");

program
  .requiredOption(
    "-a, --access_key <string>",
    "AccessKey obtain from the Picovoice Console (https://console.picovoice.ai/)"
  )
  .requiredOption(
    "-i, --input_audio_file_path <string>",
    "input audio wave file in 16-bit 16KHz linear PCM format (mono)"
  )
  .requiredOption(
    "-c, --context_path <string>",
    `absolute path to rhino context (.rhn extension)`
  )
  .option(
    "-l, --library_file_path <string>",
    "absolute path to rhino dynamic library"
  )
  .option("-m, --model_file_path <string>", "absolute path to rhino model")
  .option(
    "-s, --sensitivity <number>",
    "sensitivity value between 0 and 1",
    parseFloat,
    0.5
  ).option(
    "-d, --endpoint_duration_sec <bool>",
    "Endpoint duration in seconds. " +
    "An endpoint is a chunk of silence at the end of an utterance that marks the end of spoken command. " +
    "It should be a positive number within [0.5, 5]. " +
    "A lower endpoint duration reduces delay and improves responsiveness. " +
    "A higher endpoint duration assures Rhino doesn't return inference preemptively " +
    "in case the user pauses before finishing the request." ,
    parseFloat,
    1.0
  ).option(
    "-e, --requires_endpoint <bool>",
    "If set to `false`, Rhino does not require an endpoint (chunk of silence) before finishing inference.",
    "true"
);

if (process.argv.length < 3) {
  program.help();
}
program.parse(process.argv);

function fileDemo() {
  let audioPath = program["input_audio_file_path"];
  let access_key = program["access_key"]
  let contextPath = program["context_path"];
  let libraryFilePath = program["library_file_path"];
  let modelFilePath = program["model_file_path"];
  let sensitivity = program["sensitivity"];
  let endpointDurationSec = program["endpoint_duration_sec"];
  let requiresEndpoint = program["requires_endpoint"].toLowerCase() !== 'false';

  if (isNaN(sensitivity) || sensitivity < 0 || sensitivity > 1) {
    console.error("--sensitivity must be a number in the range [0,1]");
    return;
  }

  if (isNaN(endpointDurationSec) || endpointDurationSec < 0.5 || endpointDurationSec > 5.0) {
    console.error("--endpointDurationSec must be a number in the range [0.5, 5.0]");
    return;
  }

  if (!fs.existsSync(contextPath)) {
    throw new RhinoInvalidArgumentError(
      `File not found at 'contextPath': ${contextPath}`
    );
  }

  let engineInstance = new Rhino(
    access_key,
    contextPath,
    sensitivity,
    endpointDurationSec,
    requiresEndpoint,
    modelFilePath,
    libraryFilePath
  );

  console.log("Context info:");
  console.log("-------------");
  console.log(engineInstance.getContextInfo());

  let contextName = contextPath
    .split(/[\\|\/]/)
    .pop()
    .split("_")[0];

  let audioFileName = audioPath.split(/[\\|\/]/).pop();

  if (!fs.existsSync(audioPath)) {
    console.error(`--input_audio_file_path file not found: ${audioPath}`);
    return;
  }

  let waveBuffer = fs.readFileSync(audioPath);
  let inputWaveFile;
  try {
    inputWaveFile = new WaveFile(waveBuffer);
  } catch (error) {
    console.error(`Exception trying to read file as wave format: ${audioPath}`);
    console.error(error);
    return;
  }

  if (!checkWaveFile(inputWaveFile, engineInstance.sampleRate)) {
    console.error(
      "Audio file did not meet requirements. Wave file must be 16KHz, 16-bit, linear PCM (mono)."
    );
  }

  let frames = getInt16Frames(inputWaveFile, engineInstance.frameLength);

  let isFinalized = false;
  for (let frame of frames) {
    isFinalized = engineInstance.process(frame);

    if (isFinalized) {
      let inference = engineInstance.getInference();
      console.log(
        `Inference result of '${audioFileName}' using context '${contextName}':`
      );
      console.log(JSON.stringify(inference, null, 4));
      break;
    }
  }

  if (!isFinalized) {
    console.log(
      "Rhino did receive enough frames of audio to reach an inference conclusion."
    );
  }

  engineInstance.release();
}

fileDemo();
