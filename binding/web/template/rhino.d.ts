type RhinoInference = {
  isFinalized: boolean
  isUnderstood?: boolean
  intent?: string
  slots?: Record<string, unknown>
}

interface RhinoEngine {
  release(): void;
  process(frames: Int16Array): RhinoInference;
  version: string;
  sampleRate: number;
  frameLength: number;
}

type RhinoContext = {
  base64: string,
  sensitivty?: number
}

type WorkerRequestProcess = {
  command: 'process';
  inputFrame: Int16Array;
};

type WorkerRequestVoid = {
  command: 'reset' | 'pause' | 'resume' | 'release';
};

type RhinoArgs = {
  context: RhinoContext;
  start: boolean;
}

type RhinoWorkerRequestInit = {
  command: 'init';
  rhinoArgs: RhinoArgs;
}

type RhinoWorkerResponseReady = {
  command: 'rhn-ready';
};

type RhinoWorkerResponseError = {
  command: 'rhn-error';
  error: Error | string
};

type RhinoWorkerResponseInitError = {
  command: 'rhn-error-init';
  error: Error | string
}

type RhinoWorkerResponseInference = {
  command: 'rhn-inference';
  inference: RhinoInference
};

interface RhinoWorker extends Omit<Worker, 'postMessage'> {
  postMessage(command: WorkerRequestVoid | RhinoWorkerRequestInit): void
}

type RhinoWorkerResponse = RhinoWorkerResponseReady | RhinoWorkerResponseInference | RhinoWorkerResponseError | RhinoWorkerResponseInitError
