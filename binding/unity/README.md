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
* self-service. Developers and designers can train custom models using [Picovoice Console](https://picovoice.ai/console/).

## Compatibility

This binding is for running Rhino on **Unity 2017.4+** on the following platforms:

- Android 4.1+ (API 16+) (ARM only)
- iOS 9.0+
- Windows (x86_64)
- macOS (x86_64)
- Linux (x86_64)

## Installation

The easiest way to install the Rhino Unity SDK is to import [rhino.unitypackage](/binding/unity/rhino.unitypackage) into your Unity project by either dropping it into the Unity editor or going to _Assets>Import Package>Custom Package..._

**NOTE:** On macOS, the Rhino library may get flagged as having come from an unverified source if you've downloaded the  `.unitypackage` directly from github. This should only come up when running your project in the Editor. To disable this warning, go to Security & Preferences and choose to allow pv_rhino.dylib to run.

## Packaging
To build the package from source, you have first have to clone the repo with submodules:
```bash
git clone --recurse-submodules git@github.com:Picovoice/rhino.git
# or 
git clone --recurse-submodules https://github.com/Picovoice/rhino.git
```

You then have to run the `copy.sh` file to copy the package resources from various locations in the repo to the Unity project located at [/binding/unity](/binding/unity) (**NOTE:** on Windows, Git Bash or another bash shell is required, or you will have to manually copy the resources into the project.). Then, open the Unity project, right click the Assets folder and select Export Package. The resulting Unity package can be imported into other Unity projects as desired.

## Usage

The module provides you with two levels of API to choose from depending on your needs.

#### High-Level API

[PorcupineManager](/binding/unity/Assets/Porcupine/PorcupineManager.cs) provides a high-level API that takes care of audio recording. This class is the quickest way to get started.

>**NOTE:** If running on iOS, you must fill in the Microphone Usage Description under Project Settings>Other Settings in order to enable audio recording.

Using the constructor `PorcupineManager.FromKeywords` will create an instance of the PorcupineManager using one or more of the built-in keywords.
```csharp
using Pv.Unity;

try {
    List<string> keywords = new List<string>(){ "picovoice", "porcupine" };
    PorcupineManager _porcupineManager = PorcupineManager.FromKeywords(
                                            keywords,
                                            OnWakeWordDetected);
}
catch (Exception ex)
{
    // handle porcupine init error
}
```
The `wakeWordCallback` parameter is a function that you want to execute when Porcupine has detected one of the keywords.
The function should accept a single integer, keywordIndex, which specifies which wake word has been detected.

```csharp
private void OnWakeWordDetected(int keywordIndex){
    if(keywordIndex == 0){
        // picovoice detected
    }
    else if (keywordIndex === 1){
        // porcupine detected
    }
}
```

Available built-in keywords are stored in the constants `PorcupineManager.BUILT_IN_KEYWORDS` and `Porcupine.BUILT_IN_KEYWORDS`.

To create an instance of PorcupineManager that detects custom keywords, you can use the `PorcupineManager.FromKeywordPaths`
static constructor and provide the paths to the `.ppn` file(s).
```csharp
List<string> keywordPaths = new List<string>(){ "/path/to/keyword.ppn" };
PorcupineManager _porcupineManager = PorcupineManager.FromKeywordPaths( 
                                        keywordPaths, 
                                        OnWakeWordDetected);
```

In addition to custom keywords, you can override the default Porcupine model file and/or keyword sensitivities, as well as add an error callback you want to trigger if there's a problem encountered while Porcupine is processing frames.

These optional parameters can be passed in like so:
```csharp
List<string> keywordPaths = new List<string>()
{ 
    "/path/to/keyword/file/one.ppn", 
    "/path/to/keyword/file/two.ppn"
};
string modelPath = "path/to/model/file.pv";
List<float> sensitivites = new List<float>(){ 0.25f, 0.6f };

PorcupineManager _porcupineManager = PorcupineManager.FromKeywordPaths(
                                        keywordPaths,
                                        OnWakWordDetected,
                                        modelPath: modelPath,
                                        sensitivities: sensitivities,
                                        errorCallback: OnError);

void OnError(Exception ex){
    Debug.LogError(ex.ToString());
}
```

Once you have instantiated a PorcupineManager, you can start audio capture and wake word detection by calling:

```csharp
_porcupineManager.Start();
```

And then stop it by calling:

```csharp
_porcupineManager.Stop();
```

Once the app is done with using an instance of PorcupineManager, you can explicitly release the audio resources and the resources allocated to Porcupine:
```csharp
_porcupineManager.Delete();
```

There is no need to deal with audio capture to enable wake word detection with PorcupineManager.
This is because it uses our
[unity-voice-processor](https://github.com/Picovoice/unity-voice-processor/)
Unity package to capture frames of audio and automatically pass it to the wake word engine.

#### Low-Level API

[Porcupine](/binding/unity/Assets/Porcupine/Porcupine.cs) provides low-level access to the wake word engine for those who want to incorporate wake word detection into a already existing audio processing pipeline.

To create an instance of `Porcupine`, use the `.Create` static constructor. You can pass a list of built-in keywords as its `keywords` argument or a list or paths to custom keywords using its `keywordPaths` arguement. 

```csharp
using Pv.Unity;

try
{
    List<string> keywords = new List<string>(){ "porcupine", "picovoice" };
    Porcupine _porcupine = Porcupine.Create(keywords: keywords);
} 
catch (Exception ex) 
{
    // handle porcupine init error
}
```

To search for a keyword in audio, you must pass frames of audio to Porcupine using the `Process` function. The `keywordIndex` returned will either be -1 if no detection was made or an integer specifying which keyword was detected.

```csharp
short[] frame = getAudioFrame();

try 
{
    int keywordIndex = _porcupine.Process(frame);
    if (keywordIndex >= 0) 
    {
        // detection made!
    }
}
catch (Exception ex)
{
    Debug.LogError(ex.ToString());
}  
```

For process to work correctly, the audio data must be in the audio format required by Picovoice.
The required sample rate is specified by the `SampleRate` property and the required number of audio samples in each frame is specified by the `FrameLength` property. Audio must be single-channel and 16-bit linearly-encoded.

Porcupine implements the `IDisposable` interface, so you can use Porcupine in a `using` block. If you don't use a `using` block, resources will be released by the garbage collector automatically or you can explicitly release the resources like so:

```csharp
_porcupine.Dispose();
```

## Demo

The Porcupine Unity demo can be imported along with the SDK when you import the Porcupine Unity package. Browse the source of the demo [here](/demo/unity).