//
// Copyright 2020 Picovoice Inc.
//
// You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
// file accompanying this source.
//
// Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
// an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
// specific language governing permissions and limitations under the License.
//

import { VoiceProcessor, BufferEmitter } from '@picovoice/react-native-voice-processor';
import { EventSubscription, NativeEventEmitter } from 'react-native';

import Rhino from './rhino';
export type InferenceCallback = (inference: object) => void;

class RhinoManager {
  private _voiceProcessor: VoiceProcessor;
  private _rhino: Rhino | null;
  private _isFinalized: boolean;
  private _inferenceCallback: InferenceCallback;
  private _bufferListener?: EventSubscription;
  private _bufferEmitter: NativeEventEmitter;

  /**
   * Creates an instance of the Rhino Manager.
   * @param contextPath Absolute path to context file.
   * @param inferenceCallback A callback for when Rhino has made an intent inference
   * @param modelPath Path to the file containing model parameters. If not set it will be set to the default location.
   * @param sensitivity Inference sensitivity. A higher sensitivity value results in fewer misses at the cost of (potentially) increasing the erroneous inference rate. 
   * Sensitivity should be a floating-point number within [0, 1].
   * @returns An instance of the Rhino Manager
   */
  
  static async create(
    contextPath: string,
    inferenceCallback: InferenceCallback,
    modelPath?: string,
    sensitivity?: number
  ) {
    let rhino = await Rhino.create(
      contextPath,
      modelPath,
      sensitivity 
    );
    return new RhinoManager(rhino, inferenceCallback);
  }

  constructor(rhino: Rhino, inferenceCallback: InferenceCallback) {
    this._inferenceCallback = inferenceCallback;
    this._rhino = rhino;    
    this._isFinalized = false;
    this._voiceProcessor = new VoiceProcessor(
      rhino.frameLength,
      rhino.sampleRate
    );    
    this._bufferEmitter = new NativeEventEmitter(BufferEmitter);
    this._bufferListener = this._bufferEmitter.addListener(
      BufferEmitter.BUFFER_EMITTER_KEY,
      async (buffer: number[]) => {
        if (this._rhino === null) return;
        
        try{
          this._isFinalized = await this._rhino.process(buffer); 
          
          if(this._isFinalized === true){
            let inference = await this._rhino.getInference();
            if(inference !== undefined){
              this._inferenceCallback(inference);
            }
          }
        }catch(e){
          console.error(e);
        }
      
      }
    );
  }

  /**
   * Opens audio input stream and sends audio frames to Rhino
   */
  start() {
    this._voiceProcessor.start();
  }

  /**
   * Closes audio stream
   */
  stop() {
    this._voiceProcessor.stop();
  }

  /**
   * Releases resources and listeners
   */
  delete() {
    this._bufferListener?.remove();
    if (this._rhino != null) {
      this._rhino.delete();
      this._rhino = null;
    }
  }
}

export default RhinoManager;
