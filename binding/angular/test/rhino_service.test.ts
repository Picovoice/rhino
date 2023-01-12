import { RhinoService } from '../dist/rhino-angular';

import rhinoParams from './rhino_params.js';
import testData from './test_data.json';

const ACCESS_KEY = Cypress.env('ACCESS_KEY');
describe('Rhino binding', () => {
  it('should be able to init via public path', (done) => {
    let i = 0;
    const expected = [true, false];

    const rhinoService = new RhinoService();

    cy.wrapFn(
      () => rhinoService.init(
        ACCESS_KEY,
        { publicPath: "./contexts/coffee_maker_wasm.rhn", forceWrite: true },
        { publicPath: "./rhino_params.pv", forceWrite: true }
      )
    );

    cy.wrapFn(
      () => rhinoService.release()
    );

    rhinoService.isLoaded$.subscribe(isLoaded => {
      expect(isLoaded).to.eq(expected[i++]);
      if (i == expected.length) {
        done();
      }
    });
  });

  it('should be able to init via base64', (done) => {
    const rhinoService = new RhinoService();

    cy.wrapFn(
      () => rhinoService.init(
        ACCESS_KEY,
        { publicPath: "./contexts/coffee_maker_wasm.rhn", forceWrite: true },
        { base64: rhinoParams, forceWrite: true }
      )
    );

    cy.wrapFn(
      () => rhinoService.release()
    );

    rhinoService.isLoaded$.subscribe(isLoaded => {
      expect(isLoaded).to.be.true;
      done();
    });
  });

  it('should show invalid model path error message', (done) => {
    const rhinoService = new RhinoService();

    cy.wrapFn(
      () => rhinoService.init(
        ACCESS_KEY,
        { publicPath: "./contexts/coffee_maker_wasm.rhn", forceWrite: true },
        { publicPath: "./rhino_params_failed.pv", forceWrite: true }
      )
    );

    rhinoService.isLoaded$.subscribe(isLoaded => {
      expect(isLoaded).to.be.false;
    });

    rhinoService.error$.subscribe(error => {
      expect(error).to.contain("Error response returned while fetching model from './rhino_params_failed.pv'");
      done();
    });
  });

  it('should show invalid access key error message', (done) => {
    const rhinoService = new RhinoService();

    cy.wrapFn(
      () => rhinoService.init(
        '',
        { publicPath: "./contexts/coffee_maker_wasm.rhn", forceWrite: true },
        { publicPath: "./rhino_params.pv", forceWrite: true }
      )
    );

    rhinoService.isLoaded$.subscribe(isLoaded => {
      expect(isLoaded).to.be.false;
    });

    rhinoService.error$.subscribe(error => {
      expect(error).to.contain("Invalid AccessKey");
      done();
    });
  });

  for (const testInfo of testData.tests.within_context) {
    it(`should be able to process audio within context (${testInfo.language})`, (done) => {
      const rhinoService = new RhinoService();

      cy.wrapFn(
        () => rhinoService.init(
          ACCESS_KEY,
          {
            publicPath: `./contexts/${testInfo.context_name}_wasm.rhn`,
            forceWrite: true,
          },
          {
            publicPath: testInfo.language === 'en' ? "./rhino_params.pv" : `./rhino_params_${testInfo.language}.pv`,
            forceWrite: true,
          }
        )
      );

      cy.wrapFn(
        () => rhinoService.process()
      );

      cy.mockRecording(`audio_samples/test_within_context${(testInfo.language === 'en' ? '' : '_' + testInfo.language)}.wav`);

      cy.wrapFn(
        () => rhinoService.release()
      );

      let i = 0;
      const expected = [true, false];

      rhinoService.isLoaded$.subscribe(isLoaded => {
        if (!isLoaded) {
          done();
        }
      });

      rhinoService.isListening$.subscribe(isListening => {
        if (i < expected.length) {
          expect(isListening).to.eq(expected[i++]);
        }
      });

      rhinoService.inference$.subscribe(inference => {
        expect(inference.intent).to.be.eq(testInfo.inference.intent);
        expect(inference.slots).to.deep.eq(testInfo.inference.slots);
      });
    });
  }

  for (const testInfo of testData.tests.out_of_context) {
    it(`should be able to process audio out of context (${testInfo.language})`, (done) => {
      const rhinoService = new RhinoService();

      cy.wrapFn(
        () => rhinoService.init(
          ACCESS_KEY,
          {
            publicPath: `./contexts/${testInfo.context_name}_wasm.rhn`,
            forceWrite: true,
          },
          {
            publicPath: testInfo.language === 'en' ? "./rhino_params.pv" : `./rhino_params_${testInfo.language}.pv`,
            forceWrite: true,
          }
        )
      );

      cy.wrapFn(
        () => rhinoService.process()
      );

      cy.mockRecording(`audio_samples/test_out_of_context${(testInfo.language === 'en' ? '' : '_' + testInfo.language)}.wav`);

      cy.wrapFn(
        () => rhinoService.release()
      );

      let i = 0;
      const expected = [true, false];

      rhinoService.isLoaded$.subscribe(isLoaded => {
        if (!isLoaded) {
          done();
        }
      });

      rhinoService.isListening$.subscribe(isListening => {
        if (i < expected.length) {
          expect(isListening).to.eq(expected[i++]);
        }
      });

      rhinoService.inference$.subscribe(inference => {
        expect(inference.intent).to.be.null;
      });
    });
  }
});
