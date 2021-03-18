export type RhinoInference = {
  isFinalized: boolean
  isUnderstood?: boolean
  intent?: string
  slots?: Record<string, unknown>
}

export interface RhinoEngine {
  release(): void;
  process(frames: Int16Array): RhinoInference;
  version: string;
  sampleRate: number;
  frameLength: number;
}

export type RhinoContext = {
  base64: string,
  sensitivty?: number
}

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
}

export type RhinoWorkerRequestInit = {
  command: 'init';
  rhinoArgs: RhinoArgs;
}

export type RhinoWorkerResponseReady = {
  command: 'rhn-ready';
};

export type RhinoWorkerResponseError = {
  command: 'rhn-error';
  error: Error | string
};

export type RhinoWorkerResponseInitError = {
  command: 'rhn-error-init';
  error: Error | string
}

export type RhinoWorkerResponseInference = {
  command: 'rhn-inference';
  inference: RhinoInference
};

export type RhinoWorkerRequest = WorkerRequestVoid | WorkerRequestProcess | RhinoWorkerRequestInit

export interface RhinoWorker extends Omit<Worker, 'postMessage'> {
  postMessage(command: RhinoWorkerRequest): void
}

export type RhinoWorkerResponse = RhinoWorkerResponseReady | RhinoWorkerResponseInference | RhinoWorkerResponseError | RhinoWorkerResponseInitError
