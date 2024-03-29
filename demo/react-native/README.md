# Rhino Demo App

To run the React Native Rhino demo app you'll first need to set up your React Native environment. For this, 
please refer to [React Native's documentation](https://reactnative.dev/docs/environment-setup). Once your environment has been set up, 
you can run the following commands from this repo location.

## AccessKey

Rhino requires a valid Picovoice `AccessKey` at initialization. `AccessKey` acts as your credentials when using Rhino SDKs.
You can get your `AccessKey` for free. Make sure to keep your `AccessKey` secret.
Signup or Login to [Picovoice Console](https://console.picovoice.ai/) to get your `AccessKey`.

## Usage

Replace your `AccessKey` in [`App.tsx`](App.tsx) file:

```typescript
_accessKey: string ="${YOUR_ACCESS_KEY_HERE}" // AccessKey obtained from Picovoice Console (https://console.picovoice.ai/)
```

Replace `${LANGUAGE}` with the language code of your choice (e.g. `de` -> German, `ko` -> Korean). To see a list of 
available languages, run the `android-run` or `ios-run` command without a language code.

### Running On Android
```console
yarn android-install          # sets up environment
yarn android-run ${LANGUAGE}  # builds and deploys to Android
```

### Running On iOS

```console
yarn ios-install              # sets up environment
yarn ios-run ${LANGUAGE}      # builds and deploys to iOS
```

Once the demo app has started, press the start button and utter a command to start inferring context. 
To see more details about the current context information, press the `Context Info` 
button in the top right corner of the app.
