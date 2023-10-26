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

import rhinoWasm from '../lib/pv_rhino.wasm';
import rhinoWasmSimd from '../lib/pv_rhino_simd.wasm';

import * as RhinoErrors from './rhino_errors';

Rhino.setWasm(rhinoWasm);
Rhino.setWasmSimd(rhinoWasmSimd);
RhinoWorker.setWasm(rhinoWasm);
RhinoWorker.setWasmSimd(rhinoWasmSimd);

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
