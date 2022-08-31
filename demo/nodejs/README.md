# Rhino NodeJS Demos

This package provides two demonstration command-line applications for Rhino: a file based demo, which scans a compatible WAV file, and a microphone demo.

## Introduction to Rhino

Rhino is Picovoice's Speech-to-Intent engine. It directly infers intent from spoken commands within a given context of
interest, in real-time. For example, given a spoken command

>Can I have a small double-shot espresso?

Rhino infers that the user wants to order a drink and emits the following inference result:

```json
{
  "isUnderstood": "true",
  "intent": "orderBeverage",
  "slots": {
    "beverage": "espresso",
    "size": "small",
    "numberOfShots": "2"
  }
}
```

Unlike typical NLU inference software, Rhino does _not_ use generic Speech-to-Text transcription, and instead operates on a compact, bespoke model generated for a specific use case; e.g. a coffee maker, or smart home lighting. Unless you deliberately program it to do so, it won't understand phrases like _"tell me a joke"_. Using this approach (combined with Picovoice's proprietary deep learning technology) allows for:

- dramatically improved efficiency (it can even run on tiny microcontrollers)
- accuracy gains from not having to anticipate every possible spoken phrase
- avoiding transcription errors compounding into the intent understanding (e.g. homonyms are much less of an issue, because we probably know which word makes sense).

To learn more about Rhino, see the [product](https://picovoice.ai/products/rhino/), [documentation](https://picovoice.ai/docs/), and [GitHub](https://github.com/Picovoice/rhino/) pages.

## Compatibility

These demos run Rhino on **NodeJS 12+** on the following platforms:

- Windows (x86_64)
- Linux (x86_64)
- macOS (x86_64, arm64)
- Raspberry Pi (2,3,4)
- NVIDIA Jetson (Nano)
- BeagleBone

### Web Browsers

These demos and the bindings upon which they are built are for NodeJS and **do not work in a browser**. Looking to run Rhino in-browser? There are npm packages available for [Web](https://www.npmjs.com/package/@picovoice/rhino-web), and dedicated packages for [Angular](https://www.npmjs.com/package/@picovoice/rhino-angular), [React](https://www.npmjs.com/package/@picovoice/rhino-react), and [Vue](https://www.npmjs.com/package/@picovoice/rhino-vue).

## AccessKey

Rhino requires a valid Picovoice `AccessKey` at initialization. `AccessKey` acts as your credentials when using Rhino SDKs.
You can get your `AccessKey` for free. Make sure to keep your `AccessKey` secret.
Signup or Login to [Picovoice Console](https://console.picovoice.ai/) to get your `AccessKey`.

## Install NPM package

To install the demos and make them available on the command line, use either of the following `yarn` or `npm` commands:

```console
yarn global add @picovoice/rhino-node-demo
```

(or)

```console
npm install -g @picovoice/rhino-node-demo
```

### Run the mic demo

Using the 'global' install methods above should add `rhn-mic-demo` to your system path, which we can use to run the mic demo.

Select an input audio device to start recording audio:

```console
rhn-mic-demo --show_audio_devices
```

This command prints a list of the available devices and its inputs:

```console
index: 0, device name: USB Audio Device
index: 1, device name: MacBook Air Microphone
```

Specify the input audio device with `--audio_device_index` and the Speech-to-Intent context (.rhn file) with `--context` and provide your Picovoice AccessKey with `--access_key`.

Here is an example using USB Audio Device and commands from the "Smart Lighting" demo from the [Rhino GitHub repository](https://github.com/Picovoice/rhino/blob/master/resources/contexts/) (note that context files are platform-dependent; choose the appropriate one for the platform you are using; this demo uses the "mac" version)

```console
rhn-mic-demo --access_key ${ACCESS_KEY} --context ./smart_lighting_mac.rhn --audio_device_index 0
```

The context source in YAML format will be output to show you the grammar and options that the context supports. The demo will listen for a phrase that the contexts understands, and upon reaching a conclusion (or timeout), it will output the results.

```console
Using device: USB Audio Device
Context info:
-------------
context:
  expressions:
    changeColor:
      - (please) [change, set, switch] (the) $location:location (to) $color:color
      - (please) [change, set, switch] (the) $location:location color (to) $color:color
      - (please) [change, set, switch] (the) $location:location lights (to) $color:color
      ... (etc.) ...

Listening for speech within the context of 'smart_lighting_mac'. Please speak your phrase into the microphone.

# (say e.g. "please turn on the lights in the kitchen")

...

Inference result:
{
    "isUnderstood": true,
    "intent": "changeLightState",
    "slots": {
        "state": "on",
        "location": "kitchen"
    }
}

```

Try running the mic demo again, but this time say something that it is not designed to understand, like "tell me a joke":

```console
rhn-mic-demo access_key ${ACCESS_KEY} --context_path ../../resources/contexts/mac/smart_lighting_mac.rhn  --audio_device_index 0

...

Using device: sof-hda-dsp Digital Microphone
Listening for speech within the context of 'smart_lighting_mac'. Please speak your phrase into the microphone.

# (say e.g. "tell me a joke")

Inference result:
{
    "isUnderstood": false
}
```

### Run the file demo

The file-based demo allows you to scan a compatible wave file with Rhino. Note: **The demo requires 16KHz, 16-bit linear PCM, single-channel (mono) WAV files**.

To run the file-based demo, we need to provide a Speech-to-Intent context along with a path to a compatible WAV file.

We can use a couple of test WAV files that are bundled in the [Rhino GitHub repository](https://github.com/Picovoice/rhino/blob/master/resources/audio_samples/). These are intended to be used with the sample "Coffee Maker" context, also available in the [Rhino GitHub repository](https://github.com/Picovoice/rhino/blob/master/resources/contexts/) (note that context files are platform-dependent; choose the appropriate one for the platform you are using; this demo uses the "mac" version)

Run the file demo, and the successful inference with the intent "orderDrink" along with the specific details are returned:

```console
rhn-file-demo \
access_key ${ACCESS_KEY} \
--context_path ../../resources/contexts/mac/coffee_maker_mac.rhn \
--input_audio_file_path ../../resources/audio_samples/test_within_context.wav

...

Inference result of 'test_within_context.wav' using context 'coffee':
{
    "isUnderstood": true,
    "intent": "orderDrink",
    "slots": {
        "size": "medium",
        "numberOfShots": "double shot",
        "coffeeDrink": "americano",
        "milkAmount": "lots of milk",
        "sugarAmount": "some sugar"
    }
}
```

Trying the file demo on a phrase that the coffee context is not designed to understand (again a sample WAV file from the Rhino GitHub repository):

```console
rhn-file-demo \
access_key ${ACCESS_KEY} \
--context_path ../../resources/contexts/mac/coffee_maker_mac.rhn \
--input_audio_file_path ../../resources/audio_samples/test_out_of_context.wav

...

Inference result of 'test_out_of_context.wav' using context 'coffee':
{
    "isUnderstood": false
}
```

## Common Demo Options

The microphone and file demos both have additional options.

To see the full set of options, use `--help`:

```console
rhn-mic-demo --help
```

```console
rhn-file-demo --help
```

```console
Usage: rhn-mic-demo [options]

Options:
  -c, --context_path <string>       absolute path to rhino context (.rhn extension)
  -a, --access_key <string>         AccessKey obtain from the Picovoice Console (https://console.picovoice.ai/)
  -l, --library_file_path <string>  absolute path to rhino dynamic library
  -m, --model_file_path <string>    absolute path to rhino model
  -s, --sensitivity <number>        sensitivity value between 0 and 1 (default: 0.5)
  -h, --help                        display help for command
```

### Sensitivity

The sensitivity is a floating-point value in the range [0,1] which specifies the tradeoff between miss rate and false alarm. The demo defaults to 0.5. You can override this with `--sensitivity`:

```console
rhn-mic-demo --context_path ../../resources/contexts/mac/coffee_maker_mac.rhn --sensitivity 0.65
```

### Creating a custom Speech-to-Intent context

To design Speech-to-Intent contexts and train them into RHN files, see the [Picovoice Console](https://console.picovoice.ai/).

Files generated with the Picovoice Console carry restrictions including (but not limited to): training allowance, time limits, available platforms, and commercial usage.

### Custom library and model files

You may override the Rhino model and dynamic libraries by specifying their absolute paths with `--model_file_path` and `--library_file_path`, respectively. As with context files, the dynamic library is specific to the platform.

e.g. for macOS (x86_64):

```console
rhn-file-demo \
--access_key ${ACCESS_KEY} \
--input_audio_file_path ../../resources/audio_samples/test_out_of_context.wav \
--context_path ../../resources/contexts/mac/coffee_maker_mac.rhn \
--library_file_path ../../lib/mac/x86_64/libpv_rhino.dylib \
--model_file_path ../../lib/common/rhino_params.pv
```

## Running the demos from the GitHub repository

Use one of `yarn` or `npm` to install the package dependencies from the demo/nodejs folder:

```console
cd demo/nodejs
yarn
```

(or)

```console
cd demo/nodejs
npm install
```

### Microphone demo

Use `yarn mic` (or `npm run mic`) to run the mic demo from the demos/nodejs directory. For `npm run`, note the extra `--` needed before specifying commands. This is to disambiguate whether the options are intended for npm or for the demo script. As before, pick a context that matches the platform you are using (these examples use 'mac'):

```console
yarn mic --access_key ${ACCESS_KEY} --context_path ../../resources/contexts/mac/coffee_maker_mac.rhn
```

(or)

```console
npm run mic -- --access_key ${ACCESS_KEY} --context_path ../../resources/contexts/mac/coffee_maker_mac.rhn
```

### File demo

Use `yarn file` or `npm run file` from the demos/nodejs directory. For `npm run`, note the extra `--` needed before specifying commands. This is to disambiguate whether the options are intended for npm itself, or for the demo script.

```console
yarn file \
--access_key ${ACCESS_KEY} \
--input_audio_file_path ../../resources/audio_samples/test_within_context.wav \
--context_path ../../resources/contexts/mac/coffee_maker_mac.rhn
```

(or)

```console
npm run file -- \
--access_key ${ACCESS_KEY} \
--input_audio_file_path ../../resources/audio_samples/test_within_context.wav \
--context_path ../../resources/contexts/mac/coffee_maker_mac.rhn
```
