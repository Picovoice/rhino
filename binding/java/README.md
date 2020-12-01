# Rhino Speech-to-Intent Engine

Made in Vancouver, Canada by [Picovoice](https://picovoice.ai)

Rhino is Picovoice's Speech-to-Intent engine. It directly infers intent from spoken commands within a given context of
interest, in real-time. For example, given a spoken command *"Can I have a small double-shot espresso?"*, Rhino infers that the user wants to order a drink with these specifications:

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

## Compatibility

- Java 11+
- Runs on Linux (x86_64), macOS (x86_64) and Windows (x86_64)

## Installation

You can install the Rhino Java SDK by downloading and referencing the latest [Rhino JAR file](/binding/java/bin).

## Build

To build from source, we recommend using the [IntelliJ IDE](https://www.jetbrains.com/idea/download/). Open the .iml file with IntelliJ and
click "Build > Build Project" to build or "Build > Build Artifacts" to package as a JAR file.

## Usage

The easiest way to create an instance of the engine is with the Rhino Builder:

```java
import ai.picovoice.rhino.*;

try{
    Rhino handle = new Rhino.Builder()
                    .setContextPath("/absolute/path/to/context")
                    .build();
} catch (RhinoException e) { }
```


Where the `setContextPath()` builder argument sets the absolute path to Speech-to-Intent context created either using
[Picovoice Console](https://picovoice.ai/console/) or one of the default contexts available on Rhino's GitHub repository.

The sensitivity of the engine can be tuned using the `setSensitivity` builder argument. It is a floating-point number within
[0, 1]. A higher sensitivity value results in fewer misses at the cost of (potentially) increasing the erroneous
inference rate.

```java
import ai.picovoice.rhino.*;

try{
    Rhino handle = new Rhino.Builder()
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

## Demos

The [Rhino Java demo](/demo/java) is a Java command-line application that allows for 
processing real-time audio (i.e. microphone) and files using Rhino.