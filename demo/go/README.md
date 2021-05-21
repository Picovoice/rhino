# Rhino Go Demos

This Go module contains demos for processing real-time audio (i.e. microphone) and audio files using the Rhino Speech-to-Intent engine.

## Installation

MicDemo uses [malgo](https://github.com/gen2brain/malgo) for cross-platform audio capture. It requires `cgo`, which on Windows may mean that you need to install a gcc compiler like [Mingw](http://mingw-w64.org/doku.php) to build it properly. 

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
go run filedemo/rhino_file_demo.go -input_audio_path "path/to/input.wav" \
-context_path "/path/to/context/file.rhn"
```

The sensitivity of the engine can be tuned using the `sensitivity` input argument and pass in a model file using the `model_path` argument:

```console
go run filedemo/rhino_file_demo.go -input_audio_path "path/to/input.wav" \
-context_path "/path/to/context/file.rhn" -sensitivity 0.4
```

Sensitivity is the parameter that enables trading miss rate for the false alarm rate. It is a floating point number within `[0, 1]`. A higher sensitivity reduces the miss rate at the cost of increased false alarm rate.

### Microphone Demo

The microphone demo opens an audio stream from a microphone and performs inference on spoken commands:

```console
go run micdemo/rhino_mic_demo.go -context_path "/path/to/context/file.rhn"
```

It is possible that the default audio input device is not the one you wish to use. There are a couple
of debugging facilities baked into the demo application to solve this. First, type the following into the console:
```console
go run micdemo/rhino_mic_demo.go -show_audio_devices
```

It provides information about various audio input devices on the box. On a is an example output from a Windows machine:

```console
Capture Devices
    0: Microphone Array (Realtek(R) Audio)
    1: Microphone (USB Audio Device)
``` 

You can use the device index to specify which microphone to use for the demo. For instance, if you want to use the USB microphone in the above example, you can invoke the demo application as below:

```console
go run micdemo/rhino_mic_demo.go -context_path "/path/to/context/file.rhn" -audio_device_index 1
```

If the problem persists we suggest storing the recorded audio into a file for inspection. This can be achieved with:

```console
go run micdemo/rhino_mic_demo.go -context_path "/path/to/context/file.rhn" -audio_device_index 1 -output_path ./test.wav
```

If after listening to stored file there is no apparent problem detected please open an issue.
