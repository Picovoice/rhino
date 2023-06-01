# Rhino demo for Rect

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

## AccessKey

Rhino requires a valid Picovoice `AccessKey` at initialization. `AccessKey` acts as your credentials when using Rhino SDKs.
You can get your `AccessKey` for free. Make sure to keep your `AccessKey` secret.
Signup or Login to [Picovoice Console](https://console.picovoice.ai/) to get your `AccessKey`.

## Install and Run

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

Open `http://localhost:3000` to view it in the browser.

## Try Rhino

This demo application includes the `VoiceWidget` which uses the `useRhino` react hook to allow inferring naturally spoken commands from voice.

If you decline microphone permission in the browser, or another such issue prevents Rhino from starting, the error will be displayed.

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

The demo is running a context called "Clock" (available as a `.rhn` file in the GitHub repository). Enter your `AccessKey` in the provided textbox the press the "Start Rhino" button to initialize Rhino. Once loaded, press the "Process" button to start a voice interaction.

Try a phrase that is in the context:

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

This command falls outside the domain of "Alarm Clock" and is therefore not understood.
