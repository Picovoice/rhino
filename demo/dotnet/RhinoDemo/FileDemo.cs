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
using System.Linq;
using System.Text;

using Pv;

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
        public static void RunDemo(
            string accessKey,
            string inputAudioPath,
            string contextPath,
            string modelPath,
            float sensitivity,
            float endpointDurationSec,
            bool requireEndpoint)
        {
            // init rhino speech-to-intent engine
            using Rhino rhino = Rhino.Create(
                accessKey,
                contextPath,
                modelPath,
                sensitivity,
                endpointDurationSec,
                requireEndpoint);

            // open and validate wav file
            using BinaryReader reader = new BinaryReader(File.Open(inputAudioPath, FileMode.Open));
            ValidateWavFile(reader, rhino.SampleRate, 16, out short numChannels);

            // read audio and send frames to rhino
            short[] rhinoFrame = new short[rhino.FrameLength];
            int frameIndex = 0;
            while (reader.BaseStream.Position != reader.BaseStream.Length)
            {
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
                        return;
                    }

                    frameIndex = 0;
                }

                // skip right channel
                if (numChannels == 2)
                {
                    reader.ReadInt16();
                }
            }

            Console.WriteLine("Reached end of audio file before Rhino returned an inference.");
        }


        /// <summary>
        ///  Reads RIFF header of a WAV file and validates its properties against Picovoice audio processing requirements
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
                Console.Read();
                return;
            }

            string inputAudioPath = null;
            string accessKey = null;
            string contextPath = null;
            string modelPath = null;
            float sensitivity = 0.5f;
            float endpointDurationSec = 1.0f;
            bool requireEndpoint = true;
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
                else if (args[argIndex] == "--access_key")
                {
                    if (++argIndex < args.Length)
                    {
                        accessKey = args[argIndex++];
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
                    if (argIndex < args.Length && float.TryParse(args[argIndex], out sensitivity))
                    {
                        argIndex++;
                    }
                }
                else if (args[argIndex] == "--endpoint_duration")
                {
                    argIndex++;
                    if (argIndex < args.Length && float.TryParse(args[argIndex], out endpointDurationSec))
                    {
                        argIndex++;
                    }
                }
                else if (args[argIndex] == "--require_endpoint")
                {
                    if (++argIndex < args.Length)
                    {
                        if (args[argIndex++].ToLower() == "false")
                        {
                            requireEndpoint = false;
                        }
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
                Console.Read();
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

            RunDemo(accessKey, inputAudioPath, contextPath, modelPath, sensitivity, endpointDurationSec, requireEndpoint);
        }

        private static void OnUnhandledException(object sender, UnhandledExceptionEventArgs e)
        {
            Console.WriteLine(e.ExceptionObject.ToString());
            Console.Read();
            Environment.Exit(1);
        }

        private static readonly string HELP_STR = "Available options: \n" +
            "\t--input_audio_path (required): Absolute path to input audio file.\n" +
            "\t--access_key (required): AccessKey obtained from Picovoice Console (https://console.picovoice.ai/)\n" +
            "\t--context_path (required): Absolute path to context file.\n" +
            "\t--model_path: Absolute path to the file containing model parameters.\n" +
            "\t--sensitivity: Inference sensitivity. It should be a number within [0, 1]. A higher sensitivity value results in " +
            "fewer misses at the cost of (potentially) increasing the erroneous inference rate.\n" +
            "\t--endpoint_duration: Endpoint duration in seconds. It should be a positive number within [0.5, 5].\n" +
            "\t--require_endpoint: ['true'|'false'] If set to 'false', Rhino does not require an endpoint (chunk of silence) before finishing inference.\n";
    }
}
