/*
    Copyright 2020-2022 Picovoice Inc.

    You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
    file accompanying this source.

    Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
    an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
    specific language governing permissions and limitations under the License.
*/

using System;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using Microsoft.VisualStudio.TestTools.UnitTesting;

using Pv;

namespace RhinoTest
{
    [TestClass]
    public class MainTest
    {
        private static string ACCESS_KEY;

        [ClassInitialize]
        public static void ClassInitialize(TestContext _)
        {
            ACCESS_KEY = Environment.GetEnvironmentVariable("ACCESS_KEY");
        }

        private static string AppendLanguage(string s, string language) => language == "en" ? s : $"{s}_{language}";

        private static string GetContextPath(string language, string context)
        {
            return Path.Combine(
                _relativeDir,
                "../../../../../../resources",
                AppendLanguage("contexts", language),
                $"{_env}/{context}_{_env}.rhn"
            );
        }

        private static string GetModelPath(string language)
        {
            string file_name = AppendLanguage("rhino_params", language);
            return Path.Combine(
                _relativeDir,
                "../../../../../../lib/common",
                $"{file_name}.pv"
            );
        }

        private void RunTestCase(
            Rhino rhino,
            string audioFileName,
            bool isWithinContext,
            string expectedIntent = null,
            Dictionary<string, string> expectedSlots = null)
        {
            int frameLen = rhino.FrameLength;
            string testAudioPath = Path.Combine(_relativeDir, "resources/audio_samples", audioFileName);
            List<short> data = GetPcmFromFile(testAudioPath, rhino.SampleRate);

            bool isFinalized = false;
            int framecount = (int)Math.Floor((float)(data.Count / frameLen));
            var results = new List<int>();
            for (int i = 0; i < framecount; i++)
            {
                int start = i * rhino.FrameLength;
                int count = rhino.FrameLength;
                List<short> frame = data.GetRange(start, count);
                isFinalized = rhino.Process(frame.ToArray());
                if (isFinalized)
                {
                    break;
                }
            }
            Assert.IsTrue(isFinalized, "Failed to finalize.");

            Inference inference = rhino.GetInference();

            if (isWithinContext)
            {
                Assert.IsTrue(inference.IsUnderstood, "Couldn't understand.");
                Assert.AreEqual(expectedIntent, inference.Intent, "Incorrect intent.");
                Assert.IsTrue(inference.Slots.All((keyValuePair) =>
                                            expectedSlots.ContainsKey(keyValuePair.Key) &&
                                            expectedSlots[keyValuePair.Key] == keyValuePair.Value));
            }
            else
            {
                Assert.IsFalse(inference.IsUnderstood, "Shouldn't be able to understand.");
            }
        }

        [TestMethod]
        public void TestFrameLength()
        {
            using Rhino rhino = InitDefaultRhino();
            Assert.IsTrue(rhino?.FrameLength > 0, "Specified frame length was not a valid number.");
        }

        [TestMethod]
        public void TestVersion()
        {
            using Rhino rhino = InitDefaultRhino();
            Assert.IsFalse(string.IsNullOrWhiteSpace(rhino?.Version), "Rhino did not return a valid version number.");
        }

        [TestMethod]
        public void TestContextInfo()
        {
            using Rhino rhino = InitDefaultRhino();
            Assert.IsFalse(string.IsNullOrWhiteSpace(rhino?.ContextInfo), "Rhino did not return any context information.");
        }

        [TestMethod]
        [DataRow("en", "coffee_maker", "orderBeverage", new string[] {"size", "numberOfShots", "beverage"}, new string[] {"medium", "double shot", "americano"})]
        [DataRow("de", "beleuchtung", "changeState", new string[] {"state"}, new string[] {"aus"})]
        [DataRow("es", "iluminación_inteligente", "changeColor", new string[] {"location", "color"}, new string[] {"habitación", "rosado"})]
        [DataRow("fr", "éclairage_intelligent", "changeColor", new string[] {"color"}, new string[] {"violet"})]
        [DataRow("it", "illuminazione", "spegnereLuce", new string[] {"luogo"}, new string[] {"bagno"})]
        [DataRow("ja", "sumāto_shōmei", "色変更", new string[] {"色"}, new string[] {"青"})]
        [DataRow("ko", "seumateu_jomyeong", "changeColor", new string[] {"color"}, new string[] {"파란색"})]
        [DataRow("pt", "luz_inteligente", "ligueLuz", new string[] {"lugar"}, new string[] {"cozinha"})]
        public void TestWithinContext(
            string language,
            string contextName,
            string expectedIntent,
            string[] slotKeys,
            string[] slotValues)
        {
            using Rhino rhino = Rhino.Create(
                ACCESS_KEY,
                GetContextPath(language, contextName),
                GetModelPath(language)
            );

            Dictionary<string, string> expectedSlots = new Dictionary<string, string>();
            for (int i = 0; i < slotKeys.Length; i++) {
                expectedSlots[slotKeys[i]] = slotValues[i];
            }

            RunTestCase(
                rhino,
                String.Format("{0}.wav", AppendLanguage("test_within_context", language)),
                true,
                expectedIntent,
                expectedSlots
            );
        }

        [TestMethod]
        [DataRow("en", "coffee_maker")]
        [DataRow("de", "beleuchtung")]
        [DataRow("es", "iluminación_inteligente")]
        [DataRow("fr", "éclairage_intelligent")]
        [DataRow("it", "illuminazione")]
        [DataRow("ja", "sumāto_shōmei")]
        [DataRow("ko", "seumateu_jomyeong")]
        [DataRow("pt", "luz_inteligente")]
        public void TestOutOfContext(string language, string contextName)
        {
            using Rhino rhino = Rhino.Create(
                ACCESS_KEY,
                GetContextPath(language, contextName),
                GetModelPath(language)
            );

            Dictionary<string, string> expectedSlots = new Dictionary<string, string>();
            RunTestCase(
                rhino,
                String.Format("{0}.wav", AppendLanguage("test_out_of_context", language)),
                false
            );
        }

        private List<short> GetPcmFromFile(string audioFilePath, int expectedSampleRate)
        {
            List<short> data = new List<short>();
            using (BinaryReader reader = new BinaryReader(File.Open(audioFilePath, FileMode.Open)))
            {
                reader.ReadBytes(24); // skip over part of the header
                Assert.AreEqual(reader.ReadInt32(), expectedSampleRate, "Specified sample rate did not match test file.");
                reader.ReadBytes(16); // skip over the rest of the header

                while (reader.BaseStream.Position != reader.BaseStream.Length)
                {
                    data.Add(reader.ReadInt16());
                }
            }

            return data;
        }

        private static string _relativeDir = Path.GetDirectoryName(Assembly.GetExecutingAssembly().Location);

        private static Architecture _arch => RuntimeInformation.ProcessArchitecture;
        private static string _env => RuntimeInformation.IsOSPlatform(OSPlatform.OSX) ? "mac" :
                                                 RuntimeInformation.IsOSPlatform(OSPlatform.Windows) ? "windows" :
                                                 RuntimeInformation.IsOSPlatform(OSPlatform.Linux) && _arch == Architecture.X64 ? "linux" :
                                                 RuntimeInformation.IsOSPlatform(OSPlatform.Linux) &&
                                                    (_arch == Architecture.Arm || _arch == Architecture.Arm64) ? PvLinuxEnv() : "";

        private Rhino InitDefaultRhino() => Rhino.Create(ACCESS_KEY, Path.Combine(_relativeDir, $"resources/contexts/{_env}/coffee_maker_{_env}.rhn"));

        public static string PvLinuxEnv()
        {
            string cpuInfo = File.ReadAllText("/proc/cpuinfo");
            string[] cpuPartList = cpuInfo.Split('\n').Where(x => x.Contains("CPU part")).ToArray();
            if (cpuPartList.Length == 0)
                throw new PlatformNotSupportedException($"Unsupported CPU.\n{cpuInfo}");

            string cpuPart = cpuPartList[0].Split(' ').Last().ToLower();

            switch (cpuPart)
            {
                case "0xc07":
                case "0xd03":
                case "0xd08": return "raspberry-pi";
                case "0xd07": return "jetson";
                case "0xc08": return "beaglebone";
                default:
                    throw new PlatformNotSupportedException($"This device (CPU part = {cpuPart}) is not supported by Picovoice.");
            }
        }
    }
}
