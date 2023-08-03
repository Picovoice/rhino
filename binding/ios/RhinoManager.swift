//
//  Copyright 2018-2023 Picovoice Inc.
//  You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
//  file accompanying this source.
//  Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
//  an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
//  specific language governing permissions and limitations under the License.
//

import ios_voice_processor

/// High-level iOS binding for Rhino Speech-to-Intent engine. It handles recording
/// audio from microphone, processes it in real-time using Rhino, and notifies the client
/// when an intent is inferred from the spoken command.
public class RhinoManager {

    private var rhino: Rhino?

    private var frameListener: VoiceProcessorFrameListener?
    private var errorListener: VoiceProcessorErrorListener?

    private var isListening = false

    public var contextInfo: String {
        get {
            return (self.rhino != nil) ? self.rhino!.contextInfo : ""
        }
    }

    /// Constructor.
    ///
    /// - Parameters:
    ///   - accessKey: AccessKey obtained from Picovoice Console (https://console.picovoice.ai).
    ///   - modelPath: Absolute path to file containing model parameters.
    ///   - contextPath: Absolute path to file containing context parameters. A context represents the
    ///   set of expressions (spoken commands), intents, and intent arguments (slots) within a domain of interest.
    ///   - sensitivity: Inference sensitivity. It should be a number within [0, 1]. A higher sensitivity
    ///   value results in fewer misses at the cost of (potentially) increasing the erroneous inference rate.
    ///   - endpointDurationSec: Endpoint duration in seconds. An endpoint is a chunk of silence at the end of an
    ///   utterance that marks the end of spoken command. It should be a positive number
    ///   within [0.5, 5]. A lower endpoint duration reduces delay and improves responsiveness. A
    ///   higher endpoint duration assures Rhino doesn't return inference preemptively in case the user pauses
    ///   before finishing the request.
    ///   - requireEndpoint: If set to `true`, Rhino requires an endpoint (a chunk of silence) after the spoken command.
    ///   If set to `false`, Rhino tries to detect silence, but if it cannot, it
    ///   still will provide inference regardless. Set to `false` only if operating
    ///   in an environment with overlapping speech
    ///   (e.g. people talking in the background).
    ///   - onInferenceCallback: It is invoked upon completion of intent inference.
    ///   - processErrorCallback: Invoked if an error occurs while processing frames.
    ///   If missing, error will be printed to console.
    /// - Throws: RhinoError
    public init(
        accessKey: String,
        contextPath: String,
        modelPath: String? = nil,
        sensitivity: Float32 = 0.5,
        endpointDurationSec: Float32 = 1.0,
        requireEndpoint: Bool = true,
        onInferenceCallback: ((Inference) -> Void)?,
        processErrorCallback: ((Error) -> Void)? = nil) throws {
        self.errorListener = VoiceProcessorErrorListener({ error in
            guard let callback = processErrorCallback else {
                print("\(error.errorDescription)")
                return
            }
            callback(RhinoError(error.errorDescription))
        })

        self.frameListener = VoiceProcessorFrameListener({ frame in
            guard let rhino = self.rhino else {
                return
            }

            do {
                let isFinalized: Bool = try rhino.process(pcm: frame)
                if isFinalized {
                    let inference: Inference = try rhino.getInference()
                    onInferenceCallback?(inference)
                    try self.stop()
                }
            } catch {
                guard let callback = processErrorCallback else {
                    print("\(error)")
                    return
                }
                callback(error)
            }
        })

        self.rhino = try Rhino(
            accessKey: accessKey,
            contextPath: contextPath,
            modelPath: modelPath,
            sensitivity: sensitivity,
            requireEndpoint: requireEndpoint)
    }

    deinit {
        if self.rhino != nil {
            self.rhino!.delete()
            self.rhino = nil
        }
    }

    /// Stops recording and releases Rhino resources
    ///
    /// - Throws: RhinoError if there was an error stopping RhinoManager
    public func delete() throws {
        if isListening {
            try stop()
        }

        if self.rhino != nil {
            self.rhino!.delete()
            self.rhino = nil
        }
    }

    /// Start recording audio from the microphone and infers the user's intent
    /// from the spoken command. Once the inference is finalized it will invoke the user
    /// provided callback and terminates recording audio.
    ///
    /// - Throws: RhinoError if there was an error starting RhinoManager
    public func process() throws {
        guard !isListening else {
            return
        }

        if rhino == nil {
            throw RhinoInvalidStateError("Rhino has been deleted.")
        }

        VoiceProcessor.instance.addErrorListener(errorListener!)
        VoiceProcessor.instance.addFrameListener(frameListener!)

        do {
            try VoiceProcessor.instance.start(
                    frameLength: Rhino.frameLength,
                    sampleRate: Rhino.sampleRate
            )
        } catch {
            throw RhinoError(error.localizedDescription)
        }
        isListening = true
    }

    private func stop() throws {
        guard isListening else {
            return
        }

        VoiceProcessor.instance.removeErrorListener(errorListener!)
        VoiceProcessor.instance.removeFrameListener(frameListener!)

        if VoiceProcessor.instance.numFrameListeners == 0 {
            do {
                try VoiceProcessor.instance.stop()
            } catch {
                throw RhinoError(error.localizedDescription)
            }
        }
        isListening = false
    }
}
