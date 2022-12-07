# Rhino Binding for iOS

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

## Installation

The Rhino iOS binding is available via [CocoaPods](https://cocoapods.org/pods/Rhino-iOS). To import it into your iOS project, add the following line to your Podfile and run `pod install`: 

```ruby
pod 'Rhino-iOS'
```

## AccessKey

Rhino requires a valid Picovoice `AccessKey` at initialization. `AccessKey` acts as your credentials when using Rhino SDKs.
You can get your `AccessKey` for free. Make sure to keep your `AccessKey` secret.
Signup or Login to [Picovoice Console](https://console.picovoice.ai/) to get your `AccessKey`.

## Permissions

To enable recording with your iOS device's microphone you must add the following to your app's `Info.plist` file:
```xml
<key>NSMicrophoneUsageDescription</key>
<string>[Permission explanation]</string>
```

## Usage

The module provides you with two levels of API to choose from depending on your needs.

### High-Level API

[RhinoManager](./RhinoManager.swift) provides a high-level API that takes care of audio recording and intent inference. This class is the quickest way to get started.

To create an instance of RhinoManager, pass a Picovoice `AccessKey` and a Rhino context file to the constructor:
```swift
import Rhino

let accessKey = "${ACCESS_KEY}" // Obtained from Picovoice Console (https://console.picovoice.ai)
do {
    let rhinoManager = try RhinoManager(
        accessKey: accessKey,
        contextPath: "/path/to/context/file.rhn", 
        onInferenceCallback: inferenceCallback)
} catch { }
```

The `onInferenceCallback` parameter is function that will be invoked when Rhino has returned an inference result.
The callback should accept a `Inference` object that will contain the inference results.
```swift
let inferenceCallback: ((Inference) -> Void) = { inference in
                if inference.isUnderstood {
                    let intent:String = inference.intent
                    let slots:Dictionary<String,String> = inference.slots
                    // use inference results
                }
            }
}
```

You can override the default Rhino model file and/or the inference sensitivity. 

Sensitivity is the parameter that enables trading miss rate for the false alarm rate. It is a floating-point number within [0, 1]. A higher sensitivity reduces the miss rate at the cost of increased false alarm rate. 

The model file contains the parameters for the speech-to-intent engine. To change the language that Rhino understands, you'll pass in a different model file. 

These optional parameters can be set like so:
```swift
let accessKey = "${ACCESS_KEY}" // Obtained from Picovoice Console (https://console.picovoice.ai)
do {
    let rhinoManager = try RhinoManager(
        accessKey: accessKey,
        contextPath: "/path/to/context/file.rhn", 
        modelPath: "/path/to/model/file.pv",
        sensitivity: 0.35,
        onInferenceCallback: inferenceCallback)
} catch { }
```

Once you have instantiated a RhinoManager, you can start audio capture and intent inference using the `.process()` function.
Audio capture stops and rhino resets once an inference result is returned via the inference callback. 

```swift
do {
    try rhinoManager.process()
} catch { }
```

Once the app is done with using an instance of RhinoManager you can release the native resources manually rather than waiting for the garbage collector:
```swift
rhinoManager.delete()
```

### Low-Level API

[Rhino](./Rhino.swift) provides low-level access to the Speech-to-Intent engine for those who want to incorporate intent inference into an already existing audio processing pipeline.

Create an instance of `Rhino` by passing it a Picovoice `AccessKey` and a Rhino context file (.rhn).

```swift
import Rhino

let accessKey = "${ACCESS_KEY}" // Obtained from Picovoice Console (https://console.picovoice.ai)
do {
    let rhino = try Rhino(
        accessKey: accessKey,
        contextPath: "/path/to/context/file.rhn")
} catch { }
```

To feed Rhino your audio, you must send frames of audio to its `process` function. The function returns a boolean indicating whether it has an inference ready or not. When it returns true, call `getInference` to get a `Inference` object with the following structure:

- `.isUnderstood` - whether Rhino understood what it heard based on the context
- `.intent` - if understood, name of intent that were inferred
- `.slots` - if understood, dictionary of slot keys and values that were inferred

The process loop would look something like this:
```swift
func getNextAudioFrame() -> [Int16] {
    // .. get audioFrame
    return audioFrame
}

while true {
    do {
        let isFinalized = try rhino.process(getNextAudioFrame())
        if isFinalized {
            let inference = try rhino.getInference()
            if inference.isUnderstood {
                let intent:String = inference.intent
                let slots:Dictionary<String, String> = inference.slots
                // add code to take action based on inferred intent and slot values
            }
        }
    } catch { }
}
```

For process to work correctly, the audio data must be in the audio format required by Picovoice.
The required audio format is using `Rhino.sampleRate` to get the required sample rate and `Rhino.frameLength` to get the required number of samples per input frame. Audio must be single-channel and 16-bit linearly-encoded.

Once you're done with Rhino, you can force it to release its native resources rather than waiting for the garbage collector:
```swift
rhino.delete()
```

## Custom Context Integration

To add a custom context to your iOS application you must include it in your app as a bundled resource (found by selecting in Build Phases > Copy Bundle Resources). Then in code, get its path like so:

```swift
// file is called context_ios.rhn
let contextPath = Bundle.main.path(forResource: "context_ios", ofType: "rhn")
```

Alternatively, if the context file is deployed to the device with a different method, the absolute path to the file on device can be used.

## Non-English Contexts

In order to run inference on non-English contexts you need to use the corresponding model file. The model files for all supported languages are available [here](../../lib/common).

## Running Unit Tests

Copy your `AccessKey` into the `accessKey` variable in [`RhinoAppTestUITests.swift`](RhinoAppTest/RhinoAppTestUITests/RhinoAppTestUITests.swift). Open `RhinoAppTest.xcworkspace` with XCode and run the tests with `Product > Test`.

## Demo App

For example usage refer to the [Rhino iOS demo app](../../demo/ios).
