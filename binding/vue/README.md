# rhino-vue

Vue mixin for Rhino Web.

## Rhino

Rhino is Picovoice's Speech-to-Intent engine. It directly infers intent from spoken commands within a given context of interest, in real-time.

E.g. using the [demo "Clock" Rhino context (English language)](https://github.com/Picovoice/rhino/blob/master/resources/contexts/wasm/clock_wasm.rhn), Rhino performs inference on a spoken phrase:

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

## Compatibility

This library is compatible with Vue:
- Vue.js 2.6.11+
- Vue.js 3.0.0+

The Picovoice SDKs for Web are powered by WebAssembly (WASM), the Web Audio API, and Web Workers.

All modern browsers (Chrome/Edge/Opera, Firefox, Safari) are supported, including on mobile. Internet Explorer is _not_ supported.

Using the Web Audio API requires a secure context (HTTPS connection) - except `localhost` - for local development.

## AccessKey

Rhino requires a valid Picovoice `AccessKey` at initialization. `AccessKey` acts as your credentials when using Rhino SDKs.
You can get your `AccessKey` for free. Make sure to keep your `AccessKey` secret.
Signup or Login to [Picovoice Console](https://console.picovoice.ai/) to get your `AccessKey`.

## Installation

Install the package using `npm` or `yarn`. You will also need to add `@picovoice/web-voice-processor` and one of the `@picovoice/rhino-web-**-worker` series of packages for the specific language model:

E.g. English:

```console
yarn add @picovoice/rhino-vue @picovoice/rhino-web-en-worker @picovoice/web-voice-processor
```

## Usage

The Rhino SDK for Vue is based on the Rhino SDK for Web. The library provides a mixin: `rhinoMixin`, which exposes the variable `$rhino` to your component. The mixin exposes the following functions:

- `init`: initializes Rhino.
- `start`: starts processing audio and infer context.
- `pause`: stops processing audio.
- `pushToTalk`: sets Rhino in an active `isTalking` state.
- `delete`: cleans up used resources.

The Rhino library is by default a "push-to-talk" experience. You can use a button to trigger the `isTalking` state. Rhino will listen and process frames of microphone audio until it reaches a conclusion. If the utterance matched something in your Rhino context (e.g. "make me a coffee" in a coffee maker context), the details of the inference are returned.

## Parameters

The `Rhino` mixin has the following parameters:

1. The `rhinoFactoryArgs` (i.e. what specific context we want Rhino to understand).
2. The `rhinoWorkerFactory` (language-specific, imported as `RhinoWorkerFactory` from the `@picovoice/rhino-web-xx-worker` series of packages, where `xx` is the two-letter language code).
3. The `inferenceCallback` invoked after Rhino processes audio, the inference can be understood or not.
4. The `infoCallback` invoked when Rhino is ready and also model's context (as a string) is ready.
5. The `readyCallback` invoked after Rhino has been initialized successfully.
6. The `errorCallback` invoked if any error occurs while initializing Rhino or processing audio.

Provide a Rhino context via `rhinoFactoryArgs`:

```typescript
export type RhinoContext = {
  /** Base64 representation of a trained Rhino context (`.rhn` file) */
  base64: string
  /** Value in range [0,1] that trades off miss rate for false alarm */
  sensitivity?: number
}

export type RhinoFactoryArgs = {
  /** AccessKey obtained from Picovoice Console (https://console.picovoice.ai/) */
  accessKey: string;
  /** The context to instantiate */
  context: RhinoContext;
  /** If set to `true`, Rhino requires an endpoint (chunk of silence) before finishing inference. **/
  requireEndpoint?: boolean;
};
```
The inference callback takes a `RhinoInference` object after processing audio:

```typescript
export type RhinoInference = {
  /** Rhino has concluded the inference (isUnderstood is now set) */
  isFinalized: boolean
  /** The intent was understood (it matched an expression in the context) */
  isUnderstood?: boolean
  /** The name of the intent */
  intent?: string
  /** Map of the slot variables and values extracted from the utterance */
  slots?: Record<string, string>
}
```

Make sure you handle the possibility of errors with the `errorCallback` function. Users may not have a working microphone, and they can always decline (and revoke) permissions; your application code should anticipate these scenarios. 

```typescript
import rhinoMixin, { RhinoInferenceFinalized } from "@picovoice/rhino-vue";
import { RhinoWorkerFactory as RhinoWorkerFactoryEn } from "@picovoice/rhino-web-en-worker";

export default {
  name: "VoiceWidget",
  mixins: [rhinoMixin],
  data: function () {
    return {
      inference: null as RhinoInferenceFinalized | null,
      isError: false,
      isLoaded: false,
      isListening: false,
      isTalking: false,
      contextInfo: '',
      factory: RhinoWorkerFactoryEn,
      factoryArgs: {
        accessKey: '${ACCESS_KEY}',  // AccessKey obtained from Picovoice Console (https://console.picovoice.ai/)
        context: {
          base64: `RHINO_TRAINED_CONTEXT_BASE_64_STRING`
        },
      }
    };
  },
  async created() {
    await this.$rhino.init(
      factoryArgs,      // Rhino factory arguments
      factory,          // Rhino Web Worker component
      rhnInferenceFn,   // Rhino inference callback
      rhnInfoFn,        // Rhino context information callback
      rhnReadyFn,       // Rhino ready callback
      rhnErrorFn        // Rhino error callback
    );
  },
  methods: {
    start: function () {
      if (this.$rhino.start()) {
        this.isListening = !this.isListening;
      }
    },
    pause: function () {
      if (this.$rhino.pause()) {
        this.isListening = !this.isListening;
      }
    },
    pushToTalk: function () {
      if (this.$rhino.pushToTalk()) {
        this.isTalking = true;
      }
    },
    rhnReadyFn: function () {
      this.isLoaded = true;
      this.isListening = true;
    },
    rhnInferenceFn: function (inference) {
      this.inference = inference;
      this.isTalking = false;
    },
    rhnInfoFn: function (info) {
      this.contextInfo = info;
    },
    rhnErrorFn: function (error) {
      this.isError = true;
      this.errorMessage = error.toString();
    },
  },
};
```

### Custom contexts

Custom contexts are generated using [Picovoice Console](https://console.picovoice.ai/). They are trained from text using transfer learning into bespoke Rhino context files with a `.rhn` extension. The target platform is WebAssembly (WASM), as that is what backs the Vue library.

The `.zip` file contains a `.rhn` file and a `_b64.txt` file which contains the binary model encoded with Base64. Provide the base64 encoded string as an argument to Rhino as in the above example. You may wish to store the base64 string in a separate JavaScript file and `export` it to keep your application code separate.

```typescript
factoryArgs: {
  accessKey: "${ACCESS_KEY}", // AccessKey obtained from Picovoice Console(https://console.picovoice.ai/)",
  context: {
    base64: '${CONTEXT_FILE_64}'
  },
  start: false
}
```
