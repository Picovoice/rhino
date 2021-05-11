/*
    Copyright 2020-2021 Picovoice Inc.

    You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
    file accompanying this source.

    Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
    an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
    specific language governing permissions and limitations under the License.
*/

using System;
using System.Collections.Generic;
using System.IO;
using System.Reflection;
using System.Runtime.InteropServices;

namespace Pv
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
        INVALID_STATE = 6
    }

    /// <summary>
    /// Class for holding Rhino inference result
    /// </summary>
    public class Inference
    {
        public Inference(bool isUnderstood, string intent, Dictionary<string,string> slots)
        {
            IsUnderstood = isUnderstood;
            Intent = intent;
            Slots = slots;
        }

        public bool IsUnderstood { get; }

        public string Intent { get; }

        public Dictionary<string, string> Slots { get; }
    }

    /// <summary>
    /// .NET binding for Rhino Speech-to-Intent engine.
    /// </summary>
    public class Rhino : IDisposable
    {
        private const string LIBRARY = "libpv_rhino";
        private IntPtr _libraryPointer = IntPtr.Zero;        

        public static readonly string MODEL_PATH;

        static Rhino() 
        {
#if NETCOREAPP3_1
            NativeLibrary.SetDllImportResolver(typeof(Rhino).Assembly, ImportResolver);
#endif
            MODEL_PATH = Utils.PvModelPath();
        }

#if NETCOREAPP3_1
        private static IntPtr ImportResolver(string libraryName, Assembly assembly, DllImportSearchPath? searchPath) 
        {
            IntPtr libHandle = IntPtr.Zero;                                   
            NativeLibrary.TryLoad(Utils.PvLibraryPath(libraryName), out libHandle);
            return libHandle;
        }
#endif
        [DllImport(LIBRARY, CallingConvention = CallingConvention.Cdecl, CharSet = CharSet.Ansi)]
        private static extern RhinoStatus pv_rhino_init(string modelPath, string contextPath, float sensitivity, out IntPtr handle);

        [DllImport(LIBRARY, CallingConvention = CallingConvention.Cdecl, CharSet = CharSet.Ansi)]
        private static extern int pv_sample_rate();

        [DllImport(LIBRARY, CallingConvention = CallingConvention.Cdecl, CharSet = CharSet.Ansi)]
        private static extern void pv_rhino_delete(IntPtr handle);

        [DllImport(LIBRARY, CallingConvention = CallingConvention.Cdecl, CharSet = CharSet.Ansi)]
        private static extern RhinoStatus pv_rhino_process(IntPtr handle, short[] pcm, out bool isFinalized);

        [DllImport(LIBRARY, CallingConvention = CallingConvention.Cdecl, CharSet = CharSet.Ansi)]
        private static extern RhinoStatus pv_rhino_is_understood(IntPtr handle, out bool isUnderstood);

        [DllImport(LIBRARY, CallingConvention = CallingConvention.Cdecl, CharSet = CharSet.Ansi)]
        private static extern RhinoStatus pv_rhino_get_intent(IntPtr handle, out IntPtr intent, out int numSlots, out IntPtr slots, out IntPtr values);

        [DllImport(LIBRARY, CallingConvention = CallingConvention.Cdecl, CharSet = CharSet.Ansi)]
        private static extern RhinoStatus pv_rhino_free_slots_and_values(IntPtr handle, IntPtr slots, IntPtr values);

        [DllImport(LIBRARY, CallingConvention = CallingConvention.Cdecl, CharSet = CharSet.Ansi)]
        private static extern RhinoStatus pv_rhino_reset(IntPtr handle);

        [DllImport(LIBRARY, CallingConvention = CallingConvention.Cdecl, CharSet = CharSet.Ansi)]
        private static extern RhinoStatus pv_rhino_context_info(IntPtr handle, out IntPtr contextInfo);

        [DllImport(LIBRARY, CallingConvention = CallingConvention.Cdecl, CharSet = CharSet.Ansi)]
        private static extern IntPtr pv_rhino_version();

        [DllImport(LIBRARY, CallingConvention = CallingConvention.Cdecl, CharSet = CharSet.Ansi)]
        private static extern int pv_rhino_frame_length();

        private bool _isFinalized;

        /// <summary>
        /// Factory method for Rhino Speech-to-Intent engine.
        /// </summary>
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
        /// <returns>An instance of Rhino Speech-to-Intent engine.</returns>                             
        public static Rhino Create(string contextPath, string modelPath = null, float sensitivity=0.5f)
        {
            return new Rhino(modelPath ?? MODEL_PATH, contextPath, sensitivity);
        }

        /// <summary>
        /// Creates an instance of the Rhino wake word engine.
        /// </summary>
        /// <param name="modelPath">Absolute path to file containing model parameters.
        /// <param name="contextPath">
        /// Absolute path to file containing context parameters. A context represents the set of
        /// expressions(spoken commands), intents, and intent arguments(slots) within a domain of interest.
        /// </param>
        /// <param name="sensitivity">
        /// Inference sensitivity. It should be a number within [0, 1]. A higher sensitivity value
        /// results in fewer misses at the cost of(potentially) increasing the erroneous inference rate.
        /// </param>        
        public Rhino(string modelPath, string contextPath, float sensitivity=0.5f)
        {            
            if (!File.Exists(modelPath))
            {
                throw new IOException($"Couldn't find model file at '{modelPath}'");
            }

            if (!File.Exists(contextPath))
            {
                throw new IOException($"Couldn't find context file at '{contextPath}'");
            }

            if (sensitivity < 0 || sensitivity > 1)
            {
                throw new ArgumentException("Sensitivity value should be within [0, 1].");
            }

            RhinoStatus status = pv_rhino_init(modelPath, contextPath, sensitivity, out _libraryPointer);
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
                throw new ArgumentException($"Input audio frame size ({pcm.Length}) was not the size specified by Rhino engine ({FrameLength}). " +
                    $"Use rhino.FrameLength to get the correct size.");
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
        /// Coverts status codes to relavent .NET exceptions
        /// </summary>
        /// <param name="status">Picovoice library status code.</param>
        /// <returns>.NET exception</returns>
        private static Exception RhinoStatusToException(RhinoStatus status)
        {
            switch (status)
            {
                case RhinoStatus.OUT_OF_MEMORY:
                    return new OutOfMemoryException();
                case RhinoStatus.IO_ERROR:
                    return new IOException();
                case RhinoStatus.INVALID_ARGUMENT:
                    return new ArgumentException();
                case RhinoStatus.INVALID_STATE:
                    return new Exception("Rhino reported an invalid state.");
                default:
                    return new Exception("Unmapped error code returned from Rhino.");
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
    }
}
