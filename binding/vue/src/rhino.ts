/*
  Copyright 2022 Picovoice Inc.

  You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
  file accompanying this source.

  Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
  an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
  specific language governing permissions and limitations under the License.
*/

import { WebVoiceProcessor } from '@picovoice/web-voice-processor';

import {
  InferenceCallback,
  RhinoContext,
  RhinoOptions,
  RhinoInference,
  RhinoModel,
  RhinoWorker
} from '@picovoice/rhino-web';

/**
 * Type alias for Rhino Vue Mixin.
 * Use with `Vue as VueConstructor extends {$rhino: RhinoVue}` to get types in typescript.
 */
 export interface RhinoVue {
  $_rhino_: RhinoWorker | null;
  init: (
    accessKey: string,
    context: RhinoContext,
    inferenceCallback: InferenceCallback,
    model: RhinoModel,
    contextCallback: (info: string) => void,
    isLoadedCallback: (isLoaded: boolean) => void,
    isListeningCallback: (isListening: boolean) => void,
    errorCallback: (error: any) => void,
    options?: RhinoOptions) => Promise<void>;
  process: () => Promise<void>;
  release: () => Promise<void>;
  isLoadedCallback: (isLoaded: boolean) => void,
  isListeningCallback: (isListening: boolean) => void,
  errorCallback: (error: string | null) => void,
}

export default {
  computed: {
    /**
     * Rhino Vue Mixin.
     */
    $rhino(): RhinoVue {
      return {
        $_rhino_: null as RhinoWorker | null,
        isLoadedCallback: function (): void {
          return;
        },
        isListeningCallback: function (): void {
          return;
        },
        errorCallback: function (): void {
          return;
        },
        async init(
          accessKey: string,
          context: RhinoContext,
          inferenceCallback: InferenceCallback,
          model: RhinoModel,
          contextCallback: (info: string) => void,
          isLoadedCallback: (isLoaded: boolean) => void ,
          isListeningCallback: (isListening: boolean) => void ,
          errorCallback: (error: any) => void,
          options: RhinoOptions = {}
        ): Promise<void> {
          if (options.processErrorCallback) {
            console.warn("'processErrorCallback' options is not supported, use 'errorCallback' instead.");
          }

          const inferenceCallbackInner = (newInference: RhinoInference) => {
            if (newInference && newInference.isFinalized) {
              if (this.$_rhino_) {
                WebVoiceProcessor.unsubscribe(this.$_rhino_);
              }
              isListeningCallback(false);
              inferenceCallback(newInference);
            }
          };

          try {
            if (!this.$_rhino_) {
              this.$_rhino_ = await RhinoWorker.create(
                accessKey,
                context,
                inferenceCallbackInner,
                model,
                {...options, processErrorCallback: errorCallback}
              );

              contextCallback(this.$_rhino_.contextInfo);

              this.isListeningCallback = isListeningCallback;
              this.isLoadedCallback = isLoadedCallback;
              this.errorCallback = errorCallback;
              isLoadedCallback(true);
              errorCallback(null);
            }
          } catch (error: any) {
            errorCallback(error.toString());
          }
        },
        async process(): Promise<void> {
          try {
            if (!this.$_rhino_) {
              this.errorCallback('Rhino not initialized');
              return;
            }
            await WebVoiceProcessor.subscribe(this.$_rhino_);
            this.isListeningCallback(true);
            this.errorCallback(null);
          } catch (error: any) {
            this.errorCallback(error.toString());
          }
        },
        async release(): Promise<void> {
          if (this.$_rhino_) {
            await WebVoiceProcessor.unsubscribe(this.$_rhino_);
            this.$_rhino_.terminate();
            this.$_rhino_ = null;

            this.isLoadedCallback(false);
          }
        },
      }
    }
  },
  // Vue 3 method to clean resources.
  beforeUnmount(this: any): void {
    this.$rhino.release();
  },
  // Vue 2 method to clean resources.
  beforeDestroy(this: any): void {
    this.$rhino.release();
  }
};
