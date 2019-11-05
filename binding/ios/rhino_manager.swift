//
// Copyright 2019 Picovoice Inc.
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
// http://www.apache.org/licenses/LICENSE-2.0
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//

import AVFoundation
import pv_rhino

/// Errors corresponding to different status codes returned by Porcupine library.
public enum RhinoManagerError: Error {
    case outOfMemory
    case io
    case invalidArgument
}

public enum RhinoManagerPermissionError: Error {
    case recordingDenied
}

public struct InferenceInfo {
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

    private var rhino: OpaquePointer?

    private let audioInputEngine: AudioInputEngine

    public let modelFilePath: String
    public let contextFilePath: String

    public var onInference: ((InferenceInfo) -> Void)?

    public private(set) var isListening = false

    private var shouldBeListening: Bool = false

    public init(modelFilePath: String, contextFilePath: String, onInference: ((InferenceInfo) -> Void)?) throws {

        self.modelFilePath = modelFilePath
        self.contextFilePath = contextFilePath
        self.onInference = onInference

        self.audioInputEngine = AudioInputEngine_AudioQueue()

        audioInputEngine.audioInput = { [weak self] audio in

            guard let `self` = self else {
                return
            }

            var isFinalized: Bool = false

            pv_rhino_process(self.rhino, audio, &isFinalized)
            if isFinalized {
                var isUnderstood: Bool = false
                pv_rhino_is_understood(self.rhino, &isUnderstood)
                if isUnderstood {
                    var intent: UnsafePointer<Int8>?
                    var numSlots: Int32 = 0
                    var slots: UnsafeMutablePointer<UnsafePointer<Int8>?>?
                    var values: UnsafeMutablePointer<UnsafePointer<Int8>?>?
                    pv_rhino_get_intent(self.rhino, &intent, &numSlots, &slots, &values)
                    
                    if !isUnderstood {
                        self.onInference?(InferenceInfo(isUnderstood: false, intent: "", slots: [String: String]()))
                    } else {
                        var slotsDictionary = [String: String]()
                        for i in 1...numSlots {
                            let slot = String(cString: slots!.advanced(by: Int(i)).pointee!)
                            let value = String(cString: values!.advanced(by: Int(i)).pointee!)
                            slotsDictionary[slot] = value
                        }
                        
                        self.onInference?(InferenceInfo(isUnderstood: isUnderstood, intent: String(cString: intent!), slots: slotsDictionary))
                        
                        pv_rhino_free_slots_and_values(self.rhino, slots, values)
                    }
                }
            }
        }

        let status = pv_rhino_init(modelFilePath, contextFilePath, 0.5, &rhino)
        try checkInitStatus(status)
    }

    deinit {
        if isListening {
            stopListening()
        }
        pv_rhino_delete(rhino)
        rhino = nil
    }

    public func startListening() throws {

        shouldBeListening = true

        let audioSession = AVAudioSession.sharedInstance()
        // Only check if it's denied, permission will be automatically asked.
        if audioSession.recordPermission == .denied {
            throw RhinoManagerPermissionError.recordingDenied
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

        shouldBeListening = false

        guard isListening else {
            return
        }

        audioInputEngine.stop()
        isListening = false
    }

    // MARK: - Private

    private func checkInitStatus(_ status: pv_status_t) throws {
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

    @objc private func onAudioSessionInterruption(_ notification: Notification) {

        guard let userInfo = notification.userInfo,
            let typeValue = userInfo[AVAudioSessionInterruptionTypeKey] as? UInt,
            let type = AVAudioSession.InterruptionType(rawValue: typeValue) else {
                return
        }

        if type == .began {
            audioInputEngine.pause()
        } else if type == .ended {
            // Interruption options are ignored. AudioEngine should be restarted
            // unless PorcupineManager is told to stop listening.
            guard let _ = userInfo[AVAudioSessionInterruptionOptionKey] as? UInt else {
                return
            }
            if shouldBeListening {
                audioInputEngine.unpause()
            }
        }
    }
}

private protocol AudioInputEngine: AnyObject {

    var audioInput: ((UnsafePointer<Int16>) -> Void)? { get set }

    func start() throws
    func stop()

    func pause()
    func unpause()
}

private class AudioInputEngine_AudioQueue: AudioInputEngine {

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

    func pause() {
        guard let audioQueue = audioQueue else {
            return
        }
        AudioQueuePause(audioQueue)
    }

    func unpause() {
        guard let audioQueue = audioQueue else {
            return
        }
        AudioQueueFlush(audioQueue)
        AudioQueueStart(audioQueue, nil)
    }

    private func createAudioQueueCallback() -> AudioQueueInputCallback {
        return { userData, queue, bufferRef, startTimeRef, numPackets, packetDescriptions in

            // `self` is passed in as userData in the audio queue callback.
            guard let userData = userData else {
                return
            }
            let `self` = Unmanaged<AudioInputEngine_AudioQueue>.fromOpaque(userData).takeUnretainedValue()

            let pcm = bufferRef.pointee.mAudioData.assumingMemoryBound(to: Int16.self)

            if let audioInput = self.audioInput {
                audioInput(pcm)
            }

            AudioQueueEnqueueBuffer(queue, bufferRef, 0, nil)
        }
    }
}
