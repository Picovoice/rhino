# Rhino Speech-to-Intent Engine Demos

Made in Vancouver, Canada by [Picovoice](https://picovoice.ai)

This package contains demos and commandline utilities for processing real-time audio (i.e. microphone) and audio files
using Rhino Speech-to-Intent engine.

## Rhino

Rhino is Picovoice's Speech-to-Intent engine. It directly infers intent from spoken commands within a given context of
interest, in real-time. For example, given a spoken command

>Can I have a small double-shot espresso?

Rhino infers that the user and emits the following inference result:

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
- self-service. Developers can train custom models using [Picovoice Console](https://picovoice.ai/console/).

## Compatibility

- Python 3.5+
- Runs on Linux (x86_64), Mac (x86_64, arm64), Windows (x86_64), Raspberry Pi (all variants), NVIDIA Jetson Nano and BeagleBone.

## Installation

```console
sudo pip3 install pvrhinodemo
```

## AccessKey

Rhino requires a valid `AccessKey` at initialization. `AccessKey`s act as your credentials when using Rhino SDKs.
You can create your `AccessKey` for free. Make sure to keep your `AccessKey` secret.

To obtain your `AccessKey`:
1. Login or Signup for a free account on the [Picovoice Console](https://picovoice.ai/console/).
2. Once logged in, go to the [`AccessKey` tab](https://console.picovoice.ai/access_key) to create one or use an existing `AccessKey`.

## Usage

### File Demo

It allows testing Rhino on a corpus of audio files. The demo is mainly useful for quantitative performance
benchmarking. It accepts 16kHz audio files. Rhino processes a single-channel audio stream if a stereo file is
provided it only processes the first (left) channel. Note that only the relevant spoken command should be present in the
file and no other speech. There also needs to be at least one second of silence at the end of the file.

```console
rhino_demo_file --input_audio_path ${AUDIO_PATH} --access_key ${ACCESS_KEY} --context_path ${CONTEXT_PATH} 
```

### Microphone Demo

It opens an audio stream from a microphone and performs inference in spoken commands:

```console
rhino_demo_mic --access_key ${ACCESS_KEY} --context_path ${CONTEXT_PATH}
```

It is possible that the default audio input device recognized by the demo is not the one being used. There are a couple 
of debugging facilities baked into the demo application to solve this. First, type the following into the console:

```console
rhino_demo_mic --show_audio_devices
```

It provides information about various audio input devices on the box. On a Linux box, this is the console output

```
index: 0, device name: USB Audio Device
index: 1, device name: MacBook Air Microphone
``` 

You can use the device index to specify which microphone to use for the demo. For instance, if you want to use the USB Audio Device
in the above example, you can invoke the demo application as below:

```console
rhino_demo_mic --access_key ${ACCESS_KEY} --context_path ${CONTEXT_PATH} --audio_device_index 0
```

If a problem occurs, we suggest storing the recorded audio into a file for inspection. This can be achieved by:

```console
rhino_demo_mic --access_key ${ACCESS_KEY} --context_path ${CONTEXT_PATH} --audio_device_index 0 --output_path ~/test.wav
```
