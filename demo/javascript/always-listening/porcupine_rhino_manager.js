/*
    Copyright 2018 Picovoice Inc.
    You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
    file accompanying this source.
    Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
    an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
    specific language governing permissions and limitations under the License.
*/

PorcupineRhinoManager = function (porcupineWorkerScript, rhinoWorkerScript, downsamplingScript) {
    let porcupineWorker;
    let rhinoWorker;

    let isWakeWordDetected = false;

    let start = function (keywordsID, keywordSensitivities, keywordDetectionCallback, context, inferenceCallback, errorCallback) {
        porcupineWorker = new Worker(porcupineWorkerScript);
        porcupineWorker.postMessage({
            command: "init",
            keywordIDs: keywordsID,
            sensitivities: keywordSensitivities
        });

        rhinoWorker = new Worker(rhinoWorkerScript);
        rhinoWorker.postMessage({command: "init", context: context});

        porcupineWorker.onmessage = function (e) {
            if (!isWakeWordDetected) {
                isWakeWordDetected = e.data.keyword !== null;

                if (isWakeWordDetected) {
                    keywordDetectionCallback(e.data.keyword);
                }
            }
        };

        rhinoWorker.onmessage = function (e) {
            inferenceCallback(e.data);
            isWakeWordDetected = false;
        };

        WebVoiceProcessor.start([this], downsamplingScript, errorCallback);
    };

    let stop = function () {
        WebVoiceProcessor.stop();
        porcupineWorker.postMessage({command: "release"});
        rhinoWorker.postMessage({command: 'release'});
    };

    let processFrame = function (frame) {
        if (!isWakeWordDetected) {
            porcupineWorker.postMessage({command: "process", inputFrame: frame});
        } else {
            rhinoWorker.postMessage({command: "process", inputFrame: frame});
        }
    };

    return {start: start, processFrame: processFrame, stop: stop}
};
