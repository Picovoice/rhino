# rhino-web-vue-demo

This demo application includes a sample `VoiceWidget` Vue component which uses the `rhinoMixin` service to allow processing naturally spoken phrases within a domain (context) of interest. Rhino inference events are handled via the `inferenceCallback` function.

The demo uses dynamic imports to split the VoiceWidget away from the main application bundle. This means that the initial download size of the Vue app will not be impacted by the ~3-4 MB requirement of Rhino. While small for all-in-one offline Voice AI, the size is large for an initial web app load.

If you decline microphone permission in the browser, or another such issue prevents Rhino from starting, the error will be displayed.

The widget shows the various loading and error events, as well as mounting/unmounting the `VoiceWidget` with a toggle, demonstrating the complete lifecycle of Rhino with in a Vue app.

This project was bootstrapped with Vue CLI. See the [Configuration Reference](https://cli.vuejs.org/config/).

## Install & run

```console
yarn
yarn serve
```

(or)

```console
npm install
npm run serve
```

The command-line output will provide you with a localhost link and port to open in your browser.

## Try Rhino

Use the "Push to Talk" button to start Rhino, and then speak a phrase within the "Clock" context, e.g.:

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
