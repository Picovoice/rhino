# JavaScript Binding for Rhino

## Compatibility

The binding uses [WebAssembly](https://webassembly.org/) which is supported on
[almost all](https://caniuse.com/#feat=wasm) modern browsers.

## Initialization

Typically, the Rhino WASM module is loaded asynchronously, and is therefore not guaranteed to be ready the first time you wish use `Rhino.create()`. There are two options for handling this:

1. Poll the Rhino `isLoaded()` method until it is true
2. Supply a callback to `Rhino` using the `RhinoOptions` method with your function assigned to the `callback` key; it will be invoked when `isLoaded()` becomes true

```javascript
let callback = function callback() {
  console.log("Rhino.create() is ready to be called.");
};
// n.b.: Rhino must be declared before the Rhino binding is loaded, or it will be ignored
let RhinoOptions = { callback: callback };
```

## Usage

Create a new instance of the engine using:

```javascript
let context = new Uint8Array([...]);

let handle = Rhino.create(context)
```

`context` is an array of 8-bit unsigned integers (i.e. `UInt8Array`) representing the domain of interest.

When instantiated `handle` can process audio via its `.process` method.

```javascript
let getNextAudioFrame = function() {
    ...
};

let result = {};
do {
    result = handle.process(getNextAudioFrame())
} while (Object.keys(result).length === 0);

if (result.isUnderstood) {
    // callback to act upon inference result
} else {
    // callback to handle failed inference
}
```

`getNextAudioFrame()` should return an array of audio samples in 16-bit format (i.e. `Int16Array`). The length of the
array can be retrieved using `handle.frameLength` and the required sample rate using `handle.sampleRate`. When done be
sure to release resources acquired by WebAssembly using `.release`.

```javascript
handle.release();
```
