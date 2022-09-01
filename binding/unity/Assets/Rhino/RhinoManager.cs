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

using System;

using UnityEngine;


namespace Pv.Unity
{

    public class RhinoManager
    {
        private VoiceProcessor _voiceProcessor;
        private Rhino _rhino;
        private Action<Inference> _inferenceCallback;
        private Action<RhinoException> _processErrorCallback;

        /// <summary>
        /// Creates an instance of Rhino inference engine with built-in audio processing
        /// </summary>
        /// <param name="accessKey">AccessKey obtained from Picovoice Console (https://console.picovoice.ai/).</param>
        /// <param name="contextPath">Absolute path to the Rhino context file (.rhn).</param>
        /// <param name="inferenceCallback">A callback for when Rhino has made an intent inference.</param>
        /// <param name="modelPath">(Optional) Absolute path to the file containing model parameters. If not set it will be set to the default location.</param>
        /// <param name="sensitivity">
        /// (Optional) Inference sensitivity. A higher sensitivity value results in
        /// fewer misses at the cost of (potentially) increasing the erroneous inference rate.
        /// Sensitivity should be a floating-point number within 0 and 1.
        /// </param>
        /// <param name="endpointDurationSec">
        /// (Optional) Endpoint duration in seconds. An endpoint is a chunk of silence at the end of an
        /// utterance that marks the end of spoken command. It should be a positive number within [0.5, 5]. A lower endpoint
        /// duration reduces delay and improves responsiveness. A higher endpoint duration assures Rhino doesn't return inference
        /// preemptively in case the user pauses before finishing the request.
        /// </param>
        /// <param name="requireEndpoint">
        /// (Optional) If set to `true`, Rhino requires an endpoint (a chunk of silence) after the spoken command.
        /// If set to `false`, Rhino tries to detect silence, but if it cannot, it still will provide inference regardless. Set
        /// to `false` only if operating in an environment with overlapping speech (e.g. people talking in the background).
        /// </param>
        /// <param name="processErrorCallback">(Optional) Reports errors that are encountered while the engine is processing audio.</returns>
        public static RhinoManager Create(
            string accessKey,
            string contextPath,
            Action<Inference> inferenceCallback,
            string modelPath = null,
            float sensitivity = 0.5f,
            float endpointDurationSec = 1.0f,
            bool requireEndpoint = true,
            Action<RhinoException> processErrorCallback = null)
        {
            Rhino rhino = Rhino.Create(accessKey, contextPath, modelPath: modelPath, sensitivity: sensitivity, endpointDurationSec: endpointDurationSec, requireEndpoint: requireEndpoint);
            return new RhinoManager(rhino, inferenceCallback, processErrorCallback);
        }

        // private constructor
        private RhinoManager(Rhino rhino, Action<Inference> inferenceCallback, Action<RhinoException> processErrorCallback = null)
        {
            _rhino = rhino;
            _inferenceCallback = inferenceCallback;
            _processErrorCallback = processErrorCallback;

            _voiceProcessor = VoiceProcessor.Instance;
            _voiceProcessor.OnFrameCaptured += OnFrameCaptured;
        }

        /// <summary>
        /// Action to catch audio frames as voice processor produces them
        /// </summary>
        /// <param name="pcm">Frame of pcm audio</param>
        private void OnFrameCaptured(short[] pcm)
        {
            try
            {
                bool _isFinalized = _rhino.Process(pcm);
                if (_isFinalized)
                {
                    Inference inference = _rhino.GetInference();
                    if (_inferenceCallback != null)
                        _inferenceCallback.Invoke(inference);

                    _voiceProcessor.StopRecording();
                }
            }
            catch (RhinoException ex)
            {
                if (_processErrorCallback != null)
                    _processErrorCallback(ex);
                else
                    Debug.LogError(ex.ToString());
            }
        }

        /// <summary>
        /// Checks to see whether RhinoManager is capturing audio or not
        /// </summary>
        /// <returns>whether RhinoManager  is capturing audio or not</returns>
        public bool IsRecording => _voiceProcessor.IsRecording;

        /// <summary>
        /// Checks to see whether there are any audio capture devices available
        /// </summary>
        /// <returns>whether there are any audio capture devices available</returns>
        public bool IsAudioDeviceAvailable()
        {
            _voiceProcessor.UpdateDevices();
            return _voiceProcessor.CurrentDeviceIndex >= 0;
        }

        /// <summary>
        /// Starts audio capture and intent inference
        /// </summary>
        public void Process()
        {
            if (_rhino == null || _voiceProcessor == null)
            {
                throw new RhinoInvalidStateException("Cannot start RhinoManager - resources have already been released");
            }
            _voiceProcessor.StartRecording(_rhino.SampleRate, _rhino.FrameLength);
        }

        /// <summary>
        /// Free resources that were allocated to Rhino and the voice processor
        /// </summary>
        public void Delete()
        {
            if (_voiceProcessor != null)
            {
                if (_voiceProcessor.IsRecording)
                {
                    _voiceProcessor.StopRecording();
                }

                _voiceProcessor.OnFrameCaptured -= OnFrameCaptured;
                _voiceProcessor = null;
            }

            if (_rhino != null)
            {
                _rhino.Dispose();
                _rhino = null;
            }
        }
    }
}
