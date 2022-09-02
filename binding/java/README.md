# Rhino Speech-to-Intent Engine

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


## Requirements

- Java 11+

## Compatibility

- Linux (x86_64)
- macOS (x86_64, arm64)
- Windows (x86_64)
- Raspberry Pi 2, Raspberry Pi 3 (32 and 64 bit), Raspberry Pi 4 (32 and 64 bit)
- Jetson Nano
- BeagleBone

## Installation

The latest Java bindings are available from the Maven Central Repository at:

```console
ai.picovoice:rhino-java:${version}
```

If you're using Gradle for your Java project, include the following line in your `build.gradle` file to add Rhino:
```console
implementation 'ai.picovoice:rhino-java:${version}'
```

If you're using IntelliJ, open the Project Structure dialog (`File > Project Structure`) and go to the `Libraries` section.
Click the plus button at the top to add a new project library and select `From Maven...`. Search for `ai.picovoice:rhino-java`
in the search box and add the latest version to your project.

## Build

To build from source, invoke the Gradle build task from the command-line:
```console
cd rhino/binding/java
./gradlew build
```

Once the task is complete, the output JAR can be found in `rhino/binding/java/build/libs`.

## AccessKey

Rhino requires a valid Picovoice `AccessKey` at initialization. `AccessKey` acts as your credentials when using Rhino SDKs.
You can get your `AccessKey` for free. Make sure to keep your `AccessKey` secret.
Signup or Login to [Picovoice Console](https://console.picovoice.ai/) to get your `AccessKey`.

## Usage

The easiest way to create an instance of the engine is with the Rhino Builder:

```java
import ai.picovoice.rhino.*;
final String accessKey = "${ACCESS_KEY}"; // AccessKey obtained from Picovoice Console (https://console.picovoice.ai/)
try{
    Rhino handle = new Rhino.Builder()
                    .setAccessKey(accessKey)
                    .setContextPath("/absolute/path/to/context")
                    .build();
} catch (RhinoException e) { }
```


Where the `setContextPath()` builder argument sets the absolute path to Speech-to-Intent context created either using
[Picovoice Console](https://console.picovoice.ai/) or one of the default contexts available on Rhino's GitHub repository.

The sensitivity of the engine can be tuned using the `setSensitivity` builder argument. It is a floating-point number within
[0, 1]. A higher sensitivity value results in fewer misses at the cost of (potentially) increasing the erroneous
inference rate.

```java
import ai.picovoice.rhino.*;
final String accessKey = "${ACCESS_KEY}"; // AccessKey obtained from Picovoice Console (https://console.picovoice.ai/)
try{
    Rhino handle = new Rhino.Builder()
                    .setAccessKey(accessKey)
                    .setContextPath("/absolute/path/to/context")
                    .setSensitivity(0.25f)
                    .build();
} catch (RhinoException e) { }
```

When initialized, the valid sample rate is given by `handle.getSampleRate()`. Expected frame length (number of audio samples
in an input array) is `handle.getFrameLength()`. The engine accepts 16-bit linearly-encoded PCM and operates on
single-channel audio.

```java
short[] getNextAudioFrame(){
    // .. get audioFrame
    return audioFrame;
}

while(true) {
    boolean isFinalized = handle.process(getNextAudioFrame());   
    if(isFinalized){
        RhinoInference inference = handle.getInference();
        if(inference.getIsUnderstood()){
            String intent = inference.getIntent();
            Map<string, string> slots = inference.getSlots();
            // .. code to take action based on inferred intent and slot values              
        } else {
            // .. code to handle unsupported commands
        }        
    }
}
```

Once you're done with Rhino, ensure you release its resources explicitly:

```java
handle.delete();
```

## Non-English Contexts

In order to run inference on non-English contexts you need to use the corresponding model file. The model files for all supported languages are available [here](../../lib/common).

## Demos

The [Rhino Java demo](../../demo/java) is a Java command-line application that allows for 
processing real-time audio (i.e. microphone) and files using Rhino.
