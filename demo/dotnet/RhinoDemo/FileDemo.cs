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

using Picovoice;

namespace RhinoDemo
{
    /// <summary>
    /// File Demo for Rhino Speech-to-Intent engine. The demo takes an input audio file and a context file
    /// and returns prints the inference result.
    /// </summary>                
    public class FileDemo
    {

        /// <summary>
        /// Reads through input file and prints the inference result returned by Rhino.
        /// </summary>
        /// <param name="inputAudioPath">Required argument. Absolute path to input audio file.</param>
        /// <param name="contextPath">Required argument. Absolute path to the Rhino context file.</param>
        /// <param name="modelPath">Absolute path to the file containing model parameters. If not set it will be set to the default location.</param>
        /// <param name="sensitivity">
        /// Inference sensitivity. It should be a number within [0, 1]. A higher sensitivity value results in 
        /// fewer misses at the cost of (potentially) increasing the erroneous inference rate. If not set, the default value of 0.5 will be used.
        /// </param>
        public static void RunDemo(string inputAudioPath, string contextPath, string modelPath, float sensitivity)
        {                        
            // init rhino speech-to-intent engine
            using Rhino rhino = Rhino.Create(contextPath, modelPath, sensitivity);

            // open and validate wav file
            using BinaryReader reader = new BinaryReader(File.Open(inputAudioPath, FileMode.Open));
            ValidateWavFile(reader, rhino.SampleRate, 16, out short numChannels);

            // read audio and send frames to rhino
            short[] rhinoFrame = new short[rhino.FrameLength];
            int frameIndex = 0;
            long totalSamplesRead = 0;
            while (reader.BaseStream.Position != reader.BaseStream.Length)
            {
                totalSamplesRead++;
                rhinoFrame[frameIndex++] = reader.ReadInt16();

                if (frameIndex == rhinoFrame.Length)
                {
                    bool isFinalized = rhino.Process(rhinoFrame);
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
                        break;
                    }

                    frameIndex = 0;
                }

                // skip right channel
                if (numChannels == 2)
                {
                    reader.ReadInt16();
                }                
            }
        }


        /// <summary>
        ///  Reads RIFF header of a WAV file and validates it against required properties
        /// </summary>
        /// <param name="reader">WAV file stream reader</param>
        /// <param name="requiredSampleRate">Required sample rate in Hz</param>     
        /// <param name="requiredBitDepth">Required number of bits per sample</param>             
        /// <param name="numChannels">Number of channels can be returned by function</param>
        public static void ValidateWavFile(BinaryReader reader, int requiredSampleRate, short requiredBitDepth, out short numChannels) 
        {                        
            byte[] riffHeader = reader?.ReadBytes(44);

            int riff = BitConverter.ToInt32(riffHeader, 0);
            int wave = BitConverter.ToInt32(riffHeader, 8);
            if (riff != BitConverter.ToInt32(Encoding.UTF8.GetBytes("RIFF"), 0) ||
                wave != BitConverter.ToInt32(Encoding.UTF8.GetBytes("WAVE"), 0))
            {
                throw new ArgumentException("input_audio_path", $"Invalid input audio file format. Input file must be a {requiredSampleRate}kHz, 16-bit WAV file.");
            }

            numChannels = BitConverter.ToInt16(riffHeader, 22);
            int sampleRate = BitConverter.ToInt32(riffHeader, 24);
            short bitDepth = BitConverter.ToInt16(riffHeader, 34);
            if (sampleRate != requiredSampleRate || bitDepth != requiredBitDepth)
            {
                throw new ArgumentException("input_audio_path", $"Invalid input audio file format. Input file must be a {requiredSampleRate}Hz, 16-bit WAV file.");
            }

            if (numChannels == 2)
            {
                Console.WriteLine("Picovoice processes single-channel audio but stereo file is provided. Processing left channel only.");
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
            
            string inputAudioPath = null;            
            string contextPath = null;            
            string modelPath = null;
            float sensitivity = 0.5f;
            bool showHelp = false;

            // parse command line arguments
            int argIndex = 0;
            while (argIndex < args.Length)
            {
                if (args[argIndex] == "--input_audio_path")
                {
                    if (++argIndex < args.Length)
                    {
                        inputAudioPath = args[argIndex++];
                    }
                }
                else if (args[argIndex] == "--context_path")
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
                    if(argIndex < args.Length && float.TryParse(args[argIndex], out sensitivity))
                    {                        
                        argIndex++;
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

            // argument validation
            if (string.IsNullOrEmpty(inputAudioPath))
            {
                throw new ArgumentNullException("input_audio_path");
            }
            if (!File.Exists(inputAudioPath)) 
            {
                throw new ArgumentException($"Audio file at path {inputAudioPath} does not exist", "--input_audio_path");
            }
            
            if (string.IsNullOrEmpty(contextPath))
            {
                throw new ArgumentNullException("context_path");
            }
            if (!File.Exists(contextPath))
            {
                throw new ArgumentException($"Context file at path {contextPath} does not exist", "--context_path");
            }

            modelPath ??= Rhino.MODEL_PATH;

            if (sensitivity < 0 || sensitivity > 1)
            {
                throw new ArgumentException($"Sensitivity value of {sensitivity} is not valid. Value must be with [0, 1].");
            }


            RunDemo(inputAudioPath, contextPath, modelPath, sensitivity);
        }

        private static void OnUnhandledException(object sender, UnhandledExceptionEventArgs e)
        {
            Console.WriteLine(e.ExceptionObject.ToString());
            Console.ReadKey();
            Environment.Exit(-1);
        }

        private static readonly string HELP_STR = "Available options: \n" +
            "\t--input_audio_path (required): Absolute path to input audio file.\n" +
            "\t--context_path (required): Absolute path to context file.\n" +
            "\t--model_path: Absolute path to the file containing model parameters.\n" +
            "\t--sensitivity: Inference sensitivity. It should be a number within [0, 1]. A higher sensitivity value results in " +
            "fewer misses at the cost of (potentially) increasing the erroneous inference rate.";
    }
}
