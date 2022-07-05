# Rhino Speech-to-Intent Engine

Made in Vancouver, Canada by [Picovoice](https://picovoice.ai)

Rhino is Picovoice's Speech-to-Intent engine. It directly infers intent from spoken commands within a given context of
interest, in real-time. For example, given a spoken command:

> Can I have a small double-shot espresso?

Rhino infers that the user would like to order a drink and emits the following inference result:

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

* using deep neural networks trained in real-world environments.
* compact and computationally-efficient, making it perfect for IoT.
* self-service. Developers and designers can train custom models using [Picovoice Console](https://console.picovoice.ai/).

## Compatibility

- Go 1.16+
- Runs on Linux (x86_64), macOS (x86_64, arm64), Windows (x86_64), Raspberry Pi, NVIDIA Jetson (Nano) and BeagleBone

## Installation

```console
go get github.com/Picovoice/rhino/binding/go
```

## AccessKey

Rhino requires a valid Picovoice `AccessKey` at initialization. `AccessKey` acts as your credentials when using Rhino SDKs.
You can get your `AccessKey` for free. Make sure to keep your `AccessKey` secret.
Signup or Login to [Picovoice Console](https://console.picovoice.ai/) to get your `AccessKey`.

## Usage

To create an instance of the engine with default parameters, pass an `AccessKey` and a path to a Rhino context file (.rhn) to the `NewRhino` function and then make a call to `.Init()`.

```go
import . "github.com/Picovoice/rhino/binding/go"

const accessKey = "${ACCESS_KEY}" // obtained from Picovoice Console (https://console.picovoice.ai/)

rhino = NewRhino(accessKey, "/path/to/context/file.rhn")
err := rhino.Init()
if err != nil {
    // handle error
}
```
The context file is a Speech-to-Intent context created either using
[Picovoice Console](https://console.picovoice.ai/) or one of the default contexts available on Rhino's GitHub repository.

The sensitivity of the engine can be tuned using the `sensitivity` parameter. It is a floating-point number within
[0, 1]. A higher sensitivity value results in fewer misses at the cost of (potentially) increasing the erroneous
inference rate. You can also override the default Rhino model (.pv), which is required when using a non-English context.

To override these parameters, you can create a Rhino struct directly and then call `Init()`:

```go
import . "github.com/Picovoice/rhino/binding/go"

const accessKey = "${ACCESS_KEY}" // obtained from Picovoice Console (https://console.picovoice.ai/)

rhino = Rhino{
    AccessKey: accessKey,
    ContextPath: "/path/to/context/file.rhn",
    Sensitivity: 0.7,
    ModelPath: "/path/to/rhino/params.pv"}
err := rhino.Init()
if err != nil {
    // handle error
}
```

Once initialized, you can start passing in frames of audio for processing. The engine accepts 16-bit linearly-encoded PCM and operates on
single-channel audio. The sample rate that is required by the engine is given by `SampleRate` and number of samples-per-frame is `FrameLength`.

To feed audio into Rhino, use the `Process` function in your capture loop. You must have called `Init()` before calling `Process`.
```go
func getNextFrameAudio() []int16{
    // get audio frame
}

for {
    isFinalized, err := rhino.Process(getNextFrameAudio())
    if isFinalized {
        inference, err := rhino.GetInference()
        if inference.IsUnderstood {
            intent := inference.Intent
            slots := inference.Slots
            // add code to take action based on inferred intent and slot values
        } else {
            // add code to handle unsupported commands
        }
    }
}
```

When done with the engine, resources have to be released explicitly.

```go
rhino.Delete()
```

Using a `defer` call to `Delete()` after `Init()` is also a good way to ensure cleanup.

## Non-English Contexts

In order to detect non-English contexts you need to use the corresponding model file. The model files for all supported languages are available [here](https://github.com/Picovoice/rhino/tree/master/lib/common).

## Demos

Check out the Rhino Go demos [here](https://github.com/Picovoice/rhino/tree/master/demo/go)

