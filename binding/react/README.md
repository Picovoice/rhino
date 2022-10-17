# Rhino Binding for React

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

## Compatibility

- Chrome / Edge
- Firefox
- Safari

### Restrictions

IndexedDB and WebWorkers are required to use `Rhino React`. Browsers without support (i.e. Firefox Incognito Mode) 
should use the [`RhinoWeb binding`](https://github.com/Picovoice/rhino/tree/master/binding/web) main thread method.

## AccessKey

Rhino requires a valid Picovoice `AccessKey` at initialization. `AccessKey` acts as your credentials when using Rhino SDKs.
You can get your `AccessKey` for free. Make sure to keep your `AccessKey` secret.
Signup or Login to [Picovoice Console](https://console.picovoice.ai/) to get your `AccessKey`.

## Installation

Using `yarn`:

```console
yarn add @picovoice/rhino-react @picovoice/web-voice-processor
```

or using `npm`:

```console
npm install --save @picovoice/rhino-react @picovoice/web-voice-processor
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

Use the `useRhino` hook and then the `init` function to initialize `Rhino`:

```typescript
const {
  inference,
  contextInfo,
  isLoaded,
  isListening,
  error,
  init,
  process,
  release,
} = useRhino();

const initRhino = async () => {
  await init(
    "${ACCESS_KEY}",
    rhinoContext,
    rhinoModel,
    options
  )
}
```

The `init` process is asynchronous. Once complete, the `isLoaded` flag will be set to `true`.

### Process Audio Frames

The Rhino React binding uses [WebVoiceProcessor](https://github.com/Picovoice/web-voice-processor) to record audio.
To start detecting detecting an inference, run the `process` function:
```typescript
await process();
```
The `process` function initializes WebVoiceProcessor.
Rhino will then listen and process frames of microphone audio until it reaches a conclusion, then return the result via the `inference` variable.
Rhino will enter a paused state once a conclusion is reached. From the paused state, call `process` again to detect another inference.

### Release

While running in a component, you can call `release` to clean up all resources used by Rhino and WebVoiceProcessor.

```typescript
await release();
```

This will set `isLoaded` and `isListening` to false.

If any arguments require changes, call `release` then `init` again to initialize Rhino with the new settings.

You do not need to call `release` when your component is unmounted - the hook will clean up automatically on unmount.

## Contexts

Create custom contexts using the [Picovoice Console](https://console.picovoice.ai/).
Train the Rhino context model for the target platform WebAssembly (WASM).
Inside the downloaded `.zip` file, there will be a `.rhn` file which is the context model file in binary format.

Similar to the model file (`.pv`), keyword files (`.rhn`) are saved in IndexedDB to be used by Web Assembly.
Either `base64` or `publicPath` must be set to instantiate Rhino. If both are set, Rhino will use
the `base64` model.

## Non-English Languages

In order to detect non-English inferences you need to use the corresponding model file (`.pv`). The model files for all
supported languages are available [here](https://github.com/Picovoice/rhino/tree/master/lib/common).

## Demo

For example usage, refer to our [React demo application](https://github.com/Picovoice/rhino/tree/master/demo/react).
