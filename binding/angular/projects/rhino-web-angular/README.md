# rhino-web-angular

Angular service for Rhino for Web.

## Rhino

This library processes naturally spoken commands in-browser, offline. All processing is done via WebAssembly and Workers in a separate thread. Speech results are converted into inference directly, without intermediate Speech-to-Text. Rhino can be used standalone (push-to-talk), or with the [Porcupine Wake Word engine](https://picovoice.ai/platform/porcupine/).

Rhino operates on speech in a bespoke context. E.g. using the [demo "Clock" Rhino context (English language)](https://github.com/Picovoice/rhino/blob/master/resources/contexts/wasm/clock_wasm.rhn):

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

Using the Web Audio API requires a secure context (HTTPS connection) - except `localhost` - for local development.

## AccessKey

The Rhino SDK requires a valid `AccessKey` at initialization. `AccessKey`s act as your credentials when using Rhino SDKs.
You can create your `AccessKey` for free. Make sure to keep your `AccessKey` secret.

To obtain your `AccessKey`:
1. Login or Signup for a free account on the [Picovoice Console](https://picovoice.ai/console/).
2. Once logged in, go to the [`AccessKey` tab](https://console.picovoice.ai/access_key) to create one or use an existing `AccessKey`.

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

...

  constructor(private rhinoService: RhinoService) {
    // Subscribe to Rhino inference detections
    // Store each detection so we can display it in an HTML list
    this.rhinoDetection = rhinoService.inference$.subscribe(
      inference => console.log(`Rhino Detected "${inference}"`))
  }
```

Where inference is a `RhinoInference`:

```typescript
export type RhinoInference = {
  /** Rhino has concluded the inference (isUnderstood is now set) */
  isFinalized: boolean;
  /** The intent was understood (it matched an expression in the context) */
  isUnderstood?: boolean;
  /** The name of the intent */
  intent?: string;
  /** Map of the slot variables and values extracted from the utterance */
  slots?: Record<string, string>;
};
```

We need to initialize Rhino to tell it which context we want to listen to (and at what sensitivity). We can use the Angular lifecycle hooks `ngOnInit` and `ngOnDestroy` to start up and later tear down the Rhino engine.

### Imports

You can use Rhino by importing the worker package statically or dynamically. Static is more straightforward to implement, but will impact your initial bundle size with an additional ~4 MB. Depending on your requirements, this may or may not be feasible. If you require a small bundle size, see dynamic importing below.

#### Static Import

```typescript
import {RhinoWorkerFactory as RhinoWorkerFactoryEn} from'@picovoice/rhino-web-en-worker'

  async ngOnInit() {
    // Initialize Rhino Service
    try {
      await this.rhinoService.init(RhinoWorkerFactoryEn, {accessKey: accessKey, context: { base64: RHINO_CLOCK_64 }})
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

#### Dynamic Import

```typescript
  async ngOnInit() {
    // Load Rhino worker chunk with specific language model (large ~3-4MB chunk; dynamically imported)
    const rhinoFactoryEn = (await import('@picovoice/rhino-web-en-worker')).RhinoWorkerFactory
    // Initialize Rhino Service
    try {
      await this.rhinoService.init(rhinoFactoryEn, {accessKey: accessKey, context: { base64: RHINO_CLOCK_64 }})
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

## Microphone and Push to Talk

Upon mounting, the component will request microphone permission from the user, instantiate the audio stream and start up an instance of Rhino.

Rhino requires a trigger to begin listening. To start listening for natural language commands, there is a `pushToTalk` method on the RhinoService, which we can connect to a button press event, for example. If you want to trigger Rhino using voice (a wake word / trigger word / hotword), see the [Picovoice SDK for Angular](https://npmjs.com/package/@picovoice/picovoice-web-angular), which includes both the Porcupine and Rhino engines and switches between them automatically for a continuous hands-free Voice AI interaction loop. The [Porcupine SDK for Angular](https://npmjs.com/package/@picovoice/porcupine-web-angular) is also available individually.

### Custom contexts

Custom contexts are generated using [Picovoice Console](https://picovoice.ai/console/). They are trained from text using transfer learning into bespoke Rhino context files with a `.rhn` extension. The target platform is WebAssembly (WASM), as that is what backs the Angular library.

The `.zip` file contains a `.rhn` file and a `_b64.txt` file which contains the binary model encoded with Base64. Provide the base64 encoded string as an argument to Rhino as in the above example. You may wish to store the base64 string in a separate JavaScript file and `export` it to keep your application code separate.
