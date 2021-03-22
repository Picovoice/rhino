# rhino-web-angular

Angular service for Rhino for Web.

## Rhino

This library processes naturally spoken commands in-browser, offline. All processing is done via WebAssembly and Workers in a separate thread. Speech results are converted into inference directly, without intermediate Speech-to-Text. Rhino can be used standalone (push-to-talk), or with the [Porcupine Wake Word engine](https://picovoice.ai/platform/porcupine/).

Rhino operates on speech in a bespoke constext. E.g. using the [demo "Clock" Rhino context (English langauge)](https://github.com/Picovoice/rhino/blob/master/resources/contexts/wasm/clock_wasm.rhn):

> "Set a timer for ten minutes"
```json
{
  "isFinalized": true,
  "isUnderstood": true,
  "intent": "setTimer",
  "slots": {
    "minutes": "10"
  }
}
```
> "Tell me a joke"
```json
{
  "isFinalized": true,
  "isUnderstood": false
}
```

The key `isFinalized` tells you whether Rhino has reached a conclusion or is still awaiting more frames of audio to reach a decision. Upon `isFinalized=true`, `isUnderstood` will be set to true/false. If true, the `intent` will be available, as will `slots` if any were captured in this expression.

## Introduction

The Rhino SDK for Angular is based on the Rhino SDK for Web. The library provides an Angular service called `RhinoService`. The package will take care of microphone access and audio downsampling (via `@picovoice/web-voice-processor`) and provide an `inference$` event to which your Angular component can subscribe.

## Compatibility

The Picovoice SDKs for Web are powered by WebAssembly (WASM), the Web Audio API, and Web Workers.

All modern browsers (Chrome/Edge/Opera, Firefox, Safari) are supported, including on mobile. Internet Explorer is _not_ supported.

Using the Web Audio API requires a secure context (HTTPS connection), with the exception of `localhost`, for local development.

## Installation

Use `npm` or `yarn` to install the package and its peer dependencies. Each spoken language (e.g. 'en', 'de') is a separate package. For this example we'll use English:

`yarn add @picovoice/rhino-web-angular @picovoice/web-voice-processor @picovoice/rhino-web-en-worker`

(or)

`npm install @picovoice/rhino-web-angular @picovoice/web-voice-processor @picovoice/rhino-web-en-worker`

## Usage

In your Angular component, add the RhinoService. The RhinoService has an inference event to which you can subscribe:

```typescript
import { Subscription } from "rxjs"
import { RhinoService } from "@picovoice/rhino-web-angular"

const RHINO_CLOCK_64 = /* Base64 string representation of a trained "clock" Rhino context (`.rhn` file) */

...

  constructor(private rhinoService: RhinoService) {
    // Subscribe to Rhino inference
    this.rhinoDetection = rhinoService.inference$.subscribe(
      inference => console.log(`Rhino Inference "${inference}"`))
  }
```

We need to initialize Rhino to tell it the specific context we want to listen to (and at what sensitivity). We can use the Angular lifecycle hooks `ngOnInit` and `ngOnDestroy` to start up and later tear down the Rhino engine.

**Important Note** The @picovoice/rhino-web-${LANGUAGE}-\* series of packages are on the order of ~3-4MB, as they contain the entire Voice AI model. Typically, you do _not_ want to import these statically, as your application bundle will be much larger than recommended. Instead, use dynamic imports so that the chunk is lazy-loaded:

```typescript
  async ngOnInit() {
    // Load Rhino worker chunk with specific language model (large ~3-4MB chunk; dynamically imported)
    const rhinoFactoryEn = (await import('@picovoice/rhino-web-en-worker')).RhinoWorkerFactory
    // Initialize Rhino Service
    try {
      await this.rhinoService.init(rhinoFactoryEn,
        {
          rhinoFactoryArgs: {
            context: { base64: RHINO_CLOCK_64 },
          },
        })
      console.log("Rhino is now loaded. Press the Push-to-Talk button to activate.")
    }
    catch (error) {
      console.error(error)
    }
  }

  ngOnDestroy() {
    this.rhinoDetection.unsubscribe()
    this.rhinoService.release()
  }

  public pushToTalk() {
    this.rhinoService.pushToTalk();
  }

```

Upon mounting, the component will request microphone permission from the user, instantiate the audio stream and start up an instance of Rhino. 

Rhino requires a trigger to begin listening. To start listening for natural language commands, there is a `pushToTalk` method on the RhinoService, which we can connect to a button press event, for example. If you want to trigger Rhino using voice (a wake word / trigger word / hotword), see the [Picovoice SDK for Angular](https://npmjs.com/package/@picovoice/picovoice-web-angular), which includes both the Porcupine and Rhino engines and switches between them automatically for a continuous hands-free Voice AI interaction loop. The [Porcupine SDK for Angular](https://npmjs.com/package/@picovoice/porcupine-web-angular) is also available individually.

### Custom contexts

Custom contexts are generated using [Picovoice Console](https://picovoice.ai/console/). They are trained from text using transfer learning into bespoke Rhino context files with a `.rhn` extension. The target platform is WebAssembly (WASM), as that is what backs the Angular library.

Convert the `.rhn` file to base64 and provide it as an argument to Rhino as in the above example. You may wish to store the base64 string in a separate JavaScript file and `export` it to keep your application code separate.
