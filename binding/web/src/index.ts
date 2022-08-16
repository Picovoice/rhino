import { Rhino } from './rhino';
import { RhinoWorker } from './rhino_worker';

import {
  RhinoOptions,
  RhinoContext,
  RhinoWorkerInitRequest,
  RhinoWorkerProcessRequest,
  RhinoWorkerReleaseRequest,
  RhinoWorkerRequest,
  RhinoWorkerInitResponse,
  RhinoWorkerProcessResponse,
  RhinoWorkerReleaseResponse,
  RhinoWorkerFailureResponse,
  RhinoWorkerResponse,
} from './types';

import rhinoWasm from '../lib/pv_rhino.wasm';
import rhinoWasmSimd from '../lib/pv_rhino_simd.wasm';

Rhino.setWasm(rhinoWasm);
Rhino.setWasmSimd(rhinoWasmSimd);
RhinoWorker.setWasm(rhinoWasm);
RhinoWorker.setWasmSimd(rhinoWasmSimd);

export {
  Rhino,
  RhinoOptions,
  RhinoContext,
  RhinoWorker,
  RhinoWorkerInitRequest,
  RhinoWorkerProcessRequest,
  RhinoWorkerReleaseRequest,
  RhinoWorkerRequest,
  RhinoWorkerInitResponse,
  RhinoWorkerProcessResponse,
  RhinoWorkerReleaseResponse,
  RhinoWorkerFailureResponse,
  RhinoWorkerResponse,
};
