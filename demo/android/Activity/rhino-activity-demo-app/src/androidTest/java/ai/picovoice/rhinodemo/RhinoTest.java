/*
    Copyright 2022 Picovoice Inc.

    You may not use this file except in compliance with the license. A copy of the license is
    located in the "LICENSE" file accompanying this source.

    Unless required by applicable law or agreed to in writing, software distributed under the
    License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
    express or implied. See the License for the specific language governing permissions and
    limitations under the License.
*/

package ai.picovoice.rhinodemo;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;

import org.junit.Test;
import org.junit.experimental.runners.Enclosed;
import org.junit.runner.RunWith;
import org.junit.runners.Parameterized;

import java.io.File;
import java.io.IOException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

import ai.picovoice.rhino.Rhino;
import ai.picovoice.rhino.RhinoException;
import ai.picovoice.rhino.RhinoInference;


@RunWith(Enclosed.class)
public class RhinoTest {

    public static class StandardTests extends BaseTest {

        @Test
        public void testInitSuccessSimple() throws RhinoException {
            File contextPath = new File(testResourcesPath, "context_files/en/coffee_maker_android.rhn");
            Rhino r = new Rhino.Builder()
                    .setAccessKey(accessKey)
                    .setContextPath(contextPath.getAbsolutePath())
                    .build(appContext);

            assertTrue(r.getVersion() != null && !r.getVersion().equals(""));
            assertTrue(r.getFrameLength() > 0);
            assertTrue(r.getSampleRate() > 0);
            assertTrue(r.getContextInformation() != null && !r.getContextInformation().equals(""));

            r.delete();
        }

        @Test
        public void testInitSuccessWithCustomModelPath() throws RhinoException {
            File contextPath = new File(testResourcesPath, "context_files/en/coffee_maker_android.rhn");
            File modelPath = new File(testResourcesPath, "model_files/rhino_params.pv");
            Rhino r = new Rhino.Builder()
                    .setAccessKey(accessKey)
                    .setContextPath(contextPath.getAbsolutePath())
                    .setModelPath(modelPath.getAbsolutePath())
                    .build(appContext);

            assertTrue(r.getContextInformation() != null && !r.getContextInformation().equals(""));
            r.delete();
        }

        @Test
        public void testInitSuccessWithCustomSensitivity() throws RhinoException {
            File contextPath = new File(testResourcesPath, "context_files/en/coffee_maker_android.rhn");
            Rhino r = new Rhino.Builder()
                    .setAccessKey(accessKey)
                    .setContextPath(contextPath.getAbsolutePath())
                    .setSensitivity(0.7f)
                    .build(appContext);

            assertTrue(r.getContextInformation() != null && !r.getContextInformation().equals(""));
            r.delete();
        }

        @Test
        public void testInitSuccessWithCustomEndpointDurationSec() throws RhinoException {
            File contextPath = new File(testResourcesPath, "context_files/en/coffee_maker_android.rhn");
            Rhino r = new Rhino.Builder()
                    .setAccessKey(accessKey)
                    .setContextPath(contextPath.getAbsolutePath())
                    .setEndpointDurationSec(3.0f)
                    .build(appContext);

            assertTrue(r.getContextInformation() != null && !r.getContextInformation().equals(""));
            r.delete();
        }

        @Test
        public void testInitSuccessWithRequireEndpointFalse() throws RhinoException {
            File contextPath = new File(testResourcesPath, "context_files/en/coffee_maker_android.rhn");
            Rhino r = new Rhino.Builder()
                    .setAccessKey(accessKey)
                    .setContextPath(contextPath.getAbsolutePath())
                    .setRequireEndpoint(false)
                    .build(appContext);

            assertTrue(r.getContextInformation() != null && !r.getContextInformation().equals(""));
            r.delete();
        }

        @Test
        public void testInitFailWithMismatchedLanguage() {
            boolean didFail = false;
            File contextPath = new File(testResourcesPath, "context_files/de/beleuchtung_android.rhn");
            File modelPath = new File(testResourcesPath, "model_files/rhino_params.pv");
            try {
                new Rhino.Builder()
                        .setAccessKey(accessKey)
                        .setContextPath(contextPath.getAbsolutePath())
                        .setModelPath(modelPath.getAbsolutePath())
                        .build(appContext);
            } catch (RhinoException e) {
                didFail = true;
            }

            assertTrue(didFail);
        }

        @Test
        public void testInitFailWithNoAccessKey() {
            boolean didFail = false;
            File contextPath = new File(testResourcesPath, "context_files/fr/éclairage_intelligent_android.rhn");
            try {
                new Rhino.Builder()
                        .setContextPath(contextPath.getAbsolutePath())
                        .build(appContext);
            } catch (RhinoException e) {
                didFail = true;
            }

            assertTrue(didFail);
        }

        @Test
        public void testInitFailWithNoContext() {
            boolean didFail = false;
            try {
                new Rhino.Builder()
                        .setAccessKey(accessKey)
                        .build(appContext);
            } catch (RhinoException e) {
                didFail = true;
            }

            assertTrue(didFail);
        }

        @Test
        public void testInitFailWithInvalidContextPath() {
            boolean didFail = false;
            File contextPath = new File(testResourcesPath, "bad_path/bad_path.rhn");
            try {
                new Rhino.Builder()
                        .setAccessKey(accessKey)
                        .setContextPath(contextPath.getAbsolutePath())
                        .build(appContext);
            } catch (RhinoException e) {
                didFail = true;
            }

            assertTrue(didFail);
        }

        @Test
        public void testInitFailWithInvalidModelPath() {
            boolean didFail = false;
            File contextPath = new File(testResourcesPath, "context_files/en/coffee_maker_android.rhn");
            File modelPath = new File(testResourcesPath, "bad_path/bad_path.pv");
            try {
                new Rhino.Builder()
                        .setAccessKey(accessKey)
                        .setContextPath(contextPath.getAbsolutePath())
                        .setModelPath(modelPath.getAbsolutePath())
                        .build(appContext);
            } catch (RhinoException e) {
                didFail = true;
            }

            assertTrue(didFail);
        }

        @Test
        public void testInitFailWithInvalidSensitivity() {
            boolean didFail = false;
            File contextPath = new File(testResourcesPath, "context_files/en/coffee_maker_android.rhn");
            try {
                new Rhino.Builder()
                        .setAccessKey(accessKey)
                        .setContextPath(contextPath.getAbsolutePath())
                        .setSensitivity(10)
                        .build(appContext);
            } catch (RhinoException e) {
                didFail = true;
            }

            assertTrue(didFail);
        }

        @Test
        public void testInitFailWithInvalidEndpointDurationSec() {
            boolean didFail = false;
            File contextPath = new File(testResourcesPath, "context_files/en/coffee_maker_android.rhn");
            try {
                new Rhino.Builder()
                        .setAccessKey(accessKey)
                        .setContextPath(contextPath.getAbsolutePath())
                        .setEndpointDurationSec(10.0f)
                        .build(appContext);
            } catch (RhinoException e) {
                didFail = true;
            }

            assertTrue(didFail);
        }

        @Test
        public void testInitFailWithWrongPlatform() {
            boolean didFail = false;
            File contextPath = new File(testResourcesPath, "context_files/en/coffee_maker_linux.rhn");
            try {
                new Rhino.Builder()
                        .setAccessKey(accessKey)
                        .setContextPath(contextPath.getAbsolutePath())
                        .build(appContext);
            } catch (RhinoException e) {
                didFail = true;
            }

            assertTrue(didFail);
        }


        @Test
        public void testInitWithNonAsciiModelName() throws RhinoException {
            File contextPath = new File(testResourcesPath, "context_files/es/iluminación_inteligente_android.rhn");
            File modelPath = new File(testResourcesPath, "model_files/rhino_params_es.pv");
            Rhino r = new Rhino.Builder()
                    .setAccessKey(accessKey)
                    .setContextPath(contextPath.getAbsolutePath())
                    .setModelPath(modelPath.getAbsolutePath())
                    .build(appContext);

            assertTrue(r.getContextInformation() != null && !r.getContextInformation().equals(""));
            r.delete();
        }
    }

    @RunWith(Parameterized.class)
    public static class LanguageWithinContextTests extends BaseTest {

        @Parameterized.Parameter(value = 0)
        public String modelFile;

        @Parameterized.Parameter(value = 1)
        public String contextFile;

        @Parameterized.Parameter(value = 2)
        public String testAudioFile;

        @Parameterized.Parameter(value = 3)
        public boolean expectedIsUnderstood;

        @Parameterized.Parameter(value = 4)
        public String expectedIntent;

        @Parameterized.Parameter(value = 5)
        public Map<String, String> expectedSlots;

        @Parameterized.Parameters(name = "{2}")
        public static Collection<Object[]> initParameters() throws IOException {
            String testDataJsonString = getTestDataString();

            JsonObject testDataJson = JsonParser.parseString(testDataJsonString).getAsJsonObject();
            JsonArray withinContextDataJson = testDataJson.getAsJsonObject("tests").getAsJsonArray("within_context");

            List<Object[]> parameters = new ArrayList<>();
            for (int i = 0; i < withinContextDataJson.size(); i++) {
                JsonObject testData = withinContextDataJson.get(i).getAsJsonObject();
                String language = testData.get("language").getAsString();
                String contextName = testData.get("context_name").getAsString();
                JsonObject inferenceJson = testData.getAsJsonObject("inference");

                String modelFile = String.format("model_files/rhino_params_%s.pv", language);
                String contextFile = String.format("context_files/%s/%s_android.rhn", language, contextName);
                String audioFile = String.format("audio_samples/test_within_context_%s.wav", language);

                String intent = inferenceJson.get("intent").getAsString();
                HashMap<String, String> slots = new HashMap<String, String>();
                for (Map.Entry<String, JsonElement> entry : inferenceJson.getAsJsonObject("slots").asMap().entrySet()) {
                    slots.put(entry.getKey(), entry.getValue().getAsString());
                }

                if (Objects.equals(language, "en")) {
                    modelFile = "model_files/rhino_params.pv";
                    audioFile = "audio_samples/test_within_context.wav";
                }

                parameters.add(new Object[] {
                        modelFile,
                        contextFile,
                        audioFile,
                        true,
                        intent,
                        slots,
                });
            }

            return parameters;
        }

        @Test
        public void testWithinContext() throws Exception {

            String modelPath = new File(testResourcesPath, modelFile).getAbsolutePath();
            String contextPath = new File(testResourcesPath, contextFile).getAbsolutePath();

            Rhino r = new Rhino.Builder()
                    .setAccessKey(accessKey)
                    .setModelPath(modelPath)
                    .setContextPath(contextPath)
                    .build(appContext);

            File testAudio = new File(testResourcesPath, testAudioFile);

            RhinoInference inference = processTestAudio(r, testAudio);
            assertEquals(expectedIsUnderstood, inference.getIsUnderstood());
            assertEquals(expectedIntent, inference.getIntent());

            Map<String, String> slots = inference.getSlots();
            assertEquals(expectedSlots, slots);
            r.delete();
        }
    }

    @RunWith(Parameterized.class)
    public static class LanguageOutOfContextTests extends BaseTest {

        @Parameterized.Parameter(value = 0)
        public String modelFile;

        @Parameterized.Parameter(value = 1)
        public String contextFile;

        @Parameterized.Parameter(value = 2)
        public String testAudioFile;

        @Parameterized.Parameters(name = "{2}")
        public static Collection<Object[]> initParameters() throws IOException {
            String testDataJsonString = getTestDataString();

            JsonObject testDataJson = JsonParser.parseString(testDataJsonString).getAsJsonObject();
            JsonArray outOfContextDataJson = testDataJson.getAsJsonObject("tests").getAsJsonArray("out_of_context");

            List<Object[]> parameters = new ArrayList<>();
            for (int i = 0; i < outOfContextDataJson.size(); i++) {
                JsonObject testData = outOfContextDataJson.get(i).getAsJsonObject();
                String language = testData.get("language").getAsString();
                String contextName = testData.get("context_name").getAsString();

                String modelFile = String.format("model_files/rhino_params_%s.pv", language);
                String contextFile = String.format("context_files/%s/%s_android.rhn", language, contextName);
                String audioFile = String.format("audio_samples/test_out_of_context_%s.wav", language);

                if (Objects.equals(language, "en")) {
                    modelFile = "model_files/rhino_params.pv";
                    audioFile = "audio_samples/test_out_of_context.wav";
                }

                parameters.add(new Object[] {
                        modelFile,
                        contextFile,
                        audioFile,
                });
            }

            return parameters;
        }

        @Test
        public void testOutOfContext() throws Exception {

            String modelPath = new File(testResourcesPath, modelFile).getAbsolutePath();
            String contextPath = new File(testResourcesPath, contextFile).getAbsolutePath();

            Rhino r = new Rhino.Builder()
                    .setAccessKey(accessKey)
                    .setModelPath(modelPath)
                    .setContextPath(contextPath)
                    .build(appContext);

            File testAudio = new File(testResourcesPath, testAudioFile);

            RhinoInference inference = processTestAudio(r, testAudio);
            assertFalse(inference.getIsUnderstood());
            r.delete();
        }
    }
}
