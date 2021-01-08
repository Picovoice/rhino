//
// Copyright 2021 Picovoice Inc.
//
// You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
// file accompanying this source.
//
// Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
// an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
// specific language governing permissions and limitations under the License.
//

import Flutter
import UIKit
import pv_rhino

public class SwiftRhinoPlugin: NSObject, FlutterPlugin {
  public static func register(with registrar: FlutterPluginRegistrar) {
    
  }


  // these dummy function calls are required to prevent the linker from 
  // stripping the rhino static library
  public func doNotCallThisFunction_rhinoVersion(){
    pv_rhino_version();
  }

  public func doNotCallThisFunction_rhinoInit(modelPath: String, contextPath: String, sensitivity: Float32){
    var rhino:OpaquePointer?
    let _ = pv_rhino_init(
        modelPath,
        contextPath,
        sensitivity,
        &rhino);
  }

  public func doNotCallThisFunction_rhinoContextInfo(rhino:OpaquePointer?){
    var cContextInfo: UnsafePointer<Int8>?
    pv_rhino_context_info(rhino, &cContextInfo);
  }
  
  public func doNotCallThisFunction_rhinoFrameLength(){
    pv_rhino_frame_length()
  }

  public func doNotCallThisFunction_rhinoSampleRate(){
    pv_sample_rate()
  }

  public func doNotCallThisFunction_rhinoProcess(rhino:OpaquePointer?, pcm:[Int16]){
    var isFinalized:Bool = false
    pv_rhino_process(rhino, pcm, &isFinalized)

    var isUnderstood: Bool = false           
    pv_rhino_is_understood(rhino, &isUnderstood)

    var cIntent: UnsafePointer<Int8>?
    var numSlots: Int32 = 0
    var cSlotKeys: UnsafeMutablePointer<UnsafePointer<Int8>?>?
    var cSlotValues: UnsafeMutablePointer<UnsafePointer<Int8>?>?
    pv_rhino_get_intent(rhino, &cIntent, &numSlots, &cSlotKeys, &cSlotValues)

    pv_rhino_free_slots_and_values(rhino, cSlotKeys, cSlotValues)
    pv_rhino_reset(rhino)
  }

  public func doNotCallThisFunction_rhinoDelete(rhino:OpaquePointer?){
    pv_rhino_delete(rhino)
  }
}
