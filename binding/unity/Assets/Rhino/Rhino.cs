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
using System.Collections.Generic;
using System.IO;
using System.Runtime.InteropServices;
using UnityEngine;

#if !UNITY_EDITOR && UNITY_ANDROID

using UnityEngine.Networking;

#endif


namespace Pv.Unity
{
    /// <summary>
    /// Status codes returned by Rhino library
    /// </summary>
    public enum RhinoStatus
    {
        SUCCESS = 0,
        OUT_OF_MEMORY = 1,
        IO_ERROR = 2,
        INVALID_ARGUMENT = 3,
        STOP_ITERATION = 4,
        KEY_ERROR = 5,
        INVALID_STATE = 6,
        RUNTIME_ERROR = 7,
        ACTIVATION_ERROR = 8,
        ACTIVATION_LIMIT_REACHED = 9,
        ACTIVATION_THROTTLED = 10,
        ACTIVATION_REFUSED = 11
    }

    /// <summary>
    /// Class for holding Rhino inference result
    /// </summary>
    public class Inference
    {
        public Inference(bool isUnderstood, string intent, Dictionary<string, string> slots)
        {
            IsUnderstood = isUnderstood;
            Intent = intent;
            Slots = slots;
        }

        public bool IsUnderstood { get; }

        public string Intent { get; }

        public Dictionary<string, string> Slots { get; }
    }

    public class Rhino : IDisposable
    {

#if !UNITY_EDITOR && UNITY_IOS
        private const string LIBRARY_PATH = "__Internal";
#else
        private const string LIBRARY_PATH = "pv_rhino";
#endif
        private IntPtr _libraryPointer = IntPtr.Zero;

        [DllImport(LIBRARY_PATH, CallingConvention = CallingConvention.Cdecl, CharSet = CharSet.Ansi)]
        private static extern RhinoStatus pv_rhino_init(string accessKey, string modelPath, string contextPath, float sensitivity, float endpointDurationSec, bool requireEndpoint, out IntPtr handle);

        [DllImport(LIBRARY_PATH, CallingConvention = CallingConvention.Cdecl, CharSet = CharSet.Ansi)]
        private static extern int pv_sample_rate();

        [DllImport(LIBRARY_PATH, CallingConvention = CallingConvention.Cdecl, CharSet = CharSet.Ansi)]
        private static extern void pv_rhino_delete(IntPtr handle);

        [DllImport(LIBRARY_PATH, CallingConvention = CallingConvention.Cdecl, CharSet = CharSet.Ansi)]
        private static extern RhinoStatus pv_rhino_process(IntPtr handle, short[] pcm, out bool isFinalized);

        [DllImport(LIBRARY_PATH, CallingConvention = CallingConvention.Cdecl, CharSet = CharSet.Ansi)]
        private static extern RhinoStatus pv_rhino_is_understood(IntPtr handle, out bool isUnderstood);

        [DllImport(LIBRARY_PATH, CallingConvention = CallingConvention.Cdecl, CharSet = CharSet.Ansi)]
        private static extern RhinoStatus pv_rhino_get_intent(IntPtr handle, out IntPtr intent, out int numSlots, out IntPtr slots, out IntPtr values);

        [DllImport(LIBRARY_PATH, CallingConvention = CallingConvention.Cdecl, CharSet = CharSet.Ansi)]
        private static extern RhinoStatus pv_rhino_free_slots_and_values(IntPtr handle, IntPtr slots, IntPtr values);

        [DllImport(LIBRARY_PATH, CallingConvention = CallingConvention.Cdecl, CharSet = CharSet.Ansi)]
        private static extern RhinoStatus pv_rhino_reset(IntPtr handle);

        [DllImport(LIBRARY_PATH, CallingConvention = CallingConvention.Cdecl, CharSet = CharSet.Ansi)]
        private static extern RhinoStatus pv_rhino_context_info(IntPtr handle, out IntPtr contextInfo);

        [DllImport(LIBRARY_PATH, CallingConvention = CallingConvention.Cdecl, CharSet = CharSet.Ansi)]
        private static extern IntPtr pv_rhino_version();

        [DllImport(LIBRARY_PATH, CallingConvention = CallingConvention.Cdecl, CharSet = CharSet.Ansi)]
        private static extern int pv_rhino_frame_length();

        public static readonly string DEFAULT_MODEL_PATH;

        static Rhino()
        {
            DEFAULT_MODEL_PATH = GetDefaultModelPath();
        }

        private bool _isFinalized;

        /// <summary>
        /// Factory method for Rhino Speech-to-Intent engine.
        /// </summary>
        /// <param name="accessKey">AccessKey obtained from Picovoice Console (https://console.picovoice.ai/).</param>
        /// <param name="contextPath">
        /// Absolute path to file containing context model (file with `.rhn` extension. A context represents the set of
        /// expressions(spoken commands), intents, and intent arguments(slots) within a domain of interest.
        /// </param>
        /// <param name="modelPath">
        /// Absolute path to the file containing model parameters. If not set it will be set to the
        /// default location.
        /// </param>
        /// <param name="sensitivity">
        /// Inference sensitivity expressed as floating point value within [0,1]. A higher sensitivity value results in fewer misses
        /// at the cost of (potentially) increasing the erroneous inference rate.
        /// </param>
        /// <param name="endpointDurationSec">
        /// Endpoint duration in seconds. An endpoint is a chunk of silence at the end of an
        /// utterance that marks the end of spoken command. It should be a positive number within [0.5, 5]. A lower endpoint
        /// duration reduces delay and improves responsiveness. A higher endpoint duration assures Rhino doesn't return inference
        /// preemptively in case the user pauses before finishing the request.
        /// </param>
        /// <param name="requireEndpoint">
        /// If set to `true`, Rhino requires an endpoint (a chunk of silence) after the spoken command.
        /// If set to `false`, Rhino tries to detect silence, but if it cannot, it still will provide inference regardless. Set
        /// to `false` only if operating in an environment with overlapping speech (e.g. people talking in the background).
        /// </param>
        /// <returns>An instance of Rhino Speech-to-Intent engine.</returns>
        public static Rhino Create(
            string accessKey,
            string contextPath,
            string modelPath = null,
            float sensitivity = 0.5f,
            float endpointDurationSec = 1.0f,
            bool requireEndpoint = true)
        {
            return new Rhino(accessKey, modelPath ?? DEFAULT_MODEL_PATH, contextPath, sensitivity, endpointDurationSec, requireEndpoint);
        }

        /// <summary>
        /// Creates an instance of the Rhino wake word engine.
        /// </summary>
        /// <param name="accessKey">AccessKey obtained from Picovoice Console (https://console.picovoice.ai/).</param>
        /// <param name="modelPath">Absolute path to file containing model parameters.
        /// <param name="contextPath">
        /// Absolute path to file containing context parameters. A context represents the set of
        /// expressions(spoken commands), intents, and intent arguments(slots) within a domain of interest.
        /// </param>
        /// <param name="sensitivity">
        /// Inference sensitivity. It should be a number within [0, 1]. A higher sensitivity value
        /// results in fewer misses at the cost of(potentially) increasing the erroneous inference rate.
        /// </param>
        /// <param name="endpointDurationSec">
        /// Endpoint duration in seconds. An endpoint is a chunk of silence at the end of an
        /// utterance that marks the end of spoken command. It should be a positive number within [0.5, 5]. A lower endpoint
        /// duration reduces delay and improves responsiveness. A higher endpoint duration assures Rhino doesn't return inference
        /// preemptively in case the user pauses before finishing the request.
        /// </param>
        /// <param name="requireEndpoint">
        /// If set to `true`, Rhino requires an endpoint (a chunk of silence) after the spoken command.
        /// If set to `false`, Rhino tries to detect silence, but if it cannot, it still will provide inference regardless. Set
        /// to `false` only if operating in an environment with overlapping speech (e.g. people talking in the background).
        /// </param>
        private Rhino(string accessKey, string modelPath, string contextPath, float sensitivity, float endpointDurationSec, bool requireEndpoint)
        {
            if (string.IsNullOrEmpty(accessKey))
            {
                throw new RhinoInvalidArgumentException("No AccessKey provided to Rhino");
            }

            if (string.IsNullOrEmpty(contextPath))
            {
                throw new RhinoInvalidArgumentException("No contextPath provided to Rhino");
            }

            if (!File.Exists(modelPath))
            {

#if !UNITY_EDITOR && UNITY_ANDROID

                try {
                    modelPath = ExtractResource(modelPath);
                } catch {
                    throw new RhinoIOException($"Couldn't find model file at '{modelPath}'");
                }

#else

                throw new RhinoIOException($"Couldn't find model file at '{modelPath}'");

#endif
            }

            if (!File.Exists(contextPath))
            {

#if !UNITY_EDITOR && UNITY_ANDROID
                try {
                    contextPath = ExtractResource(contextPath);
                } catch (Exception e) {
                    throw new RhinoIOException($"Couldn't find context file at '{contextPath}'");
                }

#else

                throw new RhinoIOException($"Couldn't find context file at '{contextPath}'");

#endif
            }

            if (sensitivity < 0 || sensitivity > 1)
            {
                throw new RhinoInvalidArgumentException("Sensitivity value should be within [0, 1].");
            }

            if (endpointDurationSec < 0.5 || endpointDurationSec > 5.0)
            {
                throw new RhinoInvalidArgumentException("Endpoint duration value should be within [0.5, 5.0].");
            }

            RhinoStatus status = pv_rhino_init(
                accessKey,
                modelPath,
                contextPath,
                sensitivity,
                endpointDurationSec,
                requireEndpoint,
                out _libraryPointer);
            if (status != RhinoStatus.SUCCESS)
            {
                throw RhinoStatusToException(status);
            }

            IntPtr contextInfoPtr;
            status = pv_rhino_context_info(_libraryPointer, out contextInfoPtr);
            if (status != RhinoStatus.SUCCESS)
            {
                throw RhinoStatusToException(status);
            }

            ContextInfo = Marshal.PtrToStringAnsi(contextInfoPtr);
            Version = Marshal.PtrToStringAnsi(pv_rhino_version());
            SampleRate = pv_sample_rate();
            FrameLength = pv_rhino_frame_length();
        }

        /// <summary>
        /// Processes a frame of audio and emits a flag indicating if the inference is finalized. When finalized,
        /// `pv_rhino_is_understood()` should be called to check if the spoken command is considered valid.
        /// </summary>
        /// <param name="pcm">
        /// A frame of audio samples. The number of samples per frame can be found by calling `.FrameLength`.
        /// The incoming audio needs to have a sample rate equal to `.SampleRate` and be 16-bit linearly-encoded.
        /// Rhino operates on single-channel audio.
        /// </param>
        /// <returns>
        /// Flag indicating if the inference is finalized.
        /// </returns>
        public bool Process(short[] pcm)
        {
            if (pcm.Length != FrameLength)
            {
                throw new RhinoInvalidArgumentException(string.Format("Input audio frame size ({0}) was not the size specified by Rhino engine ({1}). ", pcm.Length, FrameLength) +
                    "Use rhino.FrameLength to get the correct size.");
            }

            RhinoStatus status = pv_rhino_process(_libraryPointer, pcm, out _isFinalized);
            if (status != RhinoStatus.SUCCESS)
            {
                throw RhinoStatusToException(status);
            }

            return _isFinalized;
        }

        /// <summary>
        /// Gets inference results from Rhino. If the spoken command was understood, it includes the specific intent name
        /// that was inferred, and (if applicable) slot keys and specific slot values. Should only be called after the
        /// process function returns true, otherwise Rhino has not yet reached an inference conclusion.
        /// </summary>
        /// <returns>
        /// An immutable Inference object with `.IsUnderstood`, '.Intent` , and `.Slots` getters.
        /// </returns>
        public Inference GetInference()
        {
            if (!_isFinalized)
            {
                throw RhinoStatusToException(RhinoStatus.INVALID_STATE);
            }

            bool isUnderstood;
            string intent;
            Dictionary<string, string> slots;

            RhinoStatus status = pv_rhino_is_understood(_libraryPointer, out isUnderstood);
            if (status != RhinoStatus.SUCCESS)
            {
                throw RhinoStatusToException(status);
            }

            if (isUnderstood)
            {
                IntPtr intentPtr, slotKeysPtr, slotValuesPtr;
                int numSlots;

                status = pv_rhino_get_intent(_libraryPointer, out intentPtr, out numSlots, out slotKeysPtr, out slotValuesPtr);
                if (status != RhinoStatus.SUCCESS)
                {
                    throw RhinoStatusToException(status);
                }

                intent = Marshal.PtrToStringAnsi(intentPtr);

                int elementSize = Marshal.SizeOf(typeof(IntPtr));
                slots = new Dictionary<string, string>();
                for (int i = 0; i < numSlots; i++)
                {
                    string slotKey = Marshal.PtrToStringAnsi(Marshal.ReadIntPtr(slotKeysPtr, i * elementSize));
                    string slotValue = Marshal.PtrToStringAnsi(Marshal.ReadIntPtr(slotValuesPtr, i * elementSize));
                    slots[slotKey] = slotValue;
                }

                status = pv_rhino_free_slots_and_values(_libraryPointer, slotKeysPtr, slotValuesPtr);
                if (status != RhinoStatus.SUCCESS)
                {
                    throw RhinoStatusToException(status);
                }
            }
            else
            {
                intent = null;
                slots = new Dictionary<string, string>();
            }

            status = pv_rhino_reset(_libraryPointer);
            if (status != RhinoStatus.SUCCESS)
            {
                throw RhinoStatusToException(status);
            }

            return new Inference(isUnderstood, intent, slots);
        }

        /// <summary>
        /// Gets the current context information.
        /// </summary>
        /// <returns>Context information</returns>
        public string ContextInfo { get; private set; }


        /// <summary>
        /// Gets the version number of the Rhino library.
        /// </summary>
        /// <returns>Version of Rhino</returns>
        public string Version { get; private set; }

        /// <summary>
        /// Gets the required number of audio samples per frame.
        /// </summary>
        /// <returns>Required frame length.</returns>
        public int FrameLength { get; private set; }

        /// <summary>
        /// Get the audio sample rate required by Rhino
        /// </summary>
        /// <returns>Required sample rate.</returns>
        public int SampleRate { get; private set; }


        /// <summary>
        /// Coverts status codes to relevant .NET exceptions
        /// </summary>
        /// <param name="status">Picovoice library status code.</param>
        /// <returns>.NET exception</returns>
        private static Exception RhinoStatusToException(RhinoStatus status, string message = "")
        {
            switch (status)
            {
                case RhinoStatus.OUT_OF_MEMORY:
                    return new RhinoMemoryException(message);
                case RhinoStatus.IO_ERROR:
                    return new RhinoIOException(message);
                case RhinoStatus.INVALID_ARGUMENT:
                    return new RhinoInvalidArgumentException(message);
                case RhinoStatus.STOP_ITERATION:
                    return new RhinoStopIterationException(message);
                case RhinoStatus.KEY_ERROR:
                    return new RhinoKeyException(message);
                case RhinoStatus.INVALID_STATE:
                    return new RhinoInvalidStateException(message);
                case RhinoStatus.RUNTIME_ERROR:
                    return new RhinoRuntimeException(message);
                case RhinoStatus.ACTIVATION_ERROR:
                    return new RhinoActivationException(message);
                case RhinoStatus.ACTIVATION_LIMIT_REACHED:
                    return new RhinoActivationLimitException(message);
                case RhinoStatus.ACTIVATION_THROTTLED:
                    return new RhinoActivationThrottledException(message);
                case RhinoStatus.ACTIVATION_REFUSED:
                    return new RhinoActivationRefusedException(message);
                default:
                    return new RhinoException("Unmapped error code returned from Rhino.");
            }
        }

        /// <summary>
        /// Frees memory that was allocated for Rhino
        /// </summary>
        public void Dispose()
        {
            if (_libraryPointer != IntPtr.Zero)
            {
                pv_rhino_delete(_libraryPointer);
                _libraryPointer = IntPtr.Zero;

                // ensures finalizer doesn't trigger if already manually disposed
                GC.SuppressFinalize(this);
            }
        }

        ~Rhino()
        {
            Dispose();
        }

        private static string GetDefaultModelPath()
        {
#if !UNITY_EDITOR && UNITY_ANDROID
            return ExtractResource(Path.Combine(Application.streamingAssetsPath, "rhino_params.pv"));
#else
            return Path.Combine(Application.streamingAssetsPath, "rhino_params.pv");
#endif
        }

#if !UNITY_EDITOR && UNITY_ANDROID
        public static string ExtractResource(string filePath)
        {
            if (!filePath.StartsWith(Application.streamingAssetsPath))
            {
                throw new RhinoIOException($"File '{filePath}' not found in streaming assets path.");
            }

            string dstPath = filePath.Replace(Application.streamingAssetsPath, Application.persistentDataPath);
            string dstDir = Path.GetDirectoryName(dstPath);
            if (!Directory.Exists(dstDir))
            {
                Directory.CreateDirectory(dstDir);
            }

            var loadingRequest = UnityWebRequest.Get(filePath);
            loadingRequest.SendWebRequest();

            while (!loadingRequest.isDone)
            {
                if (loadingRequest.isNetworkError || loadingRequest.isHttpError)
                {
                    break;
                }
            }
            if (!(loadingRequest.isNetworkError || loadingRequest.isHttpError))
            {
                File.WriteAllBytes(dstPath, loadingRequest.downloadHandler.data);
            }

            return dstPath;
        }
#endif

    }
}
