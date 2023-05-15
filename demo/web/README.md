# rhino-web-demo

This is a basic demo to show how to use Rhino for web browsers, using the IIFE version of the library (i.e. an HTML script tag). It instantiates a Rhino worker engine and uses it with the [@picovoice/web-voice-processor](https://www.npmjs.com/package/@picovoice/web-voice-processor) to access (and automatically downsample) microphone audio.

## AccessKey

Rhino requires a valid Picovoice `AccessKey` at initialization. `AccessKey` acts as your credentials when using Rhino SDKs.
You can get your `AccessKey` for free. Make sure to keep your `AccessKey` secret.
Signup or Login to [Picovoice Console](https://console.picovoice.ai/) to get your `AccessKey`.

## Install & run

Use `yarn` or `npm` to install the dependencies, and the `start` script with a language code
to start a local web server hosting the demo in the language of your choice (e.g. `pl` -> Polish, `ko` -> Korean).
To see a list of available languages, run `start` without a language code.

```console
yarn
yarn start ${LANGUAGE}
```

(or)

```console
npm install
npm run start ${LANGUAGE}
```

Open `localhost:5000` in your web browser, as hinted at in the output:

```console
Available on:
  http://localhost:5000
Hit CTRL-C to stop the server
```

### Try Rhino

Wait until Rhino and the WebVoiceProcessor have initialized. You will see the contents of the sample context at the 
bottom of the page. Press the "Push to Talk" button to start a voice interaction.

Try a phrase that is in the context. E.g:

> "Set a timer for two minutes"

The results will appear on screen:

```json
{
  "isFinalized": true,
  "isUnderstood": true,
  "intent": "setTimer",
  "slots": { "minutes": "10" }
}
```

Try a phrase that is out-of-context:

> "What's my horoscope?"

```json
{
  "isFinalized": true,
  "isUnderstood": false,
  "intent": null,
  "slots": {}
}
```

This command falls outside the domain of the context and is therefore not understood.
