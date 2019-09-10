# Rhino

[![GitHub release](https://img.shields.io/github/release/Picovoice/rhino.svg)](https://github.com/Picovoice/rhino/releases)

Made in Vancouver, Canada by [Picovoice](https://picovoice.ai)

Rhino is Picovoice's Speech-to-Intent engine. It directly infers intent from spoken commands within a given context of
interest, in real-time. For example, given a speech command *"Can I have a small double-shot espresso with a lot of sugar
 and some milk"*, Rhino infers that the user wants to *order a drink* with these specifications:

```json
{
  "type": "espresso",
  "size": "small",
  "numberOfShots": "2",
  "sugar": "a lot",
  "milk": "some"
}
```

Rhino is:

* intuitive. It allows users to utter their intention in a natural and conversational fashion.
* using deep neural networks trained in **real-world situations**.
* compact and computationally-efficient, making it suitable for **IoT** applications. It can run with as little as 90 KB of
RAM on an MCU.
* cross-platform. It is implemented in fixed-point ANSI C. Currently **Raspberry Pi**, **BeagleBone**, **Android**,
**iOS**, **Linux**, **macOS**, **Windows**, and **web browsers** (**WebAssembly**) are supported. Additionally, support for
various **ARM Cortex-A**, **ARM Cortex-M** (M4/M7) and **DSP cores** is available for commercial customers.
* customizable. It can be customized for any given domain.

[![Rhino in Action](https://img.youtube.com/vi/WadKhfLyqTQ/0.jpg)](https://www.youtube.com/watch?v=WadKhfLyqTQ)

## Table of Contents
* [Try It Out](#try-it-out)
* [Metrics](#metrics)
* [Terminology](#terminology)
    * [Context](#context)
    * [Expression](#expression)
    * [Intent](#intent)
    * [Slot](#slot)
* [Structure of Repository](#structure-of-repository)
* [Demo Applications](#demo-applications)
    * [Running the Python Demo Application](#running-the-python-demo-application)
    * [Running the C Demo Application](#running-the-c-demo-application)
    * [Runnning Android Demo Application](#running-android-demo-application)
* [Integration](#integration)
    * [C](#c)
    * [Python](#python)
    * [Android](#android)
* [Releases](#releases)
* [License](#license)
* [FAQ](#faq)

## Try It Out

Try out Rhino using its [interactive web demo](https://picovoice.ai/products/rhino.html). You need a working
microphone.

## Metrics

This table shows the average CPU usage on two different platforms: Raspberry Pi Zero and Raspberry Pi 3. You can
recreate this using the [C demo application](/demo/c).

Raspberry Pi Zero | Raspberry Pi 3
:---: | :---:
46.4% | 7.2%

## Terminology

### Context

A context defines the set of spoken commands that users of the application might say. Additionally, it maps each spoken
command to users' intent. For example, when building a smart lighting system:

* Turn off the lights
* Make the bedroom light darker
* Set the lights in the living room to purple

### Expression

A context is made of a collection of spoken commands mapped to the user's intent. An expression is an entity that defines
a mapping between a (or a set of) spoken commands and its (their) corresponding intent. For example:

* {turnCommand} the lights -> {turnIntent}
* Make the {location} light {intensityChange} -> {changeIntensityIntent}
* Set the lights in the {location} to {color} -> {setColorIntent}

The tokens within curly braces represent variables in spoken commands. They are either the user's intent (e.g. turnIntent)
or can be intent's details (e.g. location).

### Intent

An intent represents what a user wants to accomplish with a spoken command. For example, the intent of the phrase
"*Set the lights in the living room to purple*" is to set the color of lights. In order to take action based on this,
we might need to have more information such as which light or what is the desired color.

### Slot

A slot represents the details of the user's intent. For example, the phrase
"*Set the lights in the living room to purple*" has slots for location (living room)
and color (purple).

## Structure of Repository

Rhino is shipped as an ANSI C shared library. The binary files for supported platforms are located under [lib](/lib)
and header files are at [include](/include). Bindings are available at [binding](/binding) to facilitate usage from higher-level
languages/platforms. Demo applications are at [demo](/demo). When possible, use one of the demo applications as a
starting point for your own implementation. Finally, [resources](resources) is a placeholder for data used by various
applications within the repository.

## Demo Applications

### Running the Python Demo Application

This [demo application](/demo/python) allows testing Rhino using your computer's microphone. It opens an input audio stream,
monitors it using our [Porcupine](https://github.com/Picovoice/porcupine) wake word detection engine, and when the wake
phrase is detected it will extract the intent within the follow-up spoken command using Rhino.

The following command runs the demo application on your machine to infer intent from spoken commands in the context of a
coffee maker. It also initializes the Porcupine engine to detect the wake phrase *Hey Pico*. When the wake
phrase is detected, Rhino starts processing the followup spoken command and prints out the inferred intent and slot
values to the console.

#### Linux

```bash
python demo/python/rhino_demo.py \
--rhino_library_path ./lib/linux/x86_64/libpv_rhino.so \
--rhino_model_file_path ./lib/common/rhino_params.pv \
--rhino_context_file_path ./resources/contexts/linux/coffee_maker_linux.rhn \
--porcupine_library_path ./resources/porcupine/lib/linux/x86_64/libpv_porcupine.so \
--porcupine_model_file_path ./resources/porcupine/lib/common/porcupine_params.pv \
--porcupine_keyword_file_path ./resources/porcupine/resources/keyword_files/linux/hey\ pico_linux.ppn
```

#### macOS

```bash
python3 demo/python/rhino_demo.py \
--rhino_library_path ./lib/mac/x86_64/libpv_rhino.dylib \
--rhino_model_file_path ./lib/common/rhino_params.pv \
--rhino_context_file_path ./resources/contexts/mac/coffee_maker_mac.rhn \
--porcupine_library_path ./resources/porcupine/lib/mac/x86_64/libpv_porcupine.dylib \
--porcupine_model_file_path ./resources/porcupine/lib/common/porcupine_params.pv \
--porcupine_keyword_file_path ./resources/porcupine/resources/keyword_files/mac/hey\ pico_mac.ppn
```

#### Raspberry Pi

```bash
python demo/python/rhino_demo.py \
--rhino_library_path ./lib/raspberry-pi/cortex-a53/libpv_rhino.so \
--rhino_model_file_path ./lib/common/rhino_params.pv \
--rhino_context_file_path ./resources/contexts/raspberrypi/coffee_maker_raspberrypi.rhn \
--porcupine_library_path ./resources/porcupine/lib/raspberry-pi/cortex-a53/libpv_porcupine.so \
--porcupine_model_file_path ./resources/porcupine/lib/common/porcupine_params.pv \
--porcupine_keyword_file_path ./resources/porcupine/resources/keyword_files/raspberrypi/hey\ pico_raspberrypi.ppn
```

### Running the C Demo Application

The [C demo application](demo/c) is mainly used to show how Rhino can be integrated into an efficient C/C++ application.
Furthermore, it can be used to measure runtime metrics of the engine on various supported platforms.

### Running Android Demo Application

Using Android Studio, open [demo/android](/demo/android) as an Android project and then run the application. Note that
you will need an Android phone (with developer options enabled) connected to your machine.

## Integration

Below are code snippets showcasing how Rhino can be integrated into different applications.

### C

Rhino is implemented in ANSI C and therefore can be directly linked to C applications. The [pv_rhino.h](/include/pv_rhino.h)
header file contains relevant information. An instance of the Rhino object can be constructed as follows.

```c
const char *model_file_path = ... // available at lib/common/rhino_params.pv
const char *context_file_path = ... // absolute path to context file for the domain of interest

pv_rhino_object_t *rhino;
const pv_status_t status = pv_rhino_init(model_file_path, context_file_path, &rhino);
if (status != PV_STATUS_SUCCESS) {
    // add error handling code
}
```

Now the handle `rhino` can be used to infer intent from an incoming audio stream. Rhino accepts single channel, 16-bit PCM
audio. The sample rate can be retrieved using `pv_sample_rate()`. Finally, Rhino accepts input audio in consecutive chunks
(frames); the length of each frame can be retrieved using `pv_rhino_frame_length()`.

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

When done, remember to release the resources acquired.

```c
pv_rhino_delete(rhino);
```

### Python

[rhino.py](/binding/python/rhino.py) provides a Python binding for Rhino library. Below is a quick demonstration of how
to initialize an instance:

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
commands as below:

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

Finally, when done, be sure to explicitly release the resources; the binding class does not rely on the garbage
collector.

```python
rhino.delete()
```

### Android

Rhino provides a binding for Android using JNI. It can be initialized using:

```java
    final String modelFilePath = ... // It is available at lib/common/rhino_params.pv
    final String contextFilePath = ...
    
    Rhino rhino = new Rhino(modelFilePath, contextFilePath);
```

Once initialized, `rhino` can be used for intent inference:


```java
    private short[] getNextAudioFrame();

    while (rhino.process(getNextAudioFrame()));
    
    if (rhino.isUnderstood()) {
        RhinoIntent intent = rhino.getIntent();
        // logic to perform an action given the intent object.
    } else {
        // logic for handling out of context or unrecognized command
    }
```

When finished processing, be sure to reset the object before processing a new stream of audio via:

```java
    rhino.reset()
```

Finally, prior to exiting the application be sure to release resources acquired via:

```java
    rhino.delete()
```

## Releases

### v1.2.0 April 26, 2019

* Accuracy improvements.
* Runtime optimizations.

### v1.1.0 December 23rd, 2018

* Accuracy improvements.
* Open-sourced Raspberry Pi build.

### v1.0.0 November 2nd, 2018

* Initial Release

## License

Everything in this repository is licensed under Apache 2.0 including the contexts available under
[resources/contexts](/resources/contexts).

Custom contexts are only provided with the purchase of the commercial license. To enquire about commercial
licensing, [contact us](https://picovoice.ai/contact.html).

## FAQ

**[Q] Which speech product should I use?**

**[A]** If you need to recognize a single phrase or a number of (tens or less) of predefined phrases, in an
always-listening fashion, then you should use Porcupine (wake word engine). If you need to recognize complex voice
commands within a confined and well-defined domain with limited number of vocabulary and variations of spoken forms
(1000s or less), then you should use [Rhino](https://github.com/Picovoice/rhino) (speech-to-intent engine). If you need
to transcribe free-form speech in an open-domain, then you should use [Cheetah](https://github.com/Picovoice/cheetah)
(speech-to-text engine).

**[Q] What are the benefits of implementing voice interfaces on-device, instead of using cloud services?**

**[A]** Privacy, minimal latency, improved reliability, runtime efficiency, cost saving to name a few. More detail is
available [here](https://picovoice.ai/blog/the_case_for_voice_ai_on_the_edge.html).

**[Q] Does Picovoice technology work in far-field applications?**

**[A]** It depends on many factors including the distance, ambient noise level, reverberation (echo), quality of
microphone, and audio frontend used (if any). It is recommended to try out our technology using the freely-available
sample models in your environment. Additionally, we often publish open-source benchmarks of our technology in noisy
environments [1](https://github.com/Picovoice/wakeword-benchmark)
[2](https://github.com/Picovoice/speech-to-intent-benchmark) [3](https://github.com/Picovoice/stt-benchmark). If the
target environment is noisy and/or reverberant and user is few meters away from the microphone, a multi-microphone audio
frontend can be beneficial.

**[Q] Does Picovoice software work in my target environment and noise conditions?**

**[A]** It depends on variety of factors. You should test it out yourself with the free samples made available on
Picovoice GitHub pages. If it does not work, we can fine-tune it for your target environment.

**[Q] Does Picovoice software work in presence of noise and reverberation?**

**[A]** Picovoice software is designed to function robustly in presence of noise and reverberations. We have benchmarked
and published the performance results under various noisy conditions [1](https://github.com/Picovoice/wakeword-benchmark)
[2](https://github.com/Picovoice/speech-to-intent-benchmark) [3](https://github.com/Picovoice/stt-benchmark).
The end-to-end performance depends on the type and amount of noise and reverberation. We highly recommend testing out
the software using freely-available models in your target environment and application.

**[Q] Can I use Picovoice software for telephony applications?**

**[A]** We expect audio with 16000 sampling rate. PSTN networks usually sample at 8000 rate. It is possible to
upsample but then the frequency content above 4000 is gone and performance will be suboptimal. It is possible to train
acoustic models for telephony applications if the commercial opportunity is justified.

**[Q] My audio source is 48kHz/44.1KHz. Does Picovoice software support that?**

**[A]** Picovoice software expects a 16000Hz sampling rate. You will need to resample (downsample). Typically,
operating systems or sound cards (Audio codecs) provide such functionality; otherwise, you will need to implement it.

**[Q] Can Picovoice help with building my voice enabled product?**

**[A]** Our core business is software licensing. That being said, we do have a wide variety of expertise internally
in voice, software, and hardware. We consider such requests on a case-by-case basis and assist clients who can
guarantee a certain minimum licensing volume.


**[Q] If I am using GitHub to evaluate the software, do you provide technical support?**

**[A]** Prior to commercial engagement, basic support solely pertaining to software issues or bugs is provided via
GitHub issues by the open-source community or a member of our team. We do not offer any free support with integration
or support with any platform (either operating system or hardware) that is not officially supported via GitHub.

**[Q] Why does Picovoice have GitHub repositories?**

**[A]** To facilitate performance evaluation, for commercial prospects, and also enable open source community to
take advantage of the technology for personal and non-commercial applications.

**[Q] What is the engagement process?**

**[A]** You may use what is available on GitHub while respecting its governing license terms without engaging with us.
This facilitates performance evaluation. Then you need to acquire a development license to get access to custom speech
models or use the software for development and internal evaluation within a company. Development license is for
building a PoC or prototype. When ready to commercialize you need to acquire a commercial license. The terms depend
on your vertical.

**[Q] Does Picovoice offer AEC, VAD, noise suppression, or microphone array beamforming?**

**[A]** No. But we do have partners who provide such algorithms. Please add this to your inquiry when reaching out
and we can connect you.

**[Q] Can you build a voice-enabled app for me?**

**[A]** We do not provide software development services, so most likely the answer is no.  However, via a professional
services agreement we can help with proofs-of-concept (these will typically be rudimentary apps focused on voice user
interface or building the audio pipeline), evaluations on a specific domain/task, integration of SDK in your app,
training of custom acoustic and language models, and porting to custom hardware platforms.

**[Q] How many commands (expressions) can Picovoice speech-to-intent software understand?**

**[A]** There is no technical limit on the number of commands (expressions) or slot values Picovoice speech-to-intent
software can understand. However, on platforms with limited memory (MCUs or DSPs), the total number of commands and
vocabulary will be dictated by the available amount of memory. Roughly speaking, for 100 commands and unique words,
you should allocate around 50KB of additional memory.

**[Q] Which languages does Rhino speech-to-intent support?**

**[A]** At the moment, we only support the English language. For significant commercial opportunities, we may be able to
prioritize and partially reinvest commercial license fees into supporting new languages for customers.

**[Q] What is Rhino speech-to-intent detection accuracy?**

**[A]** Picovoice has done rigorous performance benchmarking on its Rhino speech-to-intent engine and published the results
publicly [here](https://github.com/Picovoice/speech-to-intent-benchmark). In addition, the audio data and the code used
for benchmarking have been made publicly available under the Apache 2.0 license to allow for the results to be reproduced

Rhino speech-to-intent engine can extract intents from spoken utterances with higher than 97% accuracy in clean (no noise)
environments, and 92% accuracy in noisy environments with signal to noise ratio of 9dB at microphone level.

**[Q] Can Rhino understand phone numbers, time of day, dates, alphanumerics, etc?**

**[A]** Yes, Rhino can accurately understand numbers, alphanumerics, and similar challenging parameters.
[Here](https://www.youtube.com/watch?v=T0tAnh8tUQg) is a demo of phone dialing interaction running on ARM Cortex-M4 processor
simulating a hearable application:


**[Q] What is required to support additional languages?**

**[A]** Supporting a new language is an involved, time consuming process, and requires substantial investment. For
significant commercial opportunities, we may be able to prioritize and partially reinvest commercial license fees into
supporting new languages for customers. 


**[Q] Which platforms does Rhino speech-to-intent engine support?**

**[A]** Rhino speech-to-intent is supported on Raspberry Pi (all models), BeagleBone, Android, iOS, Linux, macOS,
Windows, and modern web browsers (WebAssembly). Additionally we have support for various ARM Cortex-A and ARM Cortex-M (M4/M7)
MCUs by NXP and STMicro.

As part of our professional service, we can port our software to other proprietary platforms such as DSP cores
or Neural Net accelerators depending on the size of the commercial opportunity. Such engagement typically warrants
non-recurring engineering fees in addition to prepaid commercial royalties.

**[Q] Does Picovoice speech-to-intent software work in my target environment and noise conditions?**

**[A]** The overall performance depends on various factors such as speaker distance, level/type of noise, room acoustics,
quality of microphone, and audio frontend algorithms used (if any). It is usually best to try out our technology 
in your target environment using sample models freely-available. Additionally, we have published an open-source benchmark
of our speech-to-intent software in a noisy environment [here](https://github.com/Picovoice/speech-to-intent-benchmark), which can be used as a reference.

**[Q] Does Picovoice speech-to-intent software work in presence of noise and reverberation?**

**[A]** Yes, Picovoice speech-to-intent engine is resilient to noise, reverberation, and other acoustic artifacts.
We have done rigorous performance benchmarking on Rhino speech-to-intent engine and published the results publicly
[here](https://github.com/Picovoice/speech-to-intent-benchmark). In addition, the audio data and the code used for
benchmarking have been made publicly available under Apache 2.0 license to reproduce the results. The results show 92%
accuracy in a noisy environment with signal to noise ratio of 9dB at microphone level.

**[Q] Is there a limit on the number of slot values?**

**[A]** There is no technical limit on the number of slot values Picovoice speech-to-intent software can understand.
However, on platforms with limited memory (particularly MCUs), the total number will be dictated by the available amount of memory.
Roughly speaking, for 100 unique words/phrases, you should allocate around 50KB of additional memory. 

**[Q] Are there any best practices for designing speech-to-intent context (Interaction model)?**

**[A]** The design process for the Picovoice speech-to-intent interaction model (or context) is similar to designing Alexa skills.
In general, you have to make sure your context follows the common patterns for situational design:

- Adaptability: Let users speak in their own words.
- Personalization: Individualize your entire interaction.
- Availability: Collapse your menus; make all options top-level.
- Relatability: Talk with them, not at them.

**[Q] I need to use speech-to-intent software in an Interactive Voice Response (IVR) application. Is that possible?**

**[A]** Yes. Picovoice speech-to-intent software is a powerful tool for building IVR applications. However, please note
that Picovoice software only works well on 16kHz audio and does not perform optimally in telephony applications that use 8kHz audio.

**[Q] Does Picovoice speech-to-intent software perform endpointing?**

**[A]** Yes, Picovoice speech-to-intent software performs endpointing automatically. 

**[Q] Does my application need to listen to a wake word before processing the audio with speech-to-intent software?**

**[A]** Speech-to-intent software requires a method of initiation to start listening when the user is about to speak.
That could be implemented by either push-to-talk switch or by the Picovoice wake word detection engine, depending on the
customer requirement. 

**[Q] How do I develop a speech-to-intent context model file?**

**[A]** Designing a speech-to-intent context is straightforward and does not require any specialized technical skills.
You need to compile an exhaustive list of all possible utterances/expressions users would say to mean something.
Once you do that, you organize them by intent and identify the variables in each expression.
For example, in a smart lighting application, the user might say:

- "[set, change, switch, make, turn] the bedroom light [to] orange"
- "[set, change, switch, make, turn] the color in bedroom to orange"

**[Q] What’s the advantage of using Picovoice speech-to-intent software instead of using Speech-to-Text and input the transcribed text into an NLU engine to extract intents?**

**[A]** Using a generic speech-to-text engine with NLU usually results in suboptimal accuracy without any tuning.
We have benchmarked the performance of Picovoice speech-to-intent engine against Google’s Dialogflow tool
[here](https://github.com/Picovoice/speech-to-intent-benchmark).
