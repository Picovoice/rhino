//
//  Copyright 2018-2020 Picovoice Inc.
//  You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
//  file accompanying this source.
//  Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
//  an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
//  specific language governing permissions and limitations under the License.
//

import AVFoundation
import pv_rhino

public enum RhinoManagerError: Error {
    case invalidArgument
    case io
    case outOfMemory
    case recordingDenied
}

public struct Inference {
    let isUnderstood: Bool
    let intent: String
    let slots: Dictionary<String, String>
    
    public init(isUnderstood: Bool, intent: String, slots: Dictionary<String, String>) {
        self.isUnderstood = isUnderstood
        self.intent = intent
        self.slots = slots
    }
}

public class RhinoManager {
    private var onInferenceCallback: ((Inference) -> Void)?
    
    private let audioInputEngine: AudioInputEngine
    
    private var rhino: OpaquePointer?
    
    private var isListening = false
    
    public init(modelPath: String, contextPath: String, sensitivity: Float32, onInferenceCallback: ((Inference) -> Void)?) throws {
        self.onInferenceCallback = onInferenceCallback
        
        self.audioInputEngine = AudioInputEngine()
        
        audioInputEngine.audioInput = { [weak self] audio in
            
            guard let `self` = self else {
                return
            }
            
            var isFinalized: Bool = false
            
            pv_rhino_process(self.rhino, audio, &isFinalized)
            
            if isFinalized {
                var isUnderstood: Bool = false
                var intent = ""
                var slots = [String: String]()
                
                pv_rhino_is_understood(self.rhino, &isUnderstood)
                
                if isUnderstood {
                    var cIntent: UnsafePointer<Int8>?
                    var numSlots: Int32 = 0
                    var cSlotKeys: UnsafeMutablePointer<UnsafePointer<Int8>?>?
                    var cSlotValues: UnsafeMutablePointer<UnsafePointer<Int8>?>?
                    pv_rhino_get_intent(self.rhino, &cIntent, &numSlots, &cSlotKeys, &cSlotValues)
                    
                    if isUnderstood {
                        intent = String(cString: cIntent!)
                        for i in 0...(numSlots - 1) {
                            let slot = String(cString: cSlotKeys!.advanced(by: Int(i)).pointee!)
                            let value = String(cString: cSlotValues!.advanced(by: Int(i)).pointee!)
                            slots[slot] = value
                        }
                        
                        pv_rhino_free_slots_and_values(self.rhino, cSlotKeys, cSlotValues)
                    }
                }
                
                pv_rhino_reset(self.rhino)
                
                self.onInferenceCallback?(Inference(isUnderstood: isUnderstood, intent: intent, slots: slots))
            }
        }
        
        let status = pv_rhino_init(modelPath, contextPath, sensitivity, &rhino)
        try checkStatus(status)
    }
    
    deinit {
        if isListening {
            stopListening()
        }
        
        pv_rhino_delete(rhino)
        rhino = nil
    }
    
    public func startListening() throws {
        let audioSession = AVAudioSession.sharedInstance()
        if audioSession.recordPermission == .denied {
            throw RhinoManagerError.recordingDenied
        }
        
        guard !isListening else {
            return
        }
        
        try audioSession.setCategory(AVAudioSession.Category.record)
        try audioSession.setMode(AVAudioSession.Mode.measurement)
        try audioSession.setActive(true, options: .notifyOthersOnDeactivation)
        
        try audioInputEngine.start()
        
        isListening = true
    }
    
    public func stopListening() {
        guard isListening else {
            return
        }
        
        audioInputEngine.stop()
        
        isListening = false
    }
    
    private func checkStatus(_ status: pv_status_t) throws {
        switch status {
        case PV_STATUS_IO_ERROR:
            throw RhinoManagerError.io
        case PV_STATUS_OUT_OF_MEMORY:
            throw RhinoManagerError.outOfMemory
        case PV_STATUS_INVALID_ARGUMENT:
            throw RhinoManagerError.invalidArgument
        default:
            return
        }
    }
}

private class AudioInputEngine {
    private let numBuffers = 3
    private var audioQueue: AudioQueueRef?
    
    var audioInput: ((UnsafePointer<Int16>) -> Void)?
    
    func start() throws {
        var format = AudioStreamBasicDescription(
            mSampleRate: Float64(pv_sample_rate()),
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
        
        let bufferSize = UInt32(pv_rhino_frame_length()) * 2
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
        AudioQueueStop(audioQueue, true)
        AudioQueueDispose(audioQueue, false)
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
