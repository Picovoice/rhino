import { Rhino } from './rhino';
import { RhinoWorker } from './rhino_worker';

import {
  InferenceCallback,
  RhinoContext,
  RhinoInference,
  RhinoModel,
  RhinoOptions,
  RhinoWorkerFailureResponse,
  RhinoWorkerInitRequest,
  RhinoWorkerInitResponse,
  RhinoWorkerProcessRequest,
  RhinoWorkerProcessResponse,
  RhinoWorkerReleaseRequest,
  RhinoWorkerReleaseResponse,
  RhinoWorkerRequest,
  RhinoWorkerResponse,
} from './types';

import rhinoWasmSimd from './lib/pv_rhino_simd.wasm';
import rhinoWasmSimdLib from './lib/pv_rhino_simd.txt';
import rhinoWasmPThread from './lib/pv_rhino_pthread.wasm';
import rhinoWasmPThreadLib from './lib/pv_rhino_pthread.txt';

import * as RhinoErrors from './rhino_errors';

Rhino.setWasmSimd(rhinoWasmSimd);
Rhino.setWasmSimdLib(rhinoWasmSimdLib);
Rhino.setWasmPThread(rhinoWasmPThread);
Rhino.setWasmPThreadLib(rhinoWasmPThreadLib);
RhinoWorker.setWasmSimd(rhinoWasmSimd);
RhinoWorker.setWasmSimdLib(rhinoWasmSimdLib);
RhinoWorker.setWasmPThread(rhinoWasmPThread);
RhinoWorker.setWasmPThreadLib(rhinoWasmPThreadLib);

export {
  InferenceCallback,
  Rhino,
  RhinoContext,
  RhinoInference,
  RhinoModel,
  RhinoOptions,
  RhinoWorker,
  RhinoWorkerFailureResponse,
  RhinoWorkerInitRequest,
  RhinoWorkerInitResponse,
  RhinoWorkerProcessRequest,
  RhinoWorkerProcessResponse,
  RhinoWorkerReleaseRequest,
  RhinoWorkerReleaseResponse,
  RhinoWorkerRequest,
  RhinoWorkerResponse,
  RhinoErrors
};
