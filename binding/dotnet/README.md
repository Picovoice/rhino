# Rhino Speech-to-Intent Engine

Made in Vancouver, Canada by [Picovoice](https://picovoice.ai)

Rhino is Picovoice's Speech-to-Intent engine. It directly infers intent from spoken commands within a given context of
interest, in real-time. For example, given a spoken command *"Can I have a small double-shot espresso with a lot of sugar
 and some milk"*, Rhino infers that the user wants to order a drink and emits the following inference result:

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

- .NET Standard 2.0, .NET Core 3.0+, .NET Framework 4.6.1+
- Runs on Linux (x86_64), macOS (x86_64), Windows (x86_64) and Raspberry Pi (.NET Core 3.1+)

## Installation

You can install the latest version of Rhino by getting the latest [Rhino Nuget package](https://www.nuget.org/packages/Rhino/) in Visual Studio or using the .NET CLI:

```console
dotnet add package Rhino
```

## Usage

Create an instance of the engine:

```csharp
using Pv;

Rhino handle = Rhino.Create(contextPath:"/absolute/path/to/context");
```

Where `context_path` is the absolute path to Speech-to-Intent context created either using
[Picovoice Console](https://picovoice.ai/console/) or one of the default contexts available on Rhino's GitHub repository.

The sensitivity of the engine can be tuned using the `sensitivity` parameter. It is a floating point number within
[0, 1]. A higher sensitivity value results in fewer misses at the cost of (potentially) increasing the erroneous
inference rate.

```csharp
using Pv;

Rhino handle = Rhino.Create(contextPath:"/absolute/path/to/context", sensitivity: 0.25f);
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

## Non-English Contexts

In order to run inference on non-English contexts you need to use the corresponding model file. The model files for all supported languages are available [here](/lib/common).
## Demos

The [Rhino dotnet demo project](/demo/dotnet) is a .NET Core console app that allows for 
processing real-time audio (i.e. microphone) and files using Rhino.
