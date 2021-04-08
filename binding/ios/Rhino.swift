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

public enum RhinoError: Error {
    case invalidArgument(message:String)
    case io
    case outOfMemory
    case invalidState
}

/// Low-level iOS binding for Rhino wake word engine. Provides a Swift interface to the Rhino library.
public class Rhino {
    
    private var handle: OpaquePointer?
    public static let defaultModelPath = Bundle.main.path(forResource: "rhino_params", ofType: "pv") ?? ""
    public static let frameLength = UInt32(pv_rhino_frame_length())
    public static let sampleRate = UInt32(pv_sample_rate())
    public static let version = String(cString: pv_rhino_version())
    public var contextInfo:String = ""

    private var isFinalized: Bool = false

    /// Constructor.
    ///
    /// - Parameters:
    ///   - contextPath: Absolute path to file containing context parameters. A context represents the set of expressions (spoken commands), intents, and
    ///   intent arguments (slots) within a domain of interest.
    ///   - modelPath: Absolute path to file containing model parameters.
    ///   - sensitivity: Inference sensitivity. It should be a number within [0, 1]. A higher sensitivity value results in fewer misses at the cost of (potentially)
    ///   increasing the erroneous inference rate.
    /// - Throws: RhinoError
    public init(contextPath: String, modelPath:String = defaultModelPath, sensitivity:Float32 = 0.5) throws {
                        
        if !FileManager().fileExists(atPath: contextPath){
            throw RhinoError.invalidArgument(message: "Context file at does not exist at '\(contextPath)'")
        }

        if !FileManager().fileExists(atPath: modelPath){
            throw RhinoError.invalidArgument(message: "Model file at does not exist at '\(modelPath)'")
        }

        if sensitivity < 0 || sensitivity > 1 {
            throw RhinoError.invalidArgument(message: "Provided sensitivity \(sensitivity) is not a floating-point value between [0,1]")
        }
        
        let status = pv_rhino_init(modelPath, contextPath, sensitivity, &self.handle)
        try checkStatus(status)
        
        // get context info from lib and set in binding
        var cContextInfo: UnsafePointer<Int8>?
        pv_rhino_context_info(self.handle, &cContextInfo);
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
    ///   - pcm: A pointer to a frame of 16-bit pcm
    /// - Returns:A boolean indicating whether Rhino has a result ready or not
    public func process(pcm:UnsafePointer<Int16>) -> Bool {        
        pv_rhino_process(self.handle, pcm, &self.isFinalized)
        return self.isFinalized
    }

    /// Process a frame of audio with the inference engine
    ///
    /// - Parameters:
    ///   - pcm: An array of 16-bit pcm samples
    /// - Returns:A boolean indicating whether Rhino has a result ready or not
    public func process(pcm:[Int16]) throws -> Bool {
        if pcm.count != Rhino.frameLength {
            throw RhinoError.invalidArgument(message: "Frame of audio data must contain \(Rhino.frameLength) samples - given frame contained \(pcm.count)")
        }

        pv_rhino_process(self.handle, pcm, &self.isFinalized)
        return self.isFinalized
    }

    /// Get inference result from Rhino
    /// - Returns:An inference object
    /// - Throws: RhinoError
    public func getInference() throws -> Inference {
        
        if !self.isFinalized {
            throw RhinoError.invalidState
        }

        var isUnderstood: Bool = false
        var intent = ""
        var slots = [String: String]()
        
        pv_rhino_is_understood(self.handle, &isUnderstood)
        
        if isUnderstood {
            var cIntent: UnsafePointer<Int8>?
            var numSlots: Int32 = 0
            var cSlotKeys: UnsafeMutablePointer<UnsafePointer<Int8>?>?
            var cSlotValues: UnsafeMutablePointer<UnsafePointer<Int8>?>?
            pv_rhino_get_intent(self.handle, &cIntent, &numSlots, &cSlotKeys, &cSlotValues)
            
            if isUnderstood {
                intent = String(cString: cIntent!)
                for i in 0...(numSlots - 1) {
                    let slot = String(cString: cSlotKeys!.advanced(by: Int(i)).pointee!)
                    let value = String(cString: cSlotValues!.advanced(by: Int(i)).pointee!)
                    slots[slot] = value
                }
                
                pv_rhino_free_slots_and_values(self.handle, cSlotKeys, cSlotValues)
            }
        }
        
        pv_rhino_reset(self.handle)      

        return Inference(isUnderstood: isUnderstood, intent: intent, slots: slots)
    }

    private func checkStatus(_ status: pv_status_t) throws {
        switch status {
            case PV_STATUS_IO_ERROR:
                throw RhinoError.io
            case PV_STATUS_OUT_OF_MEMORY:
                throw RhinoError.outOfMemory
            case PV_STATUS_INVALID_ARGUMENT:
                throw RhinoError.invalidArgument(message:"Rhino rejected one of the provided arguments.")
            default:
                return
        }
    }
}
