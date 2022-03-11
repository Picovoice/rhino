# Rhino Speech-to-Intent Engine Demos

Made in Vancouver, Canada by [Picovoice](https://picovoice.ai)

This package contains Java command-line demos for processing real-time audio (i.e. microphone) and audio files
using Rhino Speech-to-Intent engine.

## Rhino

Rhino is Picovoice's Speech-to-Intent engine. It directly infers intent from spoken commands within a given context of
interest, in real-time. For example, given a spoken command

>Can I have a small double-shot espresso?

Rhino infers that the user wants to order a drink and emits the following inference result:

```json
{
  "isUnderstood": "true",
  "intent": "orderBeverage",
  "slots": {
    "beverage": "espresso",
    "size": "small",
    "numberOfShots": "2"
  }
}
```

Rhino is:

- using deep neural networks trained in real-world environments.
- compact and computationally-efficient. It is perfect for IoT.
- self-service. Developers can train custom models using [Picovoice Console](https://console.picovoice.ai/).


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

Build the demo jars with Gradle:
```console
cd rhino/demo/java
./gradlew build
```

## Usage

Navigate to the output directory to use the demos:

```console
cd rhino/demo/java/build/libs
```

## AccessKey

Rhino requires a valid Picovoice `AccessKey` at initialization. `AccessKey` acts as your credentials when using Rhino SDKs.
You can get your `AccessKey` for free. Make sure to keep your `AccessKey` secret.
Signup or Login to [Picovoice Console](https://console.picovoice.ai/) to get your `AccessKey`.

### File Demo

The file demo uses Rhino to get an inference result from an audio file. This demo is mainly useful for quantitative performance 
benchmarking against a corpus of audio data. Note that only the relevant spoken command should be present in the file 
and no other speech. There also needs to be at least one second of silence at the end of the file.

```console
java -jar rhino-file-demo.jar -a ${ACCESS_KEY} -i ${AUDIO_PATH} -c ${CONTEXT_PATH}
```

### Microphone Demo

The microphone demo opens an audio stream from a microphone and performs inference on spoken commands:

```console
java -jar rhino-mic-demo.jar -a ${ACCESS_KEY} -c ${CONTEXT_PATH}
```

It is possible that the default audio input device is not the one you wish to use. There are a couple
of debugging facilities baked into the demo application to solve this. First, type the following into the console:

```console
java -jar rhino-mic-demo.jar -sd
```

It provides information about various audio input devices on the box. On a Windows PC, this is the output:

```
Available input devices:

    Device 0: Microphone Array (Realtek(R) Au
    Device 1: Microphone Headset USB	
``` 

You can use the device index to specify which microphone to use for the demo. For instance, if you want to use the Headset 
microphone in the above example, you can invoke the demo application as below:

```console
java -jar rhino-mic-demo.jar -a ${ACCESS_KEY} -c ${CONTEXT_PATH} -di 1
```

If the problem persists we suggest storing the recorded audio into a file for inspection. This can be achieved with:

```console
java -jar rhino-mic-demo.jar -a ${ACCESS_KEY} -c ${CONTEXT_PATH} -di 1 -o ./test.wav
```

If after listening to stored file there is no apparent problem detected, please open an issue.
