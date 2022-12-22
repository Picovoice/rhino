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


## Install & run

```console
yarn
yarn start
```

(or)

```console
npm install
npm run start
```

The command-line output will provide you with a localhost link and port to open in your browser.

## Try Rhino

This demo application includes the `VoiceWidget` which uses the `rhinoMixin` mixin to allow inferring naturally spoken commands from voice.

If you decline microphone permission in the browser, or another such issue prevents Rhino from starting, the error will be displayed.

The demo is running a context called "Clock" (available as a `.rhn` file in the GitHub repository). Enter your `AccessKey` in the provided textbox the press the "Start Rhino" button to initialize Rhino. Once loaded, press the "Process" button to start a voice interaction.

Try a phrase that is in the context:

> "Set a timer for ten seconds"

Rhino's inference result will appear:

```json
{
  "isFinalized": true,
  "isUnderstood": true,
  "intent": "setTimer",
  "slots": { "minutes": "1" }
}
```

Use "Push to Talk" again, and this time try a phrase outside the Rhino context:

> "Tell me a joke"

```json
{ "isFinalized": true, "isUnderstood": false, "intent": null, "slots": {} }
```

### Clock context YAML source

```yaml
context:
  expressions:
    setAlarm:
      - "set (a, an, the) [alarm, timer] for $pv.TwoDigitInteger:hours [hour, hours] (and) $pv.TwoDigitInteger:minutes [minute, minutes] (and) $pv.TwoDigitInteger:seconds [second, seconds]"
      - "set (a, an, the) [alarm, timer] for $pv.TwoDigitInteger:hours [hour, hours] (and) $pv.TwoDigitInteger:minutes [minute, minutes]"
      - "set (a, an, the) [alarm, timer] for $pv.TwoDigitInteger:hours [hour, hours] (and) $pv.TwoDigitInteger:seconds [second, seconds]"
      - "set (a, an, the) [alarm, timer] for $pv.TwoDigitInteger:hours [hour, hours]"
      - "set (a, an, the) [alarm, timer] for $pv.TwoDigitInteger:minutes [minute, minutes] (and) $pv.TwoDigitInteger:seconds [second, seconds]"
      - "set (a, an, the) [alarm, timer] for $pv.TwoDigitInteger:minutes [minute, minutes]"
      - "set (a, an, the) [alarm, timer] for $pv.TwoDigitInteger:seconds [second, seconds]"
      - "$pv.TwoDigitInteger:hours [hour, hours] (and) $pv.TwoDigitInteger:minutes [minute, minutes] (and) $pv.TwoDigitInteger:seconds [second, seconds]"
      - "$pv.TwoDigitInteger:hours [hour, hours] (and) $pv.TwoDigitInteger:minutes [minute, minutes]"
      - "$pv.TwoDigitInteger:hours [hour, hours] (and) $pv.TwoDigitInteger:seconds [second, seconds]"
      - "$pv.TwoDigitInteger:hours [hour, hours]"
      - "$pv.TwoDigitInteger:minutes [minute, minutes] (and) $pv.TwoDigitInteger:seconds [second, seconds]"
      - "$pv.TwoDigitInteger:minutes [minute, minutes]"
      - "$pv.TwoDigitInteger:seconds [second, seconds]"
    reset:
      - "reset (the) (timer)"
    pause:
      - "[pause, stop] (the) (timer)"
    resume:
      - "resume (the) (timer)"
```
