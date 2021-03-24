# rhino-web-react-demo

This demo application includes the `VoiceWidget` which uses the `useRhino` react hook to allow inferring naturally spoken commands from voice. The inference is handled via the `inferenceEvent Handler` callback function that updates a React `useState` hook, and then renders the results.

If you decline microphone permission in the browser, or another such issue prevents Rhino from starting, the error will be displayed.

The widget shows the various loading and error states, as well as mounting/unmounting the `VoiceWidget` with a toggle, demonstrating the complete lifecycle of Rhino with in a React app.

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Install and Run

```bash
yarn
yarn start
```

Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.\
You will also see any lint errors in the console.
