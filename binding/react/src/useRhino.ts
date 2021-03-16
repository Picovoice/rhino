import { useState, useEffect, useRef } from 'react';

import WebVoiceProcessor from '@picovoice/web-voice-processor';

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

export interface RhinoWorkerFactory {
  create: (rhinoFactoryArgs: RhinoFactoryArgs) => Promise<Worker>
}

export type RhinoHookArgs = {
  /** Immediately start the microphone upon initialization */
  start: boolean;
  /** Arguments forwarded to RhinoWorkerFactory */
  rhinoFactoryArgs: RhinoFactoryArgs;
};

export function useRhino(
  rhinoWorkerFactory: RhinoWorkerFactory,
  rhinoArgs: RhinoHookArgs,
  inferenceCallback: (label: string) => void
): {
  isLoaded: boolean;
  isListening: boolean;
  isError: boolean;
  isTalking: boolean;
  errorMessage: string;
  start: () => void;
  pause: () => void;
  pushToTalk: () => void;
  resume: () => void;
} {
  const [errorMessage, setErrorMessage] = useState(null);
  const [isError, setIsError] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isTalking, setIsTalking] = useState(false);
  const [rhinoWorker, setRhinoWorker] = useState(null);
  const [webVoiceProcessor, setWebVoiceProcessor] = useState(null);
  const callback = useRef(inferenceCallback);

  const start = (): boolean => {
    if (webVoiceProcessor !== null) {
      webVoiceProcessor.start();
      setIsListening(true);
      return true;
    }
    return false;
  };

  const pause = (): boolean => {
    if (webVoiceProcessor !== null) {
      webVoiceProcessor.pause();
      setIsListening(false);
      return true;
    }
    return false;
  };

  const resume = (): boolean => {
    if (webVoiceProcessor !== null) {
      webVoiceProcessor.resume();
      setIsListening(true);
      return true;
    }
    return false;
  };

  const pushToTalk = (): boolean => {
    if (webVoiceProcessor !== null && rhinoWorker !== null) {
      if (!isTalking) {
        setIsTalking(true);
        rhinoWorker.postMessage({ command: 'resume' });
        return true;
      }
    }
    return false;
  };

  useEffect(() => {
    async function startRhino(): Promise<{
      webVp: WebVoiceProcessor;
      rhnWorker: Worker;
    }> {
      const { rhinoFactoryArgs, start: startOnInit } = rhinoArgs;

      const rhnWorker: Worker = await rhinoWorkerFactory.create(
        rhinoFactoryArgs
      );

      const webVp = await WebVoiceProcessor.init({
        engines: [rhnWorker],
        start: startOnInit,
      });

      rhnWorker.onmessage = (msg: MessageEvent): void => {
        switch (msg.data.command) {
          case 'rhn-inference':
            callback.current(msg.data.inference);
            rhnWorker.postMessage({ command: 'pause' });
            setIsTalking(false);
            break;
          default:
            break;
        }
      };

      return { webVp, rhnWorker };
    }
    const startRhinoPromise = startRhino();

    startRhinoPromise
      .then(({ webVp, rhnWorker }) => {
        setIsLoaded(true);
        setIsListening(webVp.isRecording);
        setWebVoiceProcessor(webVp);
        setRhinoWorker(rhnWorker);
        setIsError(false);
      })
      .catch(error => {
        setIsError(true);
        setErrorMessage(error.toString());
      });

    return (): void => {
      startRhinoPromise.then(({ webVp, rhnWorker }) => {
        if (webVp !== undefined) {
          webVp.release();
        }
        if (rhnWorker !== undefined) {
          rhnWorker.postMessage({ command: 'release' });
        }
      });
    };
  }, [
    rhinoWorkerFactory,
    // https://github.com/facebook/react/issues/14476#issuecomment-471199055
    // ".... we know our data structure is relatively shallow, doesn't have cycles,
    // and is easily serializable ... doesn't have functions or weird objects like Dates.
    // ... it's acceptable to pass [JSON.stringify(variables)] as a dependency."
    JSON.stringify(rhinoArgs),
  ]);

  return {
    isLoaded,
    isListening,
    isError,
    isTalking,
    errorMessage,
    start,
    pause,
    pushToTalk,
    resume,
  };
}
