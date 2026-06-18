import { Rhino, RhinoWorker, RhinoContext, RhinoModel } from "../";

import { PvModel } from '@picovoice/web-utils';

const ACCESS_KEY: string = Cypress.env("ACCESS_KEY");

const runInitTest = async (
  instance: typeof Rhino | typeof RhinoWorker,
  params: {
    accessKey?: string,
    context?: RhinoContext,
    model?: PvModel,
    device?: string,
    expectFailure?: boolean,
  } = {}
) => {
  const {
    accessKey = ACCESS_KEY,
    context = { publicPath: '/test/contexts/coffee_maker_wasm.rhn', forceWrite: true },
    model = { publicPath: '/test/rhino_params.pv', forceWrite: true },
    device = "cpu:1",
    expectFailure = false,
  } = params;

  let isFailed = false;

  try {
    const rhino = await instance.create(
      accessKey,
      context,
      () => {},
      model,
      { device }
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

describe("Rhino Train", function () {
  it(`should be able to train model`, () => {
    const writePath = "custom_éclairage_intelligent_wasm.rhn";

    const original: RhinoContext = {
      publicPath: "/test/contexts/éclairage_intelligent_wasm.rhn",
      forceWrite: true,
    };

    const model: RhinoModel = {
      publicPath: "/test/rhino_params_fr.pv",
      forceWrite: true,
    };

    cy.wrap(null).then(async () => {
      const rhinoContext = await Rhino.trainContextFromDynamicSlots(
        ACCESS_KEY,
        writePath,
        "fr",
        original,
        model,
        {
          "color": new Set(["macchiato", "cortado"])
        }
      );

      await runInitTest(Rhino, {
        context: rhinoContext,
        model,
      });
    });
  });

  it(`should be able to handle invalid slots`, () => {
    const writePath = "custom_éclairage_intelligent_wasm.rhn";

    const original: RhinoContext = {
      publicPath: "/test/contexts/éclairage_intelligent_wasm.rhn",
      forceWrite: true,
    };

    const model: RhinoModel = {
      publicPath: "/test/rhino_params_fr.pv",
      forceWrite: true,
    };

    cy.wrap(null).then(async () => {
      let failed = false;
      try {
        const rhinoContext = await Rhino.trainContextFromDynamicSlots(
          ACCESS_KEY,
          writePath,
          "fr",
          original,
          model,
          {
            "color": new Set(["bleu", "Bleu"])
          }
        );
        expect(rhinoContext).to.be.null;
      } catch (e) {
        expect(e).to.not.be.null;
        failed = true;
      }
      expect(failed).to.be.true;
    });
  });
});
