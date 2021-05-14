//
// Rhino Types
//
export type RhinoFactoryArgs = {
  context: RhinoContext;
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

export type RhinoInferenceFinalized = {
  /** Rhino has concluded the inference (isUnderstood is now set) */
  isFinalized: true;
  /** The intent was understood (it matched an expression in the context) */
  isUnderstood: boolean;
  /** The name of the intent */
  intent?: string;
  /** Map of the slot variables and values extracted from the utterance */
  slots?: Record<string, string>;
};

export type RhinoInferenceUnderstood = {
  /** Rhino has concluded the inference (isUnderstood is now true) */
  isFinalized: true;
  /** The intent was understood (it matched an expression in the context) */
  isUnderstood: true;
  /** The name of the intent */
  intent: string;
  /** Map of the slot variables and values extracted from the utterance */
  slots?: Record<string, string>;
};

export interface RhinoEngine {
  /** The version of the Rhino engine */
  readonly version: string;
  /** The sampling rate of audio expected by the Rhino engine */
  readonly sampleRate: number;
  /** The frame length of audio expected by the Rhino engine */
  readonly frameLength: number;
  /** The source of the Rhino context (YAML format) */
  readonly contextInfo: string;
  /** Release all resources acquired by Rhino */
  release(): void;
  /** Process a single frame of 16-bit 16kHz PCM audio */
  process(frame: Int16Array): RhinoInference;
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

export type RhinoWorkerRequestInfo = {
  command: 'info';
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

export type RhinoWorkerResponseInfo = {
  command: 'rhn-info';
  info: string;
};

export type RhinoWorkerRequest =
  | WorkerRequestVoid
  | WorkerRequestProcess
  | RhinoWorkerRequestInit
  | RhinoWorkerRequestInfo;

export interface RhinoWorker extends Omit<Worker, 'postMessage'> {
  postMessage(command: RhinoWorkerRequest): void;
}

export type RhinoWorkerResponse =
  | RhinoWorkerResponseReady
  | RhinoWorkerResponseInference
  | RhinoWorkerResponseError
  | RhinoWorkerResponseInitError
  | RhinoWorkerResponseInfo;

// Angular

export type RhinoServiceArgs = {
  /** Immediately start the microphone upon initialization */
  start?: boolean;
  /** The context to instantiate */
  context: RhinoContext;
};
