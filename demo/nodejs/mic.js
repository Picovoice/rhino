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

const fs = require("fs");
const { program } = require("commander");
const Rhino = require("@picovoice/rhino-node");
const { PvArgumentError } = require("@picovoice/rhino-node/errors");
const { getPlatform } = require("@picovoice/rhino-node/platforms");

const PLATFORM_RECORDER_MAP = new Map();
PLATFORM_RECORDER_MAP.set("linux", "arecord");
PLATFORM_RECORDER_MAP.set("mac", "sox");
PLATFORM_RECORDER_MAP.set("raspberry-pi", "arecord");
PLATFORM_RECORDER_MAP.set("windows", "sox");

const recorder = require("node-record-lpcm16");

program
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
  );

if (process.argv.length < 3) {
  program.help();
}
program.parse(process.argv);

function chunkArray(array, size) {
  return Array.from({ length: Math.ceil(array.length / size) }, (v, index) =>
    array.slice(index * size, index * size + size)
  );
}

function micDemo() {
  let contextPath = program["context_path"];
  let libraryFilePath = program["library_file_path"];
  let modelFilePath = program["model_file_path"];
  let sensitivity = program["sensitivity"];

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
    contextPath,
    sensitivity,
    modelFilePath,
    libraryFilePath
  );

  console.log("Context info:");
  console.log("-------------");
  console.log(handle.getContextInfo());

  let platform;
  try {
    platform = getPlatform();
  } catch (error) {
    console.error();
    ("The Rhino NodeJS binding does not support this platform. Supported platforms include macOS (x86_64), Windows (x86_64), Linux (x86_64), and Raspberry Pi (1-4)");
    console.error(error);
  }

  let recorderType = PLATFORM_RECORDER_MAP.get(platform);
  console.log(
    `Platform: '${platform}'; attempting to use '${recorderType}' to access microphone ...`
  );

  const frameLength = handle.frameLength;
  const sampleRate = handle.sampleRate;

  const recording = recorder.record({
    sampleRate: sampleRate,
    channels: 1,
    audioType: "raw",
    recorder: recorderType,
  });

  var frameAccumulator = [];

  recording.stream().on("error", (data) => {
    // Error event is triggered when stream is closed on Ubuntu
    // Swallow the error since it is harmless for this demo.
  });

  recording.stream().on("data", (data) => {
    // Two bytes per Int16 from the data buffer
    let newFrames16 = new Array(data.length / 2);
    for (let i = 0; i < data.length; i += 2) {
      newFrames16[i / 2] = data.readInt16LE(i);
    }

    // Split the incoming PCM integer data into arrays of size Rhino.frameLength. If there's insufficient frames, or a remainder,
    // store it in 'frameAccumulator' for the next iteration, so that we don't miss any audio data
    frameAccumulator = frameAccumulator.concat(newFrames16);
    let frames = chunkArray(frameAccumulator, frameLength);

    if (frames[frames.length - 1].length !== frameLength) {
      // store remainder from divisions of frameLength
      frameAccumulator = frames.pop();
    } else {
      frameAccumulator = [];
    }

    let isFinalized = false;
    for (let frame of frames) {
      isFinalized = handle.process(frame);
      if (isFinalized === true) {
        let inference = handle.getInference();
        console.log("Inference result:");
        console.log(JSON.stringify(inference, null, 4));
        console.log();
        recording.stop();
      }
    }
  });

  console.log(
    `Listening for speech within the context of '${contextName}'. Please speak your phrase into the microphone. `
  );
}

micDemo();
