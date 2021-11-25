# Rhino Binding for .NET

## Rhino Speech-to-Intent Engine

Made in Vancouver, Canada by [Picovoice](https://picovoice.ai)

Rhino is Picovoice's Speech-to-Intent engine. It directly infers intent from spoken commands within a given context of
interest, in real-time. For example, given a spoken command *"Can I have a small double-shot espresso with a lot of sugar, and some milk"*, Rhino infers that the user would like to order a drink and emits the following inference result:

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

## Requirements

- .NET Core 3.1

## Compatibility

Platform compatible with .NET Framework 4.6.1+:

- Windows (x86_64)

Platforms compatible with .NET Core 2.0+:

- Linux (x86_64)
- macOS (x86_64)
- Windows (x86_64)

Platforms compatible with .NET Core 3.1+:

- Raspberry Pi:
  - 2
  - 3 (32 and 64 bit)
  - 4 (32 and 64 bit)
- NVIDIA Jetson Nano
- BeagleBone

## Installation

You can install the latest version of Rhino by getting the latest [Rhino Nuget package](https://www.nuget.org/packages/Rhino/) in Visual Studio or using the .NET CLI:

```console
dotnet add package Rhino
```

## AccessKey

Rhino requires a valid `AccessKey` at initialization. `AccessKey`s act as your credentials when using Rhino SDKs.
You can create your `AccessKey` for free. Make sure to keep your `AccessKey` secret.

To obtain your `AccessKey`:
1. Login or Signup for a free account on the [Picovoice Console](https://picovoice.ai/console/).
2. Once logged in, go to the [`AccessKey` tab](https://console.picovoice.ai/access_key) to create one or use an existing `AccessKey`.

## Usage

Create an instance of the engine:

```csharp
using Pv;

const string accessKey = "${ACCESS_KEY}";
string contextPath = "/absolute/path/to/context.rhn";
Rhino handle = Rhino.Create(accessKey, contextPath);
```

Where `contextPath` is the absolute path to Speech-to-Intent context created either using [Picovoice Console](https://picovoice.ai/console/) or one of the default contexts available on Rhino's GitHub repository.

The sensitivity of the engine can be tuned using the `sensitivity` parameter. It is a floating-point number within
[0, 1]. A higher sensitivity value results in fewer misses at the cost of (potentially) increasing the erroneous
inference rate.

The model file contains the parameters for the Rhino engine. To change the language that Rhino understands, pass in the relevant model file.

```csharp
const string accessKey = "${ACCESS_KEY}";
string contextPath = "/absolute/path/to/context.rhn";

Rhino handle = Rhino.Create(
    accessKey
    contextPath, 
    sensitivity: 0.25f);
```

When initialized, the valid sample rate is given by `handle.SampleRate`. Expected frame length (number of audio samples in an input array) is `handle.FrameLength`. The engine accepts 16-bit linearly-encoded PCM and operates on single-channel audio.

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

Rhino will have its resources freed by the garbage collector, but to have resources freed immediately after use, wrap it in a using statement: 

```csharp
using(Rhino handle = Rhino.Create(accessKey, contextPath))
{
    // .. Rhino usage here
}
```

## Non-English Contexts

In order to run inference on non-English contexts you need to use the corresponding model file. The model files for all supported languages are available [here](/lib/common).

## Demos

The [Rhino dotnet demo project](/demo/dotnet) is a .NET Core console app that allows for processing real-time audio (i.e. microphone) and files using Rhino.
