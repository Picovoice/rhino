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

import static org.junit.Assert.assertFalse;

import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;

import org.junit.Test;
import org.junit.runner.RunWith;
import org.junit.runners.Parameterized;

import java.io.File;
import java.io.IOException;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Objects;

import ai.picovoice.rhino.Rhino;
import ai.picovoice.rhino.RhinoInference;

@RunWith(Parameterized.class)
public class LanguageOutOfContextTests extends BaseTest {

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

            String modelFile = String.format("rhino_params_%s.pv", language);
            String contextFile = String.format("%s/%s_android.rhn", language, contextName);
            String audioFile = String.format("test_out_of_context_%s.wav", language);

            if (Objects.equals(language, "en")) {
                modelFile = "rhino_params.pv";
                audioFile = "test_out_of_context.wav";
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

        String modelPath = getModelFilepath(modelFile);
        String contextPath = getContextFilepath(contextFile);

        Rhino r = new Rhino.Builder()
                .setAccessKey(accessKey)
                .setModelPath(modelPath)
                .setDevice(device)
                .setContextPath(contextPath)
                .build(appContext);

        File testAudio = new File(getAudioFilepath(testAudioFile));

        RhinoInference inference = processTestAudio(r, testAudio);
        assertFalse(inference.getIsUnderstood());
        r.delete();
    }
}
