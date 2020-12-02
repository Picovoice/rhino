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

- Python 3
- Runs on Linux (x86_64), Mac (x86_64), Windows (x86_64), Raspberry Pi (all variants), and BeagleBone.

## Installation

Microphone demo uses [PyAudio](https://people.csail.mit.edu/hubert/pyaudio/) for recording input audio. Consult the
installation guide at [PyAudio](https://people.csail.mit.edu/hubert/pyaudio/).

```bash
sudo pip3 install pvrhinodemo
```

## Usage

### File Demo

It allows testing Rhino on a corpus of audio files. The demo is mainly useful for quantitative performance
benchmarking. It accepts 16kHz audio files. Rhino processes a single-channel audio stream if a stereo file is
provided it only processes the first (left) channel. Note that only the relevant spoken command should be present in the
file and no other speech. Also there needs to be at least one second of silence at the end of the file.

```bash
rhino_demo_file --input_audio_path ${AUDIO_PATH} --context_path ${CONTEXT_PATH} 
```

### Microphone Demo

It opens an audio stream from a microphone and performs inference in spoken commands:

```bash
rhino_demo_mic --context_path ${CONTEXT_PATH}
```

It is possible that the default audio input device recognized by PyAudio is not the one being used. There are a couple
of debugging facilities baked into the demo application to solve this. First, type the following into the console:

```bash
rhino_demo_mic --show_audio_devices
```

It provides information about various audio input devices on the box. On a Linux box, this is the console output

```
'index': '0', 'name': 'HDA Intel PCH: ALC892 Analog (hw:0,0)', 'defaultSampleRate': '44100.0', 'maxInputChannels': '2'
'index': '1', 'name': 'HDA Intel PCH: ALC892 Alt Analog (hw:0,2)', 'defaultSampleRate': '44100.0', 'maxInputChannels': '2'
'index': '2', 'name': 'HDA NVidia: HDMI 0 (hw:1,3)', 'defaultSampleRate': '44100.0', 'maxInputChannels': '0'
'index': '3', 'name': 'HDA NVidia: HDMI 1 (hw:1,7)', 'defaultSampleRate': '44100.0', 'maxInputChannels': '0'
'index': '4', 'name': 'HDA NVidia: HDMI 2 (hw:1,8)', 'defaultSampleRate': '44100.0', 'maxInputChannels': '0'
'index': '5', 'name': 'HDA NVidia: HDMI 3 (hw:1,9)', 'defaultSampleRate': '44100.0', 'maxInputChannels': '0'
'index': '6', 'name': 'HDA NVidia: HDMI 0 (hw:2,3)', 'defaultSampleRate': '44100.0', 'maxInputChannels': '0'
'index': '7', 'name': 'HDA NVidia: HDMI 1 (hw:2,7)', 'defaultSampleRate': '44100.0', 'maxInputChannels': '0'
'index': '8', 'name': 'HDA NVidia: HDMI 2 (hw:2,8)', 'defaultSampleRate': '44100.0', 'maxInputChannels': '0'
'index': '9', 'name': 'HDA NVidia: HDMI 3 (hw:2,9)', 'defaultSampleRate': '44100.0', 'maxInputChannels': '0'
'index': '10', 'name': 'Logitech USB Headset: Audio (hw:3,0)', 'defaultSampleRate': '44100.0', 'maxInputChannels': '1'
'index': '11', 'name': 'sysdefault', 'defaultSampleRate': '48000.0', 'maxInputChannels': '128'
'index': '12', 'name': 'front', 'defaultSampleRate': '44100.0', 'maxInputChannels': '0'
'index': '13', 'name': 'surround21', 'defaultSampleRate': '44100.0', 'maxInputChannels': '0'
'index': '14', 'name': 'surround40', 'defaultSampleRate': '44100.0', 'maxInputChannels': '0'
'index': '15', 'name': 'surround41', 'defaultSampleRate': '44100.0', 'maxInputChannels': '0'
'index': '16', 'name': 'surround50', 'defaultSampleRate': '44100.0', 'maxInputChannels': '0'
'index': '17', 'name': 'surround51', 'defaultSampleRate': '44100.0', 'maxInputChannels': '0'
'index': '18', 'name': 'surround71', 'defaultSampleRate': '44100.0', 'maxInputChannels': '0'
'index': '19', 'name': 'pulse', 'defaultSampleRate': '44100.0', 'maxInputChannels': '32'
'index': '20', 'name': 'dmix', 'defaultSampleRate': '48000.0', 'maxInputChannels': '0'
'index': '21', 'name': 'default', 'defaultSampleRate': '44100.0', 'maxInputChannels': '32'
```

It can be seen that the last device (index 21) is considered default. But on this machine, a headset is being used as
the input device which has an index of 10. After finding the correct index the demo application can be invoked as below

```bash
rhino_demo_mic --context_path ${CONTEXT_PATH} --audio_device_index 10
```

If the problem persists we suggest storing the recorded audio into a file for inspection. This can be achieved by

```bash
rhino_demo_mic --context_path ${CONTEXT_PATH} --audio_device_index 10 --output_path ~/test.wav
```
