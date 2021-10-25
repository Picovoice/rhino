#! /usr/bin/env node
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

const fs = require("fs");
const { program } = require("commander");
const Rhino = require("@picovoice/rhino-node");
const { PvArgumentError } = require("@picovoice/rhino-node/errors");
const PvRecorder = require("@picovoice/pvrecorder-node");

program
  .requiredOption(
    "-a, --access_key <string>",
    "AccessKey obtain from the Picovoice Console (https://console.picovoice.ai/)"
  )
  .option(
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
    "-i, --audio_device_index <number>",
    "index of audio device to use to record audio",
    Number,
    -1
  ).option(
    "-d, --show_audio_devices",
    "show the list of available devices"
  );

if (process.argv.length < 3) {
  program.help();
}
program.parse(process.argv);

let isInterrupted = false;

async function micDemo() {
  let accessKey = program["access_key"]  
  let contextPath = program["context_path"];
  let libraryFilePath = program["library_file_path"];
  let modelFilePath = program["model_file_path"];
  let sensitivity = program["sensitivity"];
  let audioDeviceIndex = program["audio_device_index"];
  let showAudioDevices = program["show_audio_devices"];

  let showAudioDevicesDefined = showAudioDevices !== undefined;

  if (showAudioDevicesDefined) {
    const devices = PvRecorder.getAudioDevices();
    for (let i = 0; i < devices.length; i++) {
        console.log(`index: ${i}, device name: ${devices[i]}`);
    }
    process.exit();
  }

  if (isNaN(sensitivity) || sensitivity < 0 || sensitivity > 1) {
    console.error("--sensitivity must be a number in the range [0,1]");
    return;
  }

  if (!fs.existsSync(contextPath)) {
    throw new PvArgumentError(
      `File not found at 'contextPath': ${contextPath}`
    );
  }

  let contextName = contextPath
    .split(/[\\|\/]/)
    .pop()
    .split("_")[0];

  let handle = new Rhino(
    accessKey,
    contextPath,
    sensitivity,
    modelFilePath,
    libraryFilePath
  );

  const frameLength = handle.frameLength;

  const recorder = new PvRecorder(audioDeviceIndex, frameLength);
  recorder.start();

  console.log(`Using device: ${recorder.getSelectedDevice()}`);
  console.log("Context info:");
  console.log("-------------");
  console.log(handle.getContextInfo());

  console.log(
    `Listening for speech within the context of '${contextName}'. Please speak your phrase into the microphone. `
  );
  console.log("Press ctrl+c to exit.")

  while (!isInterrupted) {
    const pcm = await recorder.read();
    const isFinalized = handle.process(pcm);
    if (isFinalized === true) {
      let inference = handle.getInference();
      console.log("Inference result:");
      console.log(JSON.stringify(inference, null, 4));
      console.log();
      recording.stop();
    }
  }

  console.log("Stopping...");
  recorder.release();
}

(async function () {
    try {
        await micDemo();
    } catch (e) {
        console.error(e.toString());
    }
})();
