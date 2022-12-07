# Rhino Binding for Flutter

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

* [accurate](https://picovoice.ai/docs/benchmark/nlu/)
* using deep neural networks trained in real-world environments.
* compact and computationally-efficient, making it perfect for IoT.
* self-service. Developers and designers can train custom models using [Picovoice Console](https://console.picovoice.ai/).

## Compatibility

This binding is for running Rhino on **Flutter 2.8.1+** on the following platforms:

- Android 5.0+ (API 21+)
- iOS 9.0+

## Installation

To start, you must have the [Flutter SDK](https://flutter.dev/docs/get-started/install) installed on your system. Once installed, you can run `flutter doctor` to determine any other missing requirements.

To add the Rhino plugin to your app project, you can reference it in your pub.yaml:
```yaml
dependencies:
  rhino_flutter: ^<version>
```

If you prefer to clone the repo and use it locally, first run `copy_resources.sh` (**NOTE:** on Windows, Git Bash or another bash shell is required, or you will have to manually copy the libs into the project.). Then you can reference the local binding location:
```yaml
dependencies:
  rhino_flutter:
    path: /path/to/rhino/flutter/binding
```

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

**NOTE:** When archiving for release on iOS, you may have to change the build settings of your project in order to prevent stripping of the Rhino library. To do this open the Runner project in XCode and change build setting Deployment -> Strip Style to 'Non-Global Symbols'.

## Usage

The module provides you with two levels of API to choose from depending on your needs.

#### High-Level API

[RhinoManager](https://picovoice.ai/docs/api/rhino-flutter/#rhinomanager) provides a high-level API that takes care of audio recording. This class is the quickest way to get started.

The constructor `RhinoManager.create` will create an instance of the RhinoManager using a context file that you pass to it.
```dart
import 'package:rhino/rhino_manager.dart';
import 'package:rhino/rhino_error.dart';

final String accessKey = '{ACCESS_KEY}'  // AccessKey obtained from Picovoice Console (https://console.picovoice.ai/)

void createRhinoManager() async {
    try{
        _rhinoManager = await RhinoManager.create(
            '/path/to/context/file.rhn',
            _inferenceCallback);
    } on RhinoException catch (err) {
        // handle rhino init error
    }
}
```
NOTE: the call is asynchronous and therefore should be called in an async block with a try/catch.

The `inferenceCallback` parameter is a function that you want to execute when Rhino makes an inference.
The function should accept a `RhinoInference` instance that represents the inference result.

```dart
void _inferenceCallback(RhinoInference inference) {
    if(inference.isUnderstood!){
        String intent = inference.intent!
        Map<String, String> slots = inference.slots!
        // add code to take action based on inferred intent and slot values
    }
    else {
        // add code to handle unsupported commands
    }
}
```

Rhino accepts the following optional parameters:
 - `sensitivity`: overrides the default inference sensitivity.
 - `processErrorCallback`: called if there is a problem encountered while processing audio.
 - `endpointDurationSec`: sets how much silence is required after a spoken command.
 - `requireEndpoint`: indicates whether Rhino should wait for silence before returning an inference.

```dart
final String accessKey = '{ACCESS_KEY}' // AccessKey obtained from Picovoice Console (https://console.picovoice.ai/)

_rhinoManager = await RhinoManager.create(
    accessCallback
    '/path/to/context/file.rhn',
    _inferenceCallback,
    modelPath: 'path/to/model/file.pv',
    sensitivity: 0.75,
    endpointDurationSec: 1.5,
    requireEndpoint: false,
    processErrorCallback: _errorCallback);

void _errorCallback(PvError error){
    // handle error
}
```

Once you have instantiated a RhinoManager, you can start audio capture and intent inference using the `.process()` function.
Audio capture stops and rhino resets once an inference result is returned via the inference callback.

```dart
try{
    await _rhinoManager.process();
} on RhinoException catch (ex) {
    // deal with either audio exception
}
```

Once your app is done with using RhinoManager, be sure you explicitly release the resources allocated for it:
```dart
await _rhinoManager.delete();
```

There is no need to deal with audio capture to enable inference with RhinoManager.
This is because it uses our [flutter_voice_processor](https://github.com/Picovoice/flutter-voice-processor/) Flutter plugin to capture frames of audio and automatically pass it to the speech-to-intent engine.

#### Low-Level API

[Rhino](https://picovoice.ai/docs/api/rhino-flutter/#rhino) provides low-level access to the inference engine for those who want to incorporate
speech-to-intent into an already existing audio processing pipeline.

`Rhino` is created by passing a context file to its static constructor `create`:

```dart
import 'package:rhino/rhino_manager.dart';
import 'package:rhino/rhino_error.dart';

final String accessKey = '{ACCESS_KEY}' // AccessKey obtained from Picovoice Console (https://console.picovoice.ai/)

void createRhino() async {
    try{
        _rhino = await Rhino.create(accessKey, '/path/to/context/file.rhn');
    } on PvError catch (err) {
        // handle rhino init error
    }
}
```

To feed Rhino your audio, you must send it frames of audio to its `process` function.
Each call to `process` will return a `RhinoInference` instance that with following variables:

- isFinalized - true if Rhino has made an inference, false otherwise
- isUnderstood - **null** if `isFinalized` is false, otherwise true if Rhino understood what it heard based on the context or false if it did not
- intent - **null** if `isUnderstood` is not true, otherwise name of intent that were inferred
- slots - **null** if `isUnderstood` is not true, otherwise the dictionary of slot keys and values that were inferred

```dart
List<int> buffer = getAudioFrame();

try {
    RhinoInference inference = await _rhino.process(buffer);
    if(inference.isFinalized){
        if(inference.isUnderstood!){
            String intent = inference.intent!
            Map<String, String> = inference.slots!
            // add code to take action based on inferred intent and slot values
        }
    }
} on RhinoException catch (error) {
    // handle error
}
```

For process to work correctly, the audio data must be in the audio format required by Picovoice.
The required audio format is found by calling `.sampleRate` to get the required sample rate and `.frameLength` to get the required frame size.
Audio must be single-channel and 16-bit linearly-encoded.

Finally, once you no longer need the speech-to-intent engine, be sure to explicitly release the resources allocated to Rhino:

```dart
_rhino.delete();
```

## Custom Context Integration

To add a custom context to your Flutter application, first add the rhn file to an `assets` folder in your project directory. Then add them to you your `pubspec.yaml`:
```yaml
flutter:
  assets:
    - assets/context.rhn
```

You can then pass it directly to Rhino's `create` constructor:
```dart
final String accessKey = '{ACCESS_KEY}' // AccessKey obtained from Picovoice Console (https://console.picovoice.ai/)

String contextAsset = 'assets/context.rhn'
try{
    _rhino = await Rhino.create(accessKey, contextAsset);
} on RhinoException catch (err) {
    // handle rhino init error
}
```

Alternatively, if the context file is deployed to the device with a different method, the absolute path to the file on device can be used.

## Non-English Contexts

In order to run inference on non-English contexts you need to use the corresponding model file. The model files for all supported languages are available [here](https://github.com/Picovoice/rhino/tree/master/lib/common).

## Demo App

Check out the [Rhino Flutter demo](https://github.com/Picovoice/rhino/tree/master/demo/flutter) to see what it looks like to use Rhino in a cross-platform app!
