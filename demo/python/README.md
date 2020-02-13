# Microphone-Based Demo

This demo uses Picovoice's wake-word engine ([Porcupine](https://github.com/Picovoice/porcupine)) to showcase hands-free
usage of Rhino. The default wake word is "Picovoice" but it can be changed via command-line arguments. In the following,
we assume that commands are executed from the root of the repository. Additionally, you should replace `${SYSTEM}` with
your platform name (e.g. linux, mac, raspberry-pi).

Usage information can be retrieved using

```bash
python3 demo/python/rhino_demo_mic.py --help
```

Run the demo by executing the following from the root of the repository

```bash
python3 demo/python/rhino_demo_mic.py \
--rhino_context_file_path ./resources/contexts/${SYSTEM}/smart_lighting_${SYSTEM}.rhn
```

Then you can issue commands such as "Picovoice, turn off the lights" or
"Picovoice, set the lights in the attic to purple". The full list of available expressions is printed to the console.

## FAQ

#### The demo application does not detect/infer anything. Why?

The most probable cause of this is that the default audio input device recognized by PyAudio is not the one being used.
There are a couple of debugging facilities baked into the demo application to solve this. First, type the following into
the console

```bash
python3 ./demo/python/rhino_demo_mic.py --show_audio_devices_info
```

It provides information about various audio input devices on the box. On a Linux box, this is the console output

```
'index': '0', 'name': 'HDA Intel PCH: ALC892 Analog (hw:0,0)', 'defaultSampleRate': '44100.0', 'maxInputChannels': '2'
'index': '1', 'name': 'HDA Intel PCH: ALC892 Alt Analog (hw:0,2)', 'defaultSampleRate': '44100.0', 'maxInputChannels': '2'
'index': '2', 'name': 'HDA NVidia: HDMI 0 (hw:1,3)', 'defaultSampleRate': '44100.0', 'maxInputChannels': '0'
'index': '3', 'name': 'HDA NVidia: HDMI 1 (hw:1,7)', 'defaultSampleRate': '44100.0', 'maxInputChannels': '0'
'index': '4', 'name': 'HDA NVidia: HDMI 2 (hw:1,8)', 'defaultSampleRate': '44100.0', 'maxInputChannels': '0'
'index': '5', 'name': 'HDA NVidia: HDMI 3 (hw:1,9)', 'defaultSampleRate': '44100.0', 'maxInputChannels': '0'
'index': '6', 'name': 'HDA NVidia: HDMI 0 (hw:2,3)', 'defaultSampleRate': '44100.0', 'maxInputChannels': '0'
'index': '7', 'name': 'HDA NVidia: HDMI 1 (hw:2,7)', 'defaultSampleRate': '44100.0', 'maxInputChannels': '0'
'index': '8', 'name': 'HDA NVidia: HDMI 2 (hw:2,8)', 'defaultSampleRate': '44100.0', 'maxInputChannels': '0'
'index': '9', 'name': 'HDA NVidia: HDMI 3 (hw:2,9)', 'defaultSampleRate': '44100.0', 'maxInputChannels': '0'
'index': '10', 'name': 'Logitech USB Headset: Audio (hw:3,0)', 'defaultSampleRate': '44100.0', 'maxInputChannels': '1'
'index': '11', 'name': 'sysdefault', 'defaultSampleRate': '48000.0', 'maxInputChannels': '128'
'index': '12', 'name': 'front', 'defaultSampleRate': '44100.0', 'maxInputChannels': '0'
'index': '13', 'name': 'surround21', 'defaultSampleRate': '44100.0', 'maxInputChannels': '0'
'index': '14', 'name': 'surround40', 'defaultSampleRate': '44100.0', 'maxInputChannels': '0'
'index': '15', 'name': 'surround41', 'defaultSampleRate': '44100.0', 'maxInputChannels': '0'
'index': '16', 'name': 'surround50', 'defaultSampleRate': '44100.0', 'maxInputChannels': '0'
'index': '17', 'name': 'surround51', 'defaultSampleRate': '44100.0', 'maxInputChannels': '0'
'index': '18', 'name': 'surround71', 'defaultSampleRate': '44100.0', 'maxInputChannels': '0'
'index': '19', 'name': 'pulse', 'defaultSampleRate': '44100.0', 'maxInputChannels': '32'
'index': '20', 'name': 'dmix', 'defaultSampleRate': '48000.0', 'maxInputChannels': '0'
'index': '21', 'name': 'default', 'defaultSampleRate': '44100.0', 'maxInputChannels': '32'
```

It can be seen that the last device (index 21) is considered default. But on this machine, a headset is being used as
the input device which has an index of 10. After finding the correct index the demo application can be invoked as below

```bash
python3 demo/python/rhino_demo_mic.py --input_audio_device_index 10 \
--rhino_context_file_path ./resources/contexts/linux/smart_lighting_linux.rhn
```

If the problem persists we suggest storing the recorded audio into a file for inspection. This can be achieved by

```bash
python3 demo/python/rhino_demo_mic.py --output-path ~/test.wav \
--rhino_context_file_path ./resources/contexts/linux/smart_lighting_linux.rhn
```

# File-Based Demo

This demo processes a given audio file and infers the intent from spoken command within the file. Note that only the
relevant spoken command should be present in the file and no other speech. Also there needs to be at least one second of
silence at the end of the file. Try the demo using

```bash
python3 demo/python/rhino_demo_file.py --input_audio_file_path resources/audio_samples/test_within_context.wav \
--context_file_path resources/contexts/${SYSTEM}/coffee_maker_${SYSTEM}.rhn 
```

Which prints out the following in the console

```bash
intent : orderDrink
sugarAmount: some sugar
milkAmount: lots of milk
coffeeDrink: americano
numberOfShots: double shot
size: medium
```
