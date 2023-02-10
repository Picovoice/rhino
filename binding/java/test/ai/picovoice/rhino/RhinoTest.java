/*
    Copyright 2018-2023 Picovoice Inc.

    You may not use this file except in compliance with the license. A copy of the license is
    located in the "LICENSE" file accompanying this source.

    Unless required by applicable law or agreed to in writing, software distributed under the
    License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
    express or implied. See the License for the specific language governing permissions and
    limitations under the License.
*/

package ai.picovoice.rhino;

import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

import java.io.File;
import java.io.IOException;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Map;
import java.util.stream.Stream;
import javax.sound.sampled.AudioInputStream;
import javax.sound.sampled.AudioSystem;
import javax.sound.sampled.UnsupportedAudioFileException;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

public class RhinoTest {

    private final String accessKey = System.getProperty("pvTestingAccessKey");
    private Rhino rhino;

    private static Stream<Arguments> withinContextProvider() throws IOException {
        final JsonObject testDataJson = RhinoTestUtils.loadTestData();
        final JsonArray withinContextData = testDataJson
                .getAsJsonObject("tests")
                .getAsJsonArray("within_context");

        final ArrayList<Arguments> testArgs = new ArrayList<>();
        for (int i = 0; i < withinContextData.size(); i++) {
            final JsonObject testData = withinContextData.get(i).getAsJsonObject();
            final String language = testData.get("language").getAsString();
            final String context = testData.get("context_name").getAsString();
            final String intent = testData.getAsJsonObject("inference").get("intent").getAsString();
            HashMap<String, String> expectedSlotValues = new HashMap<String, String>();
            for (Map.Entry<String, JsonElement> entry : testData.getAsJsonObject("inference").getAsJsonObject("slots").asMap().entrySet()) {
                expectedSlotValues.put(entry.getKey(), entry.getValue().getAsString());
            }
            final String audioFileName = RhinoTestUtils.appendLanguage("test_within_context", language) + ".wav";
            testArgs.add(Arguments.of(
                    language,
                    context,
                    audioFileName,
                    intent,
                    expectedSlotValues)
            );
        }
        return testArgs.stream();
    }

    private static Stream<Arguments> outOfContextProvider() throws IOException {
        final JsonObject testDataJson = RhinoTestUtils.loadTestData();
        final JsonArray outOfContextData = testDataJson
                .getAsJsonObject("tests")
                .getAsJsonArray("out_of_context");

        final ArrayList<Arguments> testArgs = new ArrayList<>();
        for (int i = 0; i < outOfContextData.size(); i++) {
            final JsonObject testData = outOfContextData.get(i).getAsJsonObject();
            final String language = testData.get("language").getAsString();
            final String context = testData.get("context_name").getAsString();
            final String audioFileName = RhinoTestUtils.appendLanguage("test_out_of_context", language) + ".wav";
            testArgs.add(Arguments.of(
                    language,
                    context,
                    audioFileName)
            );
        }
        return testArgs.stream();
    }

    @AfterEach
    void tearDown() {
        rhino.delete();
    }

    @Test
    void getVersion() throws RhinoException {
        rhino = new Rhino.Builder()
                .setAccessKey(accessKey)
                .setContextPath(RhinoTestUtils.getTestContextPath("en", "coffee_maker"))
                .build();
        assertTrue(rhino.getVersion() != null && !rhino.getVersion().equals(""));
    }

    @Test
    void getFrameLength() throws RhinoException {
        rhino = new Rhino.Builder()
                .setAccessKey(accessKey)
                .setContextPath(RhinoTestUtils.getTestContextPath("en", "coffee_maker"))
                .build();
        assertTrue(rhino.getFrameLength() > 0);
    }

    @org.junit.jupiter.api.Test
    void getSampleRate() throws RhinoException {
        rhino = new Rhino.Builder()
                .setAccessKey(accessKey)
                .setContextPath(RhinoTestUtils.getTestContextPath("en", "coffee_maker"))
                .build();
        assertTrue(rhino.getSampleRate() > 0);
    }

    void runTestCase(String audioFileName, boolean isWithinContext, String expectedIntent, Map<String, String> expectedSlots) throws IOException, UnsupportedAudioFileException, RhinoException {
        int frameLen = rhino.getFrameLength();
        String audioFilePath = RhinoTestUtils.getAudioFilePath(audioFileName);
        File testAudioPath = new File(audioFilePath);

        AudioInputStream audioInputStream = AudioSystem.getAudioInputStream(testAudioPath);
        assertEquals(audioInputStream.getFormat().getFrameRate(), 16000);

        int byteDepth = audioInputStream.getFormat().getFrameSize();
        byte[] pcm = new byte[frameLen * byteDepth];
        short[] rhinoFrame = new short[frameLen];

        int numBytesRead = 0;
        boolean isFinalized = false;
        while ((numBytesRead = audioInputStream.read(pcm)) != -1) {
            if (numBytesRead / byteDepth == frameLen) {

                ByteBuffer.wrap(pcm).order(ByteOrder.LITTLE_ENDIAN).asShortBuffer().get(rhinoFrame);
                isFinalized = rhino.process(rhinoFrame);
                if (isFinalized) {
                    break;
                }
            }
        }
        assertTrue(isFinalized);

        RhinoInference inference = rhino.getInference();
        assertEquals(inference.getIsUnderstood(), isWithinContext);

        if (isWithinContext) {
            assertEquals(inference.getIntent(), expectedIntent);
            assertEquals(inference.getSlots(), expectedSlots);
        }
    }

    @ParameterizedTest(name = "testWithinContext for ''{0}''")
    @MethodSource("withinContextProvider")
    void testWithinContext(String language, String context, String audioFileName, String intent, Map<String, String> expectedSlotValues) throws IOException, UnsupportedAudioFileException, RhinoException {
        rhino = new Rhino.Builder()
                .setAccessKey(accessKey)
                .setContextPath(RhinoTestUtils.getTestContextPath(language, context))
                .setModelPath(RhinoTestUtils.getTestModelPath(language))
                .build();

        runTestCase(
                audioFileName,
                true,
                intent,
                expectedSlotValues
        );
    }

    @ParameterizedTest(name = "testOutOfContext for ''{0}''")
    @MethodSource("outOfContextProvider")
    void testOutOfContext(String language, String context, String audioFileName) throws IOException, UnsupportedAudioFileException, RhinoException {
        rhino = new Rhino.Builder()
                .setAccessKey(accessKey)
                .setContextPath(RhinoTestUtils.getTestContextPath(language, context))
                .setModelPath(RhinoTestUtils.getTestModelPath(language))
                .build();

        runTestCase(
                audioFileName,
                false,
                null,
                null
        );
    }
}
