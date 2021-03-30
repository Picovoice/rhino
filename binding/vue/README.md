# rhino-web-vue

Renderless Vue component for Rhino for Web.

## Rhino

Rhino is Picovoice's Speech-to-Intent engine. It directly infers intent from spoken commands within a given context of interest, in real-time.

E.g. using the [demo "Clock" Rhino context (English langauge)](https://github.com/Picovoice/rhino/blob/master/resources/contexts/wasm/clock_wasm.rhn), Rhino performs inference on a spoken phrase:

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

Using the Web Audio API requires a secure context (HTTPS connection), with the exception of `localhost`, for local development.

## Installation

Install the package using `npm` or `yarn`. You will also need to add one of the `@picovoice/rhino-web-**-worker` series of packages for the specific language model:

E.g. English:

```bash
yarn add @picovoice/rhino-web-vue @picovoice/rhino-web-en-worker
```

## Usage

Import the Rhino component and the Rhino Web Worker component. Bind the worker to Rhino like the demo `.vue` file below.

```html
  <Rhino
    ref="rhino"
    v-bind:rhinoFactoryArgs="{
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
