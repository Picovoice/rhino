/*
    Copyright 2020 Picovoice Inc.

    You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
    file accompanying this source.

    Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
    an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
    specific language governing permissions and limitations under the License.
*/

using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading;

using OpenTK.Audio.OpenAL;
using Picovoice;

namespace RhinoDemo
{
    /// <summary>
    /// Microphone Demo for Rhino Speech-to-Intent engine. It creates an input audio stream from a microphone, monitors it, 
    /// and extracts the intent from the speech command.It optionally saves the recorded audio into a file for further debugging.
    /// </summary>
    public class MicDemo
    {

        /// <summary>
        /// Creates an input audio stream, instantiates an instance of Rhino object, and infers the intent from spoken commands.
        /// </summary>
        /// <param name="contextPath">
        /// Absolute path to file containing context model (file with `.rhn` extension). A context represents the set of 
        /// expressions(spoken commands), intents, and intent arguments(slots) within a domain of interest.
        /// </param>    
        /// <param name="modelPath">Absolute path to the file containing model parameters. If not set it will be set to the default location.</param>           
        /// <param name="sensitivity">
        /// Inference sensitivity. It should be a number within [0, 1]. A higher sensitivity value results in 
        /// fewer misses at the cost of (potentially) increasing the erroneous inference rate. If not set, the default value of 0.5 will be used.
        /// </param>
        /// <param name="audioDeviceIndex">Optional argument. If provided, audio is recorded from this input device. Otherwise, the default audio input device is used.</param>        
        /// <param name="outputPath">Optional argument. If provided, recorded audio will be stored in this location at the end of the run.</param>                
        public static void RunDemo(string contextPath, string modelPath, float sensitivity, int? audioDeviceIndex = null, string outputPath = null)
        {
            Rhino rhino = null;
            BinaryWriter outputFileWriter = null;
            int totalSamplesWritten = 0;
            try
            {
                // init rhino speech-to-intent engine
                rhino = Rhino.Create(contextPath, modelPath, sensitivity);                

                // open stream to output file
                if (!string.IsNullOrWhiteSpace(outputPath))
                {
                    outputFileWriter = new BinaryWriter(new FileStream(outputPath, FileMode.OpenOrCreate, FileAccess.Write));
                    WriteWavHeader(outputFileWriter, 1, 16, 16000, 0);
                }

                // choose audio device
                string deviceName = null;
                if (audioDeviceIndex != null)
                {
                    List<string> captureDeviceList = ALC.GetStringList(GetEnumerationStringList.CaptureDeviceSpecifier).ToList();
                    if (captureDeviceList != null && audioDeviceIndex.Value < captureDeviceList.Count)
                    {
                        deviceName = captureDeviceList[audioDeviceIndex.Value];
                    }
                    else
                    {
                        throw new ArgumentException("No input device found with the specified index. Use --show_audio_devices to show" +
                                                    "available inputs", "--audio_device_index");
                    }
                }

                Console.WriteLine(rhino.ContextInfo);
                Console.WriteLine("Listening...\n");

                // create and start recording
                short[] recordingBuffer = new short[rhino.FrameLength];
                ALCaptureDevice captureDevice = ALC.CaptureOpenDevice(deviceName, 16000, ALFormat.Mono16, rhino.FrameLength * 2);
                {
                    ALC.CaptureStart(captureDevice);
                    while (!Console.KeyAvailable)
                    {
                        int samplesAvailable = ALC.GetAvailableSamples(captureDevice);
                        if (samplesAvailable > rhino.FrameLength)
                        {
                            ALC.CaptureSamples(captureDevice, ref recordingBuffer[0], rhino.FrameLength);
                            bool isFinalized = rhino.Process(recordingBuffer);
                            if (isFinalized)
                            {
                                Inference inference = rhino.GetInference();
                                if (inference.IsUnderstood)
                                {
                                    Console.WriteLine("{");
                                    Console.WriteLine($"  intent : '{inference.Intent}'");
                                    Console.WriteLine("  slots : {");
                                    foreach (KeyValuePair<string, string> slot in inference.Slots)
                                    {
                                        Console.WriteLine($"    {slot.Key} : '{slot.Value}'");
                                    }
                                    Console.WriteLine("  }");
                                    Console.WriteLine("}");
                                }
                                else
                                {
                                    Console.WriteLine("Didn't understand the command.");
                                }
                            }

                            if (outputFileWriter != null)
                            {
                                foreach (short sample in recordingBuffer)
                                {
                                    outputFileWriter.Write(sample);
                                }
                                totalSamplesWritten += recordingBuffer.Length;
                            }
                        }
                        Thread.Yield();
                    }

                    // stop and clean up resources
                    Console.WriteLine("Stopping...");
                    ALC.CaptureStop(captureDevice);
                    ALC.CaptureCloseDevice(captureDevice);
                }
            }
            finally
            {
                if (outputFileWriter != null)
                {
                    // write size to header and clean up
                    WriteWavHeader(outputFileWriter, 1, 16, 16000, totalSamplesWritten);
                    outputFileWriter.Flush();
                    outputFileWriter.Dispose();
                }
                rhino?.Dispose();
            }
        }

        /// <summary>
        /// Writes the RIFF header for a file in WAV format
        /// </summary>
        /// <param name="writer">Output stream to WAV file</param>
        /// <param name="channelCount">Number of channels</param>     
        /// <param name="bitDepth">Number of bits per sample</param>     
        /// <param name="sampleRate">Sampling rate in Hz</param>
        /// <param name="totalSampleCount">Total number of samples written to the file</param>
        private static void WriteWavHeader(BinaryWriter writer, ushort channelCount, ushort bitDepth, int sampleRate, int totalSampleCount)
        {
            if (writer == null)
                return;

            writer.Seek(0, SeekOrigin.Begin);         
            writer.Write(Encoding.ASCII.GetBytes("RIFF"));
            writer.Write((bitDepth / 8 * totalSampleCount) + 36);
            writer.Write(Encoding.ASCII.GetBytes("WAVE")); 
            writer.Write(Encoding.ASCII.GetBytes("fmt "));
            writer.Write(16); 
            writer.Write((ushort)1);
            writer.Write(channelCount);
            writer.Write(sampleRate);
            writer.Write(sampleRate * channelCount * bitDepth / 8);
            writer.Write((ushort)(channelCount * bitDepth / 8));
            writer.Write(bitDepth);
            writer.Write(Encoding.ASCII.GetBytes("data"));
            writer.Write(bitDepth / 8 * totalSampleCount);            
        }

        /// <summary>
        /// Lists available audio input devices.
        /// </summary>
        public static void ShowAudioDevices()
        {
            Console.WriteLine("Available audio devices: \n");
            List<string> captureDeviceList = ALC.GetStringList(GetEnumerationStringList.CaptureDeviceSpecifier).ToList();
            for(int i=0; i<captureDeviceList.Count; i++)
            {            
                Console.WriteLine($"\tDevice {i}: {captureDeviceList[i]}");
            }
        }

        public static void Main(string[] args)
        {
            AppDomain.CurrentDomain.UnhandledException += OnUnhandledException;
            if (args.Length == 0)
            {
                Console.WriteLine(HELP_STR);
                Console.ReadKey();
                return;
            }

            string contextPath = null;
            string modelPath = null;
            int? audioDeviceIndex = null;
            float sensitivity = 0.5f;
            string outputPath = null;
            bool showAudioDevices = false;
            bool showHelp = false;

            // parse command line arguments
            int argIndex = 0;
            while (argIndex < args.Length)
            {
                if (args[argIndex] == "--context_path")
                {
                    if (++argIndex < args.Length)
                    {
                        contextPath = args[argIndex++];
                    }
                }
                else if (args[argIndex] == "--model_path")
                {
                    if (++argIndex < args.Length)
                    {
                        modelPath = args[argIndex++];
                    }
                }
                else if (args[argIndex] == "--sensitivity")
                {
                    argIndex++;
                    if (argIndex < args.Length && float.TryParse(args[argIndex], out sensitivity))
                    {
                        argIndex++;
                    }
                }
                else if (args[argIndex] == "--show_audio_devices")
                {
                    showAudioDevices = true;
                    argIndex++;
                }
                else if (args[argIndex] == "--audio_device_index")
                {
                    if (++argIndex < args.Length && int.TryParse(args[argIndex], out int deviceIndex))
                    {
                        audioDeviceIndex = deviceIndex;
                        argIndex++;
                    }
                }
                else if (args[argIndex] == "--output_path")
                {
                    if (++argIndex < args.Length)
                    {
                        outputPath = args[argIndex++];
                    }
                }
                else if (args[argIndex] == "-h" || args[argIndex] == "--help")
                {
                    showHelp = true;
                    argIndex++;
                }
                else
                {
                    argIndex++;
                }
            }

            // print help text and exit
            if (showHelp)
            {
                Console.WriteLine(HELP_STR);
                Console.ReadKey();
                return;
            }

            // print audio device info and exit
            if (showAudioDevices)
            {
                ShowAudioDevices();                
                Console.ReadKey();
                return;
            }

            // argument validation
            modelPath ??= Rhino.MODEL_PATH;

            if (contextPath == null) 
            {
                throw new ArgumentNullException("context_path");
            }
            if (!File.Exists(contextPath)) 
            {
                throw new ArgumentException($"Context file at path '{contextPath}' does not exist.", "--context_path");                
            }

            if (sensitivity < 0 || sensitivity > 1)
            {
                throw new ArgumentException($"Sensitivity value of {sensitivity} is not valid. Value must be with [0, 1].");
            }

            // run demo with validated arguments
            RunDemo(contextPath, modelPath, sensitivity, audioDeviceIndex, outputPath);            
        }

        private static void OnUnhandledException(object sender, UnhandledExceptionEventArgs e)
        {
            Console.WriteLine(e.ExceptionObject.ToString());
            Console.ReadKey();
            Environment.Exit(-1);
        }

        private static readonly string HELP_STR = "Available options: \n " +
            "\t--context_path (required): Absolute path to context file.\n" +
            "\t--model_path: Absolute path to the file containing model parameters.\n" +
            "\t--sensitivity: Inference sensitivity. It should be a number within [0, 1]. A higher sensitivity value results in " +
            "fewer misses at the cost of (potentially) increasing the erroneous inference rate." +
            "\t--audio_device_index: Index of input audio device.\n" +
            "\t--output_path: Absolute path to recorded audio for debugging.\n" +
            "\t--show_audio_devices: Print available recording devices.\n";
    }
}
