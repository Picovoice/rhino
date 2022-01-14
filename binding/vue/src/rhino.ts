/*
  Copyright 2022 Picovoice Inc.

  You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
  file accompanying this source.

  Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
  an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
  specific language governing permissions and limitations under the License.
*/

import { WebVoiceProcessor } from '@picovoice/web-voice-processor';
import { RhinoContext, RhinoInference, RhinoWorkerFactory } from '@picovoice/rhino-web-core';

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
 * Type alias for Rhino Vue Mixin.
 * Use with `Vue as VueConstructor extends {$rhino: RhinoVue}` to get types in typescript.
 */
 export interface RhinoVue {
  $_rhnWorker_: Worker | null;
  $_webVp_: WebVoiceProcessor | null;
  init: (
    rhinoFactoryArgs: RhinoWorkerFactoryArgs,
    rhinoFactory: RhinoWorkerFactory,
    inferenceCallback: (inference: RhinoInference) => void,
    contextCallback: (info: string) => void,
    readyCallback: () => void,
    errorCallback: (error: Error) => void) => void;
  start: () => boolean;
  pause: () => boolean;
  pushToTalk: () => boolean;
  delete: () => void;
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
          rhinoFactoryArgs,
          rhinoFactory,
          inferenceCallback = (_: RhinoInference) => {},
          contextCallback = (_: string) => {},
          readyCallback = () => {},
          errorCallback = (error: Error) => {console.error(error)}
        ) {
          try {
            const { accessKey, context, requireEndpoint, start } = rhinoFactoryArgs;
            this.$_rhnWorker_ = await rhinoFactory.create({
              accessKey,
              context: JSON.parse(JSON.stringify(context)),
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
         * Start processing audio.
         */
        start() {
          if (this.$_webVp_ !== null) {
            this.$_webVp_.start();
            return true;
          }
          return false;
        },
        /**
         * Stop processing audio.
         */
        pause() {
          if (this.$_webVp_ !== null) {
            this.$_webVp_.pause();
            return true;
          }
          return false;
        },
        /**
         * Put Rhino in an active isTalking state.
         */
        pushToTalk() {
          if (this.$_webVp_ !== null) {
            this.$_webVp_.resume();
            this.$_rhnWorker_?.postMessage({ command: 'resume' });
            return true;
          }
          return false;
        },
        /**
         * Delete used resources.
         */
        delete() {
          this.$_webVp_?.release();
          this.$_rhnWorker_?.postMessage({ command: 'release' });
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
