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
        private Action<RhinoException> _errorCallback;

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
        /// <param name="requireEndpoint">
        /// Boolean variable to indicate if Rhino should wait for a chunk of silence before finishing inference.
        /// </param>
        /// <param name="errorCallback">(Optional) Callback that triggers is the engine experiences a problem while processing audio.</param>
        /// <returns>An instance of RhinoManager.</returns>                             
        public static RhinoManager Create(
            string accessKey,
            string contextPath,
            Action<Inference> inferenceCallback,
            string modelPath = null,
            float sensitivity = 0.5f,
            bool requireEndpoint = true,
            Action<RhinoException> errorCallback = null)
        {
            Rhino rhino = Rhino.Create(accessKey, contextPath, modelPath: modelPath, sensitivity: sensitivity, requireEndpoint: requireEndpoint);
            return new RhinoManager(rhino, inferenceCallback, errorCallback);
        }

        // private constructor
        private RhinoManager(Rhino rhino, Action<Inference> inferenceCallback, Action<RhinoException> errorCallback = null)
        {
            _rhino = rhino;
            _inferenceCallback = inferenceCallback;
            _errorCallback = errorCallback;

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
                if (_errorCallback != null)
                    _errorCallback(ex);
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
                throw new RhinoInvalidStateException("Rhino Cannot start RhinoManager - resources have already been released");
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