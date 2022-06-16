//
// Copyright 2020-2022 Picovoice Inc.
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

    @objc(create:modelPath:contextPath:sensitivity:endpointDurationSec:requireEndpoint:resolver:rejecter:)
    func create(
        accessKey: String,
        modelPath: String,
        contextPath: String,
        sensitivity: Float32,
        endpointDurationSec: Float32,
        requireEndpoint: Bool,
        resolver resolve:RCTPromiseResolveBlock,
        rejecter reject:RCTPromiseRejectBlock
    ) -> Void {
        do {
            let rhino = try Rhino(
                accessKey: accessKey,
                contextPath: contextPath,
                modelPath: modelPath.isEmpty ? nil : modelPath,
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
            let (code, message) = errorToCodeAndMessage(RhinoError(error.localizedDescription))
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
                let (code, message) = errorToCodeAndMessage(RhinoInvalidStateError("Invalid handle provided to Rhino 'process'"))
                reject(code, message, nil)
            }
        } catch let error as RhinoError {
            let (code, message) = errorToCodeAndMessage(error)
            reject(code, message, nil)
        } catch {
            let (code, message) = errorToCodeAndMessage(RhinoError(error.localizedDescription))
            reject(code, message, nil)
        }
    }

    private func errorToCodeAndMessage(_ error: RhinoError) -> (String, String) {
        return (error.name.replacingOccurrences(of: "Error", with: "Exception"), error.localizedDescription)
    }
}
