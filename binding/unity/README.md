# Rhino Binding for Unity

## Rhino Speech-to-Intent Engine

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

## Compatibility

[Rhino unity package](./rhino-2.1.4.unitypackage) is for running Rhino on **Unity 2017.4+** on the following platforms:

- Android 4.4+ (API 19+) (ARM only)
- iOS 9.0+
- Windows (x86_64)
- macOS (x86_64)
- Linux (x86_64)

For running Rhino on **macOS m1 (arm64)**, use the [Apple silicon](./rhino-2.1.4-Apple-silicon.unitypackage) version on **Unity 2021.2+**.

## Installation

The easiest way to install the Rhino Unity SDK is to import the [Rhino Unity Package](./rhino-2.1.4.unitypackage) into your Unity project by either dropping it into the Unity editor or going to _Assets>Import Package>Custom Package..._

**NOTE:** On macOS, the Rhino library may get flagged as having come from an unverified source if you've downloaded the  `.unitypackage` directly from github. This should only come up when running your project in the Editor. To disable this warning, go to Security & Preferences and choose to allow pv_rhino.dylib to run.

## AccessKey

Rhino requires a valid Picovoice `AccessKey` at initialization. `AccessKey` acts as your credentials when using Rhino SDKs.
You can get your `AccessKey` for free. Make sure to keep your `AccessKey` secret.
Signup or Login to [Picovoice Console](https://console.picovoice.ai/) to get your `AccessKey`.

## Packaging
To build the package from source, you first have to clone the repo with submodules:
```console
git clone --recurse-submodules git@github.com:Picovoice/rhino.git
# or 
git clone --recurse-submodules https://github.com/Picovoice/rhino.git
```

You then have to run the `copy.sh` file to copy the package resources from various locations in the repo to the Unity project located at [/binding/unity](.) (**NOTE:** on Windows, Git Bash or another bash shell is required, or you will have to manually copy the resources into the project.). Then, open the Unity project, right click the Assets folder and select Export Package. The resulting Unity package can be imported into other Unity projects as desired.

## Usage

The module provides you with two levels of API to choose from depending on your needs.

#### High-Level API
/
[RhinoManager](./Assets/Rhino/RhinoManager.cs) provides a high-level API that takes care of audio recording. This class is the quickest way to get started.

>**NOTE:** If running on iOS, you must fill in the Microphone Usage Description under Project Settings>Other Settings in order to enable audio recording.

Using the constructor `RhinoManager.Create` will create an instance of the RhinoManager using the provided context file.
```csharp
using Pv.Unity;

string accessKey = "${ACCESS_KEY}"; // AccessKey obtained from Picovoice Console (https://console.picovoice.ai/)

try 
{    
    RhinoManager _rhinoManager = RhinoManager.Create(
                                    accessKey,
                                    "/path/to/context/file.rhn",
                                    OnInferenceResult);
}
catch (RhinoException ex)
{
    // handle rhino init error
}
```
The `inferenceCallback` parameter is a function that you want to execute when Rhino makes an inference. The function should accept `Inference` object 
that represents the inference result.

```csharp
private void OnInferenceResult(Inference inference)
{
    if(inference.IsUnderstood)
    {
        string intent = inference.Intent;
        Dictionary<string, string> slots = inference.Slots;
        // add code to take action based on inferred intent and slot values
    }
    else
    {
        // add code to handle unsupported commands
    }
}
```

You can override the default Rhino model file and/or the inference sensitivity. You can set `requireEndpoint` parameter to false if you do not wish to wait for silence before Rhino infers context. There is also an optional `processErrorCallback` that is called if there is a problem encountered while processing audio. These optional parameters can be passed in like so:

```csharp

string accessKey = "${ACCESS_KEY}"; // AccessKey obtained from Picovoice Console (https://console.picovoice.ai/)

RhinoManager _rhinoManager = RhinoManager.Create(
                                        accessKey,
                                        "/path/to/context/file.rhn",
                                        OnInferenceResult,
                                        modelPath: "/path/to/model/file.pv",
                                        sensitivity: 0.75f,
                                        requireEndpoint: false,
                                        processErrorCallback: OnError);

void OnError(RhinoException ex){
    Debug.LogError(ex.ToString());
}
```

Once you have instantiated a RhinoManager, you can start audio capture and intent inference by calling:

```csharp
_rhinoManager.Process();
```

Audio capture stops and Rhino resets once an inference result is returned via the inference callback. When you wish to result, call `.Process()` again.

Once the app is done with using an instance of RhinoManager, you can explicitly release the audio resources, and the resources allocated to Rhino:
```csharp
_rhinoManager.Delete();
```

There is no need to deal with audio capture to enable intent inference with RhinoManager.
This is because it uses our
[unity-voice-processor](https://github.com/Picovoice/unity-voice-processor/)
Unity package to capture frames of audio and automatically pass it to the inference engine.

#### Low-Level API

[Rhino](./Assets/Rhino/Rhino.cs) provides low-level access to the inference engine for those who want to incorporate speech-to-intent into an already existing audio processing pipeline.

To create an instance of `Rhino`, use the `.Create` static constructor, and a context file.

```csharp
using Pv.Unity;

string accessKey = "${ACCESS_KEY}"; // AccessKey obtained from Picovoice Console (https://console.picovoice.ai/)

try
{    
    Rhino _rhino = Rhino.Create(accessKey, "path/to/context/file.rhn");
} 
catch (RhinoException ex) 
{
    // handle rhino init error
}
```

To feed Rhino your audio, you must send it frames of audio to its `Process` function until it has made an inference. You can then call GetInference to get the Inference object
which contains the following properties:

IsUnderstood - whether Rhino understood what it heard based on the context
Intent - if IsUnderstood, name of intent that were inferred
Slots - if IsUnderstood, dictionary of slot keys and values that were inferred

```csharp
short[] GetNextAudioFrame()
{
    // .. get audioFrame
    return audioFrame;
}

try 
{
    bool isFinalized = _rhino.Process(GetNextAudioFrame());   
    if(isFinalized)
    {
        Inference inference = _rhino.GetInference();
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
catch (Exception ex)
{
    Debug.LogError(ex.ToString());
}  
```

For process to work correctly, the audio data must be in the audio format required by Picovoice.
The required sample rate is specified by the `SampleRate` property, and the required number of audio samples in each frame is specified by the `FrameLength` property. Audio must be single-channel and 16-bit linearly-encoded.

Rhino implements the `IDisposable` interface, so you can use Rhino in a `using` block. If you don't use a `using` block, resources will be released by the garbage collector automatically, or you can explicitly release the resources like so:

```csharp
_rhino.Dispose();
```

## Custom Model Integration

To add a custom context to your Unity app, you'll need to add the rhn file to your project root under `/StreamingAssets`. Then, in a script, retrieve it like so:
```csharp
string contextPath = Path.Combine(Application.streamingAssetsPath, "context.rhn");
```

## Non-English Contexts

In order to run inference on non-English contexts you need to use the corresponding model file. The model files for all supported languages are available [here](../../lib/common).

## Demo

The Rhino Unity demo can be imported along with the SDK when you import the Rhino Unity package. Browse the source of the demo [here](../../demo/unity).