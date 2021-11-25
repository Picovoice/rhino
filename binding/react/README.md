# rhino-web-react

React hook for Rhino for Web.

Rhino is also available for React Native, as a separate package. See [@picovoice/rhino-react-native](https://www.npmjs.com/package/@picovoice/rhino-react-native).

## Rhino

Rhino is Picovoice's Speech-to-Intent engine. It directly infers intent from spoken commands within a given context of interest, in real-time.

E.g. using the [demo "Clock" Rhino context (English language)](https://github.com/Picovoice/rhino/blob/master/resources/contexts/wasm/clock_wasm.rhn):

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

Something outside the Clock context won't be understood:

> "Tell me a joke"

```json
{
  "isFinalized": true,
  "isUnderstood": false
}
```

The key `isFinalized` tells you whether Rhino has reached a conclusion or is still awaiting more frames of audio to reach a decision. Upon `isFinalized=true`, `isUnderstood` will be set to true/false. If true, the `intent` will be available, as will `slots` if any were captured in this expression.

## Introduction

The Rhino SDK for React is based on the Rhino SDK for Web. The library provides a React hook: `useRhino`. The hook will take care of microphone access and audio downsampling (via `@picovoice/web-voice-processor`) and provide an inference event to which your application can subscribe.

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

```console
yarn add @picovoice/rhino-web-react @picovoice/rhino-web-en-worker @picovoice/web-voice-processor
```

(or)

```console
npm install @picovoice/rhino-web-react @picovoice/rhino-web-en-worker @picovoice/web-voice-processor
```

## Usage

The Rhino library is by default a "Push-to-talk" experience. You can use a button to trigger the `pushToTalk` function. Rhino will listen and process frames of microphone audio until it reaches a conclusion. If the utterance matched something in your Rhino context (e.g. "make me a coffee" in a coffee maker context), the details of the inference are returned.

If you wish to use a wake word with Rhino, see [@picovoice/picovoice-web-react](https://www.npmjs.com/package/@picovoice/picovoice-web-react) which combines Rhino with the Porcupine wake word engine.

The `useRhino` hook provides a collection of fields and methods shown below. You can pass the `inferenceEventHandler` to respond to Rhino inference events. This example uses the sample "Clock" Rhino context, with a sensitivity of 0.65.

Make sure you handle the possibility of errors with the `isError` and `errorMessage` fields. Users may not have a working microphone, and they can always decline (and revoke) permissions; your application code should anticipate these scenarios.

### Static Import

```javascript
import React, { useState } from 'react';
import { RhinoWorkerFactory } from '@picovoice/rhino-web-en-worker';
import { useRhino } from '@picovoice/rhino-web-react';

const ACCESS_KEY = /* AccessKey obtained from Picovoice Console (https://picovoice.ai/console/) */
const RHN_CONTEXT_CLOCK_64 = /* Base64 representation of English language clock_wasm.rhn, omitted for brevity */

function VoiceWidget(props) {
  const [latestInference, setLatestInference] = useState(null)

  const inferenceEventHandler = (rhinoInference) => {
    console.log(`Rhino inferred: ${rhinoInference}`);
    setLatestInference(rhinoInference)
  };

  const {
    contextInfo,
    isLoaded,
    isListening,
    isError,
    isTalking,
    errorMessage,
    start,
    resume,
    pause,
    pushToTalk,
  } = useRhino(
    // Pass in the factory to build Rhino workers. This needs to match the context language below
    RhinoWorkerFactory,
      // Start Rhino with the clock contex
      //Immediately start processing audio,
      // although rhino will not activate until the button is pressed
      { accessKey: ACCESS_KEY, context: { base64: RHN_CONTEXT_CLOCK_64 }, start: true },
    inferenceEventHandler
  );

return (
  <div className="voice-widget">
    <button onClick={() => pushToTalk()} disabled={isTalking || isError || !isLoaded}>
      Push to Talk
    </button>
    <p>{JSON.stringify(latestInference)}</p>
  </div>
)
```

The `inferenceEventHandler` will log the inference to the browser's JavaScript console and display the most recent one. Use the push-to-talk button to activate Rhino.

**Important Note**: Internally, `useRhino` performs work asynchronously to initialize, as well as asking for microphone permissions. Not until the asynchronous tasks are done and permission given will Rhino actually be running. Therefore, it makes sense to use the `isLoaded` state to update your UI to let users know your application is actually ready to process voice (and `isError` in case something went wrong). Otherwise, they may start speaking, and their audio data will not be processed, leading to a poor/inconsistent experience.

### Dynamic Import

If you are shipping Rhino for the Web and wish to avoid adding its ~4 MB to your application's initial bundle, you can use dynamic imports. These will split off the rhino-web-xx-worker packages into separate bundles and load them asynchronously. This means we need additional logic.

We add a `useEffect` hook to kick off the dynamic import. We store the result of the dynamically loaded worker chunk into a `useState` hook. When `useRhino` receives a non-null/undefined value for the worker factory, it will automatically start up Rhino.

See the [Webpack docs](https://webpack.js.org/guides/code-splitting/) for more information about Code Splitting.

```javascript
import React, { useState, useEffect } from 'react';
import { RhinoWorkerFactory } from '@picovoice/rhino-web-en-worker';
import { useRhino } from '@picovoice/rhino-web-react';

const ACCESS_KEY = /* AccessKey obtained from Picovoice Console (https://picovoice.ai/console/) */
const RHN_CONTEXT_CLOCK_64 = /* Base64 representation of English language clock_wasm.rhn, omitted for brevity */

function VoiceWidget(props) {
  const [latestInference, setLatestInference] = useState(null)

  const inferenceEventHandler = (rhinoInference) => {
    console.log(`Rhino inferred: ${rhinoInference}`);
    setLatestInference(rhinoInference)
  };

  const [workerChunk, setWorkerChunk] = useState({ factory: null });

  useEffect(() => {
    async function loadRhino() {
      // Dynamically import the worker
      const rhnEnWorkerFactory = (await import('@picovoice/rhino-web-en-worker'))
        .RhinoWorkerFactory;
      console.log('Rhino worker (EN) chunk is loaded.');
      return rhnEnWorkerFactory;
    }

    if (workerChunk.factory === null) {
      loadRhino().then(workerFactory => {
        setWorkerChunk({ factory: workerFactory });
      });
    }
  }, [workerChunk]);

  const {
    isLoaded,
    isListening,
    isError,
    isTalking,
    errorMessage,
    pushToTalk,
  } = useRhino(
    workerChunk.factory,
    { accessKey: ACCESS_KEY, context: { base64: RHN_EN_CLOCK_64 } },
    inferenceEventHandler
  );
```

### Custom contexts

Custom contexts are generated using [Picovoice Console](https://picovoice.ai/console/). They are trained from text using transfer learning into bespoke Rhino context files with a `.rhn` extension. The target platform is WebAssembly (WASM), as that is what backs the React library.

The `.zip` file contains a `.rhn` file and a `_b64.txt` file which contains the binary model encoded with Base64. Provide the base64 encoded string as an argument to Rhino as in the above example. You may wish to store the base64 string in a separate JavaScript file and `export` it to keep your application code separate.
