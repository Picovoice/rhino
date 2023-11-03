import {Rhino, RhinoWorker, RhinoContext, RhinoInference} from "../";
import testData from "./test_data.json";

// @ts-ignore
import rhinoParams from "./rhino_params";
import { PvModel } from '@picovoice/web-utils';
import { RhinoError } from "../dist/types/rhino_errors";

const ACCESS_KEY: string = Cypress.env("ACCESS_KEY");

function delay(time: number) {
  return new Promise(resolve => setTimeout(resolve, time));
}

const runInitTest = async (
  instance: typeof Rhino | typeof RhinoWorker,
  params: {
    accessKey?: string,
    context?: RhinoContext,
    model?: PvModel,
    expectFailure?: boolean,
  } = {}
) => {
  const {
    accessKey = ACCESS_KEY,
    context = { publicPath: '/test/contexts/coffee_maker_wasm.rhn', forceWrite: true },
    model = { publicPath: '/test/rhino_params.pv', forceWrite: true },
    expectFailure = false,
  } = params;

  let isFailed = false;

  try {
    const rhino = await instance.create(
      accessKey,
      context,
      () => {},
      model
    );
    expect(rhino.sampleRate).to.be.eq(16000);
    expect(typeof rhino.version).to.eq('string');
    expect(rhino.version.length).to.be.greaterThan(0);

    if (rhino instanceof RhinoWorker) {
      rhino.terminate();
    } else {
      await rhino.release();
    }
  } catch (e) {
    if (expectFailure) {
      isFailed = true;
    } else {
      expect(e).to.be.undefined;
    }
  }

  if (expectFailure) {
    expect(isFailed).to.be.true;
  }
};

const runProcTest = async (
  instance: typeof Rhino | typeof RhinoWorker,
  inputPcm: Int16Array,
  params: {
    accessKey?: string,
    context?: RhinoContext,
    model?: PvModel,
  } = {},
  expectedContext?: any
) => {
  const {
    accessKey = ACCESS_KEY,
    context = { publicPath: '/test/contexts/coffee_maker_wasm.rhn', forceWrite: true },
    model = { publicPath: '/test/rhino_params.pv', forceWrite: true },
  } = params;

  let inference: RhinoInference | null = null;

  const runProcess = () => new Promise<void>(async (resolve, reject) => {
    const rhino = await instance.create(
      accessKey,
      context,
      async rhinoInference => {
        if (rhinoInference.isFinalized) {
          inference = rhinoInference;
          resolve();
        }
      },
      model,
      {
        processErrorCallback: (error: RhinoError) => {
          reject(error);
        }
      }
    );

    for (let i = 0; i < (inputPcm.length - rhino.frameLength + 1); i += rhino.frameLength) {
      await rhino.process(inputPcm.slice(i, i + rhino.frameLength));
    }
  });

  try {
    await runProcess();
    if (expectedContext !== undefined) {
      expect(inference.intent).to.deep.eq(expectedContext.intent);
      expect(inference.slots).to.deep.eq(expectedContext.slots);
    } else {
      expect(inference.isUnderstood).to.be.false;
    }
  } catch (e) {
    expect(e).to.be.undefined;
  }
};

describe("Rhino Binding", function () {
  it(`should return process error message stack`, async () => {
    let error: RhinoError | null = null;

    const runProcess = () => new Promise<void>(async resolve => {
      const rhino = await Rhino.create(
        ACCESS_KEY,
        { publicPath: '/test/contexts/coffee_maker_wasm.rhn', forceWrite: true },
        () => { },
        { publicPath: '/test/rhino_params.pv', forceWrite: true },
        {
          processErrorCallback: (e: RhinoError) => {
            error = e;
            resolve();
          }
        }
      );
      const testPcm = new Int16Array(rhino.frameLength);
      // @ts-ignore
      const objectAddress = rhino._objectAddress;

      // @ts-ignore
      rhino._objectAddress = 0;
      await rhino.process(testPcm);

      await delay(1000);

      // @ts-ignore
      rhino._objectAddress = objectAddress;
      await rhino.release();
    });

    await runProcess();
    expect(error).to.not.be.null;
    if (error) {
      expect((error as RhinoError).messageStack.length).to.be.gt(0);
      expect((error as RhinoError).messageStack.length).to.be.lte(8);
    }
  });

  for (const instance of [Rhino, RhinoWorker]) {
    const instanceString = (instance === RhinoWorker) ? 'worker' : 'main';

    it(`should be able to init with public path (${instanceString})`, () => {
      cy.wrap(null).then(async () => {
        await runInitTest(instance);
      });
    });

    it(`should be able to init with base64 (${instanceString})`, () => {
      cy.wrap(null).then(async () => {
        await runInitTest(instance, {
          model: { base64: rhinoParams, forceWrite: true }
        });
      });
    });

    it(`should be able to handle UTF-8 public path (${instanceString})`, () => {
      cy.wrap(null).then(async () => {
        await runInitTest(instance, {
          model: { publicPath: '/test/rhino_params.pv', forceWrite: true, customWritePath: '테스트' }
        });
      });
    });

    it(`should be able to handle invalid public path (${instanceString})`, () => {
      cy.wrap(null).then(async () => {
        await runInitTest(instance, {
          model: { publicPath: 'invalid', forceWrite: true },
          expectFailure: true
        });
      });
    });

    it(`should be able to handle invalid base64 (${instanceString})`, () => {
      cy.wrap(null).then(async () => {
        await runInitTest(instance, {
          model: { base64: 'invalid', forceWrite: true },
          expectFailure: true
        });
      });
    });

    it(`should be able to handle invalid access key (${instanceString})`, () => {
      cy.wrap(null).then(async () => {
        await runInitTest(instance, {
          accessKey: 'invalid',
          expectFailure: true
        });
      });
    });

    it(`should be able to handle invalid sensitivity(${instanceString})`, () => {
      cy.wrap(null).then(async () => {
        await runInitTest(instance, {
          context: { publicPath: '/test/contexts/rhino.rhn', forceWrite: true, sensitivity: -1 },
          expectFailure: true
        });
      });
    });

    for (const testParam of testData.tests.within_context) {
      it(`should be able to process within context (${testParam.language}) (${instanceString})`, () => {
        try {
          const suffix = (testParam.language === 'en') ? '' : `_${testParam.language}`;
          cy.getFramesFromFile(`audio_samples/test_within_context${suffix}.wav`).then( async pcm => {
            await runProcTest(
              instance,
              pcm,
              {
                context: {
                  publicPath: `/test/contexts/${encodeURIComponent(testParam.context_name.replace("ā", "a").replace("ō", "o"))}_wasm.rhn`,
                  forceWrite: true,
                },
                model: { publicPath: `/test/rhino_params${suffix}.pv`, forceWrite: true }
              },
              testParam.inference);
          });
        } catch (e) {
          expect(e).to.be.undefined;
        }
      });
    }

    for (const testParam of testData.tests.out_of_context) {
      it(`should be able to process out of context (${testParam.language}) (${instanceString})`, () => {
        try {
          const suffix = (testParam.language === 'en') ? '' : `_${testParam.language}`;
          cy.getFramesFromFile(`audio_samples/test_out_of_context${suffix}.wav`).then( async pcm => {
            await runProcTest(
              instance,
              pcm,
              {
                context: {
                  publicPath: `/test/contexts/${encodeURIComponent(testParam.context_name.replace("ā", "a").replace("ō", "o"))}_wasm.rhn`,
                  forceWrite: true,
                },
                model: { publicPath: `/test/rhino_params${suffix}.pv`, forceWrite: true }
              });
          });
        } catch (e) {
          expect(e).to.be.undefined;
        }
      });
    }

    it(`should be able to reset (${instanceString})`, () => {
      cy.getFramesFromFile(`audio_samples/test_within_context.wav`).then(async pcm => {
        let numFinalized = 0;

        const rhino = await instance.create(
          ACCESS_KEY,
          { publicPath: `/test/contexts/coffee_maker_wasm.rhn`, forceWrite: true },
          async rhinoInference => {
            if (rhinoInference.isFinalized) {
              numFinalized++;
            }
          },
          { publicPath: `/test/rhino_params.pv`, forceWrite: true }
        );

        for (let i = 0; i < ((pcm.length / 2) - rhino.frameLength + 1); i += rhino.frameLength) {
          await rhino.process(pcm.slice(i, i + rhino.frameLength));
          await delay(32);
        }

        await rhino.reset();

        for (let i = 0; i < (pcm.length - rhino.frameLength + 1); i += rhino.frameLength) {
          await rhino.process(pcm.slice(i, i + rhino.frameLength));
          await delay(32);
        }

        await delay(1000);

        expect(numFinalized).to.be.eq(1);
      });
    });

    it(`should return correct error message stack (${instanceString})`, async () => {
      let messageStack = [];
      try {
        const rhino = await instance.create(
          "invalidAccessKey",
          { publicPath: '/test/contexts/coffee_maker_wasm.rhn', forceWrite: true },
          () => { },
          { publicPath: '/test/rhino_params.pv', forceWrite: true }
        );
        expect(rhino).to.be.undefined;
      } catch (e: any) {
        messageStack = e.messageStack;
      }

      expect(messageStack.length).to.be.gt(0);
      expect(messageStack.length).to.be.lte(8);

      try {
        const rhino = await instance.create(
          "invalidAccessKey",
          { publicPath: '/test/contexts/coffee_maker_wasm.rhn', forceWrite: true },
          () => { },
          { publicPath: '/test/rhino_params.pv', forceWrite: true }
        );
        expect(rhino).to.be.undefined;
      } catch (e: any) {
        expect(messageStack.length).to.be.eq(e.messageStack.length);
      }
    });
  }
});
