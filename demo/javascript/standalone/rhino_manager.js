/*
    Copyright 2018-2020 Picovoice Inc.
    You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
    file accompanying this source.
    Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
    an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
    specific language governing permissions and limitations under the License.
*/

RhinoManager = (function () {
  let rhinoWorker;

  let start = function (
    context,
    inferenceCallback,
    errorCallback,
    initCallback,
    rhinoWorkerScript,
    downsamplingScript
  ) {
    rhinoWorker = new Worker(rhinoWorkerScript);

    let engine = this;

    rhinoWorker.onmessage = function (messageEvent) {
      if (messageEvent.data.status === "rhn-init") {
        rhinoWorker.postMessage({ command: "init", context: context });
        WebVoiceProcessor.start([engine], downsamplingScript, errorCallback);
        initCallback();
      } else {
        inferenceCallback(messageEvent.data);
      }
    };
  };

  let stop = function () {
    WebVoiceProcessor.stop();
    rhinoWorker.postMessage({ command: "release" });
    rhinoWorker = null;
  };

  let processFrame = function (frame) {
    rhinoWorker.postMessage({ command: "process", inputFrame: frame });
  };

  return { start: start, processFrame: processFrame, stop: stop };
})();
