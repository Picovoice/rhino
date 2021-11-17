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
  /** This is a finalized inference, so isUnderstood is now conclusively set to true/false */
  isFinalized: true;
  /** The intent was understood (it matched an expression in the context) */
  isUnderstood: boolean;
  /** The name of the intent */
  intent?: string;
  /** Map of the slot variables and values extracted from the utterance */
  slots?: Record<string, string>;
};

export interface RhinoEngine {
  /** Release all resources acquired by Rhino */
  release(): void;
  /** Process a single frame of 16-bit 16kHz PCM audio */
  process(frame: Int16Array): RhinoInference;
  /** The version of the Rhino engine */
  readonly version: string;
  /** The sampling rate of audio expected by the Rhino engine */
  readonly sampleRate: number;
  /** The frame length of audio expected by the Rhino engine */
  readonly frameLength: number;
  /** The source of the Rhino context (YAML format) */
  readonly contextInfo: string;
}

export type RhinoContext = {
  /** Base64 representation of a trained Rhino context (`.rhn` file) */
  base64: string;
  /** Value in range [0,1] that trades off miss rate for false alarm */
  sensitivity?: number;
};

export type RhinoArgs = {
  /** AccessKey obtained from Picovoice Console (https://picovoice.ai/console/) */
  accessKey: string;
  /** The context to instantiate */
  context: RhinoContext;
  /** If set to `true`, Rhino requires an endpoint (chunk of silence) before finishing inference. **/
  requireEndpoint?: boolean;
  /** Whether to start the Rhino engine immediately upon loading.
   * Default: false, as typical use-case is Push-to-Talk */
  start: boolean;
};

export type WorkerRequestProcess = {
  command: 'process';
  inputFrame: Int16Array;
};

export type WorkerRequestVoid = {
  command: 'reset' | 'pause' | 'resume' | 'release';
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

export type RhinoWorkerRequestFileOperation = {
  command:
    | 'file-save-succeeded'
    | 'file-save-failed'
    | 'file-load-succeeded'
    | 'file-load-failed'
    | 'file-exists-succeeded'
    | 'file-exists-failed'
    | 'file-delete-succeeded'
    | 'file-delete-failed';
  message?: string;
  content?: string;
};

export type RhinoWorkerRequest =
  | WorkerRequestVoid
  | WorkerRequestProcess
  | RhinoWorkerRequestInit
  | RhinoWorkerRequestInfo
  | RhinoWorkerRequestFileOperation;

export interface RhinoWorker extends Omit<Worker, 'postMessage'> {
  postMessage(command: RhinoWorkerRequest): void;
}

export interface RhinoWorkerFactory {
  create: (rhinoArgs: RhinoArgs) => Promise<RhinoWorker>;
}

export type RhinoWorkerResponseFileOperation = {
  command: 'file-save' | 'file-load' | 'file-exists' | 'file-delete';
  path: string;
  content?: string;
};

export type RhinoWorkerResponse =
  | RhinoWorkerResponseReady
  | RhinoWorkerResponseInference
  | RhinoWorkerResponseError
  | RhinoWorkerResponseInitError
  | RhinoWorkerResponseInfo
  | RhinoWorkerResponseFileOperation;

// React

export type RhinoHookArgs = {
  /** AccessKey obtained from Picovoice Console (https://picovoice.ai/console/) */
  accessKey: string;
  /** The context to instantiate */
  context: RhinoContext;
  /** If set to `true`, Rhino requires an endpoint (chunk of silence) before finishing inference. **/
  requireEndpoint?: boolean;
  /** Immediately start the microphone upon initialization */
  start?: boolean;
  /** Immediately put Rhino in an active isTalking state upon initialization (as if pushToTalk() was called) (default: false) */
  isTalking?: boolean;
};
