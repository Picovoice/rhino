# Rhino

[![GitHub release](https://img.shields.io/github/release/Picovoice/rhino.svg)](https://github.com/Picovoice/rhino/releases)

Made in Vancouver, Canada by [Picovoice](https://picovoice.ai)

Rhino is Picovoice's Speech-to-Intent engine. It directly infers intent from spoken commands within a given context of
interest, in real-time. For example, given a spoken command

>Can I have a small double-shot espresso?

Rhino infers that the user wants to order a drink with these specifications:

```json
{
  "type": "espresso",
  "size": "small",
  "numberOfShots": "2"
}
```

Rhino is:

- using deep neural networks trained in real-world environments.
- compact and computationally-efficient, making it perfect for IoT.
- cross-platform. It is implemented in fixed-point ANSI C. Raspberry Pi (all variants), Beagle Bone, Android, iOS,
  Linux (x86_64), Mac (x86_64), Windows (x86_64), and web browsers are supported. Furthermore, Support for various ARM
  Cortex-A microprocessors and ARM Cortex-M microcontrollers is available for enterprise customers.
- self-service. Developers and UX designers can train custom models using [Picovoice Console](https://picovoice.ai/console/).

## Table of Contents

- [License](#license)
- [Use Cases](#use-cases)
- [Try It Out](#try-it-out)
- [Performance](#performance)
- [Model Variants](#model-variants)
- [Terminology](#terminology)
- [Picovoice Console](#picovoice-console)
- [Structure of Repository](#structure-of-repository)
- [Running Demo Applications](#running-demo-applications)
  - [Python](#python-demos)
  - [.NET](#net-demos)
  - [Java](#java-demos)
  - [Android](#android-demos)
  - [iOS](#ios-demos)
  - [JavaScript](#javascript-demos)
  - [C](#c-demos)
- [Integration](#integration)
  - [Python](#python)
  - [.NET](#net)
  - [Java](#java)
  - [Android](#android)
  - [iOS](#ios)
  - [JavaScript](#javascript)
  - [C](#c)
- [Releases](#releases)
- [FAQ](#faq)

## License

This repository is licensed under Apache 2.0 which allows running the engine on all supported platforms
(except microcontrollers) using a set of freely-available [models](/resources/contexts). You may create custom models
using [Picovoice Console](https://picovoice.ai/console/).

There are two types of Picovoice Console accounts: Personal and Enterprise. Personal accounts empower researchers,
hobbyists, and tinkerers to experiment. Personal accounts are not permitted for any commercial usage, including internal
prototyping and proofs-of-concept. Enterprise accounts can unlock all capabilities of Picovoice Console, are permitted
for use in commercial settings, and have a path to graduate to commercial distribution. For more information check
[here](https://picovoice.ai/pricing/).

## Use Cases

Rhino should be used when the domain of voice interactions is specific (limited). Smart appliances, hearables,
infotainment systems, and automotive are a few examples.

- If you want to create voice experiences similar to Alexa or Google, check out
[Picovoice SDK](https://github.com/Picovoice/picovoice).
- If you need to recognize a few simple voice commands or activate a device using voice you should check out
  [Porcupine](https://github.com/Picovoice/porcupine).

## Try It Out

- [Interactive Web Demo](https://picovoice.ai/demos/barista/)

- [Picovoice Console](https://picovoice.ai/console/)

![Picovoice Console](resources/doc/console_rhino.gif)

- Rhino and [Porcupine](https://github.com/Picovoice/porcupine) on an ARM Cortex-M7

[![Rhino in Action](https://img.youtube.com/vi/WadKhfLyqTQ/0.jpg)](https://www.youtube.com/watch?v=WadKhfLyqTQ)

## Performance

A comparison between the accuracy of Rhino and major cloud-based alternatives is provided
[here](https://github.com/Picovoice/speech-to-intent-benchmark). Below is the summary of the benchmark:

![](resources/doc/benchmark.png)

## Model Variants

The library in this repository is the standard trim of the engine. The standard trim is suitable for applications running
on microprocessors (e.g. Raspberry Pi and BeagleBone) and mobile devices (Android and iOS). Picovoice has developed
several trims of the engine targeted at a wide range of applications. These are only available to enterprise customers.

## Terminology

Rhino infers the user's intent from spoken commands within a domain of interest. We refer to such a specialized domain as
a **context**. A context can be thought of a set of voice commands each mapped to an intent:

```yaml
turnOff:
  - Turn off the lights in the office
  - Turn off all lights
setColor:
  - Set the kitchen lights to blue
lowerIntensity:
  - Dim the lights
  - Make the lights darker
```

In examples above, each voice command is called an **expression**. Expressions are what we expect the user to utter
to interact with our voice application.

Consider the expression _"Turn off the lights in the office"_. What we require from Rhino is:

1. To infer the intent ("turnOff")
2. Record the specific details from the utterance, in this case the location ("office")

We can capture these details using slots by updating the expression:

```yaml
turnOff:
  - Turn off the lights in the $location:lightLocation.
```

`$location:lightLocation` means that we expect a variable of type `location` to occur and we want to capture its value
in a variable named `lightLocation`. We call such variable a **slot**. Slots give us the ability to capture details of the
spoken commands. Each slot type is be defined as a set of phrases. For example:

```yaml
lightLocation:
  - "attic"
  - "balcony"
  - "basement"
  - "bathroom"
  - "bedroom"
  - "entrance"
  - "kitchen"
  - "living room"
  - ...
```

You can create custom contexts using the [Picovoice Console](https://picovoice.ai/console/).

To learn the complete expression syntax of Rhino, see the [Speech-to-Intent Syntax Cheat Sheet](https://picovoice.ai/docs/syntax-cheat-sheet/).

## Picovoice Console

The [Picovoice Console](https://picovoice.ai/console/) enables creating Speech-to-Intent contexts. The Console is a web-based
platform for building voice applications and training models.

## Structure of Repository

If using SSH, clone the repository with:

```bash
git clone --recurse-submodules git@github.com:Picovoice/rhino.git
```

If using HTTPS, then type:

```bash
git clone --recurse-submodules https://github.com/Picovoice/rhino.git
```

Rhino is shipped as an ANSI C shared library. The binary files for supported platforms are located under [lib](/lib)
and header files are at [include](/include). Bindings are available at [binding](/binding) to facilitate usage from
higher-level languages. Demo applications are at [demo](/demo). Finally, [resources](resources) is a placeholder for
data used by various applications within the repository.

## Running Demo Applications

### Python Demos

This [demo application](/demo/python/rhino_porcupine_demo_mic.py) allows testing Rhino using your computer's microphone. It opens
an input audio stream, monitors it using our [Porcupine](https://github.com/Picovoice/porcupine) wake word detection
engine, and when the wake phrase is detected it will extract the intent within the follow-up spoken command using Rhino.

The following command runs the demo application on your machine to infer intent from spoken commands in the context of a
smart lighting system. It also initializes the Porcupine engine to detect the wake phrase "Picovoice". When running you
can issue commands such as "Picovoice, turn on the lights".

```bash
python3 demo/python/rhino_porcupine_demo_mic.py \
--rhino_context_file_path ./resources/contexts/${SYSTEM}/smart_lighting_${SYSTEM}.rhn
```

In the above command replace `${SYSTEM}` with your platform name (e.g. linux, mac, raspberry-pi).

### .NET Demos

The [Rhino dotnet demo](/demo/dotnet) is a command line application that lets you choose between running Rhino on a
audio file or on real-time microphone input.

The following command runs the demo application on your machine to infer intent from spoken commands in the context of a
smart lighting system:

```bash
dotnet run -c MicDemo.Release -- --context_path ./resources/contexts/${SYSTEM}/smart_lighting_${SYSTEM}.rhn
```

### Java Demos

The [Rhino Java demo](/demo/java) is a command-line application that lets you choose between running Rhino on a
audio file or on real-time microphone input.

The following command uses the Java demo to run inference on an audio file in context of a smart coffee maker:

```bash
java -jar rhino-file-demo.jar -i ${AUDIO_PATH} -c ./resources/contexts/${SYSTEM}/coffee_maker_${SYSTEM}.rhn
```

### Android Demos

Using Android Studio, open [demo/android/Activity](/demo/android/Activity) as an Android project and then run the
application. Note that you will need an Android phone (with developer options enabled) connected to your machine. After
pressing the start button you can issue commands such as "turn off the lights" or "set the lights in the living room to purple".

### iOS Demos

Using [Xcode](https://developer.apple.com/xcode/), open
[demo/ios/RhinoDemo/RhinoDemo.xcodeproj](/demo/ios/RhinoDemo/RhinoDemo.xcodeproj) and run the application. You will
need an iOS device connected to your machine and a valid Apple developer account. After pressing the start button you can
issue commands such as "turn off the lights".

### JavaScript Demos

You need `yarn` or `npm`. Install the demo dependencies by executing either of the following sets of `yarn` or `npm` commands from
[demo/javascript/](/demo/javascript/).

#### Yarn

```bash
yarn
yarn start
```

#### NPM

```bash
npm install
npm install -g copy-files-from-to
copy-files-from-to
npx serve
```

#### Web Browser

The last command will launch a local server running the demo. Open http://localhost:5000 in your web browser and follow the instructions on the page.

### C Demos

[This demo](/demo/c/rhino_demo_mic.c) runs on Linux-based systems (e.g. Ubuntu, Raspberry Pi, and BeagleBone). You need
`GCC` and `ALSA` installed to compile it. Compile the demo using

```bash
gcc -O3 -o demo/c/rhino_demo_mic -I include -I resources/porcupine/include/ demo/c/rhino_demo_mic.c \
-ldl -lasound -std=c99
```

Find the name of audio input device (microphone) on your computer using `arecord -L`. Finally execute the following

```bash
demo/c/rhino_demo_mic \
${RHINO_LIBRARY_PATH} \
lib/common/rhino_params.pv \
resources/contexts/${SYSTEM}/smart_lighting_${SYSTEM}.rhn \
${PORCUPINE_LIBRARY_PATH} \
resources/porcupine/lib/common/porcupine_params.pv \
resources/porcupine/resources/keyword_files/${SYSTEM}/picovoice_${SYSTEM}.ppn \
${INPUT_AUDIO_DEVICE}
```

Replace `${RHINO_LIBRARY_PATH}` with path to appropriate library available under [lib](/lib), `${SYSTEM}` with the
name of the operating system on your machine (e.g. linux or raspberry-pi), `${PORCUPINE_LIBRARY_PATH}` with path to appropriate
Porcupine library available under [resources/porcupine/lib](/resources/porcupine/lib) and `${INPUT_AUDIO_DEVICE}` with
the name of your microphone device. The demo opens an audio stream and detects utterances of keyword "Picovoice"
followed by spoken commands for a smart lighting system. For example you can say "Picovoice, turn on the lights".

## Integration

Below are code snippets showcasing how Rhino can be integrated into different applications.

### Python

[rhino.py](/binding/python/rhino.py) provides a Python binding for Rhino library. Below is a quick demonstration of how
to initialize an instance:

```python
library_path = ... # absolute path to Rhino's dynamic library
model_file_path = ... # available at lib/common/rhino_params.pv
context_file_path = ... # absolute path to context file for the domain of interest

rhino = Rhino(
    library_path=library_path,
    model_path=model_file_path,
    context_path=context_file_path)
```

When initialized, valid sample rate can be obtained using `rhino.sample_rate`. Expected frame length
(number of audio samples in an input array) is `rhino.frame_length`. The object can be used to infer intent from spoken
commands as below:

```python
def get_next_audio_frame():
    pass

while True:
    is_finalized = rhino.process(get_next_audio_frame())

    if is_finalized:
        if rhino.is_understood():
            intent, slot_values = rhino.get_intent()
            # add code to take action based on inferred intent and slot values
        else:
            # add code to handle unsupported commands
            pass

        rhino.reset()
```

Finally, when done, be sure to explicitly release the resources; the binding class does not rely on the garbage
collector.

```python
rhino.delete()
```

### .NET

Install the .NET SDK using Nuget or the dotnet CLI

```bash
dotnet add package Rhino
```

The SDK exposes a factory method to create instances of the engine as below:

```csharp
using Rhino

Rhino handle = Rhino.Create(contextPath:"/absolute/path/to/context");
```

When initialized, the valid sample rate is given by `handle.SampleRate`. Expected frame length (number of audio samples
in an input array) is `handle.FrameLength`. The engine accepts 16-bit linearly-encoded PCM and operates on
single-channel audio.

```csharp
short[] GetNextAudioFrame()
{
    // .. get audioFrame
    return audioFrame;
}

while(true)
{
    bool isFinalized = handle.Process(GetNextAudioFrame());
    if(isFinalized)
    {
        Inference inference = handle.GetInference();
        if(inference.IsUnderstood)
        {
            string intent = inference.Intent;
            Dictionary<string, string> slots = inference.Slots;
            // .. code to take action based on inferred intent and slot values
        }
        else
        {
            // .. code to handle unsupported commands
        }
    }
}
```

Rhino will have its resources freed by the garbage collector, but to have resources freed
immediately after use, wrap it in a using statement:

```csharp
using(Rhino handle = Rhino.Create(contextPath:"/absolute/path/to/context"))
{
    // .. Rhino usage here
}
```

### Java

You can install the Rhino Java SDK by downloading and referencing the latest [Rhino JAR file](/binding/java/bin).

The SDK exposes a Builder that allows you to create an instance of the engine:

```java
import ai.picovoice.rhino.*;

try{
    Rhino handle = new Rhino.Builder()
                    .setContextPath("/absolute/path/to/context")
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

### Android

Rhino provides a binding for Android using JNI. It can be initialized using:

```java
    final String modelPath = ... // It is available at lib/common/rhino_params.pv
    final String contextPath = ...
    final float sensitivity = 0.5;

    Rhino rhino = new Rhino(modelPath, contextPath, sensitivity);
```

Once initialized, `rhino` can be used for intent inference:

```java
    private short[] getNextAudioFrame();

    while (!rhino.process(getNextAudioFrame()));

    final RhinoInference inference = rhino.getInference();
    if (inference.getIsUnderstood()) {
        // logic to perform an action given the intent object.
    } else {
        // logic for handling out of context or unrecognized command
    }
```

Finally, prior to exiting the application be sure to release resources acquired via:

```java
    rhino.delete()
```

### iOS

The [RhinoManager](binding/ios/rhino_manager.swift) class manages all activities related to creating an input audio stream
feeding it into Rhino's library, and invoking a user-provided detection callback. The class can be initialized as below

```swift
let modelFilePath: String = ... // It is available at lib/common/rhino_params.pv
let contextFilePath: String = ...
let onInferenceCallback: ((InferenceInfo) -> Void) = {
    // detection event callback
}

let manager = RhinoManager(modelFilePath: modelFilePath, contextFilePath: contextFilePath, onInferenceCallback: onInferenceCallback);
```

when initialized, input audio can be processed using `manager.startListening()`.

### JavaScript

Create a new instance of engine using

```javascript
let context = new Uint8Array([...]);

let handle = Rhino.create(context)
```

`context` is an array of 8-bit unsigned integers (i.e. `UInt8Array`) representing the domain of interest. When
instantiated `handle` can process audio via its `.process` method.

```javascript
    let getNextAudioFrame = function() {
        ...
    };

    let result = {};
    do {
        result = handle.process(getNextAudioFrame())
    } while (Object.keys(result).length === 0);

    if (result.isUnderstood) {
        // callback to act upon inference result
    } else {
        // callback to handle failed inference
    }
```

When done be sure to release resources acquired by WebAssembly using `.release`.

```javascript
handle.release();
```

### C

Rhino is implemented in ANSI C and therefore can be directly linked to C applications. The [pv_rhino.h](/include/pv_rhino.h)
header file contains relevant information. An instance of the Rhino object can be constructed as follows.

```c
const char *model_file_path = ... // available at lib/common/rhino_params.pv
const char *context_file_path = ... // absolute path to context file for the domain of interest

pv_rhino_t *rhino;
const pv_status_t status = pv_rhino_init(model_file_path, context_file_path, &rhino);
if (status != PV_STATUS_SUCCESS) {
    // add error handling code
}
```

Now the handle `rhino` can be used to infer intent from an incoming audio stream. Rhino accepts single channel, 16-bit PCM
audio. The sample rate can be retrieved using `pv_sample_rate()`. Finally, Rhino accepts input audio in consecutive chunks
(frames); the length of each frame can be retrieved using `pv_rhino_frame_length()`.

```c
extern const int16_t *get_next_audio_frame(void);

while (true) {
    const int16_t *pcm = get_next_audio_frame();

    bool is_finalized;
    pv_status_t status = pv_rhino_process(rhino, pcm, &is_finalized);
    if (status != PV_STATUS_SUCCESS) {
        // add error handling code
    }

    if (is_finalized) {
        bool is_understood;
        status = pv_rhino_is_understood(rhino, &is_understood);
        if (status != PV_STATUS_SUCCESS) {
            // add error handling code
        }

        if (is_understood) {
            const char *intent;
            int num_slots;
            const char **slots;
            const char **values;
            status = pv_rhino_get_intent(rhino, &intent, &num_slots, &slots, &values);
            if (status != PV_STATUS_SUCCESS) {
                // add error handling code
            }

            // add code to take action based on inferred intent and slot values

            pv_rhino_free_slots_and_values(rhino, slots, values);
        } else {
            // add code to handle unsupported commands
        }

        pv_rhino_reset(rhino);
    }
}
```

When done, remember to release the resources acquired.

```c
pv_rhino_delete(rhino);
```

## Releases

### v1.5.0 June 4th, 2020

- Accuracy improvements.

### v1.4.0 April 13th, 2020

- Accuracy improvements.
- Builtin slots

### v1.3.0 February 13th, 2020

- Accuracy improvements.
- Runtime optimizations.
- Added support for Raspberry Pi 4
- Added support for JavaScript.
- Added support for iOS.
- Updated documentation.

### v1.2.0 April 26, 2019

- Accuracy improvements.
- Runtime optimizations.

### v1.1.0 December 23rd, 2018

- Accuracy improvements.
- Open-sourced Raspberry Pi build.

### v1.0.0 November 2nd, 2018

- Initial Release

## FAQ
You can find the FAQ [here](https://picovoice.ai/docs/faq/rhino/).