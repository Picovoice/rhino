# JavaScript Always-Listening Demo

## Usage

Install the demo's dependencies by using either yarn or npm. Execute the commands provided from [demo/javascript](/demo/javascript). This will launch a local server hosting the demo.

Note: As this demo uses Porcupine, make sure your local repository has the porcupine submodule initialized. Otherwise you will encounter errors when it tries to copy the Porcupine files.

### Yarn

```bash
yarn
yarn copy
yarn start
```

### NPM

```bash
npm install
npm install -g copy-files-from-to
copy-files-from-to
npx serve
```

## Try the demo

Open http://localhost:5000 in your web browser to try the demo.

## Browser Compatibility

[PorcupineRhinoManager](porcupine_rhino_manager.js) uses the
[Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API) and
[WebAssembly](https://webassembly.org/), which are supported on all modern browsers (excluding Internet Explorer).
