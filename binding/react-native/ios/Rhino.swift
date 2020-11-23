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

public struct Rhino {        
    var handle: OpaquePointer?
    var isFinalized: Bool
    var needsReset:Bool

    public init(handle:OpaquePointer?) {
        self.handle = handle
        self.isFinalized = false
        self.needsReset = false
    }
}

@objc(PvRhino)
class PvRhino: NSObject {

    private var rhinoPool:Dictionary<String, Rhino> = [:]

    @objc func constantsToExport() -> Dictionary<String, Any> {
        
        let modelPath : String = Bundle.main.path(forResource: "rhino_params", ofType: "pv") ?? "unknown"
        return [
            "DEFAULT_MODEL_PATH": modelPath
        ]
    }

    @objc(create:contextPath:sensitivity:resolver:rejecter:)
    func create(modelPath: String, contextPath: String, sensitivity: Float32,
        resolver resolve:RCTPromiseResolveBlock, rejecter reject:RCTPromiseRejectBlock) -> Void {
        
        var rhinoHandle:OpaquePointer?
        let status = pv_rhino_init(
            modelPath,
            contextPath,
            sensitivity,
            &rhinoHandle);

        if status == PV_STATUS_SUCCESS {
            let handleStr:String = String(describing:rhinoHandle)
            rhinoPool[handleStr] = Rhino(handle:rhinoHandle);
            
            var cContextInfo: UnsafePointer<Int8>?
            pv_rhino_context_info(rhinoHandle, &cContextInfo);
            
            let rhinoParameters:Dictionary<String, Any> = [
                "handle": handleStr,
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
            pv_rhino_delete(rhino.handle)
            rhino.handle = nil
        }
    }
    
    @objc(process:pcm:resolver:rejecter:)
    func process(handle:String, pcm:[Int16],
        resolver resolve:RCTPromiseResolveBlock, rejecter reject:RCTPromiseRejectBlock) -> Void {
                
        if var rhino = rhinoPool[handle] {            

            if rhino.needsReset {
                return resolve([
                    "isFinalized": false
                ])
            }

            pv_rhino_process(rhino.handle, pcm, &rhino.isFinalized)            
                    
            if !rhino.needsReset {
                return resolve([
                    "isFinalized": false
                ])
            }
            else{
                rhino.needsReset = true
            }
            rhinoPool[handle] = rhino
                
            var isUnderstood: Bool = false
            
            pv_rhino_is_understood(rhino.handle, &isUnderstood)
            
            var inference:Dictionary<String,Any?>
            
            if !isUnderstood {
                return resolve([
                    "isFinalized": true,
                    "isUnderstood": isUnderstood
                ])
            }

            var cIntent: UnsafePointer<Int8>?
            var numSlots: Int32 = 0
            var cSlotKeys: UnsafeMutablePointer<UnsafePointer<Int8>?>?
            var cSlotValues: UnsafeMutablePointer<UnsafePointer<Int8>?>?
            pv_rhino_get_intent(rhino.handle, &cIntent, &numSlots, &cSlotKeys, &cSlotValues)
            
            let intent = String(cString: cIntent!)
            var slots = [String: String]()
            for i in 0...(numSlots - 1) {
                let slot = String(cString: cSlotKeys!.advanced(by: Int(i)).pointee!)
                let value = String(cString: cSlotValues!.advanced(by: Int(i)).pointee!)
                slots[slot] = value
            }
            
            pv_rhino_free_slots_and_values(rhino.handle, cSlotKeys, cSlotValues)
            
            resolve([
                "isFinalized": true,
                "isUnderstood": isUnderstood,
                "intent": intent,
                "slots": slots
            ])
                     
        }
        else{
            reject("PvRhino:process", "Invalid Rhino handle provided to native module.", nil)
        }
    }
    
    @objc(getInference:resolver:rejecter:)
    func getInference(handle:String, resolver resolve:RCTPromiseResolveBlock, rejecter reject:RCTPromiseRejectBlock) -> Void {
                
        if let rhino = rhinoPool[handle]{
            if(!rhino.isFinalized){
                reject("PvRhino:getInference", "Attempted to getInference before Rhino had finalized.", nil)
            }

            var isUnderstood: Bool = false
            
            pv_rhino_is_understood(rhino.handle, &isUnderstood)
            
            var inference:Dictionary<String,Any?>
            
            if isUnderstood {
                var cIntent: UnsafePointer<Int8>?
                var numSlots: Int32 = 0
                var cSlotKeys: UnsafeMutablePointer<UnsafePointer<Int8>?>?
                var cSlotValues: UnsafeMutablePointer<UnsafePointer<Int8>?>?
                pv_rhino_get_intent(rhino.handle, &cIntent, &numSlots, &cSlotKeys, &cSlotValues)
                
                let intent = String(cString: cIntent!)
                var slots = [String: String]()
                for i in 0...(numSlots - 1) {
                    let slot = String(cString: cSlotKeys!.advanced(by: Int(i)).pointee!)
                    let value = String(cString: cSlotValues!.advanced(by: Int(i)).pointee!)
                    slots[slot] = value
                }
                
                pv_rhino_free_slots_and_values(rhino.handle, cSlotKeys, cSlotValues)
                
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
            
            resolve(inference)
        }
        else{
            reject("PvRhino:getInference", "Invalid Rhino handle provided to native module.", nil)
        }
    }
    
    @objc(reset:)
    func reset(handle:String) -> Void {
        if let rhino = rhinoPool[handle]{
            pv_rhino_reset(rhino.handle)
            rhino.isFinalized = false
            rhino.needsReset = false
        }
    }                        
}
