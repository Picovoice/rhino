/*
    Copyright 2018-2020 Picovoice Inc.
    You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
    file accompanying this source.
    Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
    an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
    specific language governing permissions and limitations under the License.
*/

PorcupineRhinoManager = (function () {
  let porcupineWorker;
  let rhinoWorker;

  let isWakeWordDetected = false;

  let start = function (
    keywordsID,
    keywordSensitivities,
    keywordDetectionCallback,
    context,
    inferenceCallback,
    errorCallback,
    initCallback,
    porcupineWorkerScript,
    rhinoWorkerScript,
    downsamplingScript
  ) {
    porcupineWorker = new Worker(porcupineWorkerScript);
    porcupineWorker.postMessage({
    rhinoWorker = new Worker(rhinoWorkerScript);
    rhinoWorker.postMessage({ command: "init", context: context });

    let engine = this;

    porcupineWorker.onmessage = function (messageEvent) {
      if (messageEvent.data.status === "ppn-init") {
        porcupineWorker.postMessage({
          command: "init",
          keywordIDs: keywordsID,
          sensitivities: keywordSensitivities,
        });
        WebVoiceProcessor.start([engine], downsamplingScript, errorCallback);

        initCallback();
      } else {
        if (!isWakeWordDetected) {
          isWakeWordDetected = messageEvent.data.keyword !== null;

          if (isWakeWordDetected) {
            keywordDetectionCallback(messageEvent.data.keyword);
          }
        }
      }
    };

    rhinoWorker.onmessage = function (messageEvent) {
      inferenceCallback(messageEvent.data);
      isWakeWordDetected = false;
    };
  };

  let stop = function () {
    WebVoiceProcessor.stop();
    porcupineWorker.postMessage({ command: "release" });
    rhinoWorker.postMessage({ command: "release" });
  };

  let processFrame = function (frame) {
    if (!isWakeWordDetected) {
      porcupineWorker.postMessage({ command: "process", inputFrame: frame });
    } else {
      rhinoWorker.postMessage({ command: "process", inputFrame: frame });
    }
  };

  return { start: start, processFrame: processFrame, stop: stop };
})();
