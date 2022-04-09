/*
    Copyright 2022 Picovoice Inc.

    You may not use this file except in compliance with the license. A copy of the license is
    located in the "LICENSE" file accompanying this source.

    Unless required by applicable law or agreed to in writing, software distributed under the
    License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
    express or implied. See the License for the specific language governing permissions and
    limitations under the License.
*/

package ai.picovoice.rhino;

import org.junit.jupiter.api.Test;

import javax.sound.sampled.AudioInputStream;
import javax.sound.sampled.AudioSystem;
import java.io.File;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.util.Arrays;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

public class RhinoPerformanceTest {

    private final String accessKey = System.getProperty("pvTestingAccessKey");
    private final int numTestIterations = Integer.parseInt(System.getProperty("numTestIterations"));
    private final double performanceThresholdSec = Double.parseDouble(System.getProperty("performanceThresholdSec"));

    @Test
    void testPerformance() throws Exception {
        Rhino rhino = new Rhino.Builder()
                .setAccessKey(accessKey)
                .setContextPath(RhinoTestUtils.getTestContextPath("en", "coffee_maker"))
                .build();

        int frameLen = rhino.getFrameLength();
        String audioFilePath = RhinoTestUtils.getAudioFilePath("test_within_context.wav");
        File testAudioPath = new File(audioFilePath);

        short[] rhinoFrame = new short[frameLen];
        long[] perfResults = new long[numTestIterations];
        for (int i = 0; i < numTestIterations; i++) {
            AudioInputStream audioInputStream = AudioSystem.getAudioInputStream(testAudioPath);
            int byteDepth = audioInputStream.getFormat().getFrameSize();
            byte[] pcm = new byte[frameLen * byteDepth];

            long totalNSec = 0;
            int numBytesRead;
            while ((numBytesRead = audioInputStream.read(pcm)) != -1) {
                if (numBytesRead / byteDepth == frameLen) {
                    ByteBuffer.wrap(pcm).order(ByteOrder.LITTLE_ENDIAN).asShortBuffer().get(rhinoFrame);
                    long before = System.nanoTime();
                    rhino.process(rhinoFrame);
                    totalNSec += (System.nanoTime() - before);
                }
            }

            if (i > 0) {
                perfResults[i] = totalNSec;
            }
            audioInputStream.close();
        }

        long avgPerfNSec = Arrays.stream(perfResults).sum() / numTestIterations;
        double avgPerfSec = Math.round(((double) avgPerfNSec) * 1e-6) / 1000.0;
        System.out.printf("Average Performance: %.3fs\n", avgPerfSec);
        assertTrue(
                avgPerfSec <= performanceThresholdSec,
                String.format(
                        "Expected threshold (%.3fs), process took an average of %.3fs",
                        performanceThresholdSec,
                        avgPerfSec)
        );
    }
}
