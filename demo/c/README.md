# Compatibility

You need a C99-compatible compiler to build these demos. The microphone based demo can only run on Linux-based systems
(e.g. Ubuntu, Raspberry Pi, and Beagle Bone) as it depends on ALSA.

# Usage

## Microphone-Based

Compile by executing the following command from the root of the repository

```bash
gcc -O3 -o demo/c/rhino_demo_mic -I include -I resources/porcupine/include \
demo/c/rhino_demo_mic.c -ldl -lasound -std=c99
```

Running the executable without any commandline arguments prints the usage info to the console as below

```bash
$ demo/c/rhino_demo_mic
usage : demo/c/rhino_demo_mic library_path model_path context_path input_audio_device
```

Then you need to find the name of audio input device on your machine using `arecord -L` utility.

The following starts an audio steaming from the microphone on an Ubuntu 18.04 machine and infers follow-on commands
within the context of a smart lighting system. For example you can say "turn on the lights"

```bash
demo/c/rhino_demo_mic \
lib/linux/x86_64/libpv_rhino.so \
lib/common/rhino_params.pv \
resources/contexts/linux/smart_lighting_linux.rhn \
plughw:CARD=AK5371
```

The following achieves the same on a Raspberry Pi 4

```bash
demo/c/rhino_demo_mic \
lib/raspberry-pi/cortex-a72/libpv_rhino.so \
lib/common/rhino_params.pv \
resources/contexts/raspberry-pi/smart_lighting_raspberry-pi.rhn \
plughw:CARD=AK5371
```

## File-Based

**Note that the demo expect a single-channel WAV file with a sampling rate of 16000 and 16-bit linear PCM encoding. If you
provide a file with incorrect format the demo does not perform any format validation and simply outputs incorrect result.**

Compile by executing the following command from the root of the repository

```bash
gcc -O3 -o demo/c/rhino_demo_file -I include demo/c/rhino_demo_file.c -ldl -lasound -std=c99
```
Running the executable without any commandline arguments prints the usage info to the console as below

```bash
$ ./demo/c/rhino_demo_file
usage : ./demo/c/rhino_demo_file library_path model_path context_path wav_path
```

For example the following processes one of the WAV files under resources folder on  an Ubuntu 18.04

```bash
./demo/c/rhino_demo_file \
lib/linux/x86_64/libpv_rhino.so \
lib/common/rhino_params.pv \
resources/contexts/linux/coffee_maker_linux.rhn \
resources/audio_samples/test_within_context.wav 
```

Which prints the following in the console

```bash
intent : 'orderDrink'
'sugarAmount' : 'some sugar'
'milkAmount' : 'lots of milk'
'coffeeDrink' : 'americano'
'numberOfShots' : 'double shot'
'size' : 'medium'
real time factor : 0.007
```

The following achieves the same on a Raspberry Pi 4

```bash
./demo/c/rhino_demo_file \
lib/raspberry-pi/cortex-a72/libpv_rhino.so \
lib/common/rhino_params.pv \
resources/contexts/raspberry-pi/coffee_maker_raspberry-pi.rhn \
resources/audio_samples/test_within_context.wav 
```
