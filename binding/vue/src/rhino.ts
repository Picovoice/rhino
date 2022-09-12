/*
  Copyright 2022 Picovoice Inc.

  You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
  file accompanying this source.

  Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
  an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
  specific language governing permissions and limitations under the License.
*/

import { reactive, Ref, ref, UnwrapNestedRefs, UnwrapRef, version } from 'vue';

import { WebVoiceProcessor } from '@picovoice/web-voice-processor';

import {
  InferenceCallback,
  RhinoContext,
  RhinoOptions,
  RhinoInference,
  RhinoModel,
  RhinoWorker
} from '@picovoice/rhino-web';

const createRef = <T>(data: T): Ref<UnwrapRef<T>> => {
  if (!ref || !version || version.charAt(0) < "3") {
    const obj = {
      value: data
    };

    return new Proxy(obj as Ref<UnwrapRef<T>>, {
      get(target, property, receiver): T {
        return Reflect.get(target, property, receiver);
      },
      set(target, property, newValue: T, receiver): boolean {
        return Reflect.set(target, property, newValue, receiver);
      }
    });
  }

  return ref<T>(data);
};

const createReactive = <T extends object>(data: T): UnwrapNestedRefs<T> => {
  if (!reactive || !version || version.charAt(0) < "3") {
    return data as UnwrapNestedRefs<T>;
  }

  return reactive<T>(data);
};

export type RhinoVue = {
  state: {
    inference: RhinoInference | null;
    contextInfo: string | null;
    isLoaded: boolean;
    isListening: boolean;
    error: string | null;
  },
  init: (
    accessKey: string,
    context: RhinoContext,
    model: RhinoModel,
    options?: RhinoOptions) => Promise<void>;
  process: () => Promise<void>;
  release: () => Promise<void>;
}

export function useRhino(): RhinoVue {
  const rhinoRef = createRef<RhinoWorker | null>(null);

  const state = createReactive<{
    inference: RhinoInference | null;
    contextInfo: string | null;
    isLoaded: boolean;
    isListening: boolean;
    error: string | null;
  }>({
    inference: null,
    contextInfo: null,
    isLoaded: false,
    isListening: false,
    error: null
  });

  const inferenceCallback = async(newInference: RhinoInference): Promise<void> => {
    if (newInference && newInference.isFinalized) {
      if (rhinoRef.value) {
        await WebVoiceProcessor.unsubscribe(rhinoRef.value);
      }
      state.isListening = false;
      state.inference = newInference;
    }
  };

  const errorCallback = (newError: string): void => {
    state.error = newError;
  };

  const init = async (
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
      if (!rhinoRef.value) {
        rhinoRef.value = await RhinoWorker.create(
          accessKey,
          context,
          inferenceCallback,
          model,
          { ...options, processErrorCallback: errorCallback }
        );
        state.contextInfo = rhinoRef.value.contextInfo;
        state.isLoaded = true;
        state.error = null;
      }
    } catch (e: any) {
      errorCallback(e.toString());
    }
  };

  const process = async (): Promise<void> => {
    try {
      if (!rhinoRef.value) {
        state.error = 'Rhino has not been initialized or has been released';
        return;
      }

      if (!state.isListening) {
        rhinoRef.value.reset();
        await WebVoiceProcessor.subscribe(rhinoRef.value);
        state.isListening = true;
        state.error = null;
      }
    } catch (e: any) {
      errorCallback(e.toString());
    }
  };

  const release = async (): Promise<void> => {
    try {
      if (rhinoRef.value) {
        await WebVoiceProcessor.unsubscribe(rhinoRef.value);
        rhinoRef.value.terminate();
        rhinoRef.value = null;
        state.isListening = false;
        state.error = null;
        state.isLoaded = false;
      }
    } catch (e: any) {
      errorCallback(e.toString());
    }
  };

  return {
    state,
    init,
    process,
    release,
  };
}
