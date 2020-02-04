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
