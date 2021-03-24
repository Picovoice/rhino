export type RhinoFactoryArgs = {
  /** Base64 string representation of a trained Rhino context (i.e. an `.rhn` file) */
  base64: string
  /** Sensitivity in [0,1] trades miss rate for false alarm.
   * Default: 0.5. */
  sensitivity?: number
  /** Whether to start the Rhino engine immediately upon loading.
   * Default: false, as typical use-case is Push-to-Talk */
  start?: boolean
};

export type RhinoHookArgs = {
  /** Immediately start the microphone upon initialization */
  start: boolean;
  /** Arguments forwarded to RhinoWorkerFactory */
  rhinoFactoryArgs: RhinoFactoryArgs;
};

export type RhinoInference = {
  /** Rhino has concluded the inference (isUnderstood is now set) */
  isFinalized: boolean
  /** The intent was understood (it matched an expression in the context) */
  isUnderstood?: boolean
  /** The name of the intent */
  intent?: string
  /** Map of the slot variables and values extracted from the utterance */
  slots?: Record<string, string>
}

export interface RhinoEngine {
  release(): void;
  process(frames: Int16Array): RhinoInference;
  version: string;
  sampleRate: number;
  frameLength: number;
}

export type RhinoContext = {
  /** Base64 representation of a trained Rhino context (`.rhn` file) */
  base64: string,
  /** Value in range [0,1] that trades off miss rate for false alarm */
  sensitivity?: number
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

export interface RhinoWorkerFactory {
  create: (rhinoFactoryArgs: RhinoFactoryArgs) => Promise<RhinoWorker>
}

export type RhinoWorkerResponse = RhinoWorkerResponseReady | RhinoWorkerResponseInference | RhinoWorkerResponseError | RhinoWorkerResponseInitError
