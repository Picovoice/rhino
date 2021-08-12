# Rhino Rust Demos

This Rust module contains demos for processing real-time audio (i.e. microphone) and audio files using the Rhino Speech-to-Intent engine.

## Installation

The microphone demo uses [miniaudio-rs](https://github.com/ExPixel/miniaudio-rs) for cross-platform audio capture.
It uses `bindgen` and therefore requires `clang` to be installed and on the path.
Use the [`Bindgen` docs](https://rust-lang.github.io/rust-bindgen/requirements.html) for instructions on how to install `clang` for various Operating Systems and distros.

## Usage

NOTE: The working directory for the following `Cargo` commands is:

```console
rhino/demo/rust/filedemo  # File Demo
rhino/demo/rust/micdemo  # Mic Demo
```

### File Demo

The file demo uses Rhino to get an inference result from an audio file.
This demo is mainly useful for quantitative performance benchmarking against a corpus of audio data.
Note that only the relevant spoken command should be present in the file and no other speech.
There also needs to be at least one second of silence at the end of the file.

```console
cargo run --release -- --input_audio_path "path/to/input.wav" --context_path "/path/to/context/file.rhn"
```

The sensitivity of the engine can be tuned using the `sensitivity` input argument:

```console
cargo run --release -- --input_audio_path "path/to/input.wav" \
--context_path "/path/to/context/one.rhn" --sensitivity 0.4
```

Sensitivity is the parameter that enables trading miss rate for the false alarm rate.
It is a floating point number within `[0, 1]`.
A higher sensitivity reduces the miss rate at the cost of increased false alarm rate.

### Microphone Demo

The microphone demo opens an audio stream from a microphone and performs inference on spoken commands:

```console
cargo run --release -- --context_path "/path/to/context/file.rhn"
```

It is possible that the default audio input device is not the one you wish to use.
There are a couple of debugging facilities baked into the demo application to solve this.
First, type the following into the console:

```console
cargo run --release -- --show_audio_devices
```

It provides information about various audio input devices on the box. Here is an example output from a Windows machine:

```console
Capture Devices
    0: Microphone Array (Realtek(R) Audio)
    1: Microphone (USB Audio Device)
``` 

You can use the device index to specify which microphone to use for the demo.
For instance, if you want to use the USB microphone in the above example, you can invoke the demo application as below:

```console
cargo run --release -- --context_path "/path/to/context/one.rhn" --audio_device_index 1
```

Exact system setups don't always play well with certain audio backends.
If this is the case you can override the default with a specific backend:

```console
cargo run -- --release --context_path "/path/to/context/one.rhn" --audio_device_index 1 --audio_backend Alsa
```

If the problem persists we suggest storing the recorded audio into a file for inspection.
This can be achieved with:

```console
cargo run --release -- --context_path "/path/to/context/one.rhn" --output_path ./test.wav
```

If after listening to stored file there is no apparent problem detected please open an issue.
