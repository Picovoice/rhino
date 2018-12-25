## C Demo

This demo is intended to show how to integrate Rhino into C/C++ applications. Furthermore it serves as a tool to measure
average CPU usage when running Rhino on different platforms.

## Build

The following command compiles the demo. It has been tested on Ubuntu 16.04/18.04 and different variants of
Raspberry Pi. Note that you need to execute this from the root of the repository.

```bash
gcc -O3 -o demo/c/rhino_demo -I include demo/c/rhino_demo.c -lm -ldl --std-=c99
```

## Run

The demo accepts a few command line arguments including the WAV file to be processed. Running the executable without
providing any arguments will print out the usage string. The following are examples of running the demo utility on a
number of supported platforms.

### Linux (x86_64)

```bash
./demo/c/rhino_demo lib/linux/x86_64/libpv_rhino.so lib/common/rhino_params.pv \
resources/contexts/linux/coffee_maker_linux.rhn resources/audio_samples/test_within_context.wav
```

This will print out the following into the console.


```bash
'orderDrink'
'sugarAmount': 'some sugar'
'milkAmount': 'lots of milk'
'coffeeDrink': 'americano'
'numberOfShots': 'double shot'
'size': 'medium'
real time factor is: 0.011928
```

### Raspberry Pi 3

```bash
./demo/c/rhino_demo lib/raspberry-pi/cortex-a53/libpv_rhino.so lib/common/rhino_params.pv \
resources/contexts/raspberrypi/coffee_maker_raspberrypi.rhn resources/audio_samples/test_within_context.wav
```

### Raspberry Pi Zero

```bash
./demo/c/rhino_demo lib/raspberry-pi/arm11/libpv_rhino.so lib/common/rhino_params.pv \
resources/contexts/raspberrypi/coffee_maker_raspberrypi.rhn resources/audio_samples/test_within_context.wav
```