# rhino-web-angular-demo

This demo application includes a sample `VoiceWidget` Angular component which uses the `RhinoService` Angular service to allow naturally spoken commands to be converted to intents. Rhino inference is handled via the `inference$` event. Our VoiceWidget subscribes to this event and displays the results.

The demo uses dynamic imports to split the RhinoService away from the main application bundle. This means that the initial download size of the Angular app will not be impacted by the ~3-4MB requirement of Rhino. While small for all-in-one offline Voice AI, the size is large for an intial web app load.

If you decline microphone permission in the browser, or another such issue prevents Rhino from starting, the error will be displayed.

The widget shows the various loading and error events, as well as mounting/unmounting the `VoiceWidget` with a toggle, demonstrating the complete lifecycle of Rhino with in an Angular app.

This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 11.0.5.

## Install and run

Use `yarn` or `npm` to install then start the demo application:

```
yarn
yarn start
```

Navigate to `http://localhost:4200/`. The app will automatically reload if you change any of the source files.

## Speech inference

The Rhino service, used standalone, is a push-to-talk experience. With the demo application running in your browser (and microphone permissions granted), press the "Push to Talk" button, then try saying the following:

> "Set a timer for one minute"

The result should look similar to this:

```json
{
  "isFinalized": true,
  "isUnderstood": true,
  "intent": "setAlarm",
  "slots": {
    "minutes": "1"
  }
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

This command falls outside of the domain of "Alarm Clock" and is therefore not understood.

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