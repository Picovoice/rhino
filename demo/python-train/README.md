# Rhino Speech-to-Intent Train Demo

Made in Vancouver, Canada by [Picovoice](https://picovoice.ai)

This package contains demo on how to use Rhino  Speech-to-Intent Train API.

## Compatibility

- Python 3.9+
- Runs on Linux (x86_64), macOS (x86_64, arm64), Windows (x86_64, arm64), and Raspberry Pi (Zero, 3, 4, 5).

## Installation

```console
pip3 install -r requirements.txt
```

## AccessKey

Rhino requires a valid Picovoice `AccessKey` at initialization. `AccessKey` acts as your credentials when using Rhino SDKs.
You can get your `AccessKey` for free. Make sure to keep your `AccessKey` secret.
Signup or Login to [Picovoice Console](https://console.picovoice.ai/) to get your `AccessKey`.

## Usage

Run the following command to start the demo:

```console
rhino_train_demo --access_key ${ACCESS_KEY}
```

This demo trains the yaml file via API (`contacts.yaml` which is a simple call someone in contacts list).

Additional contacts can be added by inputting contacts seperated by spaces after the following prompt:

```console
Enter additional contacts seperated by spaces:
```

It is possible that the default audio input device recognized by the demo is not the one being used. There are a couple 
of debugging facilities baked into the demo application to solve this. First, type the following into the console:

```console
rhino_train_demo --show_audio_devices
```

It provides information about various audio input devices on the box. On a Linux box, this is the console output

```
index: 0, device name: USB Audio Device
index: 1, device name: MacBook Air Microphone
``` 

You can use the device index to specify which microphone to use for the demo. For instance, if you want to use the USB Audio Device
in the above example, you can invoke the demo application as below:

```console
rhino_train_demo --access_key ${ACCESS_KEY} --audio_device_index 0
```