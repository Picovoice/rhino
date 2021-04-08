# rhino-web

The Rhino library for web browsers, powered by WebAssembly. Intended (but not required) to be used with the [@picovoice/web-voice-processor](https://www.npmjs.com/package/@picovoice/web-voice-processor).

This library processes naturally spoken commands in-browser, offline. All processing is done via WebAssembly and Workers in a separate thread. Speech results are converted into inference directly, without intermediate Speech-to-Text. Rhino can be used standalone (push-to-talk), or with the [Porcupine Wake Word engine](https://picovoice.ai/platform/porcupine/).

Looking for Rhino on NodeJS? See the [@picovoice/rhino-node](https://www.npmjs.com/package/@picovoice/rhino-node) package.

## Compatibility

- Chrome / Edge
- Firefox
- Safari

This library requires several modern browser features: WebAssembly, Web Workers, and promises. Internet Explorer will _not_ work.

If you are using this library with the [@picovoice/web-voice-processor](https://www.npmjs.com/package/@picovoice/web-voice-processor) to access the microphone, that requires some additional browser features like Web Audio API. Its overall browser support is approximately the same.

## Packages / Installation

Rhino for Web is split into multiple packages due to each language including the entire Voice AI model which is of nontrivial size. There are separate worker and factory packages as well, due to the complexities with bundling an "all-in-one" web workers without bloating bundle sizes. Import each as required.

### Workers

- @picovoice/rhino-web-de-worker
- @picovoice/rhino-web-en-worker
- @picovoice/rhino-web-es-worker
- @picovoice/rhino-web-fr-worker

### Factories

- @picovoice/rhino-web-de-factory
- @picovoice/rhino-web-en-factory
- @picovoice/rhino-web-es-factory
- @picovoice/rhino-web-fr-factory

### Worker

For typical cases, use the worker packages. These are compatible with the framework packages for [Angular](https://www.npmjs.com/package/@picovoice/rhino-web-angular), [React](https://www.npmjs.com/package/@picovoice/rhino-web-react), and [Vue](https://www.npmjs.com/package/@picovoice/rhino-web-vue). The workers are complete with everything you need to run Rhino off the main thread. If you are using the workers with the Angular/React/Vue packages, you will load them and pass them into those services/hooks/components as an argument.

To obtain a Rhino Worker, we can use the static `create` factory method from the RhinoWorkerFactory. Here is a complete example that:

1. Obtains a Worker from the RhinoWorkerFactory (in this case, English) to listen for commands in the domain of the sample "Pico Clock"
1. Responds to inferenence detection by setting the worker's `onmessage` event handler
1. Starts up the WebVoiceProcessor to forward microphone audio to the Rhino Worker

E.g.:

```bash
yarn add @picovoice/web-voice-processor @picovoice/rhino-web-en-worker
```

```javascript
import { WebVoiceProcessor } from "@picovoice/web-voice-processor"
import { RhinoWorkerFactory } from "@picovoice/rhino-web-en-worker";

const PICO_CLOCK_64 = /* Base64 string of the pico_clock.rhn file for wasm platform */

async startRhino()
  // Create a Rhino Worker (English language) to listen for commands
  // in the context of "Pico Clock" (a `.rhn` file encoded as base64, omitted for brevity),
  // at a sensitivity of 0.65. Typically you will set 'start' to false, and only activate
  // Rhino via push-to-talk or wake word (e.g. Porcupine).
  //
  // Note: you receive a Worker object, _not_ an individual Rhino instance
  // Workers are communicated with via message passing/receiving functions postMessage/onmessage.
  // See https://developer.mozilla.org/en-US/docs/Web/API/Worker for more details.
  const rhinoWorker = await RhinoWorkerFactory.create(
    {context: {base64: PICO_CLOCK_CONTEXT_64, sensitivity: 0.65}, start: false }
  );

  // The worker will send a message with data.command = "rhn-inference" upon a detection event
  // Here we tell it to log it to the console
  rhinoWorker.onmessage = (msg) => {
    switch (msg.data.command) {
      case 'rhn-inference':
        // Rhino inference detection
        console.log("Rhino detected " + msg.data.inference);
        break;
      default:
        break;
    }
  };

  // Start up the web voice processor. It will request microphone permission
  // and immediately (start: true) start listening.
  // It downsamples the audio to voice recognition standard format (16-bit 16kHz linear PCM, single-channel)
  // The incoming microphone audio frames will then be forwarded to the Rhino Worker
  // n.b. This promise will reject if the user refuses permission! Make sure you handle that possibility.
  const webVp = await WebVoiceProcessor.init({
    engines: [rhinoWorker],
    start: true,
  });
  }


}
startRhino()

...

// Finished with Rhino? Release the WebVoiceProcessor and the worker.
if (done) {
  webVp.release()
  rhinoWorker.sendMessage({command: "release"})
}

```

**Important Note**: Because the workers are all-in-one packages that run an entire machine learning inference model in WebAssembly, they are approximately 3-4MB in size. While this is tiny for a speech recognition model, it's large for web delivery. Because of this, you likely will want to use dynamic `import()` instead of static `import {}` to reduce your app's starting bundle size. See e.g. https://webpack.js.org/guides/code-splitting/ for more information.

### Factory

If you wish to build your own worker, or perhaps not use workers at all, use the factory packages. This will let you instantiate Rhino engine instances directly.

#### Usage

The audio passed to the worker must be of the correct format. The WebVoiceProcessor handles downsampling in the examples above. If you are not using that, you must ensure you do it yourself.

E.g.:

```javascript
import { Rhino } from '@picovoice/rhino-web-en-factory';

const PICO_CLOCK_64 =
  /* Base64 string of the pico_clock.rhn file for wasm platform */

  async function startRhino() {
    const handle = await Rhino.create({
      context: PICO_CLOCK_64,
      sensitivity: 0.7,
    });

    // Send Rhino frames of audio (check handle.frameLength for size of array)
    const audioFrames = new Int16Array(/* Provide data with correct format and size */);
    const inference = handle.process(audioFrames);
    // rhinoResult:
    if (inference.isFinalized) {
      if (inference.isUnderstood) {
        console.log(inference.intent)// mandatory if isUnderstood
        console.log(inference.slots)// optional
      }
    }
  };

startRhino();
```

**Important Note**: Because the factories are all-in-one packages that run an entire machine learning inference model in WebAssembly, they are approximately 1-2MB in size. While this is tiny for a speech recognition, it's nontrivial for web delivery. Because of this, you likely will want to use dynamic `import()` instead of static `import {}` to reduce your app's starting bundle size. See e.g. https://webpack.js.org/guides/code-splitting/ for more information.

## Build from source (IIFE + ESM outputs)

This library uses Rollup and TypeScript along with Babel and other popular rollup plugins. There are two outputs: an IIFE version intended for script tags / CDN usage, and an ESM version intended for use with modern JavaScript/TypeScript development (e.g. Create React App, Webpack).

```console
yarn
yarn build
```

The output will appear in the ./dist/ folder.
