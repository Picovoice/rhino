# C Demos

## Compatibility

You need a C99-compatible compiler to build these demos.

## Requirements
- The demo requires [CMake](https://cmake.org/) version 3.13 or higher.
- **For Windows Only**: [MinGW](https://www.mingw-w64.org/) is required to build the demo.

## AccessKey

Rhino requires a valid Picovoice `AccessKey` at initialization. `AccessKey` acts as your credentials when using Rhino SDKs.
You can get your `AccessKey` for free. Make sure to keep your `AccessKey` secret.
Signup or Login to [Picovoice Console](https://console.picovoice.ai/) to get your `AccessKey`.

## Build Linux/MacOS

```console
cmake -S demo/c/. -B demo/c/build && cmake --build demo/c/build --target rhino_demo_mic
```

## Build Windows

```console
cmake -S demo/c/. -B demo/c/build -G "MinGW Makefiles" && cmake --build demo/c/build --target rhino_demo_mic
```

## Run

### Usage

Running the executable without any commandline arguments prints the usage info to the console.

#### Linux, macOS, Raspberry Pi, BeagleBone, Jetson

```console
./demo/c/build/rhino_demo_mic
Usage : ./demo/c/build/rhino_demo_mic -a ACCESS_KEY -l LIBRARY_PATH -m MODEL_PATH -c CONTEXT_PATH [-d AUDIO_DEVICE_INDEX] [-t SENSITIVITY]  [-u, --endpoint_duration_sec] [-e, --require_endpoint (true,false)]
        ./demo/c/build/rhino_demo_mic [-s, --show_audio_devices]
```

#### Windows

```console
.\\demo\\c\\build\\rhino_demo_mic.exe
Usage : .\\demo\\c\\build\\rhino_demo_mic.exe -a ACCESS_KEY -l LIBRARY_PATH -m MODEL_PATH -c CONTEXT_PATH [-d AUDIO_DEVICE_INDEX] [-t SENSITIVITY]  [-u, --endpoint_duration_sec] [-e, --require_endpoint (true,false)]
        .\\demo\\c\\build\\rhino_demo_mic.exe [-s, --show_audio_devices]
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
lighting system. Replace `${AUDIO_DEVICE_INDEX}` with the index of the audio device and `${ACCESS_KEY}` with your
Picovoice AccessKey.

#### Linux

```console
./demo/c/build/rhino_demo_mic -l lib/linux/x86_64/libpv_rhino.so -m lib/common/rhino_params.pv \
-c resources/contexts/linux/smart_lighting_linux.rhn -d ${AUDIO_DEVICE_INDEX} -a ${ACCESS_KEY}
```
#### macOS (x86_64, arm64)

```console
./demo/c/build/rhino_demo_mic -l lib/mac/${PROCESSOR}/libpv_rhino.dylib -m lib/common/rhino_params.pv \
-c resources/contexts/mac/smart_lighting_mac.rhn -d ${AUDIO_DEVICE_INDEX} -a ${ACCESS_KEY}
```

#### Raspberry Pi

Replace `${PROCESSOR}` with one of the Raspberry Pi processors defined [here](../../lib/raspberry-pi)
(e.g., for Raspberry Pi 4 this would be "cortex-a72") and run:

```console
./demo/c/build/rhino_demo_mic -l lib/raspberry-pi/${PROCESSOR}/libpv_rhino.so -m lib/common/rhino_params.pv \
-c resources/contexts/raspberry-pi/smart_lighting_raspberry-pi.rhn -d ${AUDIO_DEVICE_INDEX} -a ${ACCESS_KEY}
```

#### BeagleBone

```console
./demo/c/build/rhino_demo_mic -l lib/beaglebone/libpv_rhino.so -m lib/common/rhino_params.pv \
-c resources/contexts/beaglebone/smart_lighting_beaglebone.rhn -d ${AUDIO_DEVICE_INDEX} -a ${ACCESS_KEY}
```

#### Jetson

```console
./demo/c/build/rhino_demo_mic -l lib/jetson/cortex-a57-aarch64/libpv_rhino.so -m lib/common/rhino_params.pv \
-c resources/contexts/jetson/smart_lighting_jetson.rhn -d ${AUDIO_DEVICE_INDEX} -a ${ACCESS_KEY}
```

#### Windows

```console
.\\demo\\c\\build\\rhino_demo_mic.exe -l lib/windows/amd64/libpv_rhino.dll -m lib/common/rhino_params.pv -c resources/contexts/windows/smart_lighting_windows.rhn -d ${AUDIO_DEVICE_INDEX} -a ${ACCESS_KEY}
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
Usage : ./demo/c/build/rhino_demo_file -a ACCESS_KEY -l LIBRARY_PATH -m MODEL_PATH -c CONTEXT_PATH -w WAV_PATH [-t SENSITIVITY] [-u, --endpoint_duration_sec] [-e, --require_endpoint (true,false)]
```

#### Windows

```console
.\\demo\\c\\build\\rhino_demo_file.exe
usage : .\\demo\\c\\build\\rhino_demo_file.exe -a ACCESS_KEY -l LIBRARY_PATH -m MODEL_PATH -c CONTEXT_PATH -w WAV_PATH [-t SENSITIVITY] [-u, --endpoint_duration_sec] [-e, --require_endpoint (true,false)]
```

### Follow-on Commands

**Note that the demo expects a single-channel WAV file with a sampling rate of 16kHz and 16-bit linear PCM encoding. If you
provide a file with incorrect format the demo does not perform any format validation and simply outputs incorrect results.**

The following processes a WAV file under the [audio_samples](../../resources/audio_samples) directory and infers the intent 
in the context of a coffee-maker system. Replace `${ACCESS_KEY}` with your Picovoice AccessKey.

#### Linux

```console
./demo/c/build/rhino_demo_file -l lib/linux/x86_64/libpv_rhino.so -m lib/common/rhino_params.pv \
-c resources/contexts/linux/coffee_maker_linux.rhn -w resources/audio_samples/test_within_context.wav -a ${ACCESS_KEY}
```

#### macOS (x86_64, arm64)

```console
./demo/c/build/rhino_demo_file -l lib/mac/${PROCESSOR}/libpv_rhino.dylib -m lib/common/rhino_params.pv \
-c resources/contexts/mac/coffee_maker_mac.rhn -w resources/audio_samples/test_within_context.wav -a ${ACCESS_KEY}
```

#### Raspberry Pi

Replace `${PROCESSOR}` with one of the Raspberry Pi processors defined [here](../../lib/raspberry-pi)
(e.g., for Raspberry Pi 4 this would be "cortex-a72") and run:

```console
./demo/c/build/rhino_demo_file -l lib/raspberry-pi/${PROCESSOR}/libpv_rhino.so -m lib/common/rhino_params.pv \
-c resources/contexts/raspberry-pi/coffee_maker_raspberry-pi.rhn -w resources/audio_samples/test_within_context.wav -a ${ACCESS_KEY} 
```

#### BeagleBone

```console
./demo/c/build/rhino_demo_file -l lib/beaglebone/libpv_rhino.so -m lib/common/rhino_params.pv \
-c resources/contexts/beaglebone/coffee_maker_beaglebone.rhn -w resources/audio_samples/test_within_context.wav -a ${ACCESS_KEY}
```

#### Jetson

```console
./demo/c/build/rhino_demo_file -l lib/jetson/cortex-a57-aarch64/libpv_rhino.so -m lib/common/rhino_params.pv \
-c resources/contexts/jetson/coffee_maker_jetson.rhn -w resources/audio_samples/test_within_context.wav -a ${ACCESS_KEY} 
```

#### Windows

```console
.\\demo\\c\\build\\rhino_demo_file.exe -l lib/windows/amd64/libpv_rhino.dll -m lib/common/rhino_params.pv -c resources/contexts/windows/coffee_maker_windows.rhn -w resources/audio_samples/test_within_context.wav -a ${ACCESS_KEY}
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
