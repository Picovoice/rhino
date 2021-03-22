//
// Rhino Types
//

export interface RhinoEngine {
  version: string;
  sampleRate: number;
  frameLength: number;
  release(): void;
  process(frames: Int16Array): RhinoInference;
}

export type RhinoFactoryArgs = {
  context: RhinoContext;
  start?: boolean;
};

export type RhinoServiceArgs = {
  rhinoFactoryArgs: RhinoFactoryArgs;
  start?: boolean;
};

export interface RhinoWorkerFactory {
  create: (factoryArgs: RhinoFactoryArgs) => Promise<RhinoWorker>;
}

export type RhinoInference = {
  /** Rhino has concluded the inference (isUnderstood is now set) */
  isFinalized: boolean;
  /** The intent was understood (it matched an expression in the context) */
  isUnderstood?: boolean;
  /** The name of the intent */
  intent?: string;
  /** Map of the slot variables and values extracted from the utterance */
  slots?: Record<string, string>;
};

export interface RhinoEngine {
  release(): void;
  process(frames: Int16Array): RhinoInference;
  version: string;
  sampleRate: number;
  frameLength: number;
}

export type RhinoContext = {
  /** Base64 representation of a trained Rhino context (`.rhn` file) */
  base64: string;
  /** Value in range [0,1] that trades off miss rate for false alarm */
  sensitivity?: number;
};

export type WorkerRequestProcess = {
  command: 'process';
  inputFrame: Int16Array;
};

export type WorkerRequestVoid = {
  command: 'reset' | 'pause' | 'resume' | 'release';
};

export type RhinoArgs = {
  context: RhinoContext;
  start: boolean;
};

export type RhinoWorkerRequestInit = {
  command: 'init';
  rhinoArgs: RhinoArgs;
};

export type RhinoWorkerResponseReady = {
  command: 'rhn-ready';
};

export type RhinoWorkerResponseError = {
  command: 'rhn-error';
  error: Error | string;
};

export type RhinoWorkerResponseInitError = {
  command: 'rhn-error-init';
  error: Error | string;
};

export type RhinoWorkerResponseInference = {
  command: 'rhn-inference';
  inference: RhinoInference;
};

export type RhinoWorkerRequest =
  | WorkerRequestVoid
  | WorkerRequestProcess
  | RhinoWorkerRequestInit;

export interface RhinoWorker extends Omit<Worker, 'postMessage'> {
  postMessage(command: RhinoWorkerRequest): void;
}

export type RhinoWorkerResponse =
  | RhinoWorkerResponseReady
  | RhinoWorkerResponseInference
  | RhinoWorkerResponseError
  | RhinoWorkerResponseInitError;
