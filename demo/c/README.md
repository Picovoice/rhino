# C Demos

## Compatibility

You need a C99-compatible compiler to build these demos.

## Requirements
- The demo requires [CMake](https://cmake.org/) version 3.4 or higher.
- The microphone based demo requires [miniaudio](https://github.com/mackron/miniaudio) for accessing microphone audio data.
- The following demo must be run at the [root](/../../) of the directory.
- **For Windows Only**: [MinGW](http://mingw-w64.org/doku.php) is required to build the demo.

# Microphone Demo

## Build

```console
cmake -S demo/c/. -B demo/c/build && cmake --build demo/c/build --target rhino_demo_mic
```

## Run

### Usage

Running the executable without any commandline arguments prints the usage info to the console.

#### Linux, macOS, Raspberry Pi, BeagleBone, Jetson

```console
./demo/c/rhino_demo_mic
usage : ./demo/c/rhino_demo_mic library_path model_path context_path audio_device_index
        ./demo/c/rhino_demo_mic --show_audio_devices
```

#### Windows

```console
.\\demo\\c\\build\\rhino_demo_mic.exe
usage : .\\demo\\c\\build\\rhino_demo_mic.exe library_path model_path keyword_path sensitivity audio_device_index
        .\\demo\\c\\build\\rhino_demo_mic.exe --show_audio_devices
```

### Show Audio Devices

The following commands shows the available audio input devices to the console.

#### Linux, macOS, Raspberry Pi, BeagleBone, Jetson

```console
./demo/c/build/rhino_demo_mic --show_audio_devices
```

#### Windows

```console
.\\demo\\c\\build\\rhino_demo_mic.exe --show_audio_devices
```

### Follow-on Commands

The following commands start up a microphone audio stream and infers follow-on commands within the context of a smart 
lighting system. Replace `${AUDIO_DEVICE_INDEX}` with the index of the audio device.

#### Linux

```console
./demo/c/rhino_demo_mic lib/linux/x86_64/libpv_rhino.so lib/common/rhino_params.pv \
resources/contexts/linux/smart_lighting_linux.rhn ${AUDIO_DEVICE_INDEX}
```
#### macOS

```console
./demo/c/rhino_demo_mic lib/mac/x86_64/libpv_rhino.dylib lib/common/rhino_params.pv \
resources/contexts/mac/smart_lighting_mac.rhn ${AUDIO_DEVICE_INDEX}
```

#### Raspberry Pi

Replace `${PROCESSOR}` with one of the Raspberry Pi processors defined [here](../../lib/raspberry-pi)
(e.g., for Raspberry Pi 4 this would be "cortex-a72") and run:

```console
./demo/c/rhino_demo_mic lib/raspberry-pi/${PROCESSOR}/libpv_rhino.so lib/common/rhino_params.pv \
resources/contexts/raspberry-pi/smart_lighting_raspberry-pi.rhn ${AUDIO_DEVICE_INDEX}
```

#### BeagleBone

```console
./demo/c/rhino_demo_mic lib/beaglebone/libpv_rhino.so lib/common/rhino_params.pv \
resources/contexts/beaglebone/smart_lighting_raspberry-pi.rhn ${AUDIO_DEVICE_INDEX}
```

#### Jetson

```console
./demo/c/rhino_demo_mic lib/jetson/cortex-a57-aarch64/libpv_rhino.so lib/common/rhino_params.pv \
resources/contexts/jetson/smart_lighting_raspberry-pi.rhn ${AUDIO_DEVICE_INDEX}
```

#### Windows

```console
.\\demo\\c\\build\\rhino_demo_mic.exe lib/windows/amd64/libpv_rhino.dll lib/common/rhino_params.pv resources/contexts/windows/smart_lighting_windows.rhn ${AUDIO_DEVICE_INDEX}
```

Once the demo is running, it will start listening for context. For example, you can say:

> "Turn on the lights."

If understood correctly, the following prints to the console:

```
{
    'is_understood' : 'true',
    'intent' : 'changeLightState',
    'slots' : {
        'state' : 'on',
    }
}
```

# File Demo

## Build

```console
cmake -S demo/c/. -B demo/c/build && cmake --build demo/c/build --target rhino_demo_file
```

## Run

### Usage

Running the executable without any commandline arguments prints the usage info to the console.

#### Linux, macOS, Raspberry Pi, BeagleBone, Jetson

```console
./demo/c/build/rhino_demo_file 
usage : ./demo/c/build/rhino_demo_file library_path model_path context_path wav_path
```

#### Windows

```console
.\\demo\\c\\build\\rhino_demo_file.exe
usage : .\\demo\\c\\build\\rhino_demo_file.exe library_path model_path context_path wav_path
```

### Follow-on Commands

**Note that the demo expects a single-channel WAV file with a sampling rate of 16kHz and 16-bit linear PCM encoding. If you
provide a file with incorrect format the demo does not perform any format validation and simply outputs incorrect results.**

The following processes a WAV file under the [audio_samples](/resources/audio_samples/) directory and infers the intent 
in the context of a smart lighting system.

#### Linux

```console
./demo/c/rhino_demo_file lib/linux/x86_64/libpv_rhino.so lib/common/rhino_params.pv \
resources/contexts/linux/coffee_maker_linux.rhn resources/audio_samples/test_within_context.wav 
```

#### macOS

```console
./demo/c/rhino_demo_file lib/mac/x86_64/libpv_rhino.dylib lib/common/rhino_params.pv \
resources/contexts/mac/coffee_maker_mac.rhn resources/audio_samples/test_within_context.wav 
```

#### Raspberry Pi

Replace `${PROCESSOR}` with one of the Raspberry Pi processors defined [here](../../lib/raspberry-pi)
(e.g., for Raspberry Pi 4 this would be "cortex-a72") and run:

```console
./demo/c/rhino_demo_file lib/raspberry-pi/${PROCESSOR}/libpv_rhino.so lib/common/rhino_params.pv \
resources/contexts/raspberry-pi/coffee_maker_raspberry-pi.rhn resources/audio_samples/test_within_context.wav 
```

#### BeagleBone

```console
./demo/c/rhino_demo_file lib/beaglebone/libpv_rhino.so lib/common/rhino_params.pv \
resources/contexts/beaglebone/coffee_maker_beaglebone.rhn resources/audio_samples/test_within_context.wav 
```

#### Jetson

```console
./demo/c/rhino_demo_file lib/jetson/cortex-a57-aarch64/libpv_rhino.so lib/common/rhino_params.pv \
resources/contexts/jetson/coffee_maker_jetson.rhn resources/audio_samples/test_within_context.wav 
```

#### Windows

```console
.\\demo\\c\\build\\rhino_demo_file.exe lib/windows/amd64/libpv_rhino.dll lib/common/rhino_params.pv resources/contexts/windows/coffee_maker_windows.rhn resources/audio_samples/test_within_context.wav
```

The following prints to the console:

```console
{
  'is_understood' : 'true',
  'intent' : 'orderBeverage'
  'slots' : {
    'size' : 'medium',
    'numberOfShots' : 'double shot',
    'beverage' : 'americano',
  }
}

real time factor : 0.011
```
