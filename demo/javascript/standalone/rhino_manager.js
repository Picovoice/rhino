/*
    Copyright 2018 Picovoice Inc.
    You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
    file accompanying this source.
    Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
    an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
    specific language governing permissions and limitations under the License.
*/

RhinoManager = (function (rhinoWorkerScript, downsamplingScript) {
    let rhinoWorker;

    let start = function (context, inferenceCallback, errorCallback) {
        rhinoWorker = new Worker(rhinoWorkerScript);
        rhinoWorker.postMessage({command: "init", context: context});

        rhinoWorker.onmessage = function (e) {
            inferenceCallback(e.data);
        };

        WebVoiceProcessor.start([this], downsamplingScript, errorCallback);
    };

    let stop = function () {
        WebVoiceProcessor.stop();
        rhinoWorker.postMessage({command: "release"});
    };

    let processFrame = function (frame) {
        rhinoWorker.postMessage({command: "process", inputFrame: frame});
    };

    return {start: start, processFrame: processFrame, stop: stop}
});
