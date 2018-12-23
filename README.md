# Rhino

Made in Vancouver, Canada by [Picovoice](https://picovoice.ai)

Rhino is Picovoice's Speech-to-Intent engine. It directly infers intent from speech commands within a given context of
interest in real-time. For example, given a speech command "*Can I have a small double-shot espresso with a lot of sugar
 and some milk*" it infers that the user wants to *order a drink* with the following specific requirements.

```json
{
  "type": "espresso",
  "size": "small",
  "numberOfShots": "2",
  "sugar": "a lot of",
  "milk": "some"
}
```

Rhino is

* intuitive. It allows users to utter their intention in a natural and conversational fashion.
* using deep neural networks trained in **real-world situations**.
* compact and computationally-efficient making it suitable for **IoT** applications. It can run with as low as 100 KB of RAM.
* cross-platform. It is implemented in fixed-point ANSI C. Currently **ARM Cortex-M**, **ARM Cortex-A**,
**Raspberry Pi**, **Android**, **iOS**, **watchOS**, **Linux**, **Mac**, **Windows**, and **web browsers** are supported.
* customizable. It can be customized for any given domain.

NOTE: Currently only Linux and Raspberry Pi builds are available to the open-source community. But we do have plans to
make other platforms available as well in upcoming releases.

## Table of Contents
* [Try It Out](#try-it-out)
* [Motivation](#motivation)
* [Terminology](#terminology)
    * [Context](#context)
    * [Expression](#expression)
    * [Intent](#intent)
    * [Slot](#slot)
* [Structure of Repository](#structure-of-repository)
* [Running Demo Applications](#running-demo-applications)
    * [Running Python Demo Application](#running-python-demo-application)
* [Integration](#integration)
    * [C](#c)
    * [Python](#python)
* [Releases](#releases)
* [License](#license)

## Try It Out

Try out Rhino using its [interactive web demo](https://picovoice.ai/products/#speech-to-intent-demo). You need a working
microphone.

## Motivation

A significant number of use-cases when building voice-enabled products revolves around understanding spoken commands within a
specific domain. Smart home, appliances, infotainment systems, command and control for mobile applications, etc are a
few examples. The current solutions use a domain-specific natural language understanding (NLU) engine on top of a
generic speech recognition system. This approach is computationally expensive and if not delegated to cloud services
requires significant CPU and memory for on-device implementation.

Rhino solves this problem by providing tightly-coupled speech recognition and NLU engine that are jointly optimized
for a specific domain (use case). Rhino is quite lean and can even run on small embedded processors
(think ARM Cortex-M or fixed-point DSPs) with very limited RAM (as low as 100 KB) making it ideal for
resource-constrained IoT applications.

## Terminology

Below we define a set of terms that form the main ideas around how Rhino functions.

### Context

A context defines the set of spoken commands that users of the application might say. Additionally, it maps each spoken
command to users' intent. For example, when building a smart lighting system the following are a few examples
of spoken commands:

* Turn off the lights.
* Make the bedroom light darker
* Set the lights in the living room to purple.
* ...

### Expression

A context is made of a collection of spoken commands mapped to the user's intent. An expression is an entity that defines a mapping between
a (or a set of) spoken commands and its (their) corresponding intent. For example

* {turnCommand} the lights. -> {turnIntent}
* Make the {location} light {intensityChange}. -> {changeIntensityIntent}
* Set the lights in the {location} to {color} -> {setColorIntent}

The tokens within curly braces represent variables in spoken commands. They are either the user's intent (e.g. turnIntent)
or can be intent's details (e.g. location). More on this is below.

### Intent

An intent represents what a user wants to accomplish with a spoken command. For example the intent of the phrase
"*Set the lights in the living room to purple*" is to set the color of lights. Now in order to take action based on ,
we might need to have more information such as which light or what is the desired color. More on this below.

### Slot

A slot represents the details of the user's intent. For example the intent of the phrase
"*Set the lights in the living room to purple*" is to set the color of lights. and the slots are the location (living room)
and color (purple).

## Structure of Repository

Rhino is shipped as an ANSI C shared library. The binary files for supported platforms are located under [lib](/lib)
and header files are at [include](/include). Bindings are available at [binding](/binding) to facilitate usage from higher-level
languages/platforms. Demo applications are at [demo](/demo). When possible, use one of the demo applications as a
starting point for your own implementation. Finally, [resources](resources) is a placeholder for data used by various
applications within the repository.

## Running Demo Applications

### Running Python Demo Application

This [demo application](/demo/python) allows testing Rhino using computer's microphone. It opens an input audio stream,
monitors it using [Porcupine](https://github.com/Picovoice/Porcupine) wake word detection engine, and when the wake
phrase is detected it will extract the intent within the follow-up spoken command using Rhino.

The following runs the demo application on a *Linux* machine to infer intent from spoken commands in the context of a
*coffee maker*. It also initializes the Porcupine engine to detect the wake phrase *Hey Rachel*. When the wake
phrase is detected the Rhino starts processing the followup spoken command and prints out the inferred intent and slot
values on the console.

```bash
python demo/python/rhino_demo.py \
--rhino_library_path ./lib/linux/x86_64/libpv_rhino.so \
--rhino_model_file_path ./lib/common/rhino_params.pv \
--rhino_context_file_path ./resources/contexts/linux/coffee_maker_linux.rhn \
--porcupine_library_path ./resources/porcupine/lib/linux/x86_64/libpv_porcupine.so \
--porcupine_model_file_path ./resources/porcupine/lib/common/porcupine_params.pv \
--porcupine_keyword_file_path ./resources/porcupine/resources/keyword_files/linux/hey_alfred_linux.ppn
```

The following runs the engine on a *Raspberry Pi 3* to infer intent within the context of smart lighting system

```bash
python demo/python/rhino_demo.py \
--rhino_library_path ./lib/linux/raspberry-pi/cortex-a53/libpv_rhino.so \
--rhino_model_file_path ./lib/common/rhino_params.pv \
--rhino_context_file_path ./resources/contexts/raspberrypi/coffee_maker_raspberrypi.rhn \
--porcupine_library_path ./resources/porcupine/lib/raspberry-pi/cortex-a53/libpv_porcupine.so \
--porcupine_model_file_path ./resources/porcupine/lib/common/porcupine_params.pv \
--porcupine_keyword_file_path ./resources/porcupine/resources/keyword_files/raspberrypi/hey_alfred_raspberrypi.ppn
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
(frames) the length of each frame can be retrieved using `pv_rhino_frame_length()`.

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

## Releases

### v1.1.0 December 23rd, 2018

* Accuracy improvements.
* Open-sourced Raspberry Pi build.

### v1.0.0 November 2nd, 2018

* Initial Release

## License

Everything in this repository is licensed under Apache 2.0 including the contexts available under
[resources/contexts](/resources/contexts).

Custom contexts are only provided with the purchase of the commercial license. In order to inquire about the commercial
license [contact us](https://picovoice.ai/company/#contact-us).
