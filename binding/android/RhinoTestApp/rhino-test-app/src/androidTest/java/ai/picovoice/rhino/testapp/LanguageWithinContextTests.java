/*
    Copyright 2022-2024 Picovoice Inc.

    You may not use this file except in compliance with the license. A copy of the license is
    located in the "LICENSE" file accompanying this source.

    Unless required by applicable law or agreed to in writing, software distributed under the
    License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
    express or implied. See the License for the specific language governing permissions and
    limitations under the License.
*/

package ai.picovoice.rhino.testapp;

import static org.junit.Assert.assertEquals;

import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;

import org.junit.Test;
import org.junit.runner.RunWith;
import org.junit.runners.Parameterized;

import java.io.File;
import java.io.IOException;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

import ai.picovoice.rhino.Rhino;
import ai.picovoice.rhino.RhinoInference;

@RunWith(Parameterized.class)
public class LanguageWithinContextTests extends BaseTest {

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

            String modelFile = String.format("rhino_params_%s.pv", language);
            String contextFile = String.format("%s/%s_android.rhn", language, contextName);
            String audioFile = String.format("test_within_context_%s.wav", language);

            String intent = inferenceJson.get("intent").getAsString();
            HashMap<String, String> slots = new HashMap<String, String>();
            for (Map.Entry<String, JsonElement> entry : inferenceJson.getAsJsonObject("slots").asMap().entrySet()) {
                slots.put(entry.getKey(), entry.getValue().getAsString());
            }

            if (Objects.equals(language, "en")) {
                modelFile = "rhino_params.pv";
                audioFile = "test_within_context.wav";
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

        String modelPath = getModelFilepath(modelFile);
        String contextPath = getContextFilepath(contextFile);

        Rhino r = new Rhino.Builder()
                .setAccessKey(accessKey)
                .setModelPath(modelPath)
                .setContextPath(contextPath)
                .build(appContext);

        File testAudio = new File(getAudioFilepath(testAudioFile));

        RhinoInference inference = processTestAudio(r, testAudio);
        assertEquals(expectedIsUnderstood, inference.getIsUnderstood());
        assertEquals(expectedIntent, inference.getIntent());

        Map<String, String> slots = inference.getSlots();
        assertEquals(expectedSlots, slots);
        r.delete();
    }
}
