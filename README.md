# Rhino

Made in Vancouver, Canada by [Picovoice](https://picovoice.ai)

Rhino is Picovoice's Speech-to-Intent engine. It translates speech commands into structured data representing user's
intention. For example, given a speech command *Can I have a small double-shot espresso with two sugars and no milk* it
will infer the intent and outputs the following structured data that can be used to take an action.

```json
{
  "product": "espresso",
  "size": "small",
  "# shots": "double shot",
  "sugar": "two sugars",
  "milk": "no milk"
}
```

Rhino is

* intuitive. It allows users to utter their intention in a natural and conversational fashion.
* using deep neural networks trained in **real-world situations**.
* compact and computationally-efficient making it suitable for **IoT** applications. It can run with as low as 100 KB of RAM.
* cross-platform. Currently **Android**, **iOS**, **Raspberry Pi**, **ARM Cortex-A**, **ARM Cortex-M**, and
a growing number of embedded platforms are supported.
* customizable. It can be customized for any given domain (set of commands).

## Table of Contents
* [Try It Out](#try-it-out)
* [Motivation](#motivation)
* [Terminology](#terminology)
* [Structure of Repository](#structure-of-repository)
* [Running Demo Applications](#running-demo-applications)
    * [Running Python Demo Application](#running-python-demo-application)
* [Integration](#integration)
    * [Python](#python)
    * [C](#c)
* [Releases](#releases)
* [License](#license)

## Try It Out

Try out Rhino using its [interactive web demo](https://picovoice.ai/products/#speech-to-intent-demo). You need a working microphone.

## Motivation

A good number of use-cases when building voice-enabled products revolves around understanding speech commands within a
specific (limited) domain. For example, smart home alliances, mobile applications, etc. Rhino is a tight combination of
speech-to-text and natural-language-understanding engines that are optimized to work for a specific domain. Rhino is quite
lean and can run on small embedded processors with very limited RAM (as low as 100 KB) making it ideal for IoT applications.
Furthermore, it can understand potentially unlimited number of commands within a specific domain. For example for coffee maker
example above it can correctly recognize the following commands

* can I have a latte?
* make me a single-shot espresso.
* I want a triple-shot americano with milk.
* may I have a large cappuccino with cream?

## Terminology

## Structure of Repository

Rhino is shipped as an ANSI C shared library. The binary files for supported platforms are located under [lib](/lib)
and header files are at [include](/include). Bindings are available at [binding](/binding) to facilitate usage from higher-level
languages/platforms. Demo applications are at [demo](/demo). When possible, use one of the demo applications as a
starting point for your own implementation. Finally, [resources](resources) is a placeholder for data used by various
applications within the repository.

## Running Demo Applications

### Running Python Demo Application

This demo application allows testing Rhino using computer's microphone. It opens an input audio stream, monitors it
using [Porcupine's](https://github.com/Picovoice/Porcupine) library, and when the wake phrase is detected it will extract
the intention within the follow-up command.

The following runs the Rhino engine to translate speech commands in the context of a *coffee maker machine*.
Also, it initializes the Porcupine engine to detect the wake phrase *Alfred*. When the wake phrase is detected the Rhino
starts processing the following speech command and prints out the inferred attributes and their values on the console.

```bash
python demo/python/rhino_demo.py --rhino_context_file_path=resources/contexts/coffee_maker.pv \
--porcupine_keyword_file_path=resources/porcupine/resources/keyword_files/alfred_linux.ppn
```

The following command runs the speech to intent engine within a *smart light* domain with wake phrase set to *Rachel*.


```bash
python demo/python/rhino_demo.py --rhino_context_file_path=resources/contexts/smart_light.pv \
--porcupine_keyword_file_path=resources/porcupine/resources/keyword_files/rachel_linux.ppn
```

## Integration

Below are code snippets showcasing how Rhino can be integrated into different applications.

### C

Rhino is implemented in ANSI C and therefore can be directly linked to C applications. [pv_rhino.h](/include/pv_rhino.h)
header file contains relevant information. An instance of Rhino object can be constructed as follows.

```c
const char *model_file_path = ... // available at lib/common/rhino_params.pv
const char *context_file_path = ... // absolute path to context file for the domain of interest

pv_rhino_object_t *rhino;
const pv_status_t status = pv_rhino_init(model_file_path, context_file_path, &rhino);
if (status != PV_STATUS_SUCCESS) {
    // add error handling code
}
```

Now the handle `rhino` can be used to infer intent from incoming audio stream. Rhino accepts single channel, 16-bit PCM
audio. The sample rate can be retrieved using `pv_sample_rate()`. Finally, Rhino accepts input audio in consecutive chunks
(aka frames) the length of each frame can be retrieved using `pv_rhino_frame_length()`.

```c
extern const int16_t *get_next_audio_frame(void);

while (true) {
    const int16_t *pcm = get_next_audio_frame();

    bool is_finalized;
    pv_status_t status = pv_rhino_process(rhino, pcm, &is_finalized);
    if (status != PV_STATUS_SUCCESS) {
        // add error handling code
    }

    if (is_finalized) {
        bool is_understood;
        status = pv_rhino_is_understood(rhino, &is_understood);
        if (status != PV_STATUS_SUCCESS) {
            // add error handling code
        }

        if (is_understood) {
            const char *intent;
            int num_slots;
            const char **slots;
            const char **values;
            status = pv_rhino_get_intent(rhino, &intent, &num_slots, &slots, &values);
            if (status != PV_STATUS_SUCCESS) {
                // add error handling code
            }

            // add code to take action based on inferred intent and slot values

            free(slots);
            free(values);
        } else {
            // add code to handle unsupported commands
        }

        pv_rhino_reset(rhino);
    }
}
```

When done be sure to release the resources acquired.

```c
pv_rhino_delete(rhino);
```

### Python

[rhino.py](/binding/python/rhino.py) provides a Python binding for Rhino library. Below is a quick demonstration of how
to construct an instance of it.

```python
library_path = ... # absolute path to Rhino's dynamic library
model_file_path = ... # available at lib/common/rhino_params.pv
context_file_path = ... # absolute path to context file for the domain of interest
    
rhino = Rhino(
    library_path=library_path,
    model_file_path=model_file_path,
    context_file_path=context_file_path) 
```

When initialized, valid sample rate can be obtained using `rhino.sample_rate`. Expected frame length
(number of audio samples in an input array) is `rhino.frame_length`. The object can be used to infer intent from spoken
commands as below.

```python
def get_next_audio_frame():
    # add code to get the next audio frame
    pass


while True:
    is_finalized = rhino.process(get_next_audio_frame())

    if is_finalized:
        if rhino.is_understood():
            intent, slot_values = rhino.get_intent()
            # add code to take action based on inferred intent and slot values
        else:
            # add code to handle unsupported commands
            pass

        rhino.reset()
```

Finally, when done be sure to explicitly release the resources as the binding class does not rely on the garbage
collector.

```python
rhino.delete()
```

##Releases

### v1.0.0 November 2nd, 2018

* Initial Release

## License

Everything in this repository is licensed under Apache 2.0 including the contexts available under
[resources/contexts](/resources/contexts). Custom contexts are only provided with the purchase of the commercial license.
In order to inquire about the commercial license send an email to contact@picovoice.ai with a brief description of your
use case.
