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

import pv_rhino

@objc(PvRhino)
class PvRhino: NSObject {

    private var rhinoPool:Dictionary<String, OpaquePointer?> = [:]
    
    override static func requiresMainQueueSetup() -> Bool {
        return true
    }

    @objc func constantsToExport() -> Dictionary<String, Any> {
        
        let modelPath : String = Bundle.main.path(forResource: "rhino_params", ofType: "pv") ?? "unknown"
        return [
            "DEFAULT_MODEL_PATH": modelPath
        ]
    }

    @objc(create:contextPath:sensitivity:resolver:rejecter:)
    func create(modelPath: String, contextPath: String, sensitivity: Float32,
        resolver resolve:RCTPromiseResolveBlock, rejecter reject:RCTPromiseRejectBlock) -> Void {
        
        var rhino:OpaquePointer?
        let status = pv_rhino_init(
            modelPath,
            contextPath,
            sensitivity,
            &rhino);

        if status == PV_STATUS_SUCCESS {
            let handle:String = String(describing:rhino)
            rhinoPool[handle] = rhino;
            
            var cContextInfo: UnsafePointer<Int8>?
            pv_rhino_context_info(rhino, &cContextInfo);
            
            let rhinoParameters:Dictionary<String, Any> = [
                "handle": handle,
                "frameLength": UInt32(pv_rhino_frame_length()),
                "sampleRate": UInt32(pv_sample_rate()),
                "version": String(cString: pv_rhino_version()),
                "contextInfo": String(cString: cContextInfo!)
            ]
            resolve(rhinoParameters)
        }
        else {
            let pvStatus = String(cString: pv_status_to_string(status))
            reject("PvRhino:create", "Could not create a new instance of Rhino: \(pvStatus)", nil)
        }
    }
    
    @objc(delete:)
    func delete(handle:String) -> Void {
        if var rhino = rhinoPool.removeValue(forKey: handle){
            pv_rhino_delete(rhino)
            rhino = nil
        }
    }
    
    @objc(process:pcm:resolver:rejecter:)
    func process(handle:String, pcm:[Int16],
        resolver resolve:RCTPromiseResolveBlock, rejecter reject:RCTPromiseRejectBlock) -> Void {
                
        if let rhino = rhinoPool[handle]{
            var isFinalized: Bool = false
            pv_rhino_process(rhino, pcm, &isFinalized)
            
            resolve(isFinalized)
        }
        else{
            reject("PvRhino:process", "Invalid Rhino handle provided to native module.", nil)
        }
    }
    
    @objc(getInference:resolver:rejecter:)
    func getInference(handle:String, resolver resolve:RCTPromiseResolveBlock, rejecter reject:RCTPromiseRejectBlock) -> Void {
                
        if let rhino = rhinoPool[handle]{
            var isUnderstood: Bool = false
            
            pv_rhino_is_understood(rhino, &isUnderstood)
            
            var inference:Dictionary<String,Any?>
            
            if isUnderstood {
                var cIntent: UnsafePointer<Int8>?
                var numSlots: Int32 = 0
                var cSlotKeys: UnsafeMutablePointer<UnsafePointer<Int8>?>?
                var cSlotValues: UnsafeMutablePointer<UnsafePointer<Int8>?>?
                pv_rhino_get_intent(rhino, &cIntent, &numSlots, &cSlotKeys, &cSlotValues)
                
                let intent = String(cString: cIntent!)
                var slots = [String: String]()
                for i in 0...(numSlots - 1) {
                    let slot = String(cString: cSlotKeys!.advanced(by: Int(i)).pointee!)
                    let value = String(cString: cSlotValues!.advanced(by: Int(i)).pointee!)
                    slots[slot] = value
                }
                
                pv_rhino_free_slots_and_values(rhino, cSlotKeys, cSlotValues)
                
                inference = [
                    "isUnderstood": isUnderstood,
                    "intent": intent,
                    "slots": slots,
                ]
            }
            else{
                inference = [
                    "isUnderstood": isUnderstood,
                    "intent": nil,
                    "slots": nil
                ]
            }
            
            pv_rhino_reset(rhino)
            
            resolve(inference)
        }
        else{
            reject("PvRhino:getInference", "Invalid Rhino handle provided to native module.", nil)
        }
    }
}
