# RhinoManager

This is a library for inferring intent from speech in the browser.

- Private, as it runs locally within the browser and the voice data does not leave the device.
- Real-time with minimal latency, as it does not depend on network calls.
- Optimized using WebAssembly for algorithm performance.

## Compatibility

RhinoManager uses the [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API) and
[WebAssembly](https://webassembly.org/), which are supported on all modern browsers (excluding Internet Explorer).

## Installation

```bash
npm install rhino-manager
```

## Usage

Add the following to your HTML:

```html
<script src="{PATH_TO_WEB_VOICE_PROCESSOR_JS}"></script>
<script src="{PATH_TO_RHINO_MANAGER_JS}"></script>
```
Replace `{PATH_TO_WEB_VOICE_PROCESSOR_JS}` with path to `src/web_voice_processor.js`, which is a dependency of
`rhino-manager` and replace `{PATH_TO_RHINO_MANAGER_JS}` with the path to
[src/rhino_manager.js](src/rhino_manager.js).

### Instantiation

The library adds a class to the global scope that can be used to instantiate an instance:

```javascript
let rhinoWorkerScript = ... // Path to rhino_worker.js within the package
let downsamplingWorkerScript = ... // Path to downsampling_worker.js script within web-voice-processor package

rhinoManager = RhinoManager(rhinoWorkerScript, downsamplingWorkerScript);
```

### Start Processing

Start the detection process:

```javascript
rhinoManager.start(context, inferenceCallback, errorCallback)
```

`context` A context represents the set of expressions (spoken commands), intents, and intent arguments (slots) within a
domain of interest. For more details, you can refer to the comments in the [C library's header file](/include/pv_rhino.h).

`detectionCallback` is called after intent inference is finalized.

```javascript
let detectionCallback = function (info) {
    // do something ...
};
```

`errorCallback` is executed when there is an error in the audio capture or processing logic.

### Stop Processing

```javascript
rhinoManager.stop()
```
