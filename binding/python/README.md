# Rhino Speech-to-Intent Engine

Made in Vancouver, Canada by [Picovoice](https://picovoice.ai)

Rhino is Picovoice's Speech-to-Intent engine. It directly infers intent from spoken commands within a given context of
interest, in real-time. For example, given a spoken command *"Can I have a small double-shot espresso with a lot of sugar
 and some milk"*, Rhino infers that the user wants to order a drink with these specifications:

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

* using deep neural networks trained in real-world environments.
* compact and computationally-efficient, making it perfect for IoT.
* self-service. Developers and designers can train custom models using [Picovoice Console](https://picovoice.ai/console/).

## Compatibility

- Python 3
- Runs on Linux (x86_64), Mac (x86_64), Windows (x86_64), Raspberry Pi (all variants), and BeagleBone.

## Installation

```bash
pip3 install pvrhino
```

## Usage

Create an instance of the engine:

```python
import pvrhino

handle = pvrhino.create(context_path='/absolute/path/to/context')
```

Where `context_path` is the absolute path to Speech-to-Intent context created either using
[Picovoice Console](https://picovoice.ai/console/) or one of the default contexts available on Rhino's GitHub repository.

The sensitivity of the engine can be tuned using the `sensitivity` parameter. It is a floating point number within
[0, 1]. A higher sensitivity value results in fewer misses at the cost of (potentially) increasing the erroneous
inference rate.

```python
import pvrhino

handle = pvrhino.create(context_path='/absolute/path/to/context', sensitivity=0.25)
```

When initialized, the valid sample rate is given by `handle.sample_rate`. Expected frame length (number of audio samples
in an input array) is `handle.frame_length`. The engine accepts 16-bit linearly-encoded PCM and operates on
single-channel audio.

```python
def get_next_audio_frame():
    pass

while True:
    is_finalized = rhino.process(get_next_audio_frame())

    if is_finalized:
        inference = rhino.get_inference()
        if not inference.is_understood:
            # add code to handle unsupported commands
            pass
        else:
            intent = inference.intent
            slots = inference.slots
            # add code to take action based on inferred intent and slot values
```

When done resources have to be released explicitly:

```python
handle.delete()
```

## Demos

[pvrhinodemo](https://pypi.org/project/pvrhinodemo/) provides command-line utilities for processing real-time
audio (i.e. microphone) and files using Rhino.
