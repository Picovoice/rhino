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
import Rhino

enum Method : String {
    case CREATE
    case PROCESS
    case DELETE
}

public class SwiftRhinoPlugin: NSObject, FlutterPlugin {
    private var rhinoPool:Dictionary<String, Rhino> = [:]
    
    public static func register(with registrar: FlutterPluginRegistrar) {
        let instance = SwiftRhinoPlugin()

        let methodChannel = FlutterMethodChannel(name: "rhino", binaryMessenger: registrar.messenger())
        registrar.addMethodCallDelegate(instance, channel: methodChannel)
    }
    
    public func handle(_ call: FlutterMethodCall, result: @escaping FlutterResult) {
        guard let method = Method(rawValue: call.method.uppercased()) else {
            result(errorToFlutterError(RhinoRuntimeError("Rhino method '\(call.method)' is not a valid function")))
            return
        }
        let args = call.arguments as! [String: Any]
        
        switch (method) {
        case .CREATE:
            do {
                if let accessKey = args["accessKey"] as? String,
                   let contextPath = args["contextPath"] as? String {
                    let modelPath = args["modelPath"] as? String
                    let sensitivity = args["sensitivity"] as? Float
                    let endpointDurationSec = args["endpointDurationSec"] as? Float
                    let requireEndpoint = args["requireEndpoint"] as? Bool
                    
                    let rhino = try Rhino(
                        accessKey: accessKey,
                        contextPath: contextPath,
                        modelPath: modelPath,
                        sensitivity: sensitivity ?? 0.5,
                        endpointDurationSec: endpointDurationSec ?? 1.0,
                        requireEndpoint: requireEndpoint ?? true
                    )
                    
                    let handle: String = String(describing: rhino)
                    rhinoPool[handle] = rhino
                    
                    var param: [String: Any] = [:]
                    param["handle"] = handle
                    param["contextInfo"] = rhino.contextInfo
                    param["frameLength"] = Rhino.frameLength
                    param["sampleRate"] = Rhino.sampleRate
                    param["version"] = Rhino.version
                    
                    result(param)
                } else {
                    result(errorToFlutterError(RhinoInvalidArgumentError("missing required arguments 'accessKey' and 'contextPath'")))
                }
            } catch let error as RhinoError {
                result(errorToFlutterError(error))
            } catch {
                result(errorToFlutterError(RhinoError(error.localizedDescription)))
            }
            break
        case .PROCESS:
            do {
                if let handle = args["handle"] as? String,
                   let frame = args["frame"] as? [Int16] {
                    if let rhino = rhinoPool[handle] {
                        var param: [String: Any] = [:]
                        
                        let isFinalized = try rhino.process(pcm: frame)
                        param["isFinalized"] = isFinalized
                        
                        if isFinalized {
                            let inference = try rhino.getInference()
                            param["isUnderstood"] = inference.isUnderstood
                            
                            if inference.isUnderstood {
                                param["intent"] = inference.intent
                                param["slots"] = inference.slots
                            }
                        }
                        
                        result(param)
                    } else {
                        result(errorToFlutterError(RhinoInvalidStateError("Invalid handle provided to Rhino 'process'")))
                    }
                } else {
                    result(errorToFlutterError(RhinoInvalidArgumentError("missing required arguments 'frame'")))
                }
            } catch let error as RhinoError {
                result(errorToFlutterError(error))
            } catch {
                result(errorToFlutterError(RhinoError(error.localizedDescription)))
            }
            break
        case .DELETE:
            if let handle = args["handle"] as? String {
                if let rhino = rhinoPool.removeValue(forKey: handle) {
                    rhino.delete()
                }
            }
            break
        }
    }
    
    private func errorToFlutterError(_ error: RhinoError) -> FlutterError {
        return FlutterError(code: error.name.replacingOccurrences(of: "Error", with: "Exception"), message: error.localizedDescription, details: nil)
    }
}
