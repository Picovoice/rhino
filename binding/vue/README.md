# Rhino Binding for Vue

## Rhino Speech-to-Intent engine

Made in Vancouver, Canada by [Picovoice](https://picovoice.ai)

Rhino is Picovoice's Speech-to-Intent engine. It directly infers intent from spoken commands within a given context of
interest, in real-time. For example, given a spoken command:

> Can I have a small double-shot espresso?
Rhino infers that the user would like to order a drink and emits the following inference result:

```json
{
  "isUnderstood": "true",
  "intent": "orderBeverage",
  "slots": {
    "beverage": "espresso",
    "size": "small",
    "numberOfShots": "2"
  }
}
```

Rhino is:

* using deep neural networks trained in real-world environments.
* compact and computationally-efficient, making it perfect for IoT.
* self-service. Developers and designers can train custom models using [Picovoice Console](https://console.picovoice.ai/).

## Browser Compatibility

- Chrome / Edge
- Firefox
- Safari

### Restrictions

IndexedDB and WebWorkers are required to use `Rhino Vue`. Browsers without support (i.e. Firefox Incognito Mode) 
should use the [`RhinoWeb binding`](https://github.com/Picovoice/rhino/tree/master/binding/web) main thread method.

## Framework Compatibility

- Vue.js 2.6.11+
- Vue.js 3.0.0+

## AccessKey

Rhino requires a valid Picovoice `AccessKey` at initialization. `AccessKey` acts as your credentials when using Rhino SDKs.
You can get your `AccessKey` for free. Make sure to keep your `AccessKey` secret.
Signup or Login to [Picovoice Console](https://console.picovoice.ai/) to get your `AccessKey`.

## Installation

Using `yarn`:

```console
yarn add @picovoice/rhino-vue @picovoice/web-voice-processor
```

or using `npm`:

```console
npm install --save @picovoice/rhino-vue @picovoice/web-voice-processor
```

## Usage

There are two methods to initialize Rhino:

### Public Directory

**NOTE**: Due to modern browser limitations of using a file URL, this method does __not__ work if used without hosting a server.

This method fetches [the model file](https://github.com/Picovoice/rhino/blob/master/lib/common/rhino_params.pv) from the public directory and feeds it to Rhino. Copy the model file into the public directory:

```console
cp ${RHINO_MODEL_FILE} ${PATH_TO_PUBLIC_DIRECTORY}
```

The same procedure can be used for the [Rhino context](https://github.com/Picovoice/rhino/tree/master/resources/contexts) (`.rhn`) files.

### Base64

**NOTE**: This method works without hosting a server, but increases the size of the model file roughly by 33%.

This method uses a base64 string of the model file and feeds it to Rhino. Use the built-in script `pvbase64` to base64 your model file:

```console
npx pvbase64 -i ${RHINO_MODEL_FILE} -o ${OUTPUT_DIRECTORY}/${MODEL_NAME}.js
```

The output will be a js file which you can import into any file of your project. For detailed information about `pvbase64`,
run:

```console
npx pvbase64 -h
```

The same procedure can be used for the [Rhino context](https://github.com/Picovoice/rhino/tree/master/resources/contexts) (`.rhn`) files.

### Rhino Model

Rhino saves and caches your model (`.pv`) and context (`.rhn`) files in the IndexedDB to be used by Web Assembly.
Use a different `customWritePath` variable to hold multiple model values and set the `forceWrite` value to true to force an overwrite of the model file.
If the model (`.pv`) or context (`.rhn`) files change, `version` should be incremented to force the cached model to be updated. Either `base64` or `publicPath` must be set to instantiate Rhino. If both are set, Rhino will use the `base64` parameter.

```typescript
// Context (.rhn)
const rhinoContext = {
  publicPath: ${CONTEXT_RELATIVE_PATH},
  // or
  base64: ${CONTEXT_BASE64_STRING},
  // Optionals
  customWritePath: 'custom_context',
  forceWrite: true,
  version: 1,
  sensitivity: 0.5,
}
// Model (.pv)
const rhinoModel = {
  publicPath: ${MODEL_RELATIVE_PATH},
  // or
  base64: ${MODEL_BASE64_STRING},
  // Optionals
  customWritePath: 'custom_model',
  forceWrite: true,
  version: 1,
}
```

Additional engine options are provided via the `options` parameter.
Use `endpointDurationSec` and `requireEndpoint` to control the engine's endpointing behaviour.
An endpoint is a chunk of silence at the end of an utterance that marks the end of spoken command.

```typescript
// Optional. These are the default values
const options = {
  endpointDurationSec: 1.0,
  requireEndpoint: true,
}
```

### Initialize Rhino

Use `useRhino` and `init` to initialize `Rhino`.

In case of any errors, watch for `state.error` to check the error message, otherwise watch `state.isLoaded` to check if `Rhino` has loaded. Also watch for `state.contextInfo` for current context information.

#### Rhino in Vue 2

**NOTE**: If you need to call `useRhino` outside of `data`, make sure to add observer property via `Vue.set` or `observable`.

```vue
<script lang='ts'>
import Vue, { VueConstructor } from 'vue';
import { RhinoVue, useRhino } from '@picovoice/rhino-vue';

// Use Vue.extend for JavaScript
export default (Vue as VueConstructor<Vue & RhinoVue>).extend({
  data() {
    const {
      state,
      init,
      process,
      release
    } = useRhino();

    init(
      ${ACCESS_KEY},
      rhinoContext,
      rhinoModel,
      options
    );

    return {
      state,
      process,
      release
    }
  },
  watch: {
    "state.inference": function(inference) {
      if (inference !== null) {
        console.log(inference)
      }
    },
    "state.contextInfo": function(contextInfo) {
      if (contextInfo !== null) {
        console.log(contextInfo)
      }
    },
    "state.isLoaded": function(isLoaded) {
      console.log(isLoaded)
    },
    "state.isListening": function(isListening) {
      console.log(isListening)
    },
    "state.error": function(error) {
      console.error(error)
    },
  },
  onBeforeDestroy() {
    this.release();
  },
});
</script>
```

#### Rhino in Vue 3

In Vue 3, we take advantage of the [Composition API](https://vuejs.org/api/composition-api-setup.html), especially the use of `reactive`.

```vue
<script lang='ts'>
import { defineComponent, onBeforeUnmount, watch } from 'vue';
import { useRhino } from '@picovoice/rhino-vue';

// Use Vue.extend for JavaScript
export default defineComponent({
  setup() {
    const { 
      state,
      init,
      process,
      release
    } = useRhino();
    
    watch(() => state.isLoaded, (newVal) => {
      console.log(newVal);
    });

    watch(() => state.isListening, (newVal) => {
      console.log(newVal);
    });

    watch(() => state.inference, (inference) => {
      if (inference !== null) {
        console.log(inference);
      }
    });
    
    watch(() => state.contextInfo, (contextInfo) => {
      if (contextInfo !== null) {
        console.log(contextInfo);
      }
    });
    
    watch(() => state.error, (err) => {
      if (err) {
        console.error(err);
      }
    });

    onBeforeUnmount(() => {
      release();
    });

    init(
      ${ACCESS_KEY},
      rhinoContext,
      rhinoModel,
      options
    );
    
    return {
      process,
      release
    }
  }
});
</script>
```

### Process Audio Frames

The Rhino Vue binding uses [WebVoiceProcessor](https://github.com/Picovoice/web-voice-processor) to record audio.
To start detecting an inference, run the `process` function:

```typescript
await this.process();
```

The `process` function initializes WebVoiceProcessor.
Rhino will then listen and process frames of microphone audio until it reaches a conclusion, then return the result via the `state.inference` variable.
Once a conclusion is reached Rhino will enter a paused state. From the paused state Rhino call `process` again to detect another inference.

### Release

Run release explicitly to clean up all resources used by `Rhino` and `WebVoiceProcessor`:

```typescript
this.release();
```

This will set `state.isLoaded` and `state.isListening` to false.

## Contexts

Create custom contexts using the [Picovoice Console](https://console.picovoice.ai/).
Train and download a Rhino context file (`.rhn`) for the target platform `Web (WASM)`.
This model file can be used directly with `publicPath`, but, if `base64` is preferable, convert the `.rhn` file to a
base64 JavaScript variable using the built-in `pvbase64` script:

```console
npx pvbase64 -i ${CONTEXT_FILE}.rhn -o ${CONTEXT_BASE64}.js -n ${CONTEXT_BASE64_VAR_NAME}
```

Similar to the model file (`.pv`), context files (`.rhn`) are saved in IndexedDB to be used by Web Assembly.
Either `base64` or `publicPath` must be set for the context to instantiate Rhino.
If both are set, Rhino will use the `base64` model.

```typescript
const contextModel = {
  publicPath: "${CONTEXT_RELATIVE_PATH}",
  // or
  base64: "${CONTEXT_BASE64_STRING}",
}
```

## Switching Languages

In order to make inferences in different language you need to use the corresponding model file (`.pv`). 
The model files for all supported languages are available [here](https://github.com/Picovoice/rhino/tree/master/lib/common).

## Demo

For example usage, refer to our [Vue demo application](https://github.com/Picovoice/rhino/tree/master/demo/vue).
