//
//  Copyright 2018-2021 Picovoice Inc.
//  You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
//  file accompanying this source.
//  Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
//  an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
//  specific language governing permissions and limitations under the License.
//

import AVFoundation

public enum RhinoManagerError: Error {
    case recordingDenied
    case objectDisposed
}

/// High-level iOS binding for Rhino Speech-to-Intent engine. It handles recording audio from microphone, processes it in real-time using Rhino, and notifies the client
/// when an intent is inferred from the spoken command.
public class RhinoManager {
    private var onInferenceCallback: ((Inference) -> Void)?
    private var rhino: Rhino? 
    private let audioInputEngine: AudioInputEngine    
    
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
    /// - Throws: RhinoManagerError
    public init(contextPath: String, modelPath: String? = nil, sensitivity: Float32 = 0.5, onInferenceCallback: ((Inference) -> Void)?) throws {
        self.onInferenceCallback = onInferenceCallback
        self.rhino = try Rhino(contextPath:contextPath, modelPath:modelPath, sensitivity:sensitivity)
        self.audioInputEngine = AudioInputEngine()
        
        audioInputEngine.audioInput = { [weak self] audio in
            
            guard let `self` = self else {
                return
            }
            
            guard self.rhino != nil else {
                return
            }

            do {
                let isFinalized:Bool = try self.rhino!.process(pcm:audio)
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
                print("\(error)")
            }
        }
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
        let audioSession = AVAudioSession.sharedInstance()
        if audioSession.recordPermission == .denied {
            throw RhinoManagerError.recordingDenied
        }        

        try audioSession.setCategory(AVAudioSession.Category.playAndRecord, options: [.mixWithOthers, .defaultToSpeaker, .allowBluetooth])
                
        let dispatchQueue = DispatchQueue(label: "RhinoManagerWatcher", qos: .background)
        dispatchQueue.async {
            while !self.stop {
                usleep(10000)
            }
            self.audioInputEngine.stop()
            
            self.started = false
            self.stop = false
        }
        
        try audioInputEngine.start()
     
        self.started = true        
    }   
}

private class AudioInputEngine {
    private let numBuffers = 3
    private var audioQueue: AudioQueueRef?
    
    var audioInput: ((UnsafePointer<Int16>) -> Void)?
    
    func start() throws {
        var format = AudioStreamBasicDescription(
            mSampleRate: Float64(Rhino.sampleRate),
            mFormatID: kAudioFormatLinearPCM,
            mFormatFlags: kLinearPCMFormatFlagIsSignedInteger | kLinearPCMFormatFlagIsPacked,
            mBytesPerPacket: 2,
            mFramesPerPacket: 1,
            mBytesPerFrame: 2,
            mChannelsPerFrame: 1,
            mBitsPerChannel: 16,
            mReserved: 0)
        let userData = UnsafeMutableRawPointer(Unmanaged.passUnretained(self).toOpaque())
        AudioQueueNewInput(&format, createAudioQueueCallback(), userData, nil, nil, 0, &audioQueue)
        
        guard let queue = audioQueue else {
            return
        }
        
        let bufferSize = UInt32(Rhino.frameLength) * 2
        for _ in 0..<numBuffers {
            var bufferRef: AudioQueueBufferRef? = nil
            AudioQueueAllocateBuffer(queue, bufferSize, &bufferRef)
            if let buffer = bufferRef {
                AudioQueueEnqueueBuffer(queue, buffer, 0, nil)
            }
        }
        
        AudioQueueStart(queue, nil)
    }
    
    func stop() {
        guard let audioQueue = audioQueue else {
            return
        }
        AudioQueueFlush(audioQueue)
        AudioQueueStop(audioQueue, true)
        AudioQueueDispose(audioQueue, true)
        audioInput = nil
    }
    
    private func createAudioQueueCallback() -> AudioQueueInputCallback {
        return { userData, queue, bufferRef, startTimeRef, numPackets, packetDescriptions in
            
            // `self` is passed in as userData in the audio queue callback.
            guard let userData = userData else {
                return
            }
            let `self` = Unmanaged<AudioInputEngine>.fromOpaque(userData).takeUnretainedValue()
            
            let pcm = bufferRef.pointee.mAudioData.assumingMemoryBound(to: Int16.self)
            
            if let audioInput = self.audioInput {
                audioInput(pcm)
            }
            
            AudioQueueEnqueueBuffer(queue, bufferRef, 0, nil)
        }
    }
}
