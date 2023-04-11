import { Rhino, RhinoContext, RhinoWorker } from "../";

import { PvModel } from '@picovoice/web-utils';

const ACCESS_KEY = Cypress.env('ACCESS_KEY');
const NUM_TEST_ITERATIONS = Number(Cypress.env('NUM_TEST_ITERATIONS'));
const INIT_PERFORMANCE_THRESHOLD_SEC = Number(Cypress.env('INIT_PERFORMANCE_THRESHOLD_SEC'));
const PROC_PERFORMANCE_THRESHOLD_SEC = Number(Cypress.env('PROC_PERFORMANCE_THRESHOLD_SEC'));

async function testPerformance(
  instance: typeof Rhino | typeof RhinoWorker,
  inputPcm: Int16Array,
  params: {
    accessKey?: string,
    context?: RhinoContext,
    model?: PvModel,
  } = {},
) {
  const {
    context = { publicPath: '/test/contexts/coffee_maker_wasm.rhn', forceWrite: true },
    model = { publicPath: '/test/rhino_params.pv', forceWrite: true }
  } = params;

  const initPerfResults: number[] = [];
  const procPerfResults: number[] = [];

  for (let j = 0; j < NUM_TEST_ITERATIONS; j++) {
    let isFinalized = false;

    let start = Date.now();
    const rhino = await instance.create(
      ACCESS_KEY,
      context,
      inference => {
        if (inference.isFinalized) {
          isFinalized = true;
        }
      },
      model
    );

    let end = Date.now();
    initPerfResults.push((end - start) / 1000);

    const waitUntil = (): Promise<void> => new Promise(resolve => {
      setInterval(() => {
        if (isFinalized) {
          resolve();
        }
      }, 100);
    });

    start = Date.now();
    for (let i = 0; i < (inputPcm.length - rhino.frameLength + 1); i += rhino.frameLength) {
      await rhino.process(inputPcm.slice(i, i + rhino.frameLength));
    }
    await waitUntil();
    end = Date.now();
    procPerfResults.push((end - start) / 1000);

    if (rhino instanceof RhinoWorker) {
      rhino.terminate();
    } else {
      await rhino.release();
    }
  }

  const initAvgPerf = initPerfResults.reduce((a, b) => a + b) / NUM_TEST_ITERATIONS;
  const procAvgPerf = procPerfResults.reduce((a, b) => a + b) / NUM_TEST_ITERATIONS;

  // eslint-disable-next-line no-console
  console.log(`Average init performance: ${initAvgPerf} seconds`);
  // eslint-disable-next-line no-console
  console.log(`Average proc performance: ${procAvgPerf} seconds`);

  expect(initAvgPerf).to.be.lessThan(INIT_PERFORMANCE_THRESHOLD_SEC);
  expect(procAvgPerf).to.be.lessThan(PROC_PERFORMANCE_THRESHOLD_SEC);
}

describe('Rhino binding performance test', () => {
  for (const instance of [Rhino, RhinoWorker]) {
    const instanceString = (instance === RhinoWorker) ? 'worker' : 'main';

    it(`should be lower than performance threshold (${instanceString})`, () => {
      cy.getFramesFromFile('audio_samples/test_within_context.wav').then( async inputPcm => {
        await testPerformance(
          instance,
          inputPcm
        );
      });
    });
  }
});
