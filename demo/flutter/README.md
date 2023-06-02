# Rhino Flutter Demo

To run the Rhino demo on Android or iOS with Flutter, you must have the [Flutter SDK](https://flutter.dev/docs/get-started/install) installed on your system. Once installed, you can run `flutter doctor` to determine any other missing requirements for your relevant platform. Once your environment has been set up, launch a simulator or connect an Android/iOS device.

## AccessKey

Rhino requires a valid Picovoice `AccessKey` at initialization. `AccessKey` acts as your credentials when using Rhino SDKs.
You can get your `AccessKey` for free. Make sure to keep your `AccessKey` secret.
Signup or Login to [Picovoice Console](https://console.picovoice.ai/) to get your `AccessKey`.

## Usage


Run the `prepare_demo` script from [demo/flutter](.) with a language code to set up the demo in the language of your
choice (e.g. `de` -> German, `ko` -> Korean). To see a list of available languages, run `prepare_demo` without a language code.

```console
dart scripts/prepare_demo.dart ${LANGUAGE}
```

Replace your `AccessKey` in [lib/main.dart](lib/main.dart) file:

```dart
final String accessKey = "{YOUR_ACCESS_KEY_HERE}"; // AccessKey obtained from Picovoice Console (https://console.picovoice.ai/)
```

Run the following command from [demo/flutter](../../demo/flutter) to build and deploy the demo to your device:
```console
flutter run
```

Once the demo app has started, press the start button and utter a command to start inferring context. To see more details about the current context information, press the `Context Info` button on the top right corner in the app.