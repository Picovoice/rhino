# Rhino Binding for React Native

## Rhino Speech-to-Intent Engine

Made in Vancouver, Canada by [Picovoice](https://picovoice.ai)

Rhino is Picovoice's Speech-to-Intent engine. It directly infers intent from spoken commands within a given context of
interest, in real-time. For example, given a spoken command *"Can I have a small double-shot espresso with a lot of sugar
 and some milk"*, Rhino infers that the user wants to order a drink with these specifications:

```json
{
  "type": "espresso",
  "size": "small",
  "numberOfShots": "2",
  "sugar": "a lot",
  "milk": "some"
}
```

Rhino is:

* using deep neural networks trained in real-world environments.
* compact and computationally-efficient, making it perfect for IoT.
* self-service. Developers and designers can train custom models using [Picovoice Console](https://picovoice.ai/console/).

## Compatibility

This binding is for running Rhino on **React Native 0.62.2+** on the following platforms:

- Android 4.1+ (API 16+)
- iOS 9.0+

## Installation

To start install be sure you have installed yarn and cocoapods. Then add these two native modules to your react-native project.

```sh
yarn add @picovoice/react-native-voice-processor
yarn add @picovoice/rhino-react-native
```
or
```sh
npm i @picovoice/react-native-voice-processor --save
npm i @picovoice/rhino-react-native --save
```

Link the iOS package

```sh
cd ios && pod install && cd ..
```

**NOTE**: Due to a limitation in React Native CLI autolinking, these two native modules cannot be included as transitive depedencies. If you are creating a module that depends on rhino-react-native and/or react-native-voice-processor, you will have to list these as peer dependencies and require developers to install them alongside.

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

[RhinoManager](/binding/react-native/src/rhinomanager.tsx) provides a high-level API that takes care of
audio recording. This class is the quickest way to get started.

The constructor `RhinoManager.create` will create an instance of a RhinoManager using a context file that you pass to it.
```javascript
async createRhinoManager(){
    try{
        this._rhinoManager = await RhinoManager.create(
            '/path/to/context/file.rhn',
            inferenceCallback);
    } catch (err) {
        // handle error
    }
}
```
NOTE: the call is asynchronous and therefore should be called in an async block with a try/catch.

The `inferenceCallback` parameter is a function that you want to execute when Rhino makes an inference.
The function should accept an object, which will be a JSON representation of the inference.

```javascript
inferenceCallback(object){
    console.log(JSON.stringify(inference));
}
```

You can override also the default Rhino model file and/or the inference sensitivity.
These optional parameters can be passed in like so:
```javascript
this._rhinoManager = await RhinoManager.create(
    "/path/to/context/file.rhn",
    inferenceCallback,
    'path/to/model/file.pv',
    0.25);
```

Once you have instantiated a RhinoManager, you can start audio capture and intent inference by calling:

```javascript
this._rhinoManager.process();
```

When RhinoManager returns an inference result via the inferenceCallback, it will automatically stop audio capture for you. When you wish to result, call `.process()` again.

Once your app is done with using RhinoManager, be sure you explicitly release the resources allocated for it:
```javascript
this._rhinoManager.delete();
```

As you may have noticed, there is no need to deal with audio capture to enable intent inference with RhinoManager.
This is because it uses our
[@picovoice/react-native-voice-processor](https://github.com/Picovoice/react-native-voice-processor/)
module to capture frames of audio and automatically pass it to the inference engine.

#### Low-Level API

[Rhino](/binding/react-native/src/rhino.tsx) provides low-level access to the inference engine for those
who want to incorporate speech-to-intent into a already existing audio processing pipeline.

`Rhino` is created by passing a context file to its static constructor `create`:

```javascript
async createRhino(){
    try{
        this._rhino = await Rhino.create('/path/to/context/file.rhn');
    } catch (err) {
        // handle error
    }
}
```
As you can see, in this case you don't pass in an inference callback as you will be passing in audio frames directly using the `process` function. The JSON result that is returned from `process` will have up to four fields:
- isFinalized - whether Rhino has made an inference
- isUnderstood - if isFinalized, whether Rhino understood what it heard based on the context
- intent - if isUnderstood, name of intent that were inferred
- slots - if isUnderstood, dictionary of slot keys and values that were inferred

```javascript
let buffer = getAudioFrame();

try {
    let result = await this._rhino.process(buffer);   
    // inference result example:
    //   {
    //     isFinalized: true,
    //     isUnderstood: true,
    //     intent: 'orderDrink',
    //     slots: {
    //       size: 'medium',
    //       coffeeDrink: 'americano',
    //       sugarAmount: 'some sugar'
    //     }
    //   }
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

## Demo App

Check out the [Rhino React Native demo](/demo/react-native) to see what it looks like to use Rhino in a cross-platform app!


