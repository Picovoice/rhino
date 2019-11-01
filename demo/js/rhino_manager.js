RhinoManager = (function (rhinoWorkerScript, downsamplingScript) {
    let rhinoWorker;

    let start = function (context, inferenceCallback, errorCallback) {
        rhinoWorker = new Worker(rhinoWorkerScript);
        rhinoWorker.postMessage({
            command: "init",
            context: context,
        });

        rhinoWorker.onmessage = function (e) {
            inferenceCallback(e);
        };

        WebVoiceProcessor.start([rhinoWorker], downsamplingScript, errorCallback);
    };

    let stop = function () {
        WebVoiceProcessor.stop();
        rhinoWorker.postMessage({command: "release"});
    };

    return {start: start, stop: stop}
});
