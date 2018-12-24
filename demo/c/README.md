## Build

```bash
gcc -O3 -o demo/c/rhino_demo -I include demo/c/rhino_demo.c -lm -ldl
```

## Run

### Linux (x86_64)

```bash
./demo/c/rhino_demo lib/linux/x86_64/libpv_rhino.so lib/common/rhino_params.pv \
resources/contexts/linux/coffee_maker_linux.rhn resources/audio_samples/test_within_context.wav
```

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
TODO

### Raspberry Pi Zero
TODO
