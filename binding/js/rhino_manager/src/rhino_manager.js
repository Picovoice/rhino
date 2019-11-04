RhinoManager = (function (rhinoWorkerScript, downsamplingScript) {
    let rhinoWorker;

    let start = function (context, inferenceCallback, errorCallback) {
        rhinoWorker = new Worker(rhinoWorkerScript);
        rhinoWorker.postMessage({command: "init", context: context});

        rhinoWorker.onmessage = function (e) {
            inferenceCallback(e);
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
