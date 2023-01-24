using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Runtime.InteropServices;

using NUnit.Framework;

using Newtonsoft.Json;

using UnityEngine;
using UnityEngine.TestTools;

#if !UNITY_EDITOR && UNITY_ANDROID

using UnityEngine.Networking;

#endif

using Pv.Unity;

namespace Tests
{
    [Serializable]
    public class TestData
    {
      public Tests tests;
    }

    [Serializable]
    public class Tests
    {
      public WithinContextTest[] within_context;
      public OutOfContextTest[] out_of_context;
    }

    [Serializable]
    public class WithinContextTest
    {
      public string language;
      public string context_name;
      public TestDataInference inference;
    }

    [Serializable]
    public class TestDataInference
    {
      public string intent;
      public Dictionary<string, string> slots;
    }

    [Serializable]
    public class OutOfContextTest
    {
      public string language;
      public string context_name;
    }

    public class Integration
    {
        private static string ACCESS_KEY = "{TESTING_ACCESS_KEY_HERE}";
        private Rhino rhino;

#if !UNITY_EDITOR && UNITY_ANDROID

        private static string _env = "android";

#elif !UNITY_EDITOR && UNITY_IOS

        private static string _env = "ios";

#elif UNITY_STANDALONE_LINUX || UNITY_EDITOR_LINUX

        private static string _env = "linux";

#elif UNITY_STANDALONE_OSX || UNITY_EDITOR_OSX

        private static string _env = "mac";

#elif UNITY_STANDALONE_WIN || UNITY_EDITOR_WIN

        private static string _env = "windows";

#else

#error

#endif

        public static string ExtractResource(string filePath)
        {

#if !UNITY_EDITOR && UNITY_ANDROID

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

#else

            return filePath;

#endif
        }

        private static TestData LoadJsonTestData() {
            string dataAsJson = File.ReadAllText(ExtractResource(Path.Combine(Application.streamingAssetsPath, "test/test_data.json")));
            return JsonConvert.DeserializeObject<TestData>(dataAsJson);
        }

        static WithinContextTest[] WithinTestData()
        {
            TestData testData = LoadJsonTestData();
            return testData.tests.within_context;
        }

        static OutOfContextTest[] OutOfTestData()
        {
            TestData testData = LoadJsonTestData();
            return testData.tests.out_of_context;
        }

        private List<short> GetPcmFromFile(string audioFilePath, int expectedSampleRate)
        {
            List<short> data = new List<short>();
            using (BinaryReader reader = new BinaryReader(File.OpenRead(audioFilePath)))
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

        private static string AppendLanguage(string s, string language)
        {
            if (language == "en")
            {
                return s;
            }
            return $"{s}_{language}";
        }

        private static string GetContextPath(string language, string contextName)
        {
            string filepath = Path.Combine(
                Application.streamingAssetsPath,
                "test",
                AppendLanguage("context_files", language),
                $"{_env}/{contextName}_{_env}.rhn"
            );
            return ExtractResource(filepath);
        }

        private static string GetModelPath(string language)
        {
            string filename = AppendLanguage("rhino_params", language);
            string filepath = Path.Combine(
                Application.streamingAssetsPath,
                "test",
                "model_files",
                $"{filename}.pv"
            );
            return ExtractResource(filepath);
        }

        private void RunTestCase(
            string audioFileName,
            bool isWithinContext,
            string expectedIntent = null,
            Dictionary<string, string> expectedSlots = null)
        {
            int frameLen = rhino.FrameLength;
            string testAudioPath = ExtractResource(Path.Combine(Application.streamingAssetsPath, "test/audio_samples", audioFileName));
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

            rhino.Dispose();
        }

        [Test]
        public void WithinContext([ValueSource("WithinTestData")] WithinContextTest testCase)
        {
            rhino = Rhino.Create(
                ACCESS_KEY,
                GetContextPath(testCase.language, testCase.context_name),
                GetModelPath(testCase.language)
            );

            RunTestCase(
                String.Format("{0}.wav", AppendLanguage("test_within_context", testCase.language)),
                true,
                testCase.inference.intent,
                testCase.inference.slots
            );
        }

        [Test]
        public void OutOfContext([ValueSource("OutOfTestData")] OutOfContextTest testCase)
        {
            rhino = Rhino.Create(
                ACCESS_KEY,
                GetContextPath(testCase.language, testCase.context_name),
                GetModelPath(testCase.language)
            );

            RunTestCase(
                String.Format("{0}.wav", AppendLanguage("test_out_of_context", testCase.language)),
                false
            );
        }
    }
}
