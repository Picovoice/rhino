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
using System.Text;
using System.Threading;

using Pv;

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
        /// <param name="audioDeviceIndex">Optional argument. If provided, audio is recorded from this input device. Otherwise, the default audio input device is used.</param>
        /// <param name="outputPath">Optional argument. If provided, recorded audio will be stored in this location at the end of the run.</param>
        public static void RunDemo(
            string accessKey,
            string contextPath,
            string modelPath,
            float sensitivity,
            float endpointDurationSec,
            bool requireEndpoint,
            int audioDeviceIndex,
            string outputPath = null)
        {
            Rhino rhino = null;
            BinaryWriter outputFileWriter = null;
            int totalSamplesWritten = 0;

            // init rhino speech-to-intent engine
            rhino = Rhino.Create(
                accessKey,
                contextPath,
                modelPath,
                sensitivity,
                endpointDurationSec,
                requireEndpoint);

            // open stream to output file
            if (!string.IsNullOrWhiteSpace(outputPath))
            {
                outputFileWriter = new BinaryWriter(new FileStream(outputPath, FileMode.OpenOrCreate, FileAccess.Write));
                WriteWavHeader(outputFileWriter, 1, 16, 16000, 0);
            }

            Console.CancelKeyPress += (s, o) =>
            {
                Console.WriteLine("Stopping...");

                if (outputFileWriter != null)
                {
                    // write size to header and clean up
                    WriteWavHeader(outputFileWriter, 1, 16, 16000, totalSamplesWritten);
                    outputFileWriter.Flush();
                    outputFileWriter.Dispose();
                }
                rhino?.Dispose();
            };

            // create and start recording
            using (PvRecorder recorder = PvRecorder.Create(audioDeviceIndex, rhino.FrameLength))
            {
                recorder.Start();
                Console.WriteLine(rhino.ContextInfo);
                Console.WriteLine($"\nUsing device: {recorder.SelectedDevice}");
                Console.WriteLine("Listening...\n");

                while (true)
                {
                    short[] pcm = recorder.Read();
                    bool isFinalized = rhino.Process(pcm);
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
                        foreach (short sample in pcm)
                        {
                            outputFileWriter.Write(sample);
                        }
                        totalSamplesWritten += pcm.Length;
                    }
                    Thread.Yield();
                }
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
            string[] devices = PvRecorder.GetAudioDevices();
            for (int i = 0; i < devices.Length; i++)
            {
                Console.WriteLine($"index: {i}, device name: {devices[i]}");
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

            string accessKey = null;
            string contextPath = null;
            string modelPath = null;
            int audioDeviceIndex = -1;
            float sensitivity = 0.5f;
            float endpointDurationSec = 1.0f;
            bool requireEndpoint = true;
            string outputPath = null;
            bool showAudioDevices = false;
            bool showHelp = false;

            // parse command line arguments
            int argIndex = 0;
            while (argIndex < args.Length)
            {
                if (args[argIndex] == "--access_key")
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
                Console.Read();
                return;
            }

            // print audio device info and exit
            if (showAudioDevices)
            {
                ShowAudioDevices();
                Console.Read();
                return;
            }

            // run demo with validated arguments
            RunDemo(
                accessKey,
                contextPath,
                modelPath,
                sensitivity,
                endpointDurationSec,
                requireEndpoint,
                audioDeviceIndex,
                outputPath);
        }

        private static void OnUnhandledException(object sender, UnhandledExceptionEventArgs e)
        {
            Console.WriteLine(e.ExceptionObject.ToString());
            Console.Read();
            Environment.Exit(1);
        }

        private static readonly string HELP_STR = "Available options: \n " +
            "\t--access_key (required): AccessKey obtained from Picovoice Console (https://console.picovoice.ai/)\n" +
            "\t--context_path (required): Absolute path to context file.\n" +
            "\t--model_path: Absolute path to the file containing model parameters.\n" +
            "\t--sensitivity: Inference sensitivity. It should be a number within [0, 1]. A higher sensitivity value results in " +
            "fewer misses at the cost of (potentially) increasing the erroneous inference rate.\n" +
            "\t--endpoint_duration: Endpoint duration in seconds. It should be a positive number within [0.5, 5].\n" +
            "\t--require_endpoint: ['true'|'false'] If set to 'false', Rhino does not require an endpoint (chunk of silence) before finishing inference.\n" +
            "\t--audio_device_index: Index of input audio device.\n" +
            "\t--output_path: Absolute path to recorded audio for debugging.\n" +
            "\t--show_audio_devices: Print available recording devices.\n";
    }
}
