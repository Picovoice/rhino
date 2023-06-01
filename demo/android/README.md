# Rhino Activity Demo

## AccessKey

Rhino requires a valid Picovoice `AccessKey` at initialization. `AccessKey` acts as your credentials when using Rhino SDKs.
You can get your `AccessKey` for free. Make sure to keep your `AccessKey` secret.
Signup or Login to [Picovoice Console](https://console.picovoice.ai/) to get your `AccessKey`.

## Setup

1. Open the project in Android Studio
2. Go to `Build > Select Build Variant...` and select the language you would like to run the demo in (e.g. enDebug -> English, itRelease -> Italian)
3. Build and run on an installed simulator or a connected Android device

## Running the Demo

Once the demo app has started, press the `Start` button and speak a command from the context to start inference. To see more details about
the current context information, press the `Show Context` button on the top right corner in the app.

## Running the Instrumented Unit Tests

Ensure you have an Android device connected or simulator running. Then run the following from the terminal:

```console
cd demo/android/Activity
./copy_test_resources.sh
./gradlew connectedAndroidTest
```

The test results are stored in `rhino-activity-demo-app/build/reports`.
