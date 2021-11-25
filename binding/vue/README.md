# rhino-web-vue

Renderless Vue component for Rhino for Web.

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

This library is compatible with Vue 3.

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

Install the package using `npm` or `yarn`. You will also need to add `@picovoice/web-voice-processor` and one of the `@picovoice/rhino-web-**-worker` series of packages for the specific language model:

E.g. English:

```console
yarn add @picovoice/rhino-web-vue @picovoice/rhino-web-en-worker @picovoice/web-voice-processor
```

## Usage

The Rhino SDK for Vue is based on the Rhino SDK for Web. The library provides a renderless Vue component: `Rhino`. The component will take care of microphone access and audio downsampling (via `@picovoice/web-voice-processor`) and provide a wake word detection event to which your parent component can listen.

The Rhino library is by default a "push-to-talk" experience. You can use a button to trigger the `isTalking` state. Rhino will listen and process frames of microphone audio until it reaches a conclusion. If the utterance matched something in your Rhino context (e.g. "make me a coffee" in a coffee maker context), the details of the inference are returned.

## Parameters

The `Rhino` component has two main parameters:

1. The `rhinoWorkerFactory` (language-specific, imported as `RhinoWorkerFactory` from the `@picovoice/rhino-web-xx-worker` series of packages, where `xx` is the two-letter language code)
1. The `rhinoFactoryArgs` (i.e. what specific context we want Rhino to understand)

Provide a Rhino context via `rhinoFactoryArgs`:

```typescript
export type RhinoContext = {
  /** Base64 representation of a trained Rhino context (`.rhn` file) */
  base64: string
  /** Value in range [0,1] that trades off miss rate for false alarm */
  sensitivity?: number
}

export type RhinoFactoryArgs = {
  /** AccessKey obtained from Picovoice Console (https://picovoice.ai/console/) */
  accessKey: string;
  /** The context to instantiate */
  context: RhinoContext;
  /** If set to `true`, Rhino requires an endpoint (chunk of silence) before finishing inference. **/
  requireEndpoint?: boolean;
};

```

The `Rhino` component emits four [events](#events). The main event of interest is `rhn-inference`, emitted when Rhino concludes an inference (whether it was understood or not). The `rhn-inference` event provides a `RhinoInference` object:

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

Make sure you handle the possibility of errors with the `rhn-error` event. Users may not have a working microphone, and they can always decline (and revoke) permissions; your application code should anticipate these scenarios. You also want to ensure that your UI waits until `rhn-loaded` is complete before instructing them to use VUI features (i.e. the "Push to Talk" button should be disabled until this event occurs).

```html
  <Rhino
    ref="rhino"
    v-bind:rhinoFactoryArgs="{
      accessKey: '${ACCESS_KEY}',  <!-- AccessKey obtained from Picovoice Console (https://picovoice.ai/console/) -->
      context: {
        base64: RHINO_TRAINED_CONTEXT_BASE_64_STRING
      },
    }"
    v-bind:rhinoFactory="factory"
    v-on:rhn-init="rhnInitFn"
    v-on:rhn-ready="rhnReadyFn"
    v-on:rhn-inference="rhnInferenceFn"
    v-on:rhn-error="rhnErrorFn"
  />
```

```javascript
import Rhino from "@picovoice/rhino-web-vue";
import { RhinoWorkerFactory as RhinoWorkerFactoryEn } from "@picovoice/rhino-web-en-worker";

export default {
  name: "VoiceWidget",
  components: {
    Rhino,
  },
  data: function () {
    return {
      inference: null,
      isError: false,
      isLoaded: false,
      isListening: false,
      isTalking: false,
      factory: RhinoWorkerFactoryEn,
    };
  },
  methods: {
    start: function () {
      if (this.$refs.rhino.start()) {
        this.isListening = !this.isListening;
      }
    },
    pause: function () {
      if (this.$refs.rhino.pause()) {
        this.isListening = !this.isListening;
      }
    },
    resume: function () {
      if (this.$refs.rhino.resume()) {
        this.isListening = !this.isListening;
      }
    },
    pushToTalk: function () {
      if (this.$refs.rhino.pushToTalk()) {
        this.isTalking = true;
      }
    },

    rhnInitFn: function () {
      this.isError = false;
    },
    rhnReadyFn: function () {
      this.isLoaded = true;
      this.isListening = true;
    },
    rhnInferenceFn: function (inference) {
      this.inference = inference;
      this.isTalking = false;
    },
    rhnErrorFn: function (error) {
      this.isError = true;
      this.errorMessage = error.toString();
    },
  },
};
```

## Events

The Rhino component will emit the following events:

| Event         | Data                                                                  | Description                                                                                         |
| ------------- | --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| "rhn-loading" |                                                                       | Rhino has begun loading                                                                         |
| "rhn-ready"   |                                                                       | Rhino has finished loading & the user has granted microphone permission: ready to process voice |
| "rhn-inference" | The inference object (see above for examples)                         | Rhino has concluded the inference.                                                                    |
| "rhn-error"   | The error that was caught (e.g. "NotAllowedError: Permission denied") | An error occurred while Rhino or the WebVoiceProcessor was loading                              |

### Custom contexts

Custom contexts are generated using [Picovoice Console](https://picovoice.ai/console/). They are trained from text using transfer learning into bespoke Rhino context files with a `.rhn` extension. The target platform is WebAssembly (WASM), as that is what backs the Vue library.

The `.zip` file contains a `.rhn` file and a `_b64.txt` file which contains the binary model encoded with Base64. Provide the base64 encoded string as an argument to Rhino as in the above example. You may wish to store the base64 string in a separate JavaScript file and `export` it to keep your application code separate.
