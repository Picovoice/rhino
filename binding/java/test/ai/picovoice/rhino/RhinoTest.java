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
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import javax.sound.sampled.AudioInputStream;
import javax.sound.sampled.AudioSystem;
import javax.sound.sampled.UnsupportedAudioFileException;
import java.io.File;
import java.io.IOException;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.HashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

public class RhinoTest {

    private Rhino rhino;
    private String accessKey = System.getProperty("pvTestingAccessKey");

    private static String append_language(String s, String language) {
        if (language == "en")
            return s;
        return s + "_" + language;
    }    

    private static String getContextPath(String language, String context) {
        return Paths.get(System.getProperty("user.dir"))
            .resolve("../../resources")
            .resolve(append_language("contexts", language))
            .resolve(Utils.ENVIRONMENT_NAME)
            .resolve(context + "_" + Utils.ENVIRONMENT_NAME + ".rhn")
            .toString();
    }

    private static String getModelPath(String language) {
        return Paths.get(System.getProperty("user.dir"))
            .resolve("../../lib/common")
            .resolve(append_language("rhino_params", language)+".pv")
            .toString();
    }    

    private static String getAudioFilePath(String auadioFileName) {
        return Paths.get(System.getProperty("user.dir"))
            .resolve("../../resources/audio_samples")
            .resolve(auadioFileName)
            .toString();
    }

    private void buildRhinoWrapper(String language, String context) throws RhinoException{
        rhino = new Rhino(
                accessKey,
                Utils.getPackagedLibraryPath(),
                getModelPath(language),
                getContextPath(language, context),
                0.5f,
                false);
    }    

    private void buildDefaultTestRhino() throws RhinoException {
        rhino = new Rhino.Builder()
                .setAccessKey(accessKey)
                .setContextPath(getContextPath("en", "coffee_maker"))
                .build();
    }

    @AfterEach
    void tearDown() {
        rhino.delete();
    }

    @Test
    void getVersion() throws RhinoException{
        buildDefaultTestRhino();
        assertTrue(rhino.getVersion() != null && !rhino.getVersion().equals(""));
    }

    @Test
    void getFrameLength() throws RhinoException{
        buildDefaultTestRhino();
        assertTrue(rhino.getFrameLength() > 0);
    }

    @org.junit.jupiter.api.Test
    void getSampleRate() throws RhinoException{
        buildDefaultTestRhino();
        assertTrue(rhino.getSampleRate() > 0);
    }
    void runProcess(String audioFileName, boolean isWithinContext, String expectedIntent, Map<String, String> expectedSlots) throws IOException, UnsupportedAudioFileException, RhinoException {
        int frameLen = rhino.getFrameLength();
        String audioFilePath = getAudioFilePath(audioFileName);
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

        if(isWithinContext) {
            assertEquals(inference.getIntent(), expectedIntent);
            assertEquals(inference.getSlots(), expectedSlots);
        }
    }

    @Test
    void testWithinContext() throws IOException, UnsupportedAudioFileException, RhinoException {
        buildDefaultTestRhino();

        Map<String, String> expectedSlotValues  = new HashMap<String, String>() {{
            put("size", "medium");
            put("numberOfShots", "double shot");
            put("beverage", "americano");
        }};

        runProcess(
            "test_within_context.wav",
            true,
            "orderBeverage",
            expectedSlotValues
        );
    }

    @Test
    void testOutOfContext() throws IOException, UnsupportedAudioFileException, RhinoException {
        buildDefaultTestRhino();

        runProcess(
            "test_out_of_context.wav",
            false,
            null,
            null
        );
    }

    @Test
    void testWithinContextDe() throws IOException, UnsupportedAudioFileException, RhinoException {
        buildRhinoWrapper("de", "beleuchtung");

        Map<String, String> expectedSlotValues  = new HashMap<String, String>() {{
            put("state", "aus");
        }};

        runProcess(
            "test_within_context_de.wav",
            true,
            "changeState",
            expectedSlotValues
        );
    }    

    @Test
    void testOutOfContextDe() throws IOException, UnsupportedAudioFileException, RhinoException {
        buildRhinoWrapper("de", "beleuchtung");

        runProcess(
            "test_out_of_context_de.wav",
            false,
            null,
            null
        );
    }

    // @Test
    // void testWithinContextEs() throws IOException, UnsupportedAudioFileException, RhinoException {
    //     buildRhinoWrapper("es", "luz");

    //     Map<String, String> expectedSlotValues  = new HashMap<String, String>() {{
    //         put("location", "habitación");
    //         put("color", "rosado");            
    //     }};

    //     runProcess(
    //         "test_within_context_es.wav",
    //         true,
    //         "changeColor",
    //         expectedSlotValues
    //     );
    // }    

    @Test
    void testOutOfContextEs() throws IOException, UnsupportedAudioFileException, RhinoException {
        buildRhinoWrapper("es", "luz");

        runProcess(
            "test_out_of_context_es.wav",
            false,
            null,
            null
        );
    }     
}