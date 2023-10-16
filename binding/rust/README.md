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

- Rust 1.54+
- Runs on Linux (x86_64), macOS (x86_64), Windows (x86_64), Raspberry Pi, NVIDIA Jetson (Nano), and BeagleBone

## Installation
First you will need [Rust and Cargo](https://rustup.rs/) installed on your system.

To add the rhino library into your app, add `pv_rhino` to your apps `Cargo.toml` manifest:
```toml
[dependencies]
pv_rhino = "*"
```

If you prefer to clone the repo and use it locally, first run `copy.sh`.
(**NOTE:** on Windows, Git Bash or another bash shell is required, or you will have to manually copy the libs into the project).
Then you can reference the local binding location:
```toml
[dependencies]
pv_rhino = { path = "/path/to/rust/binding" }
```

## AccessKey

Rhino requires a valid Picovoice `AccessKey` at initialization. `AccessKey` acts as your credentials when using Rhino SDKs.
You can get your `AccessKey` for free. Make sure to keep your `AccessKey` secret.
Signup or Login to [Picovoice Console](https://console.picovoice.ai/) to get your `AccessKey`.

## Usage

To create an instance of the engine you first create a `RhinoBuilder` instance with the configuration parameters for the speech to intent engine and then make a call to `.init()`:

```rust
use rhino::RhinoBuilder;

let access_key = "${ACCESS_KEY}"; // AccessKey obtained from Picovoice Console (https://console.picovoice.ai/)

let rhino: Rhino = RhinoBuilder::new(access_key, "/path/to/context/file.rhn").init().expect("Unable to create Rhino");
```
The context file is a Speech-to-Intent context created either using
[Picovoice Console](https://console.picovoice.ai/) or one of the default contexts available on [Rhino's GitHub repository](../../resources/contexts).

The sensitivity of the engine can be tuned using the `sensitivity` parameter.
It is a floating-point number within [0, 1].
A higher sensitivity value results in fewer misses at the cost of (potentially) increasing the erroneous inference rate.
You can also override the default Rhino model (.pv), which is needs to be done when using a non-English context:

```rust
let rhino: Rhino = RhinoBuilder::RhinoBuilder::new(access_key, "/path/to/context/file.rhn")
    .sensitivity(0.42f32)
    .model_path("/path/to/rhino/params.pv")
    .init().expect("Unable to create Rhino");
```

When initialized, the valid sample rate is given by `sample_rate()`.
Expected frame length (number of audio samples in an input array) is given by `frame_length()`.
The engine accepts 16-bit linearly-encoded PCM and operates on single-channel audio.

To feed audio into Rhino, use the `process` function in your capture loop:
```rust
fn next_audio_frame() -> Vec<i16> {
    // get audio frame
}

loop {
    if let Ok(is_finalized) = rhino.process(&next_audio_frame()) {
        if is_finalized {
            if let Ok(inference) = rhino.get_inference() {
                if inference.is_understood {
                    let intent = inference.intent.unwrap();
                    let slots = inference.slots;
                    // add code to take action based on inferred intent and slot values
                } else {
                    // add code to handle unsupported commands
                }
            }
        }   
    }
}
```

## Non-English Contexts

In order to detect non-English contexts you need to use the corresponding model file.
The model files for all supported languages are available [here](../../lib/common).

## Demos

Check out the Rhino Rust demos [here](../../demo/rust)

