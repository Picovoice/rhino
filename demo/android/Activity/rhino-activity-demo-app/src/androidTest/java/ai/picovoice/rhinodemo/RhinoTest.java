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

import org.junit.Test;
import org.junit.experimental.runners.Enclosed;
import org.junit.runner.RunWith;
import org.junit.runners.Parameterized;

import java.io.File;
import java.util.Arrays;
import java.util.Collection;
import java.util.HashMap;
import java.util.Map;

import ai.picovoice.rhino.Rhino;
import ai.picovoice.rhino.RhinoException;
import ai.picovoice.rhino.RhinoInference;


@RunWith(Enclosed.class)
public class RhinoTest {

    public static class StandardTests extends BaseTest {

        @Test
        public void testInitSuccessSimple() throws RhinoException {
            File contextPath = new File(testResourcesPath, "context_files/coffee_maker_android.rhn");
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
            File contextPath = new File(testResourcesPath, "context_files/coffee_maker_android.rhn");
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
            File contextPath = new File(testResourcesPath, "context_files/coffee_maker_android.rhn");
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
            File contextPath = new File(testResourcesPath, "context_files/coffee_maker_android.rhn");
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
            File contextPath = new File(testResourcesPath, "context_files/coffee_maker_android.rhn");
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
            File contextPath = new File(testResourcesPath, "context_files/beleuchtung_android.rhn");
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
            File contextPath = new File(testResourcesPath, "context_files/éclairage_intelligent_android.rhn");
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
            File contextPath = new File(testResourcesPath, "context_files/coffee_maker_android.rhn");
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
            File contextPath = new File(testResourcesPath, "context_files/coffee_maker_android.rhn");
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
            File contextPath = new File(testResourcesPath, "context_files/coffee_maker_android.rhn");
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
            File contextPath = new File(testResourcesPath, "context_files/coffee_maker_linux.rhn");
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
            File contextPath = new File(testResourcesPath, "context_files/iluminación_inteligente_android.rhn");
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
        public static Collection<Object[]> initParameters() {
            return Arrays.asList(new Object[][]{
                    {
                            "model_files/rhino_params.pv",
                            "context_files/coffee_maker_android.rhn",
                            "audio_samples/test_within_context.wav",
                            true,
                            "orderBeverage",
                            new HashMap<String, String>() {{
                                put("beverage", "americano");
                                put("numberOfShots", "double shot");
                                put("size", "medium");
                            }}
                    },
                    {
                            "model_files/rhino_params_es.pv",
                            "context_files/iluminación_inteligente_android.rhn",
                            "audio_samples/test_within_context_es.wav",
                            true,
                            "changeColor",
                            new HashMap<String, String>() {{
                                put("location", "habitación");
                                put("color", "rosado");
                            }}
                    },
                    {
                            "model_files/rhino_params_de.pv",
                            "context_files/beleuchtung_android.rhn",
                            "audio_samples/test_within_context_de.wav",
                            true,
                            "changeState",
                            new HashMap<String, String>() {{
                                put("state", "aus");
                            }}
                    },
                    {
                            "model_files/rhino_params_fr.pv",
                            "context_files/éclairage_intelligent_android.rhn",
                            "audio_samples/test_within_context_fr.wav",
                            true,
                            "changeColor",
                            new HashMap<String, String>() {{
                                put("color", "violet");
                            }}
                    },
                    {
                            "model_files/rhino_params_it.pv",
                            "context_files/illuminazione_android.rhn",
                            "audio_samples/test_within_context_it.wav",
                            true,
                            "spegnereLuce",
                            new HashMap<String, String>() {{
                                put("luogo", "bagno");
                            }}
                    },
                    {
                            "model_files/rhino_params_ja.pv",
                            "context_files/sumāto_shōmei_android.rhn",
                            "audio_samples/test_within_context_ja.wav",
                            true,
                            "色変更",
                            new HashMap<String, String>() {{
                                put("色", "青");
                            }}
                    },
                    {
                            "model_files/rhino_params_ko.pv",
                            "context_files/seumateu_jomyeong_android.rhn",
                            "audio_samples/test_within_context_ko.wav",
                            true,
                            "changeColor",
                            new HashMap<String, String>() {{
                                put("color", "파란색");
                            }}
                    },
                    {
                            "model_files/rhino_params_pt.pv",
                            "context_files/luz_inteligente_android.rhn",
                            "audio_samples/test_within_context_pt.wav",
                            true,
                            "ligueLuz",
                            new HashMap<String, String>() {{
                                put("lugar", "cozinha");
                            }}
                    },
            });
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
        public static Collection<Object[]> initParameters() {
            return Arrays.asList(new Object[][]{
                    {
                            "model_files/rhino_params.pv",
                            "context_files/coffee_maker_android.rhn",
                            "audio_samples/test_out_of_context.wav",
                    },
                    {
                            "model_files/rhino_params_es.pv",
                            "context_files/iluminación_inteligente_android.rhn",
                            "audio_samples/test_out_of_context_es.wav",
                    },
                    {
                            "model_files/rhino_params_de.pv",
                            "context_files/beleuchtung_android.rhn",
                            "audio_samples/test_out_of_context_de.wav",
                    },
                    {
                            "model_files/rhino_params_fr.pv",
                            "context_files/éclairage_intelligent_android.rhn",
                            "audio_samples/test_out_of_context_fr.wav",
                    },
                    {
                            "model_files/rhino_params_it.pv",
                            "context_files/illuminazione_android.rhn",
                            "audio_samples/test_out_of_context_it.wav",
                    },
                    {
                            "model_files/rhino_params_ja.pv",
                            "context_files/sumāto_shōmei_android.rhn",
                            "audio_samples/test_out_of_context_ja.wav",
                    },
                    {
                            "model_files/rhino_params_ko.pv",
                            "context_files/seumateu_jomyeong_android.rhn",
                            "audio_samples/test_out_of_context_ko.wav",
                    },
                    {
                            "model_files/rhino_params_pt.pv",
                            "context_files/luz_inteligente_android.rhn",
                            "audio_samples/test_out_of_context_pt.wav",
                    },
            });
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