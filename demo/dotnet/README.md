# Rhino Demos for .NET

This package contains .NET Core command line demos for processing real-time audio (i.e. microphone) and audio files
using Rhino Speech-to-Intent engine.

## Rhino

Made in Vancouver, Canada by [Picovoice](https://picovoice.ai)

Rhino is Picovoice's Speech-to-Intent engine. It directly infers intent from spoken commands within a given context of interest, in real-time. For example, given a spoken command

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

- .NET Core 3.1

## Compatibility

- Linux (x86_64)
- macOS (x86_64)
- Windows (x86_64)
- Raspberry Pi:
  - 2
  - 3 (32 and 64 bit)
  - 4 (32 and 64 bit)
- NVIDIA Jetson Nano
- BeagleBone

## Installation

Both demos use [Microsoft's .NET Core framework](https://dotnet.microsoft.com/download).

Build with the dotnet CLI:

```console
dotnet build -c MicDemo.Release
dotnet build -c FileDemo.Release
```

## AccessKey

Rhino requires a valid Picovoice `AccessKey` at initialization. `AccessKey` acts as your credentials when using Rhino SDKs.
You can get your `AccessKey` for free. Make sure to keep your `AccessKey` secret.
Signup or Login to [Picovoice Console](https://console.picovoice.ai/) to get your `AccessKey`.

## Usage

NOTE: File path arguments must be absolute paths. The working directory for the following dotnet commands is:

```console
rhino/demo/dotnet/RhinoDemo
```

### File Demo

The file demo uses Rhino to get an inference result from an audio file. This demo is mainly useful for quantitative performance 
benchmarking against a corpus of audio data. Note that only the relevant spoken command should be present in the file 
and no other speech. There also needs to be at least one second of silence at the end of the file.

```console
dotnet run -c FileDemo.Release -- \ 
--input_audio_path ${AUDIO_PATH} \
--access_key ${ACCESS_KEY} \
--context_path ${CONTEXT_PATH}
```

### Microphone Demo

The microphone demo opens an audio stream from a microphone and performs inference on spoken commands:

```console
dotnet run -c MicDemo.Release -- \
--access_key ${ACCESS_KEY} \
--context_path ${CONTEXT_PATH}
```

It is possible that the default audio input device is not the one you wish to use. There are a couple
of debugging facilities baked into the demo application to solve this. First, type the following into the console:

```console
dotnet run -c MicDemo.Release -- --show_audio_devices
```

It provides information about various audio input devices on the box. This is an example of the output:

```
index: 0, device name: USB Audio Device
index: 1, device name: MacBook Air Microphone
``` 

You can use the device index to specify which microphone to use for the demo. For instance, if you want to use the USB Audio Device 
in the above example, you can invoke the demo application as below:

```console
dotnet run -c MicDemo.Release -- \
--access_key ${ACCESS_KEY} \
--context_path ${CONTEXT_PATH} \
--audio_device_index 0
```

If the problem persists we suggest storing the recorded audio into a file for inspection. This can be achieved with:

```console
dotnet run -c MicDemo.Release -- \
--access_key ${ACCESS_KEY} \
--context_path ${CONTEXT_PATH} \ 
--output_path ./test.wav
```

If after listening to the stored file there is no apparent problem detected, please open an issue.
