/*
    Copyright 2018-2021 Picovoice Inc.

    You may not use this file except in compliance with the license. A copy of the license is
    located in the "LICENSE" file accompanying this source.

    Unless required by applicable law or agreed to in writing, software distributed under the
    License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
    express or implied. See the License for the specific language governing permissions and
    limitations under the License.
*/

package ai.picovoice.rhino;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

import java.io.File;
import java.io.IOException;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
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

    private static Stream<Arguments> withinContextProvider() {
        return Stream.of(
                Arguments.of("en", "coffee_maker", "test_within_context.wav", "orderBeverage", new HashMap<String, String>() {{
                    put("size", "medium");
                    put("numberOfShots", "double shot");
                    put("beverage", "americano");
                }}),
                Arguments.of("de", "beleuchtung", "test_within_context_de.wav", "changeState", new HashMap<String, String>() {{
                    put("state", "aus");
                }}),
                Arguments.of("es", "iluminación_inteligente", "test_within_context_es.wav", "changeColor", new HashMap<String, String>() {{
                    put("location", "habitación");
                    put("color", "rosado");
                }}),
                Arguments.of("fr", "éclairage_intelligent", "test_within_context_fr.wav", "changeColor", new HashMap<String, String>() {{
                    put("color", "violet");
                }}),
                Arguments.of("it", "illuminazione", "test_within_context_it.wav", "spegnereLuce", new HashMap<String, String>() {{
                    put("luogo", "bagno");
                }}),
                Arguments.of("ja", "sumāto_shōmei", "test_within_context_ja.wav", "色変更", new HashMap<String, String>() {{
                    put("色", "青");
                }}),
                Arguments.of("ko", "seumateu_jomyeong", "test_within_context_ko.wav", "changeColor", new HashMap<String, String>() {{
                    put("color", "파란색");
                }}),
                Arguments.of("pt", "luz_inteligente", "test_within_context_pt.wav", "ligueLuz", new HashMap<String, String>() {{
                    put("lugar", "cozinha");
                }})
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

    private static Stream<Arguments> outOfContextProvider() {
        return Stream.of(
                Arguments.of("en", "coffee_maker", "test_out_of_context.wav"),
                Arguments.of("de", "beleuchtung", "test_out_of_context_de.wav"),
                Arguments.of("es", "iluminación_inteligente", "test_out_of_context_es.wav"),
                Arguments.of("fr", "éclairage_intelligent", "test_out_of_context_fr.wav"),
                Arguments.of("it", "illuminazione", "test_out_of_context_it.wav"),
                Arguments.of("ja", "sumāto_shōmei", "test_out_of_context_ja.wav"),
                Arguments.of("ko", "seumateu_jomyeong", "test_out_of_context_ko.wav"),
                Arguments.of("pt", "luz_inteligente", "test_out_of_context_pt.wav")
        );
    }
}
