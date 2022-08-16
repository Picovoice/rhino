# Rhino Binding for Web

## Rhino speech-to-intent engine

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

## Installation

### Package

Using `Yarn`:

```console
yarn add @picovoice/rhino-web
```

or using `npm`:

```console
npm install --save @picovoice/rhino-web
```

### AccessKey

Rhino requires a valid Picovoice `AccessKey` at initialization. `AccessKey` acts as your credentials when using
Rhino SDKs.
You can get your `AccessKey` for free. Make sure to keep your `AccessKey` secret.
Signup or Login to [Picovoice Console](https://console.picovoice.ai/) to get your `AccessKey`.

## Usage

There are two methods to initialize Rhino:

### Public Directory

**NOTE**: Due to modern browser limitations of using a file URL, this method does __not__ work if used without hosting a server.

This method fetches [the model file](https://github.com/Picovoice/rhino/blob/master/lib/common/rhino_params.pv) from the public directory and feeds it to Rhino. Copy the model file into the public directory:

```console
cp ${RHINO_MODEL_FILE} ${PATH_TO_PUBLIC_DIRECTORY}
```

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

### Init options

Rhino saves and caches your model file in IndexedDB to be used by Web Assembly. Use a different `customWritePath`
variableto hold multiple model values and set the `forceWrite` value to true to force re-save the model file.
Set `processErrorCallback` to handle errors if an error occurs while transcribing.
If the model file (`.pv`) changes, `version` should be incremented to force the cached model to be updated.

```typescript
// these are default
const options = {
  processErrorCallback: (error) => {
  },
  customWritePath: "porcupine_model",
  forceWrite: false,
  version: 1
}
```

### Initialize in Main Thread

Use `Rhino` to initialize from public directory:

```typescript
const handle = await Rhino.fromPublicDirectory(
  ${ACCESS_KEY},
  ${CONTEXT_RELATIVE_PATH},
  ${MODEL_RELATIVE_PATH},
  options // optional options
);
```

or initialize using a base64 string:

```typescript
import rhinoParams from "${PATH_TO_BASE64_RHINO_PARAMS}";
const handle = await Rhino.fromBase64(
  ${ACCESS_KEY},
  ${CONTEXT_RELATIVE_PATH},
  rhinoParams,
  options // optional options
)
```

### Process Audio Frames in Main Thread

```typescript
function getAudioData(): Int16Array {
... // function to get audio data
  return new Int16Array();
}
for (; ;) {
  const inference = await handle.process(getAudioData());
  if (inference.isFinalized) {
    if (inference.isUnderstood) {
      console.log(inference.intent)
      console.log(inference.slots)
      // Insert inference event callback here
    }
  }
  // break on some condition
}
```

### Initialize in Worker Thread

Create a `inferenceDetectionCallback` function to get the streaming results from the worker:

```typescript
function inferenceDetectionCallback(inference) {
  if (inference.isUnderstood) {
    console.log(inference.intent)
    console.log(inference.slots)
  }
}
```

Add to the `options` object an `processErrorCallback` function if you would like to catch errors:

```typescript
function processErrorCallback(error: string) {
...
}
options.processErrorCallback = processErrorCallback;
```

Use `rhinoWorker` to initialize from public directory:

```typescript
const handle = await RhinoWorker.fromPublicDirectory(
  ${ACCESS_KEY},
  ${CONTEXT_RELATIVE_PATH}
  keywordDetectionCallback,
  ${MODEL_RELATIVE_PATH},
  options // optional options
);
```

or initialize using a base64 string:

```typescript
import rhinoParams from "${PATH_TO_BASE64_RHINO_PARAMS}";
const handle = await Rhino.fromBase64(
  ${ACCESS_KEY},
  ${CONTEXT_RELATIVE_PATH},
  keywordDetectionCallback,
  rhinoParams,
  options // optional options
)
```

### Process Audio Frames in Worker Thread

In a worker thread, the `process` function will send the input frames to the worker.
The result is received from `inferenceDetectionCallback` as mentioned above.

```typescript
function getAudioData(): Int16Array {
... // function to get audio data
  return new Int16Array();
}
for (; ;) {
  handle.process(getAudioData());
  // break on some condition
}
```

### Clean Up

Clean up used resources by `Rhino` or `RhinoWorker`:

```typescript
await handle.release();
```

### Terminate

Terminate `RhinoWorker` instance:

```typescript
await handle.terminate();
```

## Contexts

Create custom contexts using the [Picovoice Console](https://console.picovoice.ai/).
Train the Rhino context model for the target platform WebAssembly (WASM).
Inside the downloaded `.zip` file, there are two files:

- `.rhn` file which is the context model file in binary format
- `_b64.txt` file which contains the same binary model encoded with Base64

Similar to the model file (`.pv`), there are two ways to use a custom context model:

### Public Directory

This method fetches the context model file from the public directory and feeds it to Porcupine.
Copy the binary context model file (`.rhn`) into the public directory and then define a `RhinoContext` object,
in which the `rhnPath` property is set to the path to the context model file.

```typescript
const rhinoContext = {
  rhnPath: ${RHN_MODEL_RELATIVE_PATH},
}
const handle = await Rhino.fromPublicDirectory(
  ${ACCESS_KEY},
  rhinoContext,
  ${MODEL_RELATIVE_PATH},
  options // optional options
);
```

### Base64

Copy the base64 string and pass it as the `base64` property of a `RhinoContext` object.

```typescript
const customWakeWord = {
  base64: ${RHN_BASE64_STRING},
}
const handle = await Rhino.fromPublicDirectory(
  ${ACCESS_KEY},
  rhinoContext,
  ${MODEL_RELATIVE_PATH},
  options // optional options
);
```

## Non-English Languages

In order to detect non-English wake words you need to use the corresponding model file (`.pv`). The model files for all
supported languages are available [here](https://github.com/Picovoice/rhino/tree/master/lib/common).

## Demo

For example usage refer to our [Web demo application](https://github.com/Picovoice/rhino/tree/master/demo/web).
