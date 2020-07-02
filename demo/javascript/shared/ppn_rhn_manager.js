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
  let ppnReady = false;
  let rhnReady = false;
  let downsamplingScript;
  let initCallback;
  let keywordDetectionCallback;
  let inferenceCallback;

  let isWakeWordDetected = false;

  let start = function (
    keywordsID,
    keywordSensitivities,
    keywordDetectionCallback_,
    context,
    inferenceCallback_,
    errorCallback_,
    initCallback_,
    porcupineWorkerScript,
    rhinoWorkerScript,
    downsamplingScript_
  ) {
    ppnReady = false;
    rhnReady = false;
    porcupineWorker = new Worker(porcupineWorkerScript);
    rhinoWorker = new Worker(rhinoWorkerScript);

    downsamplingScript = downsamplingScript_;
    errorCallback = errorCallback_;
    initCallback = initCallback_;
    keywordDetectionCallback = keywordDetectionCallback_;
    inferenceCallback = inferenceCallback_;

    porcupineWorker.onmessage = function (messageEvent) {
      if (messageEvent.data.status === "ppn-init") {
        ppnReady = true;
        porcupineWorker.postMessage({
          command: "init",
          keywordIDs: keywordsID,
          sensitivities: keywordSensitivities,
        });
        ready(this);
      } else {
        if (!isWakeWordDetected) {
          isWakeWordDetected = messageEvent.data.keyword !== null;

          if (isWakeWordDetected) {
            keywordDetectionCallback(messageEvent.data.keyword);
          }
        }
      }
    }.bind(this);

    rhinoWorker.onmessage = function (messageEvent) {
      if (messageEvent.data.status === "rhn-init") {
        rhnReady = true;
        rhinoWorker.postMessage({ command: "init", context: context });
        ready(this);
      } else {
        inferenceCallback(messageEvent.data);
        isWakeWordDetected = false;
      }
    }.bind(this);
  };

  let ready = function (engine) {
    if (ppnReady && rhnReady) {
      WebVoiceProcessor.start([engine], downsamplingScript, errorCallback);
      initCallback();
    }
  };

  let refresh = function (
    initCallback_,
    keywordDetectionCallback_,
    inferenceCallback_
  ) {
    initCallback = initCallback_;
    keywordDetectionCallback = keywordDetectionCallback_;
    inferenceCallback = inferenceCallback_;
  };

  let stop = function () {
    WebVoiceProcessor.stop();
    porcupineWorker.postMessage({ command: "release" });
    porcupineWorker = null;
    rhinoWorker.postMessage({ command: "release" });
    rhinoWorker = null;
  };

  let processFrame = function (frame) {
    if (!isWakeWordDetected) {
      porcupineWorker.postMessage({ command: "process", inputFrame: frame });
    } else {
      rhinoWorker.postMessage({ command: "process", inputFrame: frame });
    }
  };

  return {
    start: start,
    refresh: refresh,
    processFrame: processFrame,
    stop: stop,
  };
})();
