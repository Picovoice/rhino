# rhino-web-react-demo

This demo application includes the `VoiceWidget` which uses the `useRhino` react hook to allow inferring naturally spoken commands from voice. The inference is handled via the `inferenceEvent Handler` callback function that updates a React `useState` hook, and then renders the results.

If you decline microphone permission in the browser, or another such issue prevents Rhino from starting, the error will be displayed.

The widget shows the various loading and error states, as well as mounting/unmounting the `VoiceWidget` with a toggle, demonstrating the complete lifecycle of Rhino with in a React app.

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Install and Run

```bash
yarn
yarn start
```

(or)

```bash
npm install
npm run start
```

Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

## Try Rhino

The demo is running a context called "Clock" (available as a `.rhn` file in the GitHub repository). Press the "Push to Talk" button to start a voice interaction.

Try a phrase that is in the context:

> "Set a timer for two minutes"

The results will appear on screen:

````json
{
  "isFinalized": true,
  "isUnderstood": true,
  "intent": "setTimer",
  "slots": { "minutes": "10" }
}

Try a phrase that is out-of-context:

> "What's my horoscope?"
```json
{
  "isFinalized": true,
  "isUnderstood": false,
  "intent": null,
  "slots": {}
}
````

This command falls outside of the domain of "Alarm Clock" and is therefore not understood.

#### Demo context source

The Alarm Clock was trained to understand a particular set of expressions. These are built using a simple grammar and grouped together into a YAML file. This file is trained by [Picovoice Console](https://picovoice.ai/console/) to create a `.rhn` file for the WebAssembly (WASM) platform.

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
