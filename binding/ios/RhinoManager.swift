//
//  Copyright 2018-2021 Picovoice Inc.
//  You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
//  file accompanying this source.
//  Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
//  an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
//  specific language governing permissions and limitations under the License.
//

import ios_voice_processor

public enum RhinoManagerError: Error {
    case recordingDenied
    case objectDisposed
}

/// High-level iOS binding for Rhino Speech-to-Intent engine. It handles recording audio from microphone, processes it in real-time using Rhino, and notifies the client
/// when an intent is inferred from the spoken command.
public class RhinoManager {
    private var onInferenceCallback: ((Inference) -> Void)?
    private var errorCallback: ((Error) -> Void)?
    private var rhino: Rhino?
    
    private var started = false    
    private var stop = false
    
    /// Constructor.
    ///
    /// - Parameters:
    ///   - modelPath: Absolute path to file containing model parameters.
    ///   - contextPath: Absolute path to file containing context parameters. A context represents the set of expressions (spoken commands), intents, and
    ///   intent arguments (slots) within a domain of interest.
    ///   - sensitivity: Inference sensitivity. It should be a number within [0, 1]. A higher sensitivity value results in fewer misses at the cost of (potentially)
    ///   increasing the erroneous inference rate.
    ///   - onInferenceCallback: It is invoked upon completion of intent inference.
    ///   - errorCallback: Invoked if an error occurs while processing frames. If missing, error will be printed to console.
    /// - Throws: RhinoManagerError
    public init(
        contextPath: String,
        modelPath: String? = nil,
        sensitivity: Float32 = 0.5,
        onInferenceCallback: ((Inference) -> Void)?,
        errorCallback: ((Error) -> Void)? = nil) throws {
        self.onInferenceCallback = onInferenceCallback
        self.errorCallback = errorCallback
        self.rhino = try Rhino(contextPath:contextPath, modelPath:modelPath, sensitivity:sensitivity)
    }
    
    deinit {
        self.delete()
    }
    
    /// Stops recording and releases Rhino resources
    public func delete() {
        if self.started {
            self.stop = true
        }
        
        if self.rhino != nil {
            self.rhino!.delete()
            self.rhino = nil
        }
    }
    
    /// Callback to run after after voice processor processes frames.
    private func audioCallback(pcm: [Int16]) {
        guard self.rhino != nil else {
            return
        }

        do {
            let isFinalized:Bool = try self.rhino!.process(pcm: pcm)
            if isFinalized {
                do {
                    let inference:Inference = try self.rhino!.getInference()
                    self.onInferenceCallback?(inference)
                } catch {
                    print("There was an error retrieving the inference result.")
                }
                
                self.stop = true
            }
        } catch {
            if self.errorCallback != nil {
                self.errorCallback!(error)
            } else {
                print("\(error)")
            }
        }
    }
    
    /// Start recording audio from the microphone and infers the user's intent from the spoken command. Once the inference is finalized it will invoke the user
    /// provided callback and terminates recording audio.
    ///
    /// - Throws: AVAudioSession, AVAudioEngine errors. Additionally RhinoManagerError if
    ///           microphone permission is not granted or Rhino has been disposed.
    public func process() throws {
        if self.started {
            return
        }
        
        if rhino == nil {
            throw RhinoManagerError.objectDisposed
        }

        // Only check if it's denied, permission will be automatically asked.
        guard try VoiceProcessor.shared.hasPermissions() else {
            throw RhinoManagerError.recordingDenied
        }
                
        let dispatchQueue = DispatchQueue(label: "RhinoManagerWatcher", qos: .background)
        dispatchQueue.async {
            while !self.stop {
                usleep(10000)
            }
            VoiceProcessor.shared.stop()
            
            self.started = false
            self.stop = false
        }
        
        try VoiceProcessor.shared.start(
            frameLength: Rhino.frameLength,
            sampleRate: Rhino.sampleRate,
            audioCallback: self.audioCallback
        )
     
        self.started = true        
    }   
}
