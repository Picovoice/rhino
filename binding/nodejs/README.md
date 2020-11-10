# Rhino Binding for NodeJS

## Rhino

Rhino is Picovoice's Speech-to-Intent engine. It directly infers intent from spoken commands within a given context of interest, in real-time. For example, given a "Coffee Maker" context, and the utterance _"Can I have a small double-shot espresso with a lot of sugar and some milk?"_, Rhino infers that the user wants to order a drink with particular choices:

```json
{
  "intent": "orderDrink",
  "slots":
  {
    "type": "espresso",
    "size": "small",
    "numberOfShots": "2",
    "sugar": "a lot",
    "milk": "some"
  }
}
```

Unlike typical NLU inference software, Rhino does _not_ use generic Speech-to-Text transcription, and instead operates on a compact, bespoke model generated for a specific use case; e.g. a coffee maker, or smart home lighting. Unless you deliberately program it to do so, it won't understand phrases like _"tell me a joke"_. Using this approach (combined with Picovoice's proprietary deep learning technology) allows for:

- dramatically improved efficiency (it can even run on tiny microcontrollers)
- accuracy gains from not having to anticipate every possible spoken phrase
- avoiding transcription errors compounding into the intent understanding (e.g. homonyms are much less of an issue, because we probably know which word makes sense).

To learn more about Rhino, see the [product](https://picovoice.ai/products/rhino/), [documentation](https://picovoice.ai/docs/), and [GitHub](https://github.com/Picovoice/rhino/) pages.

### Creating a context

To design contexts and train into RHN files, see the [Picovoice Console](https://picovoice.ai/console/).

Files generated with the Picovoice Console carry restrictions including (but not limited to): training allowance, time limits, available platforms, and commercial usage.

## Compatibility

This binding is for running Rhino on **NodeJS 10+** on the following platforms:

- Linux (x86_64)
- macOS (x86_64)
- Raspberry Pi (2,3,4)

### Web Browsers

This binding is for NodeJS and **does not work in a browser**. Looking to run Rhino in-browser? Use the [JavaScript WebAssembly](https://github.com/Picovoice/rhino/tree/master/binding/javascript) binding instead.

## Usage

The binding provides the Rhino class. Create instances of the Rhino class to make speech inferences within a context.

### Quick Start

```javascript
const Rhino = require("@picovoice/rhino-node");

const coffeeMakerContextPath = "./coffee_maker.rhn";

let handle = new Rhino(coffeeMakerContextPath);

let isFinalized = false;
// process each frame of audio until Rhino has concluded that it understood the phrase (or did not)
// when Rhino has reached a conclusion, isFinalized will become true
while (!isFinalized) {
  isFinalized = handle.process(frame);
  // retrieve the inference from Rhino
  if (isFinalized) {
    let inference = engineInstance.getInference();
    // inference result example:
    //
    //   {
    //     isUnderstood: true,
    //     intent: 'orderDrink',
    //     slots: {
    //       size: 'medium',
    //       numberOfShots: 'double shot',
    //       coffeeDrink: 'americano',
    //       milkAmount: 'lots of milk',
    //       sugarAmount: 'some sugar'
    //     }
    //   }
  }
}

// always call release when finished to free the resources allocated by Rhino
handle.release();
```

### Override model and library paths

The Rhino constructor accepts three optional positional parameters for the sensitivity and the absolute paths to the model and dynamic library, should you need to override them (typically, you will not).

```javascript
let handle = new Rhino(
  contextPath,
  sensitivity,
  modelFilePath,
  libraryFilePath
);
```

## Using the bindings from source

## Unit Tests

Run `yarn` (or `npm install --also=dev`) from the [binding/nodejs](https://github.com/Picovoice/rhino/tree/master/binding/nodejs) directory to install project dependencies. This will also run a script to copy all of the necessary shared resources from the Rhino repository into the package directory.

Run `yarn test` (or `npm run test`) from the [binding/nodejs](https://github.com/Picovoice/rhino/tree/master/binding/nodejs) directory to execute the test suite.
