package ai.picovoice.rhinodemo;

import android.content.Context;
import android.content.res.AssetManager;

import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;

import com.microsoft.appcenter.espresso.Factory;
import com.microsoft.appcenter.espresso.ReportHelper;

import org.junit.After;
import org.junit.Assume;
import org.junit.Before;
import org.junit.Rule;
import org.junit.Test;
import org.junit.runner.RunWith;

import java.io.BufferedInputStream;
import java.io.BufferedOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.util.Map;

import ai.picovoice.rhino.Rhino;
import ai.picovoice.rhino.RhinoException;
import ai.picovoice.rhino.RhinoInference;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;


@RunWith(AndroidJUnit4.class)
public class RhinoTest {
    @Rule
    public ReportHelper reportHelper = Factory.getReportHelper();
    Context testContext;
    Context appContext;
    AssetManager assetManager;
    String testResourcesPath;
    String accessKey;

    @After
    public void TearDown() {
        reportHelper.label("Stopping App");
    }

    @Before
    public void Setup() throws IOException {
        testContext = InstrumentationRegistry.getInstrumentation().getContext();
        appContext = InstrumentationRegistry.getInstrumentation().getTargetContext();
        assetManager = testContext.getAssets();
        extractAssetsRecursively("test_resources");
        testResourcesPath = new File(appContext.getFilesDir(), "test_resources").getAbsolutePath();

        accessKey = appContext.getString(R.string.pvTestingAccessKey);
    }

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
    public void testInitSuccessDE() throws RhinoException {
        File contextPath = new File(testResourcesPath, "context_files/test_de_android.rhn");
        File modelPath = new File(testResourcesPath, "model_files/rhino_params_de.pv");
        Rhino r = new Rhino.Builder()
                .setAccessKey(accessKey)
                .setContextPath(contextPath.getAbsolutePath())
                .setModelPath(modelPath.getAbsolutePath())
                .build(appContext);

        assertTrue(r.getContextInformation() != null && !r.getContextInformation().equals(""));
        r.delete();
    }

    @Test
    public void testInitSuccessES() throws RhinoException {
        File contextPath = new File(testResourcesPath, "context_files/test_es_android.rhn");
        File modelPath = new File(testResourcesPath, "model_files/rhino_params_es.pv");
        Rhino r = new Rhino.Builder()
                .setAccessKey(accessKey)
                .setContextPath(contextPath.getAbsolutePath())
                .setModelPath(modelPath.getAbsolutePath())
                .build(appContext);

        assertTrue(r.getContextInformation() != null && !r.getContextInformation().equals(""));
        r.delete();
    }

    @Test
    public void testInitSuccessFR() throws RhinoException {
        File contextPath = new File(testResourcesPath, "context_files/test_fr_android.rhn");
        File modelPath = new File(testResourcesPath, "model_files/rhino_params_fr.pv");
        Rhino r = new Rhino.Builder()
                .setAccessKey(accessKey)
                .setContextPath(contextPath.getAbsolutePath())
                .setModelPath(modelPath.getAbsolutePath())
                .build(appContext);

        assertTrue(r.getContextInformation() != null && !r.getContextInformation().equals(""));
        r.delete();
    }

    @Test
    public void testInitFailWithMismatchedLanguage() {
        boolean didFail = false;
        File contextPath = new File(testResourcesPath, "context_files/test_de_android.rhn");
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
        File contextPath = new File(testResourcesPath, "context_files/test_fr_android.rhn");
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
    public void testProcWithinContext() throws Exception {

        File contextPath = new File(testResourcesPath, "context_files/coffee_maker_android.rhn");
        Rhino r = new Rhino.Builder()
                .setAccessKey(accessKey)
                .setContextPath(contextPath.getAbsolutePath())
                .build(appContext);

        File testAudio = new File(testResourcesPath, "audio_samples/test_within_context.wav");
        FileInputStream audioInputStream = new FileInputStream(testAudio);

        byte[] rawData = new byte[r.getFrameLength() * 2];
        short[] pcm = new short[r.getFrameLength()];
        ByteBuffer pcmBuff = ByteBuffer.wrap(rawData).order(ByteOrder.LITTLE_ENDIAN);

        assertEquals(44, audioInputStream.skip(44));

        boolean isFinalized = false;
        while (audioInputStream.available() > 0) {
            int numRead = audioInputStream.read(pcmBuff.array());
            if (numRead == r.getFrameLength() * 2) {
                pcmBuff.asShortBuffer().get(pcm);
                isFinalized = r.process(pcm);
                if (isFinalized) {
                    break;
                }
            }
        }

        assertTrue(isFinalized);

        RhinoInference inference = r.getInference();
        assertTrue(inference.getIsUnderstood());
        assertEquals("orderBeverage", inference.getIntent());

        Map<String, String> slots = inference.getSlots();
        assertEquals("medium", slots.get("size"));
        assertEquals("double shot", slots.get("numberOfShots"));
        assertEquals("americano", slots.get("beverage"));

        r.delete();
    }

    @Test
    public void testProcOutOfContext() throws Exception {

        File contextPath = new File(testResourcesPath, "context_files/coffee_maker_android.rhn");
        Rhino r = new Rhino.Builder()
                .setAccessKey(accessKey)
                .setContextPath(contextPath.getAbsolutePath())
                .build(appContext);

        File testAudio = new File(testResourcesPath, "audio_samples/test_out_of_context.wav");
        FileInputStream audioInputStream = new FileInputStream(testAudio);

        byte[] rawData = new byte[r.getFrameLength() * 2];
        short[] pcm = new short[r.getFrameLength()];
        ByteBuffer pcmBuff = ByteBuffer.wrap(rawData).order(ByteOrder.LITTLE_ENDIAN);

        assertEquals(44, audioInputStream.skip(44));

        boolean isFinalized = false;
        while (audioInputStream.available() > 0) {
            int numRead = audioInputStream.read(pcmBuff.array());
            if (numRead == r.getFrameLength() * 2) {
                pcmBuff.asShortBuffer().get(pcm);
                isFinalized = r.process(pcm);
                if (isFinalized) {
                    break;
                }
            }
        }

        assertTrue(isFinalized);

        RhinoInference inference = r.getInference();
        assertFalse(inference.getIsUnderstood());

        r.delete();
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

    @Test
    public void testPerformance() throws Exception {
        String thresholdString = appContext.getString(R.string.performanceThresholdSec);
        Assume.assumeNotNull(thresholdString);
        Assume.assumeFalse(thresholdString.equals(""));

        File contextPath = new File(testResourcesPath, "context_files/coffee_maker_android.rhn");
        Rhino r = new Rhino.Builder()
                .setAccessKey(accessKey)
                .setContextPath(contextPath.getAbsolutePath())
                .build(appContext);

        double performanceThresholdSec = Double.parseDouble(thresholdString);

        File testAudio = new File(testResourcesPath, "audio_samples/test_within_context.wav");
        FileInputStream audioInputStream = new FileInputStream(testAudio);

        byte[] rawData = new byte[r.getFrameLength() * 2];
        short[] pcm = new short[r.getFrameLength()];
        ByteBuffer pcmBuff = ByteBuffer.wrap(rawData).order(ByteOrder.LITTLE_ENDIAN);

        audioInputStream.skip(44);

        long totalNSec = 0;
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
        p.delete();

        double totalSec = Math.round(((double) totalNSec) * 1e-6) / 1000.0;
        assertTrue(
                String.format("Expected threshold (%.3fs), process took (%.3fs)", performanceThresholdSec, totalSec),
                totalSec <= performanceThresholdSec
        );
    }

    private void extractAssetsRecursively(String path) throws IOException {
        String[] list = assetManager.list(path);
        if (list.length > 0) {
            File outputFile = new File(appContext.getFilesDir(), path);
            if (!outputFile.exists()) {
                if (!outputFile.mkdirs()) {
                    throw new IOException("Couldn't create output directory " + outputFile.getAbsolutePath());
                }
            }

            for (String file : list) {
                String filepath = path + "/" + file;
                extractAssetsRecursively(filepath);
            }
        } else {
            extractTestFile(path);
        }
    }

    private void extractTestFile(String filepath) throws IOException {
        InputStream is = new BufferedInputStream(assetManager.open(filepath), 256);
        File absPath = new File(appContext.getFilesDir(), filepath);
        OutputStream os = new BufferedOutputStream(new FileOutputStream(absPath), 256);
        int r;
        while ((r = is.read()) != -1) {
            os.write(r);
        }
        os.flush();

        is.close();
        os.close();
    }
}
