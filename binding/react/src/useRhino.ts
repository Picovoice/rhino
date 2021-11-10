import { useState, useEffect } from 'react';

import { WebVoiceProcessor } from '@picovoice/web-voice-processor';
import {
  RhinoHookArgs,
  RhinoInferenceFinalized,
  RhinoWorker,
  RhinoWorkerFactory,
  RhinoWorkerResponse,
} from './rhino_types';

export function useRhino(
  rhinoWorkerFactory: RhinoWorkerFactory | null,
  rhinoHookArgs: RhinoHookArgs | null,
  inferenceCallback: (inference: RhinoInferenceFinalized) => void
): {
  contextInfo: string | null;
  isLoaded: boolean;
  isListening: boolean;
  isError: boolean;
  isTalking: boolean;
  errorMessage: string | null;
  webVoiceProcessor: WebVoiceProcessor | null;
  start: () => void;
  pause: () => void;
  pushToTalk: () => void;
  resume: () => void;
} {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isTalking, setIsTalking] = useState(false);
  const [contextInfo, setContextInfo] = useState<string | null>(null);
  const [rhinoWorker, setRhinoWorker] = useState<RhinoWorker | null>(null);
  const [
    webVoiceProcessor,
    setWebVoiceProcessor,
  ] = useState<WebVoiceProcessor | null>(null);

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
      setIsTalking(true);
      rhinoWorker.postMessage({ command: 'resume' });
      return true;
    }
    return false;
  };

  /** Refresh the inference callback when it changes (avoid stale closure) */
  useEffect(() => {
    if (typeof inferenceCallback !== 'function') {
      // eslint-disable-next-line no-console
      console.warn('useRhino: inferenceCallback is not a function');
    }

    if (rhinoWorker !== null) {
      rhinoWorker.onmessage = (
        msg: MessageEvent<RhinoWorkerResponse>
      ): void => {
        switch (msg.data.command) {
          case 'rhn-inference':
            setIsTalking(false);
            rhinoWorker.postMessage({ command: 'pause' });
            // We know this inference isFinalized, so assert to more specific type
            inferenceCallback(msg.data.inference as RhinoInferenceFinalized);
            break;
          case 'rhn-error':
            setIsError(true);
            setErrorMessage(msg.data.error.toString());
            break;
          case 'rhn-info':
            setContextInfo(msg.data.info);
            break;
          default:
            break;
        }
      };
    }
  }, [inferenceCallback]);

  /** Startup (and cleanup) Rhino */
  useEffect(() => {
    // Reset hook state, since we're rebooting Rhino and WebVoiceProcessor
    setIsTalking(rhinoHookArgs?.isTalking === true);
    setIsListening(false);
    setIsLoaded(false);
    setIsError(false);
    setErrorMessage(null);

    if (rhinoWorkerFactory === null || rhinoWorkerFactory === undefined) {
      return (): void => {
        /* NOOP */
      };
    }

    if (rhinoHookArgs === null || rhinoHookArgs === undefined) {
      return (): void => {
        /* NOOP */
      };
    }

    async function startRhino(): Promise<{
      webVp: WebVoiceProcessor;
      rhnWorker: RhinoWorker;
    }> {
      const { accessKey, context, requireEndpoint, start: startWebVp = true } = rhinoHookArgs!;

      const initIsTalking = rhinoHookArgs?.isTalking === true;

      const rhnWorker = await rhinoWorkerFactory!.create({
        accessKey,
        context,
        requireEndpoint,
        start: initIsTalking,
      });

      rhnWorker.onmessage = (msg: MessageEvent<RhinoWorkerResponse>): void => {
        switch (msg.data.command) {
          case 'rhn-inference':
            setIsTalking(false);
            rhnWorker.postMessage({ command: 'pause' });
            // We know this inference isFinalized, so assert to more specific type
            inferenceCallback(msg.data.inference as RhinoInferenceFinalized);
            break;
          case 'rhn-error':
            setIsError(true);
            setErrorMessage(msg.data.error.toString());
            break;
          case 'rhn-info':
            setContextInfo(msg.data.info);
            break;
          default:
            break;
        }
      };

      rhnWorker.postMessage({ command: 'info' });

      const webVp = await WebVoiceProcessor.init({
        engines: [rhnWorker],
        start: startWebVp,
      });

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
        if (webVp !== null) {
          webVp.release();
        }
        if (rhnWorker !== null) {
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
    JSON.stringify(rhinoHookArgs),
  ]);

  return {
    contextInfo,
    isLoaded,
    isListening,
    isError,
    isTalking,
    errorMessage,
    webVoiceProcessor,
    start,
    pause,
    pushToTalk,
    resume,
  };
}
