console.log("webvp")

WebVoiceProcessor = (function () {
    let downsampler;

    let isRecording = false;

    let start = function (engines, downsamplerScript, errorCallback) {
        if (!downsampler) {
            navigator.mediaDevices.getUserMedia({audio: true})
                .then(stream => {
                    let audioContext = new (window.AudioContext || window.webkitAudioContext)();
                    let audioSource = audioContext.createMediaStreamSource(stream);
                    let node = audioContext.createScriptProcessor(4096, 1, 1);
                    node.onaudioprocess = function (e) {
                        if (!isRecording) {
                            return;
                        }

                        downsampler.postMessage({command: "process", inputFrame: e.inputBuffer.getChannelData(0)});
                    };
                    audioSource.connect(node);
                    node.connect(audioContext.destination);

                    downsampler = new Worker(downsamplerScript);
                    downsampler.postMessage({command: "init", inputSampleRate: audioSource.context.sampleRate});
                    downsampler.onmessage = function (e) {
                        engines.forEach(function (engine) {
                            engine.processFrame(e.data);
                        });
                    };
                })
                .catch(errorCallback);
        }

        isRecording = true;
    };

    let stop = function () {
        isRecording = false;
        downsampler.postMessage({command: "reset"});
    };

    return {start: start, stop: stop};
})();
