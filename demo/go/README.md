# Rhino Go Demos

This Go module contains demos for processing real-time audio (i.e. microphone) and audio files using the Rhino Speech-to-Intent engine.

## Requirements

- go 1.16+
- **Windows**: The demo requires `cgo`, which means that you need to install a gcc compiler like [Mingw](http://mingw-w64.org) to build it properly. 

## Compatibility

- Linux (x86_64)
- macOS (x86_64, arm64)
- Windows (x86_64)
- Raspberry Pi:
  - Zero
  - 2
  - 3 (32 and 64 bit)
  - 4 (32 and 64 bit)
- NVIDIA Jetson Nano
- BeagleBone

## AccessKey

Rhino requires a valid Picovoice `AccessKey` at initialization. `AccessKey` acts as your credentials when using Rhino SDKs.
You can get your `AccessKey` for free. Make sure to keep your `AccessKey` secret.
Signup or Login to [Picovoice Console](https://console.picovoice.ai/) to get your `AccessKey`.

## Usage

NOTE: The working directory for the following go commands is:

```console
cd rhino/demo/go
```

### File Demo

The file demo uses Rhino to get an inference result from an audio file. This demo is mainly useful for quantitative performance 
benchmarking against a corpus of audio data. Note that only the relevant spoken command should be present in the file 
and no other speech. There also needs to be at least one second of silence at the end of the file.

```console
go run filedemo/rhino_file_demo.go \ 
-input_audio_path "path/to/input.wav" \
-access_key "${ACCESS_KEY}" \
-context_path "/path/to/context/file.rhn"
```

The sensitivity of the engine can be tuned using the `sensitivity` input argument. You can also override the default Rhino model (.pv), which is required when using a non-English context. 

```console
go run filedemo/rhino_file_demo.go \
-input_audio_path "path/to/input.wav" \
-access_key "${ACCESS_KEY}" \
-context_path "/path/to/context/file.rhn" \
-sensitivity 0.4
-model_path "/path/to/model.pv"
```

Sensitivity is the parameter that enables trading miss rate for the false alarm rate. It is a floating-point number within `[0, 1]`. A higher sensitivity reduces the miss rate at the cost of increased false alarm rate.

### Microphone Demo

The microphone demo opens an audio stream from a microphone and performs inference on spoken commands:

```console
go run micdemo/rhino_mic_demo.go \
-access_key "${ACCESS_KEY}" \
-context_path "/path/to/context/file.rhn"
```

It is possible that the default audio input device is not the one you wish to use. There are a couple
of debugging facilities baked into the demo application to solve this. First, type the following into the console:
```console
go run micdemo/rhino_mic_demo.go -show_audio_devices
```

It provides information about various audio input devices on the box. Here is an example output:

```console
Index: 0, device name: USB Audio Device
Index: 1, device name: MacBook Air Microphone
``` 

You can use the device index to specify which microphone to use for the demo. For instance, if you want to use the USB Audio Device
in the above example, you can invoke the demo application as below:

```console
go run micdemo/rhino_mic_demo.go \
-access_key "${ACCESS_KEY}" \
-context_path "/path/to/context/file.rhn" \
-audio_device_index 0
```

If the problem persists we suggest storing the recorded audio into a file for inspection. This can be achieved with:

```console
go run micdemo/rhino_mic_demo.go \
-access_key "${ACCESS_KEY}" \
-context_path "/path/to/context/file.rhn" \
-audio_device_index 0 \
-output_path ./test.wav
```

If after listening to stored file there is no apparent problem detected, please open an issue.
