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
  $_rhnWorker_: Worker | null;
  $_webVp_: WebVoiceProcessor | null;
  init: (
    accessKey: string,
    context: RhinoContext,
    inferenceCallback: InferenceCallback,
    model: RhinoModel,
    options: RhinoOptions,
    contextCallback: (info: string) => void,
    isLoadedCallback: (isLoaded: boolean) => void,
    isListeningCallback: (isListening: boolean) => void,
    errorCallback: (error: Error) => void) => void;
  process: () => Promise<boolean>;
  release: () => Promise<boolean>;
}

export default {
  computed: {
    /**
     * Rhino Vue Mixin.
     */
    $rhino(): RhinoVue {
      return {
        $_rhnWorker_: null as Worker | null,
        $_webVp_: null as WebVoiceProcessor | null,
        /**
         * Init function for Rhino.
         *
         * @param rhinoFactoryArgs Arguments for RhinoWorkerFactory.
         * @param rhinoFactory The language-specific worker factory
         * @param inferenceCallback A method invoked upon completion of intent inference.
         * @param contextCallback A method invoked after context information is ready.
         * @param readyCallback A method invoked after Rhino has initialized.
         * @param errorCallback A method invoked if an error occurs within `PorcupineWorkerFactory`.
         */
        async init(
          accessKey: string,
          context: RhinoContext,
          inferenceCallback: InferenceCallback,
          model: RhinoModel,
          options: RhinoOptions = {},
          contextCallback: (info: string) => void = (info: string) => {},
          isLoadedCallback: (isLoaded: boolean) => void = (isLoaded: boolean) => {},
          isListeningCallback: (isListening: boolean) => void = (isListening: boolean) => {},
          errorCallback: (error: Error) => void = (error: Error) => {})
        ) {
          try {
            const { accessKey, context, endpointDurationSec, requireEndpoint, start } = rhinoFactoryArgs;
            this.$_rhnWorker_ = await rhinoFactory.create({
              accessKey,
              context: JSON.parse(JSON.stringify(context)),
              endpointDurationSec,
              requireEndpoint,
              start
            });
            this.$_webVp_ = await WebVoiceProcessor.init({
              engines: [this.$_rhnWorker_],
            });

            this.$_rhnWorker_.onmessage = messageEvent => {
              switch (messageEvent.data.command) {
                case 'rhn-inference':
                  inferenceCallback(messageEvent.data.inference);
                  // Reset Push-to-Talk
                  this.$_rhnWorker_?.postMessage({ command: 'pause' });
                  break;
                case 'rhn-info':
                  const info = messageEvent.data.info;
                  contextCallback(info);
                  break;
              }
            };
            this.$_rhnWorker_.postMessage({ command: 'info' });
            readyCallback();
          } catch (error) {
            errorCallback(error as Error);
          }
        },
        /**
         * Put Rhino in an active isListening state.
         */
        process() {
          if (this.$_webVp_ !== null) {
            this.$_webVp_.start();
            this.$_rhnWorker_?.postMessage({ command: 'resume' });
            return true;
          }
          return false;
        },
        release() {
        }
      }
    }
  },
  // Vue 3 method to clean resources.
  beforeUnmount(this: any) {
    this.$rhino.delete();
  },
  // Vue 2 method to clean resources.
  beforeDestory(this: any) {
    this.$rhino.delete();
  }
};
