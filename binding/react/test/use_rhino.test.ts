import { renderHook } from '@testing-library/react-hooks/dom';

import { useRhino } from '../src';

// @ts-ignore
import rhinoParams from '@/rhino_params.js';
import testData from './test_data.json';

const ACCESS_KEY = Cypress.env('ACCESS_KEY');

describe('Rhino binding', () => {
  it('should be able to init via public path', () => {
    const { result } = renderHook(() => useRhino());

    cy.wrapHook(
      () => result.current.init(
        ACCESS_KEY,
        { publicPath: "/test/contexts/coffee_maker_wasm.rhn", forceWrite: true },
        { publicPath: "/test/rhino_params.pv", forceWrite: true }
      )
    ).then(() => {
      expect(result.current.isLoaded).to.be.true;
    });

    cy.wrapHook(
      result.current.release
    ).then(() => {
      expect(result.current.isLoaded).to.be.false;
    });
  });

  it('should be able to init via base64', () => {
    const { result } = renderHook(() => useRhino());

    cy.wrapHook(
      () => result.current.init(
        ACCESS_KEY,
        { publicPath: "/test/contexts/coffee_maker_wasm.rhn", forceWrite: true },
        { base64: rhinoParams, forceWrite: true }
      )
    ).then(() => {
      expect(result.current.isLoaded).to.be.true;
    });
  });

  it('should show invalid model path error message', () => {
    const { result } = renderHook(() => useRhino());

    cy.wrapHook(
      () => result.current.init(
        ACCESS_KEY,
        { publicPath: "/test/contexts/coffee_maker_wasm.rhn", forceWrite: true },
        { publicPath: "/rhino_params_failed.pv", forceWrite: true }
      )
    ).then(() => {
      expect(result.current.isLoaded).to.be.false;
      expect(result.current.error).to.contain("Error response returned while fetching model from '/rhino_params_failed.pv'");
    });
  });

  it('should show invalid access key error message', () => {
    const { result } = renderHook(() => useRhino());

    cy.wrapHook(
      () => result.current.init(
        '',
        { publicPath: "/test/contexts/coffee_maker_wasm.rhn", forceWrite: true },
        { publicPath: "/test/rhino_params.pv", forceWrite: true }
      )
    ).then(() => {
      expect(result.current.isLoaded).to.be.false;
      expect(result.current.error).to.contain("Invalid AccessKey");
    });
  });

  for (const testInfo of testData.tests.within_context) {
    it(`should be able to process audio within context (${testInfo.language})`, () => {
      const { result } = renderHook(() => useRhino());

      cy.wrapHook(
        () => result.current.init(
          ACCESS_KEY,
          {
            publicPath: `/test/contexts/${testInfo.context_name}_wasm.rhn`,
            forceWrite: true,
          },
          {
            publicPath: testInfo.language === 'en' ? "/test/rhino_params.pv" : `/test/rhino_params_${testInfo.language}.pv`,
            forceWrite: true,
          }
        )
      ).then(() => {
        expect(result.current.isLoaded).to.be.true;
      });

      cy.wrapHook(
        result.current.process
      ).then(() => {
        expect(result.current.isListening).to.be.true;
      });

      cy.mockRecording(
        `audio_samples/test_within_context${(testInfo.language === 'en' ? '' : '_' + testInfo.language)}.wav`
      ).then(() => {
        expect(result.current.inference?.intent).to.eq(testInfo.inference.intent);
        expect(result.current.inference?.slots).to.deep.eq(testInfo.inference.slots);
      }).then(() => {
        expect(result.current.isListening).to.be.false;
      });
    });
  }

  for (const testInfo of testData.tests.out_of_context) {
    it(`should be able to process audio out of context (${testInfo.language})`, () => {
      const { result } = renderHook(() => useRhino());

      cy.wrapHook(
        () => result.current.init(
          ACCESS_KEY,
          {
            publicPath: `/test/contexts/${testInfo.context_name}_wasm.rhn`,
            forceWrite: true,
          },
          {
            publicPath: testInfo.language === 'en' ? "/test/rhino_params.pv" : `/test/rhino_params_${testInfo.language}.pv`,
            forceWrite: true,
          }
        )
      ).then(() => {
        expect(result.current.isLoaded).to.be.true;
      });

      cy.wrapHook(
        result.current.process
      ).then(() => {
        expect(result.current.isListening).to.be.true;
      });

      cy.mockRecording(`audio_samples/test_out_of_context${(testInfo.language === 'en' ? '' : '_' + testInfo.language)}.wav`).then(() => {
        expect(result.current.inference?.intent).to.be.null;
      }).then(() => {
        expect(result.current.isListening).to.be.false;
      });
    });
  }
});
