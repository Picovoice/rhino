# rhino-web-react

React hook for Rhino for Web.

Rhino is also available for React Native, as a separate package. See [@picovoice/rhino-react-native](https://www.npmjs.com/package/@picovoice/rhino-react-native).

## Rhino

Rhino is Picovoice's Speech-to-Intent engine. It directly infers intent from spoken commands within a given context of interest, in real-time. 

E.g. using the [demo "Clock" Rhino context (English langauge)](https://github.com/Picovoice/rhino/blob/master/resources/contexts/wasm/clock_wasm.rhn):

> Set a timer for ten minutes

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
> Tell me a joke

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

Using the Web Audio API requires a secure context (HTTPS connection), with the exception of `localhost`, for local development.

## Installation

Use `npm` or `yarn` to install the package and its peer dependencies. Each spoken language (e.g. 'en', 'de') is a separate package. For this example we'll use English:

`yarn add @picovoice/rhino-web-react @picovoice/rhino-web-en-worker`

(or)

`npm install @picovoice/rhino-web-react @picovoice/rhino-web-en-worker`

## Usage

The Rhino library is by default a `push-to-talk` experience. You can use a button to trigger the `isTalking` state. Rhino will listen and process frames of microphone audio until it reaches a conclusion. If the utterance matched something in your Rhino context (e.g. "make me a coffee" in a coffee maker context), the details of the inference are returned.

If you wish to use a wake word with Rhino, see the Picovoice SDK for Web, which combines the two engines.

The `useRhino` hook provides a collection of fields and methods shown below. You can pass the `inferenceEventHandler` to respond to Rhino inference events. This example uses the sample "Clock" Rhino context, with a sensitivity of 0.65.

Make sure you handle the possibility of errors with the `isError` and `errorMessage` fields. Users may not have a working microphone, and they can always decline (and revoke) permissions; your application code should anticipate these scenarios.

```javascript
import React, { useState } from 'react';
import { RhinoWorkerFactory } from '@picovoice/rhino-web-en-worker';
import { useRhino } from '@picovoice/rhino-web-react';

const RHN_CONTEXT_CLOCK_64 = /* Base64 representation of English language clock_wasm.rhn, omitted for brevity */

function VoiceWidget(props) {
  const [latestInference, setLatestInference] = useState(null)

  const inferenceEventHandler = (rhinoInference) => {
    console.log(`Rhino inferred: ${rhinoInference}`);
    setLatestInference(rhinoInference)
  };

  const {
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
    {
      // Start Rhino in a paused state with the clock context
      rhinoFactoryArgs: { context: { base64: RHN_CONTEXT_CLOCK_64 }, start: false },
      // Immediately start processing audio, although rhino will not activate until the button is pressed
      start: true,
    },
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

**Important Note**: Internally, `useRhino` performs work asynchronously to initialize, as well as asking for microphone permissions. Not until the asynchronous tasks are done and permission given will Rhino actually be running. Therefore, it makes sense to use the `isLoaded` state to update your UI to let users know your application is actually ready to process voice (and `isError` in case something went wrong). Otherwise, they may start speaking and their audio data will not be processed, leading to a poor/inconsistent experience.
