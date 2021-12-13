import { WebVoiceProcessor } from '@picovoice/web-voice-processor';

/**
 * Type alias for Rhino context.
 */
export type RhinoContext = {
  base64: string
  sensitivity?: number
};
  
/**
 * Type alias for the Rhino inference.
 */
export type RhinoInferenceFinalized = {
  isFinalized: true
  isUnderstood?: boolean
  intent?: string
  slots?: {[key: string]: string}
};
  
/**
 * Type alias for RhinoWorkerFactory arguments.
 */
export type RhinoWorkerFactoryArgs = {
  accessKey: string;
  context: RhinoContext;
  requireEndpoint?: boolean;
  start: boolean;
};

/**
 * The language-specific worker factory, imported as { RhinoWorkerFactory } from the 
 * @picovoice/rhino-web-xx-worker series of packages, where xx is the two-letter language code.
 */
export interface RhinoWorkerFactory extends Object {
  create: (
    rhinoArgs: RhinoWorkerFactoryArgs
  ) => Promise<Worker>,
};

/**
 * Type alias for Rhino Vue Mixin.
 * Use with `Vue as VueConstructor extends {$rhino: RhinoVue}` to get types in typescript.
 */
export interface RhinoVue {
  $_rhnWorker_: Worker | null;
  $_webVp_: WebVoiceProcessor | null;
  init: (
    rhinoFactoryArgs: RhinoWorkerFactoryArgs,
    rhinoFactory: RhinoWorkerFactory,
    inferenceCallback: (inference: RhinoInferenceFinalized) => void,
    contextCallback: (info: string) => void,
    readyCallback: () => void,
    errorCallback: (error: Error) => void) => void;
  start: () => boolean;
  pause: () => boolean;
  pushToTalk: () => boolean;
  delete: () => void;
}
