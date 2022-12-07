# Rhino Binding for React Native

## Rhino Speech-to-Intent Engine

Made in Vancouver, Canada by [Picovoice](https://picovoice.ai)

Rhino is Picovoice's Speech-to-Intent engine. It directly infers intent from spoken commands within a given context of
interest, in real-time. For example, given a spoken command *"Can I have a small double-shot espresso?"*, Rhino infers that the user wants to order a drink and emits the following inference result:

```json
{
  "type": "espresso",
  "size": "small",
  "numberOfShots": "2"
}
```

Rhino is:

* using deep neural networks trained in real-world environments.
* compact and computationally-efficient, making it perfect for IoT.
* self-service. Developers and designers can train custom models using [Picovoice Console](https://console.picovoice.ai/).

## Compatibility

This binding is for running Rhino on **React Native 0.62.2+** on the following platforms:

- Android 5.0+ (API 21+)
- iOS 10.0+

## Installation

To start install be sure you have installed yarn and cocoapods. Then add these two native modules to your react-native project.

```console
yarn add @picovoice/react-native-voice-processor
yarn add @picovoice/rhino-react-native
```
or
```console
npm i @picovoice/react-native-voice-processor --save
npm i @picovoice/rhino-react-native --save
```

Link the iOS package

```console
cd ios && pod install && cd ..
```

**NOTE**: Due to a limitation in React Native CLI auto-linking, these two native modules cannot be included as transitive dependencies. If you are creating a module that depends on rhino-react-native and/or react-native-voice-processor, you will have to list these as peer dependencies and require developers to install them alongside.

## AccessKey

Rhino requires a valid Picovoice `AccessKey` at initialization. `AccessKey` acts as your credentials when using Rhino SDKs.
You can get your `AccessKey` for free. Make sure to keep your `AccessKey` secret.
Signup or Login to [Picovoice Console](https://console.picovoice.ai/) to get your `AccessKey`.

## Permissions

To enable recording with the hardware's microphone, you must first ensure that you have enabled the proper permission on both iOS and Android.

On iOS, open your Info.plist and add the following line:
```xml
<key>NSMicrophoneUsageDescription</key>
<string>[Permission explanation]</string>
```

On Android, open your AndroidManifest.xml and add the following line:
```xml
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.INTERNET" />
```

Finally, in your app JS code, be sure to check for user permission consent before proceeding with audio capture:
```javascript
let recordAudioRequest;
if (Platform.OS == 'android') {
    // For Android, we need to explicitly ask
    recordAudioRequest = this._requestRecordAudioPermission();
} else {
    // iOS automatically asks for permission
    recordAudioRequest = new Promise(function (resolve, _) {
    resolve(true);
    });
}

recordAudioRequest.then((hasPermission) => {
    if(hasPermission){
        // Code that uses Rhino
    }
});

async _requestRecordAudioPermission() {
    const granted = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
    {
        title: 'Microphone Permission',
        message: '[Permission explanation]',
        buttonNeutral: 'Ask Me Later',
        buttonNegative: 'Cancel',
        buttonPositive: 'OK',
    }
    );
    return (granted === PermissionsAndroid.RESULTS.GRANTED)
  }
```

## Usage

The module provides you with two levels of API to choose from depending on your needs.

#### High-Level API

[RhinoManager](https://github.com/Picovoice/rhino/blob/master/binding/react-native/src/rhino_manager.tsx) provides a high-level API that takes care of
audio recording. This class is the quickest way to get started.

The constructor `RhinoManager.create` will create an instance of a RhinoManager using a context file that you pass to it.
```javascript
const accessKey = "${ACCESS_KEY}"; // AccessKey obtained from Picovoice Console (https://console.picovoice.ai/)

async createRhinoManager() {
    try{
        this._rhinoManager = await RhinoManager.create(
            accessKey,
            "/path/to/context/file.rhn",
            inferenceCallback);
    } catch (err) {
        // handle error
    }
}
```
NOTE: the call is asynchronous and therefore should be called in an async block with a try/catch.

To use a context file in your React Native application you'll need to add the `.rhn` file to your platform projects. Android models must be added to `./android/app/src/main/assets/`, while iOS models can be added anywhere under `./ios`, but must be included as a bundled resource in your iOS (i.e. add via XCode) project. The paths used as initialization arguments are relative to these device-specific directories.

The `inferenceCallback` parameter is a function that you want to execute when Rhino makes an inference.
The function should accept a `RhinoInference` instance.

```javascript
inferenceCallback(object) {
    if (inference.isUnderstood) {
        // do something with:
        // inference.intent - string representing intent
        // inference.slots - Object<string, string> representing the slot values
    }
}
```

Rhino accepts the following optional parameters:
 - `modelPath`: path to a `.pv` file containing the model parameters for the speech-to-intent engine
 - `sensitivity`: overrides the default inference sensitivity.
 - `processErrorCallback`: called if there is a problem encountered while processing audio.
 - `endpointDurationSec`: sets how much silence is required after a spoken command.
 - `requireEndpoint`: indicates whether Rhino should wait for silence before returning an inference.

These optional parameters can be passed in like so:

```javascript
const accessKey = "${ACCESS_KEY}"; // AccessKey obtained from Picovoice Console (https://console.picovoice.ai/)

this._rhinoManager = await RhinoManager.create(
    accessKey,
    "/path/to/context.rhn",
    inferenceCallback,
    processErrorCallback,
    'path/to/model.pv',
    sensitivity,
    endpointDurationSec,
    requireEndpoint);
```

Once you have instantiated a RhinoManager, you can start audio capture and intent inference by calling:

```javascript
let didStart = await this._rhinoManager.process();
```

When RhinoManager returns an inference result via the `inferenceCallback`, it will automatically stop audio capture for you. When you wish to result, call `.process()` again.

Once your app is done with using RhinoManager, be sure you explicitly release the resources allocated for it:
```javascript
this._rhinoManager.delete();
```

With `RhinoManager`, the
[@picovoice/react-native-voice-processor](https://github.com/Picovoice/react-native-voice-processor/)
module handles audio capture and automatically passes it to the inference engine.

#### Low-Level API

[Rhino](https://github.com/Picovoice/rhino/blob/master/binding/react-native/src/rhino.tsx) provides low-level access to the inference engine for those
who want to incorporate speech-to-intent into an already existing audio processing pipeline.

`Rhino` is created by passing a context file to its static constructor `create`:

```javascript
const accessKey = "${ACCESS_KEY}"; // AccessKey obtained from Picovoice Console (https://console.picovoice.ai/)

async createRhino() {
    try {
        this._rhino = await Rhino.create(
            accessKey,
            "/path/to/context/file.rhn");
    } catch (err) {
        // handle error
    }
}
```
As you can see, in this case you don't pass in an inference callback as you will be passing in audio frames directly using the `process` function. The `RhinoInference` result that is returned from `process` will have up to four fields:

- isFinalized - true if Rhino has made an inference, false otherwise
- isUnderstood - **null** if `isFinalized` is false, otherwise true if Rhino understood what it heard based on the context or false if it did not
- intent - **null** if `isUnderstood` is not true, otherwise name of intent that were inferred
- slots - **null** if `isUnderstood` is not true, otherwise the dictionary of slot keys and values that were inferred

```javascript
let buffer = getAudioFrame();

try {
    let inference = await this._rhino.process(buffer);
    // inference result example:
    // if (inference.isFinalized) {
    //     if (inference.isUnderstood) {
    //          console.log(inference.intent)
    //          console.log(inference.slots)
    //     }
    // }
    }
} catch (e) {
    // handle error
}
```

For process to work correctly, the audio data must be in the audio format required by Picovoice.
The required audio format is found by calling `.sampleRate` to get the required sample rate and `.frameLength` to get the required frame size. Audio must be single-channel and 16-bit linearly-encoded.

Finally, once you no longer need the inference engine, be sure to explicitly release the resources allocated to Rhino:

```javascript
this._rhino.delete();
```

## Custom Context Integration

To add a custom context to your React Native application you'll need to add the `.rhn` file to your platform projects.

### Adding Android Models

Android custom models and contexts must be added to `./android/app/src/main/assets/`.

### Adding iOS Models

On iOS, contexts can be added anywhere under `./ios`, but they must be included as a bundled resource.
The easiest way to include a bundled resource in the iOS project is to:

1. Open XCode.
2. Either:
  - Drag and Drop the model/keyword file to the navigation tab.
  - Right click on the navigation tab, and click `Add Files To ...`.

This will bundle your models together when the app is built.

### Using Custom Context

Pass the file paths (relative to the assets/resource) directory:

```javascript
const accessKey = "${ACCESS_KEY}"

let contextPath: '';
if (Platform.OS === 'android') {
    contextPath = 'context_android.rhn'
} else if (Platform.OS === 'ios') {
    contextPath = 'context_ios.rhn'
} else {
    // handle errors
}

try {
    let rhino = await Rhino.create(accessKey, contextPath);
} catch (e) {
    // handle errors
}
```

Alternatively, if the context file is deployed to the device with a different method, the absolute path to the file on device can be used.

## Non-English Contexts

In order to run inference on non-English contexts you need to use the corresponding model file. The model files for all supported languages are available [here](https://github.com/Picovoice/rhino/tree/master/lib/common).

## Demo App

Check out the [Rhino React Native demo](https://github.com/Picovoice/rhino/tree/master/demo/react-native) to see what it looks like to use Rhino in a cross-platform app!
