# Rhino Speech-to-Intent Engine Demos

Made in Vancouver, Canada by [Picovoice](https://picovoice.ai)

This package contains .NET Core command line demos for processing real-time audio (i.e. microphone) and audio files
using Rhino Speech-to-Intent engine.

## Rhino

Rhino is Picovoice's Speech-to-Intent engine. It directly infers intent from spoken commands within a given context of
interest, in real-time. For example, given a spoken command *"Can I have a small double-shot espresso with a lot of sugar 
and some milk"*, Rhino infers that the user wants to order a drink with these specifications:

```json
{
  "type": "espresso",
  "size": "small",
  "numberOfShots": "2",
  "sugar": "a lot",
  "milk": "some"
}
```

Rhino is:

* using deep neural networks trained in real-world environments.
* compact and computationally-efficient, making it perfect for IoT.
* self-service. Developers and designers can train custom models using [Picovoice Console](https://picovoice.ai/console/).

## Compatibility

- .NET Core 3.1+
- Runs on Linux (x86_64), MacOS (x86_64) and Windows (x86_64)

## Installation

Both demos use [Microsoft's .NET Core framework](https://dotnet.microsoft.com/download).

MicDemo uses [OpenAL](https://openal.org/). On Windows, install using the [OpenAL Windows Installer](https://openal.org/downloads/oalinst.zip).

On Linux use apt-get

```bash
sudo apt-get install libopenal-dev
```

On Mac use Brew

```bash
brew install openal-soft
```

Once .NET Core and OpenAL have been installed, you can build with the dotnet CLI

```bash
dotnet build -c MicDemo.Release
dotnet build -c FileDemo.Release
```

## Usage

NOTE: the working directory for all dotnet commands is:

```bash
rhino/demo/dotnet/RhinoDemo
```

### File Demo

The file demo uses Rhino to get an inference result from an audio file. This demo is mainly useful for quantitative performance 
benchmarking against a corpus of audio data. Note that only the relevant spoken command should be present in the file 
and no other speech. There also needs to be at least one second of silence at the end of the file.

```bash
dotnet run -c FileDemo.Release -- --input_audio_path ${AUDIO_PATH} --context_path ${CONTEXT_PATH}
```

### Microphone Demo

The microphone demo opens an audio stream from a microphone and performs inference on spoken commands:

```bash
dotnet run -c MicDemo.Release -- --context_path ${CONTEXT_PATH}
```

It is possible that the default audio input device is not the one you wish to use. There are a couple
of debugging facilities baked into the demo application to solve this. First, type the following into the console:

```bash
dotnet run -c MicDemo.Release -- --show_audio_devices
```

It provides information about various audio input devices on the box. On a Windows PC, this is the output:

```
Available input devices:

    Device 0: Microphone Array (Realtek(R) Au
    Device 1: Microphone Headset USB	
``` 

You can use the device index to specify which microphone to use for the demo. For instance, if you want to use the Headset 
microphone in the above example, you can invoke the demo application as below:

```bash
dotnet run -c MicDemo.Release -- --context_path ${CONTEXT_PATH} --audio_device_index 1
```

If the problem persists we suggest storing the recorded audio into a file for inspection. This can be achieved with:

```bash
dotnet run -c MicDemo.Release -- --context_path ${CONTEXT_PATH} --audio_device_index 1 --output_path ./test.wav
```

If after listening to stored file there is no apparent problem detected please open an issue.
