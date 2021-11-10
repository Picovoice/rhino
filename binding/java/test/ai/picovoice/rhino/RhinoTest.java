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
import java.util.HashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

public class RhinoTest {

    private Rhino rhino;
    private String accessKey = System.getProperty("pvTestingAccessKey");

    @BeforeEach
    void setUp() throws RhinoException {
        rhino = new Rhino.Builder()
                .setAccessKey(accessKey)
                .setContextPath(Utils.getTestContextPath())
                .build();
    }

    @AfterEach
    void tearDown() {
        rhino.delete();
    }

    @Test
    void getVersion() {
        assertTrue(rhino.getVersion() != null && !rhino.getVersion().equals(""));
    }

    @Test
    void getFrameLength() {
        assertTrue(rhino.getFrameLength() > 0);
    }

    @org.junit.jupiter.api.Test
    void getSampleRate() {
        assertTrue(rhino.getSampleRate() > 0);
    }

    @Test
    void testWithinContext() throws IOException, UnsupportedAudioFileException, RhinoException {

        int frameLen = rhino.getFrameLength();
        File testAudioPath = new File("../../resources/audio_samples/test_within_context.wav");

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
        assertTrue(inference.getIsUnderstood());
        assertEquals("orderBeverage", inference.getIntent());

        Map<String, String> expectedSlotValues  = new HashMap<String, String>() {{
            put("size", "medium");
            put("numberOfShots", "double shot");
            put("beverage", "americano");
        }};
        assertEquals(inference.getSlots(), expectedSlotValues);
    }

    @Test
    void testOutOfContext() throws IOException, UnsupportedAudioFileException, RhinoException {

        int frameLen = rhino.getFrameLength();
        File testAudioPath = new File("../../resources/audio_samples/test_out_of_context.wav");

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
        assertFalse(inference.getIsUnderstood());
    }
}