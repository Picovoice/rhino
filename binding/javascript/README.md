# Compatibility

The binding uses [WebAssembly](https://webassembly.org/) which is supported on
[almost all](https://caniuse.com/#feat=wasm) modern browsers.

# Usage

Create a new instance of engine using

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
