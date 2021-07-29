# C Demos

## Compatibility

You need a C99-compatible compiler to build these demos.

## Microphone Demo

## Requirements

**For Windows, MingW is required to run the demo.**

The microphone based demo requires [miniaudio](https://github.com/mackron/miniaudio) for accessing microphone audio data.

## Build

### Linux, macOS, Raspberry Pi

```console
gcc -std=c99 -O3 -o demo/c/rhino_demo_mic -I include demo/c/rhino_demo_mic.c -ldl -lpthread -lm
```

### Windows

```console
gcc -std=c99 -O3 -o demo/c/rhino_demo_mic -I include demo/c/rhino_demo_mic.c
```

## Run

Running the executable without any commandline arguments prints the usage info to the console.

For Linux, macOS, and Raspberry Pi:

```console
./demo/c/rhino_demo_mic
usage : ./demo/c/rhino_demo_mic library_path model_path context_path input_audio_device
        ./demo/c/rhino_demo_mic --show_audio_devices
```

on Windows:

```console
./demo/c/rhino_demo_mic.exe
usage : ./demo/c/rhino_demo_mic.exe library_path model_path context_path input_audio_device
        ./demo/c/rhino_demo_mic.exe --show_audio_devices
```

To show the available audio input devices, on Linux, macOS, Raspberry Pi run:

```console
./demo/c/rhino_demo_mic --show_audio_devices
```

on Windows run:

```console
./demo/c/rhino_demo_mic.exe --show_audio_devices
```

The following commands start up a microphone audio steam and infers follow-on commands within the context of a smart lighting system:

### Linux

```console
./demo/c/rhino_demo_mic lib/linux/x86_64/libpv_rhino.so lib/common/rhino_params.pv \
resources/contexts/linux/smart_lighting_linux.rhn ${AUDIO_DEVICE_INDEX}
```

### macOS

```console
./demo/c/rhino_demo_mic lib/mac/x86_64/libpv_rhino.dylib lib/common/rhino_params.pv \
resources/contexts/mac/smart_lighting_mac.rhn ${AUDIO_DEVICE_INDEX}
```

### RaspberryPi

Replace `${PROCESSOR}` with one of Raspberry Pi's processor defined [here](../../lib/raspberry-pi) (for Raspberry Pi 4 this would
be cortex-a72) and run:

```console
./demo/c/rhino_demo_mic lib/raspberry-pi/${PROCESSOR}/libpv_rhino.so lib/common/rhino_params.pv \
resources/contexts/raspberry-pi/smart_lighting_raspberry-pi.rhn ${AUDIO_DEVICE_INDEX}
```

### Windows

```console
./demo/c/rhino_demo_mic.exe lib/windows/amd64/libpv_rhino.dll lib/common/rhino_params.pv \
resources/contexts/windows/smart_lighting_windows.rhn ${AUDIO_DEVICE_INDEX}
```

Replace `${AUDIO_DEVICE_INDEX}` with the index of the audio device. Once the demo is running, it will start listening
for context. For example, you can say:

> "turn on the lights".

## File Demo

**Note that the demo expect a single-channel WAV file with a sampling rate of 16000 and 16-bit linear PCM encoding. If you
provide a file with incorrect format the demo does not perform any format validation and simply outputs incorrect result.**

Compile by executing the following command from the root of the repository:

```console
gcc -std=c99 -O3 -o demo/c/rhino_demo_file -I include demo/c/rhino_demo_file.c -ldl
```
Running the executable without any commandline arguments prints the usage info to the console as below:

```console
$ ./demo/c/rhino_demo_file
usage : ./demo/c/rhino_demo_file library_path model_path context_path wav_path
```

For example the following processes one of the WAV files under resources folder on  an Ubuntu 18.04:

```console
./demo/c/rhino_demo_file \
lib/linux/x86_64/libpv_rhino.so \
lib/common/rhino_params.pv \
resources/contexts/linux/coffee_maker_linux.rhn \
resources/audio_samples/test_within_context.wav 
```

Which prints the following in the console:

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

The following achieves the same on a Raspberry Pi 4:

```console
./demo/c/rhino_demo_file \
lib/raspberry-pi/cortex-a72/libpv_rhino.so \
lib/common/rhino_params.pv \
resources/contexts/raspberry-pi/coffee_maker_raspberry-pi.rhn \
resources/audio_samples/test_within_context.wav 
```
