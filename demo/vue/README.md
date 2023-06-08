# Rhino demo for Vue

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

## Framework Compatibility

- Vue.js 2.6.11+
- Vue.js 3.0.0+

**NOTE**: Although this demo uses Vue 3, the [Picovoice Vue SDK](https://github.com/Picovoice/picovoice/tree/master/sdk/vue)
is compatible with both Vue 2 and Vue 3.

## AccessKey

Rhino requires a valid Picovoice `AccessKey` at initialization. `AccessKey` acts as your credentials when using Rhino SDKs.
You can get your `AccessKey` for free. Make sure to keep your `AccessKey` secret.
Signup or Login to [Picovoice Console](https://console.picovoice.ai/) to get your `AccessKey`.


## Install & Run

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

The command-line output will provide you with a localhost link and port to open in your browser.

## Usage

Enter your `ACCESS_KEY` and press `Init Rhino` to start the demo. Once `Rhino` has initialized, utter a command
to start inferring context. See more information about the current context at the bottom of the screen.
