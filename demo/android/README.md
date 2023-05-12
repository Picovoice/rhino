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

Copy your AccessKey into the `ACCESS_KEY` variable in `MainActivity.java` before building the demo.

The default context for this demo is `Smart Lighting`. Simply press start, and the engine can recognize commands such as

> Turn off the lights.

or

> Set the lights in the bedroom to blue.

See in-app for the full context.

## Running the Instrumented Unit Tests

Ensure you have an Android device connected or simulator running. Then run the following from the terminal:

```console
cd demo/android/Activity
./copy_test_resources.sh
./gradlew connectedAndroidTest
```

The test results are stored in `rhino-activity-demo-app/build/reports`.
