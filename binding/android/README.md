# Rhino Binding for Android

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
* self-service. Developers and designers can train custom models using [Picovoice Console](https://picovoice.ai/console/).

## Installation

Rhino can be found on Maven Central. To include the package in your Android project, ensure you have included `mavenCentral()` in your top-level `build.gradle` file and then add the following to your app's `build.gradle`:

```groovy
dependencies {
    // ...
    implementation 'ai.picovoice:rhino-android:${LATEST_VERSION}'
}
```

## AccessKey

All bindings require a valid Picovoice `AccessKey` at initialization. `AccessKey`s act as your credentials when using Porcupine SDKs.
You can create your `AccessKey` for free. Make sure to keep your `AccessKey` secret.

To obtain your `AccessKey`:
1. Login or Signup for a free account on the [Picovoice Console](https://picovoice.ai/console/).
2. Once logged in, go to the [`AccessKey` tab](https://console.picovoice.ai/access_key) to create one or use an existing `AccessKey`.

## Permissions

To enable recording with your Android device's microphone you must add the following line to your `AndroidManifest.xml` file:
```xml
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.INTERNET" />
```

## Usage

The module provides you with two levels of API to choose from depending on your needs.

### High-Level API

[RhinoManager](/binding/android/Rhino/rhino/src/main/java/ai/picovoice/rhino/RhinoManager.java) provides a high-level API that takes care of audio recording and intent inference. This class is the quickest way to get started.

To create an instance of RhinoManager, use the RhinoManager Builder:
```java
import ai.picovoice.rhino.*;

final String accessKey = "${ACCESS_KEY}"; // AccessKey obtained from Picovoice Console (https://picovoice.ai/console/)

try {
    RhinoManager rhinoManager = new RhinoManager.Builder()
                        .accessKey(accessKey)
                        .setContextPath("assets_sub_folder/context.rhn")
                        .build(appContext, inferenceCallback);
} catch (RhinoException e) { }
```

The context file is an .rhn file obtained from the [Picovoice Console](https://picovoice.ai/console/) that you can store in your Android assets folder (`src/main/assets`) and pass into the Rhino Builder. The `appContext` parameter is the Android application context - this is used to extract Rhino resources from the APK. The `inferenceCallback` parameter is a `RhinoManagerCallback` that will be invoked when Rhino has returned an inference result.
The callback should accept a `RhinoInference` object that will contain the inference results.

```java
RhinoManagerCallback inferenceCallback = new RhinoManagerCallback() {
            @Override
            public void invoke(RhinoInference inference) {
                if (inference.getIsUnderstood()) {
                    final String intent = inference.getIntent()));
                    final Map<String, String> slots = inference.getSlots();
                    // add code to take action based on inferred intent and slot values
                }
                else {
                    // add code to handle unsupported commands
                }   
            }
}
```

You can override the default Rhino model file and/or the inference sensitivity. 

Sensitivity is the parameter that enables trading miss rate for the false alarm rate. It is a floating-point number within [0, 1]. A higher sensitivity reduces the miss rate at the cost of increased false alarm rate. 

The model file contains the parameters for the speech-to-intent engine. To change the language that Rhino understands, you'll pass in a different model file. This should also be placed in the `assets` folder. 

There is also the option to pass an error callback, which will be invoked if an error is encountered while RhinoManager is processing audio.

RequireEndpoint is the parameter which indicates if Rhino should wait for a silence before inferring context. Default is set to true.

These optional parameters can be set through the Builder functions `setModelPath`, `setSensitivity`, `setErrorCallback` and `setRequireEndpoint`:
```java
import ai.picovoice.rhino.*;

final String accessKey = "${ACCESS_KEY}"; // AccessKey obtained from Picovoice Console (https://picovoice.ai/console/)

try {
    RhinoManager rhinoManager = new RhinoManager.Builder()
                        .setAccessKey(accessKey)
                        .setContextPath("assets_sub_folder/context.rhn")
                        .setModelPath("assets_sub_folder/model.pv")
                        .setSensitivity(0.35f)
                        .setErrorCallback(new RhinoManagerErrorCallback() {
                            @Override
                            public void invoke(RhinoExcpetion e) {
                                // process error
                            }
                        })                
                        .setRequireEndpoint(false)        
                        .build(context, inferenceCallback);
} catch (RhinoException e) { }
```

Once you have instantiated a RhinoManager, you can start audio capture and intent inference using the `.process()` function.
Audio capture stops and rhino resets once an inference result is returned via the inference callback. 

```java
rhinoManager.process();
```

Once the app is done with using an instance of RhinoManager, be sure you explicitly release the resources allocated to Rhino:
```java
rhinoManager.delete();
```

### Low-Level API

[Rhino](/binding/android/Rhino/rhino/src/main/java/ai/picovoice/rhino/Rhino.java) provides low-level access to the Speech-To-Intent engine for those who want to incorporate intent inference into an already existing audio processing pipeline.

`Rhino` uses a Builder pattern to construct instances. You must pass a context file via the `setContextPath` function.

```java
import ai.picovoice.rhino.*;

final String accessKey = "${ACCESS_KEY}"; // AccessKey obtained from Picovoice Console (https://picovoice.ai/console/)

try {    
    Rhino rhino = new Rhino.Builder()
                        .setAccessKey(accessKey)
                        .setContextPath("assets_sub_folder/file.rhn")
                        .build(appContext);
} catch (RhinoException e) { }
```

To feed Rhino your audio, you must send it frames of audio to its `process` function. The function returns a boolean indicating whether it has an inference ready or not. When it returns true, call `getInference` to get a `RhinoInference` object with the following structure:

- `getIsUnderstood()` - whether Rhino understood what it heard based on the context
- `getIntent()` - if understood, name of intent that were inferred
- `getSlots()` - if understood, dictionary of slot keys and values that were inferred

The process loop would look something like this:
```java
short[] getNextAudioFrame(){
    // .. get audioFrame
    return audioFrame;
}

while(true) {
    try {
        boolean isFinalized = rhino.process(getNextAudioFrame());
        if (isFinalized) {
            RhinoInference inference = rhino.getInference();
            if (inference.getIsUnderstood()) {
                final String intent = inference.getIntent();
                final Map<String, String> slots = inference.getSlots();
                // add code to take action based on inferred intent and slot values
            }
            else {
                // add code to handle unsupported commands
            }
        }
    } catch (RhinoException e) { }
}
```

For process to work correctly, the audio data must be in the audio format required by Picovoice.
The required audio format is found by calling `.getSampleRate()` to get the required sample rate and `.getFrameLength()` to get the required number of samples per input frame. Audio must be single-channel and 16-bit linearly-encoded.

Once you're done with Rhino, ensure you release its resources explicitly:
```java
rhino.delete();
```

## Custom Context Integration

To add a custom context or model file to your application, add the files to your assets folder (`src/main/assets`) and then pass the path to the Rhino Builder:


```java
// in this example our files are located at '/assets/picovoice_files/context.rhn' and '/assets/picovoice_files/model.pv' 
try {    
    Rhino rhino = new Rhino.Builder()
                        .setContextPath("picovoice_files/context.rhn")
                        .setModelPath("picovoice_files/model.pv")
                        .build(appContext);
} catch (RhinoException e) { }
```

## Non-English Contexts

In order to run inference on non-English contexts you need to use the corresponding model file. The model files for all supported languages are available [here](/lib/common).

## Demo App

For example usage refer to the [Rhino Activity demo](/demo/android/Activity).
