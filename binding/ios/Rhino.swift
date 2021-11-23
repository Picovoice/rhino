//
//  Copyright 2021 Picovoice Inc.
//  You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
//  file accompanying this source.
//  Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
//  an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
//  specific language governing permissions and limitations under the License.
//

import PvRhino

public struct Inference {
    public let isUnderstood: Bool
    public let intent: String
    public let slots: Dictionary<String, String>
    
    public init(isUnderstood: Bool, intent: String, slots: Dictionary<String, String>) {
        self.isUnderstood = isUnderstood
        self.intent = intent
        self.slots = slots
    }
}

/// Low-level iOS binding for Rhino wake word engine. Provides a Swift interface to the Rhino library.
public class Rhino {
    
    static let resourceBundle: Bundle = {
       let myBundle = Bundle(for: Rhino.self)

        guard let resourceBundleURL = myBundle.url(
             forResource: "RhinoResources", withExtension: "bundle")
        else { fatalError("RhinoResources.bundle not found") }

        guard let resourceBundle = Bundle(url: resourceBundleURL)
            else { fatalError("Could not open RhinoResources.bundle") }

        return resourceBundle
    }()

    private var handle: OpaquePointer?
    public static let frameLength = UInt32(pv_rhino_frame_length())
    public static let sampleRate = UInt32(pv_sample_rate())
    public static let version = String(cString: pv_rhino_version())
    public var contextInfo:String = ""
    
    private var isFinalized: Bool = false
    
    /// Constructor.
    ///
    /// - Parameters:
    ///   - accessKey: AccessKey obtained from Picovoice Console (https://console.picovoice.ai).
    ///   - contextPath: Absolute path to file containing context parameters. A context represents the set of expressions (spoken commands), intents, and
    ///   intent arguments (slots) within a domain of interest.
    ///   - modelPath: Absolute path to file containing model parameters.
    ///   - sensitivity: Inference sensitivity. It should be a number within [0, 1]. A higher sensitivity value results in fewer misses at the cost of (potentially)
    ///   increasing the erroneous inference rate.
    ///   - requireEndpoint: If set to `true`, Rhino requires an endpoint (chunk of silence) before finishing inference.
    /// - Throws: RhinoError
    public init(accessKey: String, contextPath: String, modelPath:String? = nil, sensitivity:Float32 = 0.5, requireEndpoint: Bool = true) throws {
        
        if accessKey.isEmpty {
            throw RhinoInvalidArgumentError("No AccessKey was provided to Rhino")
        }  
        
        if !FileManager().fileExists(atPath: contextPath) {
            throw RhinoIOError("Context file at does not exist at '\(contextPath)'")
        }
        
        var modelPathArg = modelPath
        if (modelPathArg == nil){
            modelPathArg  = Rhino.resourceBundle.path(forResource: "rhino_params", ofType: "pv")
            if modelPathArg == nil {
                throw RhinoIOError("Could not find default model file in app bundle.")
            }
        }
        
        if !FileManager().fileExists(atPath: modelPathArg!) {
            throw RhinoIOError("Model file at does not exist at '\(modelPathArg!)'")
        }
        
        if sensitivity < 0 || sensitivity > 1 {
            throw RhinoInvalidArgumentError("Sensitivity value '\(sensitivity)' is not a floating-point value between [0, 1]")
        }
        
        var status = pv_rhino_init(
            accessKey,
            modelPathArg,
            contextPath,
            sensitivity,
            requireEndpoint,
            &self.handle)
        if status != PV_STATUS_SUCCESS {
            throw pvStatusToRhinoError(status, "Rhino init failed")
        }
        
        // get context info from lib and set in binding
        var cContextInfo: UnsafePointer<Int8>?
        status = pv_rhino_context_info(self.handle, &cContextInfo);
        if status != PV_STATUS_SUCCESS {
            throw pvStatusToRhinoError(status, "Failed to get Rhino context info")
        }
        
        self.contextInfo = String(cString: cContextInfo!)
    }
    
    deinit {
        self.delete()
    }
    
    /// Releases native resources that were allocated to Rhino
    public func delete(){
        if self.handle != nil {
            pv_rhino_delete(self.handle)
            self.handle = nil
        }
    }
    
    /// Process a frame of audio with the inference engine
    ///
    /// - Parameters:
    ///   - pcm: An array of 16-bit pcm samples
    /// - Throws: RhinoError
    /// - Returns:A boolean indicating whether Rhino has a result ready or not
    public func process(pcm:[Int16]) throws -> Bool {
        if handle == nil {
            throw RhinoInvalidStateError("Rhino must be initialized before process is called")
        }
        
        if pcm.count != Rhino.frameLength {
            throw RhinoInvalidArgumentError("Frame of audio data must contain \(Rhino.frameLength) samples - given frame contained \(pcm.count)")
        }
        
        let status = pv_rhino_process(self.handle, pcm, &self.isFinalized)
        if status != PV_STATUS_SUCCESS {
            throw pvStatusToRhinoError(status, "Rhino process failed")
        }
        
        return self.isFinalized
    }
    
    /// Get inference result from Rhino
    /// - Returns:An inference object
    /// - Throws: RhinoError
    public func getInference() throws -> Inference {
        
        if handle == nil {
            throw RhinoInvalidStateError("Rhino must be initialized before process is called")
        }
        
        if !self.isFinalized {
            throw RhinoInvalidStateError("getInference can only be called after Rhino has finalized (i.e. process returns true)")
        }
        
        var isUnderstood: Bool = false
        var intent = ""
        var slots = [String: String]()
        
        var status = pv_rhino_is_understood(self.handle, &isUnderstood)
        if status != PV_STATUS_SUCCESS {
            throw pvStatusToRhinoError(status, "Rhino failed to get isUnderstood")
        }
        
        if isUnderstood {
            var cIntent: UnsafePointer<Int8>?
            var numSlots: Int32 = 0
            var cSlotKeys: UnsafeMutablePointer<UnsafePointer<Int8>?>?
            var cSlotValues: UnsafeMutablePointer<UnsafePointer<Int8>?>?
            status = pv_rhino_get_intent(self.handle, &cIntent, &numSlots, &cSlotKeys, &cSlotValues)
            if status != PV_STATUS_SUCCESS {
                throw pvStatusToRhinoError(status, "Rhino failed to get Intent")
            }
            
            if isUnderstood {
                intent = String(cString: cIntent!)
                for i in 0..<numSlots {
                    let slot = String(cString: cSlotKeys!.advanced(by: Int(i)).pointee!)
                    let value = String(cString: cSlotValues!.advanced(by: Int(i)).pointee!)
                    slots[slot] = value
                }
                
                status = pv_rhino_free_slots_and_values(self.handle, cSlotKeys, cSlotValues)
                if status != PV_STATUS_SUCCESS {
                    throw pvStatusToRhinoError(status, "Rhino failed to free slots and values")
                }
            }
        }
        
        status = pv_rhino_reset(self.handle)
        if status != PV_STATUS_SUCCESS {
            throw pvStatusToRhinoError(status, "Rhino failed to reset")
        }
        
        return Inference(isUnderstood: isUnderstood, intent: intent, slots: slots)
    }
    
    private func pvStatusToRhinoError(_ status: pv_status_t, _ message: String) -> RhinoError {
        switch status {
        case PV_STATUS_OUT_OF_MEMORY:
            return RhinoMemoryError(message)
        case PV_STATUS_IO_ERROR:
            return RhinoIOError(message)
        case PV_STATUS_INVALID_ARGUMENT:
            return RhinoInvalidArgumentError(message)
        case PV_STATUS_STOP_ITERATION:
            return RhinoStopIterationError(message)
        case PV_STATUS_KEY_ERROR:
            return RhinoKeyError(message)
        case PV_STATUS_INVALID_STATE:
            return RhinoInvalidStateError(message)
        case PV_STATUS_RUNTIME_ERROR:
            return RhinoRuntimeError(message)
        case PV_STATUS_ACTIVATION_ERROR:
            return RhinoActivationError(message)
        case PV_STATUS_ACTIVATION_LIMIT_REACHED:
            return RhinoActivationLimitError(message)
        case PV_STATUS_ACTIVATION_THROTTLED:
            return RhinoActivationThrottledError(message)
        case PV_STATUS_ACTIVATION_REFUSED:
            return RhinoActivationRefusedError(message)
        default:
            let pvStatusString = String(cString: pv_status_to_string(status))
            return RhinoError("\(pvStatusString): \(message)")
        }
    }
}
