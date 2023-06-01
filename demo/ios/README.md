# Rhino iOS Demo

## AccessKey

Rhino requires a valid Picovoice `AccessKey` at initialization. `AccessKey` acts as your credentials when using Rhino SDKs.
You can get your `AccessKey` for free. Make sure to keep your `AccessKey` secret.
Signup or Login to [Picovoice Console](https://console.picovoice.ai/) to get your `AccessKey`.

## Running the Demo

To run the application demo:

1) From the [demo](./) directory run:

```console
pod install
```

2) Open `RhinoDemo.xcworkspace` in XCode.

3) Replace `let accessKey = "${YOUR_ACCESS_KEY_HERE}"` in the file [ContentView.swift](./RhinoDemo/ContentView.swift) with your `AccessKey`.

4) Go to `Product > Scheme` and select the scheme for the language you would like to demo (e.g. `arDemo` -> Arabic Demo, `deDemo` -> German Demo)

5) Run the demo with a simulator or connected iOS device.

6) Once the demo app has started, press the `Start` button to infer audio within a context. To see more details about
the current context information, press the `Context Info` button on the top right corner in the app.
