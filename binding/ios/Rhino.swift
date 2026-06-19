//
//  Copyright 2021-2026 Picovoice Inc.
//  You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
//  file accompanying this source.
//  Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
//  an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
//  specific language governing permissions and limitations under the License.
//

import Foundation
import Yams

import PvRhino

public struct Inference {
    public let isUnderstood: Bool
    public let intent: String
    public let slots: [String: String]

    public init(isUnderstood: Bool, intent: String, slots: [String: String]) {
        self.isUnderstood = isUnderstood
        self.intent = intent
        self.slots = slots
    }
}

/// Low-level iOS binding for Rhino wake word engine. Provides a Swift interface to the Rhino library.
public class Rhino {

#if SWIFT_PACKAGE

    static let resourceBundle = Bundle.module

#else

    static let resourceBundle: Bundle = {
        let myBundle = Bundle(for: Rhino.self)

        guard let resourceBundleURL = myBundle.url(
                forResource: "RhinoResources", withExtension: "bundle")
        else {
            fatalError("RhinoResources.bundle not found")
        }

        guard let resourceBundle = Bundle(url: resourceBundleURL)
        else {
            fatalError("Could not open RhinoResources.bundle")
        }

        return resourceBundle
    }()

#endif

    private static let PV_API_URL = "https://rest.picovoice.ai/"
    private static let VALID_LANGUAGES: Set<String> = ["en", "fr", "de", "es", "it", "ja", "ko", "pt"]

    private var handle: OpaquePointer?
    public static let frameLength = UInt32(pv_rhino_frame_length())
    public static let sampleRate = UInt32(pv_sample_rate())
    public static let version = String(cString: pv_rhino_version())
    public var contextInfo: String = ""
    private static var sdk = "ios"

    private var isFinalized: Bool = false

    public static func setSdk(sdk: String) {
        self.sdk = sdk
    }

    /// Trains a model from an existing Rhino context (.rhn) file and new sets of slot values.
    ///
    /// - Parameters:
    ///   - accessKey: AccessKey obtained from Picovoice Console (https://console.picovoice.ai/).
    ///   - outputPath: Absolute path to file where the trained model will be saved.
    ///   - language: Two character language code for the model (e.g. "en", "fr").
    ///               See https://picovoice.ai/docs/model-api/rhino/ for supported languages.
    ///   - contextPath: Absolute path to the existing context model (.rhn file).
    ///   - modelPath: Absolute path to the file containing model parameters.
    ///   - slots: Map of existing slot names to the set of values that will replace the
    ///            corresponding entries in the YAML's `context.slots` section.
    ///            Each value must be a non-empty set of strings.
    /// - Throws: `RhinoError` if model training fails.
    public static func trainContextFromDynamicSlots(
        accessKey: String,
        outputPath: String,
        language: String,
        contextPath: String,
        modelPath: String? = nil,
        slots: [String: Set<String>]
    ) throws {

        let yamlContent: String
        do {
            let rhino = try Rhino(
                accessKey: accessKey,
                contextPath: contextPath,
                modelPath: modelPath)
            yamlContent = rhino.contextInfo
            rhino.delete()
        } catch {
            throw RhinoRuntimeError("Failed to initialize Rhino for context info with: '\(error)'")
        }

        guard !slots.isEmpty else {
            throw RhinoInvalidArgumentError("Slots cannot be empty")
        }

        guard let root = try? Yams.load(yaml: yamlContent) as? [String: Any] else {
            throw RhinoInvalidArgumentError("Failed to parse yaml content")
        }

        guard var context = root["context"] as? [String: Any] else {
            throw RhinoInvalidArgumentError("Invalid value in slots field")
        }

        guard let existingSlots = context["slots"] as? [String: Any] else {
            throw RhinoInvalidArgumentError("Invalid value in slots field")
        }

        var merged: [String: [String]] = [:]

        for (key, value) in existingSlots where slots[key] == nil {
            merged[key] = (value as? [String]) ?? []
        }

        for (key, values) in slots {
            guard !values.isEmpty else {
                throw RhinoInvalidArgumentError("Slot '\(key)' must be a non-empty set of string values")
            }
            guard existingSlots[key] != nil else {
                throw RhinoInvalidArgumentError("Slot '\(key)' does not exist")
            }
            merged[key] = Array(values)
        }

        for (key, values) in merged {
            var seen = Set<String>()
            for v in values {
                let value = v.lowercased()
                if seen.contains(value) {
                    throw RhinoInvalidArgumentError("Duplicate slot value '\(v)' in '\(key)'")
                }
                seen.insert(value)
            }
        }

        context["slots"] = merged
        var newRoot = root
        newRoot["context"] = context

        let newYaml: String
        do {
            newYaml = try Yams.dump(object: newRoot)
        } catch {
            throw RhinoRuntimeError("Failed to serialize yaml content")
        }

        try trainContextFromYaml(
            accessKey: accessKey,
            outputPath: outputPath,
            language: language,
            yamlContent: newYaml)
    }

    /// Trains a model using a YAML configuration string.
    ///
    /// - Parameters:
    ///   - accessKey: AccessKey obtained from Picovoice Console (https://console.picovoice.ai/).
    ///   - outputPath: Absolute path to file where the trained model will be saved.
    ///   - language: Two character language code for the model (e.g. "en", "fr").
    ///   - yamlContent: YAML configuration string to be used for training.
    /// - Throws: `RhinoError` if model training fails.
    public static func trainContextFromYaml(
        accessKey: String,
        outputPath: String,
        language: String,
        yamlContent: String
    ) throws {

        guard VALID_LANGUAGES.contains(language) else {
            throw RhinoInvalidArgumentError("Invalid language ('\(language)')")
        }

        let payload: Data
        do {
            payload = try JSONSerialization.data(withJSONObject: [
                "platform": "ios",
                "yaml_content": yamlContent
            ])
        } catch {
            throw RhinoRuntimeError("Failed to create request payload \(error.localizedDescription)")
        }

        guard let url = URL(string: PV_API_URL + language + "/api/rhn") else {
            throw RhinoRuntimeError("Invalid request URL")
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.httpBody = payload
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue(accessKey, forHTTPHeaderField: "x-api-key")

        var resultData: Data?
        var resultResponse: URLResponse?
        var resultError: Error?
        let semaphore = DispatchSemaphore(value: 0)

        URLSession.shared.dataTask(with: request) { data, response, error in
            resultData = data
            resultResponse = response
            resultError = error
            semaphore.signal()
        }.resume()
        semaphore.wait()

        if let error = resultError {
            throw RhinoRuntimeError("Request failed: \(error.localizedDescription)")
        }

        guard let http = resultResponse as? HTTPURLResponse else {
            throw RhinoRuntimeError("Invalid response")
        }

        guard (200...299).contains(http.statusCode) else {
            let errorBody = resultData.flatMap { String(data: $0, encoding: .utf8) } ?? ""
            throw RhinoRuntimeError("Failed to train model: \(errorBody)")
        }

        guard let data = resultData, !data.isEmpty else {
            throw RhinoRuntimeError("Empty response body")
        }

        do {
            try data.write(to: URL(fileURLWithPath: outputPath))
        } catch {
            throw RhinoRuntimeError("Failed to save Rhino context file: \(error.localizedDescription)")
        }
    }

    /// Lists all available devices that Rhino can use for inference.
    /// Entries in the list can be used as the `device` argument when initializing Rhino.
    ///
    /// - Throws: RhinoError
    /// - Returns: Array of available devices that Rhino can be used for inference.
    public static func getAvailableDevices() throws -> [String] {
        var cHardwareDevices: UnsafeMutablePointer<UnsafeMutablePointer<Int8>?>?
        var numHardwareDevices: Int32 = 0
        let status = pv_rhino_list_hardware_devices(&cHardwareDevices, &numHardwareDevices)
        if status != PV_STATUS_SUCCESS {
            let messageStack = try Rhino.getMessageStack()
            throw Rhino.pvStatusToRhinoError(status, "Rhino getAvailableDevices failed", messageStack)
        }

        var hardwareDevices: [String] = []
        for i in 0..<numHardwareDevices {
            hardwareDevices.append(String(cString: cHardwareDevices!.advanced(by: Int(i)).pointee!))
        }

        pv_rhino_free_hardware_devices(cHardwareDevices, numHardwareDevices)

        return hardwareDevices
    }

    /// Constructor.
    ///
    /// - Parameters:
    ///   - accessKey: AccessKey obtained from Picovoice Console (https://console.picovoice.ai).
    ///   - contextPath: Absolute path to file containing context parameters. A context represents the
    ///   set of expressions (spoken commands), intents, and intent arguments (slots) within a domain of interest.
    ///   - modelPath: Absolute path to file containing model parameters.
    ///   - device: String representation of the device (e.g., CPU or GPU) to use. If set to `best`, the most
    ///   suitable device is selected automatically. If set to `gpu`, the engine uses the first available GPU
    ///   device. To select a specific GPU device, set this argument to `gpu:${GPU_INDEX}`, where `${GPU_INDEX}`
    ///   is the index of the target GPU. If set to `cpu`, the engine will run on the CPU with the default
    ///   number of threads. To specify the number of threads, set this argument to `cpu:${NUM_THREADS}`,
    ///   where `${NUM_THREADS}` is the desired number of threads.
    ///   - sensitivity: Inference sensitivity. It should be a number within [0, 1]. A higher sensitivity value
    ///   results in fewer misses at the cost of (potentially) increasing the erroneous inference rate.
    ///   - endpointDurationSec: Endpoint duration in seconds. An endpoint is a chunk of silence at the end of an
    ///   utterance that marks the end of spoken command. It should be a positive number within [0.5, 5].
    ///   A lower endpoint duration reduces delay and improves responsiveness. A higher endpoint duration
    ///   assures Rhino doesn't return inference preemptively in case the user pauses before finishing the request.
    ///   - requireEndpoint: If set to `true`, Rhino requires an endpoint (a chunk of silence) after the spoken command.
    ///   If set to `false`, Rhino tries to detect silence, but if it cannot, it still will provide
    ///   inference regardless. Set to `false` only if operating in an environment with overlapping speech
    ///   (e.g. people talking in the background).
    /// - Throws: RhinoError
    public init(
        accessKey: String,
        contextPath: String,
        modelPath: String? = nil,
        device: String? = nil,
        sensitivity: Float32 = 0.5,
        endpointDurationSec: Float32 = 1.0,
        requireEndpoint: Bool = true) throws {

        if accessKey.isEmpty {
            throw RhinoInvalidArgumentError("No AccessKey was provided to Rhino")
        }

        var contextPathArg = contextPath
        if !FileManager().fileExists(atPath: contextPathArg) {
            contextPathArg = try getResourcePath(contextPathArg)
        }

        var modelPathArg = modelPath
        if modelPathArg == nil {
            modelPathArg = Rhino.resourceBundle.path(forResource: "rhino_params", ofType: "pv")
            if modelPathArg == nil {
                throw RhinoIOError("Could not find default model file in app bundle.")
            }
        }

        if !FileManager().fileExists(atPath: modelPathArg!) {
            modelPathArg = try getResourcePath(modelPathArg!)
        }

        var deviceArg = device
        if device == nil {
            deviceArg = "best"
        }

        if sensitivity < 0 || sensitivity > 1 {
            throw RhinoInvalidArgumentError(
                "Sensitivity value '\(sensitivity)' is not a floating-point value between [0, 1]")
        }

        if endpointDurationSec < 0.5 || endpointDurationSec > 5.0 {
            throw RhinoInvalidArgumentError(
                "Endpoint duration value '\(endpointDurationSec)' is not a floating-point value between [0.5, 5.0]")
        }

        pv_set_sdk(Rhino.sdk)

        var status = pv_rhino_init(
            accessKey,
            modelPathArg,
            deviceArg,
            contextPathArg,
            sensitivity,
            endpointDurationSec,
            requireEndpoint,
            &self.handle)
        if status != PV_STATUS_SUCCESS {
            let messageStack = try Rhino.getMessageStack()
            throw Rhino.pvStatusToRhinoError(status, "Rhino init failed", messageStack)
        }

        // get context info from lib and set in binding
        var cContextInfo: UnsafePointer<Int8>?
        status = pv_rhino_context_info(self.handle, &cContextInfo)
        if status != PV_STATUS_SUCCESS {
            let messageStack = try Rhino.getMessageStack()
            throw Rhino.pvStatusToRhinoError(status, "Failed to get Rhino context info", messageStack)
        }

        self.contextInfo = String(cString: cContextInfo!)
    }

    deinit {
        self.delete()
    }

    /// Releases native resources that were allocated to Rhino
    public func delete() {
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
    public func process(pcm: [Int16]) throws -> Bool {
        if handle == nil {
            throw RhinoInvalidStateError("Rhino must be initialized before process is called")
        }

        if pcm.count != Rhino.frameLength {
            throw RhinoInvalidArgumentError(
                "Frame of audio data must contain \(Rhino.frameLength) samples - given frame contained \(pcm.count)")
        }

        let status = pv_rhino_process(self.handle, pcm, &self.isFinalized)
        if status != PV_STATUS_SUCCESS {
            let messageStack = try Rhino.getMessageStack()
            throw Rhino.pvStatusToRhinoError(status, "Rhino process failed", messageStack)
        }

        return self.isFinalized
    }

    /// Resets the internal state of Rhino. It should be called before the engine can be used to infer intent from a new
    /// stream of audio.
    ///
    /// - Throws: RhinoError
    public func reset() throws {
        if handle == nil {
            throw RhinoInvalidStateError("Rhino must be initialized before reset is called")
        }

        let status = pv_rhino_reset(self.handle)
        if status != PV_STATUS_SUCCESS {
            let messageStack = try Rhino.getMessageStack()
            throw Rhino.pvStatusToRhinoError(status, "Rhino reset failed", messageStack)
        }
    }

    /// Get inference result from Rhino
    /// - Returns:An inference object
    /// - Throws: RhinoError
    public func getInference() throws -> Inference {

        if handle == nil {
            throw RhinoInvalidStateError("Rhino must be initialized before process is called")
        }

        if !self.isFinalized {
            throw RhinoInvalidStateError(
                "getInference can only be called after Rhino has finalized (i.e. process returns true)")
        }

        var isUnderstood: Bool = false
        var intent = ""
        var slots = [String: String]()

        var status = pv_rhino_is_understood(self.handle, &isUnderstood)
        if status != PV_STATUS_SUCCESS {
            let messageStack = try Rhino.getMessageStack()
            throw Rhino.pvStatusToRhinoError(status, "Rhino failed to get isUnderstood", messageStack)
        }

        if isUnderstood {
            var cIntent: UnsafePointer<Int8>?
            var numSlots: Int32 = 0
            var cSlotKeys: UnsafeMutablePointer<UnsafePointer<Int8>?>?
            var cSlotValues: UnsafeMutablePointer<UnsafePointer<Int8>?>?
            status = pv_rhino_get_intent(self.handle, &cIntent, &numSlots, &cSlotKeys, &cSlotValues)
            if status != PV_STATUS_SUCCESS {
                let messageStack = try Rhino.getMessageStack()
                throw Rhino.pvStatusToRhinoError(status, "Rhino failed to get intent", messageStack)
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
                    let messageStack = try Rhino.getMessageStack()
                    throw Rhino.pvStatusToRhinoError(status, "Rhino failed to free slots and values", messageStack)
                }
            }
        }

        status = pv_rhino_reset(self.handle)
        if status != PV_STATUS_SUCCESS {
            let messageStack = try Rhino.getMessageStack()
            throw Rhino.pvStatusToRhinoError(status, "Rhino failed to reset", messageStack)
        }

        return Inference(isUnderstood: isUnderstood, intent: intent, slots: slots)
    }

    /// Given a path, return the full path to the resource.
    ///
    /// - Parameters:
    ///   - filePath: relative path of a file in the bundle.
    /// - Throws: RhinoIOError
    /// - Returns: The full path of the resource.
    private func getResourcePath(_ filePath: String) throws -> String {
        if let resourcePath = Bundle(for: type(of: self)).resourceURL?.appendingPathComponent(filePath).path {
            if FileManager.default.fileExists(atPath: resourcePath) {
                return resourcePath
            }
        }

        throw RhinoIOError(
            "Could not find file at path '\(filePath)'. If this is a " +
                "packaged asset, ensure you have added it to your xcode project.")
    }

    private static func pvStatusToRhinoError(
        _ status: pv_status_t,
        _ message: String,
        _ messageStack: [String] = []) -> RhinoError {
        switch status {
        case PV_STATUS_OUT_OF_MEMORY:
            return RhinoMemoryError(message, messageStack)
        case PV_STATUS_IO_ERROR:
            return RhinoIOError(message, messageStack)
        case PV_STATUS_INVALID_ARGUMENT:
            return RhinoInvalidArgumentError(message, messageStack)
        case PV_STATUS_STOP_ITERATION:
            return RhinoStopIterationError(message, messageStack)
        case PV_STATUS_KEY_ERROR:
            return RhinoKeyError(message, messageStack)
        case PV_STATUS_INVALID_STATE:
            return RhinoInvalidStateError(message, messageStack)
        case PV_STATUS_RUNTIME_ERROR:
            return RhinoRuntimeError(message, messageStack)
        case PV_STATUS_ACTIVATION_ERROR:
            return RhinoActivationError(message, messageStack)
        case PV_STATUS_ACTIVATION_LIMIT_REACHED:
            return RhinoActivationLimitError(message, messageStack)
        case PV_STATUS_ACTIVATION_THROTTLED:
            return RhinoActivationThrottledError(message, messageStack)
        case PV_STATUS_ACTIVATION_REFUSED:
            return RhinoActivationRefusedError(message, messageStack)
        default:
            let pvStatusString = String(cString: pv_status_to_string(status))
            return RhinoError("\(pvStatusString): \(message)", messageStack)
        }
    }

    private static func getMessageStack() throws -> [String] {
        var messageStackRef: UnsafeMutablePointer<UnsafeMutablePointer<Int8>?>?
        var messageStackDepth: Int32 = 0
        let status = pv_get_error_stack(&messageStackRef, &messageStackDepth)
        if status != PV_STATUS_SUCCESS {
            throw Rhino.pvStatusToRhinoError(status, "Unable to get Rhino error state")
        }

        var messageStack: [String] = []
        for i in 0..<messageStackDepth {
            messageStack.append(String(cString: messageStackRef!.advanced(by: Int(i)).pointee!))
        }

        pv_free_error_stack(messageStackRef)

        return messageStack
    }
}
