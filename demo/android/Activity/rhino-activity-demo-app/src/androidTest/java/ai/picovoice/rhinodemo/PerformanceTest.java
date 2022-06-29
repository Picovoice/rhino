package ai.picovoice.rhinodemo;

import static org.junit.Assert.assertTrue;

import androidx.test.ext.junit.runners.AndroidJUnit4;

import org.junit.Assume;
import org.junit.Test;
import org.junit.runner.RunWith;

import java.io.File;
import java.io.FileInputStream;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;

import ai.picovoice.rhino.Rhino;

@RunWith(AndroidJUnit4.class)
public class PerformanceTest extends BaseTest {

    @Test
    public void testPerformance() throws Exception {
        String iterationString = appContext.getString(R.string.numTestIterations);
        String thresholdString = appContext.getString(R.string.performanceThresholdSec);
        Assume.assumeNotNull(thresholdString);
        Assume.assumeFalse(thresholdString.equals(""));

        int numTestIterations = 100;
        try {
            numTestIterations = Integer.parseInt(iterationString);
        } catch (NumberFormatException ignored) {
        }
        double performanceThresholdSec = Double.parseDouble(thresholdString);

        File contextPath = new File(testResourcesPath, "context_files/coffee_maker_android.rhn");
        Rhino r = new Rhino.Builder()
                .setAccessKey(accessKey)
                .setContextPath(contextPath.getAbsolutePath())
                .build(appContext);

        File testAudio = new File(testResourcesPath, "audio_samples/test_within_context.wav");

        long totalNSec = 0;
        for (int i = 0; i < numTestIterations; i++) {
            FileInputStream audioInputStream = new FileInputStream(testAudio);

            byte[] rawData = new byte[r.getFrameLength() * 2];
            short[] pcm = new short[r.getFrameLength()];
            ByteBuffer pcmBuff = ByteBuffer.wrap(rawData).order(ByteOrder.LITTLE_ENDIAN);

            audioInputStream.skip(44);
            while (audioInputStream.available() > 0) {
                int numRead = audioInputStream.read(pcmBuff.array());
                if (numRead == r.getFrameLength() * 2) {
                    pcmBuff.asShortBuffer().get(pcm);
                    long before = System.nanoTime();
                    r.process(pcm);
                    long after = System.nanoTime();
                    totalNSec += (after - before);
                }
            }
        }
        r.delete();

        double avgNSec = totalNSec / (double) numTestIterations;
        double avgSec = ((double) Math.round(avgNSec * 1e-6)) / 1000.0;
        assertTrue(
                String.format("Expected threshold (%.3fs), process took (%.3fs)", performanceThresholdSec, avgSec),
                avgSec <= performanceThresholdSec
        );
    }
}
