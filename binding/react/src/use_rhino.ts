/*
  Copyright 2022 Picovoice Inc.

  You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
  file accompanying this source.

  Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
  an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
  specific language governing permissions and limitations under the License.
*/

import { useState, useEffect, useRef, useCallback } from 'react';

import { WebVoiceProcessor } from '@picovoice/web-voice-processor';
import {
  RhinoContext,
  RhinoOptions,
  RhinoInference,
  RhinoModel,
  RhinoWorker,
} from '@picovoice/rhino-web';

export function useRhino(): {
  inference: RhinoInference | null;
  contextInfo: string | null;
  isLoaded: boolean;
  isListening: boolean;
  error: Error | string | null;
  init: (
    accessKey: string,
    context: RhinoContext,
    model: RhinoModel,
    options?: RhinoOptions
  ) => Promise<void>;
  process: () => Promise<void>;
  release: () => Promise<void>;
  } {
  const rhinoRef = useRef<RhinoWorker | null>(null);
  const [inference, setInference] = useState<RhinoInference | null>(null);
  const [contextInfo, setContextInfo] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inferenceCallback = useCallback(
    (newInference: RhinoInference): void => {
      if (newInference && newInference.isFinalized) {
        if (rhinoRef.current) {
          WebVoiceProcessor.unsubscribe(rhinoRef.current);
        }
        setIsListening(false);
        setInference(newInference);
      }
    },
    []
  );

  const errorCallback = useCallback((newError: string): void => {
    setError(newError);
  }, []);

  const init = useCallback(
    async (
      accessKey: string,
      context: RhinoContext,
      model: RhinoModel,
      options: RhinoOptions = {}
    ): Promise<void> => {
      if (options.processErrorCallback) {
        // eslint-disable-next-line no-console
        console.warn(
          "'processErrorCallback' is only supported in the Rhino Web SDK. Use the 'error' state to monitor for errors in the React SDK."
        );
      }

      try {
        if (!rhinoRef.current) {
          rhinoRef.current = await RhinoWorker.create(
            accessKey,
            context,
            inferenceCallback,
            model,
            { ...options, processErrorCallback: errorCallback }
          );
          setContextInfo(rhinoRef.current.contextInfo);
          setIsLoaded(true);
          setError(null);
        }
      } catch (e: any) {
        setError(e.toString());
      }
    },
    [inferenceCallback]
  );

  const process = useCallback(async (): Promise<void> => {
    try {
      if (!rhinoRef.current) {
        setError('Rhino has not been initialized or has been released');
        return;
      }

      if (!isListening) {
        rhinoRef.current.reset();
        await WebVoiceProcessor.subscribe(rhinoRef.current);
        setIsListening(true);
        setError(null);
      }
    } catch (e: any) {
      setError(e.toString());
    }
  }, [isListening]);

  const release = useCallback(async (): Promise<void> => {
    try {
      if (rhinoRef.current) {
        await WebVoiceProcessor.unsubscribe(rhinoRef.current);
        rhinoRef.current.terminate();
        rhinoRef.current = null;
        setIsListening(false);
        setError(null);
        setIsLoaded(false);
      }
    } catch (e: any) {
      setError(e.toString());
    }
  }, []);

  useEffect(() => (): void => {
    if (rhinoRef.current) {
      WebVoiceProcessor.unsubscribe(rhinoRef.current);
      rhinoRef.current.terminate();
      rhinoRef.current = null;
    }
  }, []);

  return {
    inference,
    contextInfo,
    isLoaded,
    isListening,
    error,
    init,
    process,
    release,
  };
}
