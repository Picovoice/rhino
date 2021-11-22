//
// Copyright 2020-2021 Picovoice Inc.
//
// You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
// file accompanying this source.
//
// Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
// an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
// specific language governing permissions and limitations under the License.
//

import Rhino

@objc(PvRhino)
class PvRhino: NSObject {

    private var rhinoPool:Dictionary<String, Rhino> = [:]

    @objc(create:modelPath:contextPath:sensitivity:requireEndpoint:resolver:rejecter:)
    func create(accessKey: String, modelPath: String, contextPath: String, sensitivity: Float32, requireEndpoint: Bool,
        resolver resolve:RCTPromiseResolveBlock, rejecter reject:RCTPromiseRejectBlock) -> Void {
        
        do {
            let rhino = try Rhino(
                accessKey: accessKey,
                contextPath: try getResourcePath(contextPath),
                modelPath: modelPath.isEmpty ? nil : try getResourcePath(modelPath),
                sensitivity: sensitivity,
                requireEndpoint: requireEndpoint
            )
            
            let handle: String = String(describing: rhino)
            rhinoPool[handle] = rhino
            
            var param: [String: Any] = [:]
            param["handle"] = handle
            param["contextInfo"] = rhino.contextInfo
            param["frameLength"] = Rhino.frameLength
            param["sampleRate"] = Rhino.sampleRate
            param["version"] = Rhino.version

            resolve(param)
        } catch let error as RhinoError {
            let (code, message) = errorToCodeAndMessage(error)
            reject(code, message, nil)
        } catch {
            let (code, message) = errorToCodeAndMessage(RhinoError.RhinoError(error.localizedDescription))
            reject(code, message, nil)
        }
    }
    
    @objc(delete:)
    func delete(handle:String) -> Void {
        if let rhino = rhinoPool.removeValue(forKey: handle){
            rhino.delete()
        }
    }
    
    @objc(process:pcm:resolver:rejecter:)
    func process(handle:String, pcm:[Int16],
        resolver resolve:RCTPromiseResolveBlock, rejecter reject:RCTPromiseRejectBlock) -> Void {
        do {
            if let rhino = rhinoPool[handle] {
                var param: [String: Any] = [:]
                
                let isFinalized = try rhino.process(pcm: pcm)
                param["isFinalized"] = isFinalized
                
                if isFinalized {
                    let inference = try rhino.getInference()
                    param["isUnderstood"] = inference.isUnderstood
                    
                    if inference.isUnderstood {
                        param["intent"] = inference.intent
                        param["slots"] = inference.slots
                    }
                }
                
                resolve(param)
            } else {
                let (code, message) = errorToCodeAndMessage(RhinoError.RhinoInvalidStateError("Invalid handle provided to Rhino 'process'"))
                reject(code, message, nil)
            }
        } catch let error as RhinoError {
            let (code, message) = errorToCodeAndMessage(error)
            reject(code, message, nil)
        } catch {
            let (code, message) = errorToCodeAndMessage(RhinoError.RhinoError(error.localizedDescription))
            reject(code, message, nil)
        }
    }
    
    private func getResourcePath(_ filePath: String) throws -> String {
        if (!FileManager.default.fileExists(atPath: filePath)) {
            if let resourcePath = Bundle(for: type(of: self)).resourceURL?.appendingPathComponent(filePath).path {
                if (FileManager.default.fileExists(atPath: resourcePath)) {
                    return resourcePath
                }
            }
            
            throw RhinoError.RhinoIOError("Could not find file at path '\(filePath)'. If this is a packaged asset, ensure you have added it to your XCode project.")
        }
        
        return filePath
    }

    private func errorToCodeAndMessage(_ error: RhinoError) -> (String, String) {
        switch(error) {
        case .RhinoMemoryError (let message):
            return ("RhinoMemoryException", message)
        case .RhinoIOError (let message):
            return ("RhinoIOException", message)
        case .RhinoInvalidArgumentError (let message):
            return ("RhinoInvalidArgumentException", message)
        case .RhinoStopIterationError (let message):
            return ("RhinoStopIterationException", message)
        case .RhinoKeyError (let message):
            return ("RhinoKeyException", message)
        case .RhinoInvalidStateError (let message):
            return ("RhinoInvalidStateException", message)
        case .RhinoRuntimeError (let message):
            return ("RhinoRuntimeException", message)
        case .RhinoActivationError (let message):
            return ("RhinoActivationException", message)
        case .RhinoActivationLimitError (let message):
            return ("RhinoActivationLimitException", message)
        case .RhinoActivationThrottledError (let message):
            return ("RhinoActivationThrottledException", message)
        case .RhinoActivationRefusedError (let message):
            return ("RhinoActivationRefusedException", message)
        case .RhinoError (let message):
            return ("RhinoException", message)
        }
    }                
}
