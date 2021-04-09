# rhino-web-demo

This is a basic demo to show how to use Rhino for web browsers, using the IIFE version of the library (i.e. an HTML script tag). It instantiates a Rhino worker engine and uses it with the [@picovoice/web-voice-processor](https://www.npmjs.com/package/@picovoice/web-voice-processor) to access (and automatically downsample) microphone audio.

## Install & run

Use `yarn` or `npm` to install the dependencies, and the `start` script to start a local web server hosting the demo.

```bash
yarn
yarn start
```

Open `localhost:5000` in your web browser, as hinted at in the output:

```bash
   ┌──────────────────────────────────────────────────┐
   │                                                  │
   │   Serving!                                       │
   │                                                  │
   │   - Local:            http://localhost:5000      │
   │   - On Your Network:  http://192.168.1.69:5000   │
   │                                                  │
   │   Copied local address to clipboard!             │
   │                                                  │
   └──────────────────────────────────────────────────┘
```

Wait until Rhino and the WebVoiceProcessor have initialized. Press the "Push to Talk" button and then say a command within the context of "Pico Clock", e.g.:

> "Set a timer for ten seconds"

```
Inference detected: {"isFinalized":true,"isUnderstood":true,"intent":"setTimer","slots":{"seconds":"10"}}
```
