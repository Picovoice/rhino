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
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import org.junit.Test;
import org.junit.runner.RunWith;

import java.io.File;
import java.io.IOException;

import ai.picovoice.rhino.Rhino;
import ai.picovoice.rhino.RhinoException;
import ai.picovoice.rhino.RhinoInference;

import androidx.test.ext.junit.runners.AndroidJUnit4;

@RunWith(AndroidJUnit4.class)
public class StandardTests extends BaseTest {

    @Test
    public void testInitSuccessSimple() throws RhinoException, IOException {
        File contextPath = new File(getContextFilepath("en/coffee_maker_android.rhn"));
        Rhino r = new Rhino.Builder()
                .setAccessKey(accessKey)
                .setDevice(device)
                .setContextPath(contextPath.getAbsolutePath())
                .build(appContext);

        assertTrue(r.getVersion() != null && !r.getVersion().equals(""));
        assertTrue(r.getFrameLength() > 0);
        assertTrue(r.getSampleRate() > 0);
        assertTrue(r.getContextInformation() != null && !r.getContextInformation().equals(""));

        r.delete();
    }

    @Test
    public void testInitSuccessWithCustomModelPath() throws RhinoException, IOException {
        File contextPath = new File(getContextFilepath("en/coffee_maker_android.rhn"));
        File modelPath = new File(getModelFilepath("rhino_params.pv"));
        Rhino r = new Rhino.Builder()
                .setAccessKey(accessKey)
                .setDevice(device)
                .setContextPath(contextPath.getAbsolutePath())
                .setModelPath(modelPath.getAbsolutePath())
                .build(appContext);

        assertTrue(r.getContextInformation() != null && !r.getContextInformation().equals(""));
        r.delete();
    }

    @Test
    public void testInitSuccessWithCustomSensitivity() throws RhinoException, IOException {
        File contextPath = new File(getContextFilepath("en/coffee_maker_android.rhn"));
        Rhino r = new Rhino.Builder()
                .setAccessKey(accessKey)
                .setDevice(device)
                .setContextPath(contextPath.getAbsolutePath())
                .setSensitivity(0.7f)
                .build(appContext);

        assertTrue(r.getContextInformation() != null && !r.getContextInformation().equals(""));
        r.delete();
    }

    @Test
    public void testInitSuccessWithCustomEndpointDurationSec() throws RhinoException, IOException {
        File contextPath = new File(getContextFilepath("en/coffee_maker_android.rhn"));
        Rhino r = new Rhino.Builder()
                .setAccessKey(accessKey)
                .setDevice(device)
                .setContextPath(contextPath.getAbsolutePath())
                .setEndpointDurationSec(3.0f)
                .build(appContext);

        assertTrue(r.getContextInformation() != null && !r.getContextInformation().equals(""));
        r.delete();
    }

    @Test
    public void testInitSuccessWithRequireEndpointFalse() throws RhinoException, IOException {
        File contextPath = new File(getContextFilepath("en/coffee_maker_android.rhn"));
        Rhino r = new Rhino.Builder()
                .setAccessKey(accessKey)
                .setDevice(device)
                .setContextPath(contextPath.getAbsolutePath())
                .setRequireEndpoint(false)
                .build(appContext);

        assertTrue(r.getContextInformation() != null && !r.getContextInformation().equals(""));
        r.delete();
    }

    @Test
    public void testInitFailWithMismatchedLanguage() throws IOException {
        boolean didFail = false;
        File contextPath = new File(getContextFilepath("de/beleuchtung_android.rhn"));
        File modelPath = new File(getModelFilepath("rhino_params.pv"));
        try {
            new Rhino.Builder()
                    .setAccessKey(accessKey)
                    .setDevice(device)
                    .setContextPath(contextPath.getAbsolutePath())
                    .setModelPath(modelPath.getAbsolutePath())
                    .build(appContext);
        } catch (RhinoException e) {
            didFail = true;
        }

        assertTrue(didFail);
    }

    @Test
    public void testInitFailWithNoAccessKey() throws IOException {
        boolean didFail = false;
        File contextPath = new File(getContextFilepath("fr/éclairage_intelligent_android.rhn"));
        try {
            new Rhino.Builder()
                    .setDevice(device)
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
                    .setDevice(device)
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
                    .setDevice(device)
                    .setContextPath(contextPath.getAbsolutePath())
                    .build(appContext);
        } catch (RhinoException e) {
            didFail = true;
        }

        assertTrue(didFail);
    }

    @Test
    public void testInitFailWithInvalidModelPath() throws IOException {
        boolean didFail = false;
        File contextPath = new File(getContextFilepath("en/coffee_maker_android.rhn"));
        File modelPath = new File(testResourcesPath, "bad_path/bad_path.pv");
        try {
            new Rhino.Builder()
                    .setAccessKey(accessKey)
                    .setDevice(device)
                    .setContextPath(contextPath.getAbsolutePath())
                    .setModelPath(modelPath.getAbsolutePath())
                    .build(appContext);
        } catch (RhinoException e) {
            didFail = true;
        }

        assertTrue(didFail);
    }

    @Test
    public void testInitFailWithInvalidSensitivity() throws IOException {
        boolean didFail = false;
        File contextPath = new File(getContextFilepath("en/coffee_maker_android.rhn"));
        try {
            new Rhino.Builder()
                    .setAccessKey(accessKey)
                    .setDevice(device)
                    .setContextPath(contextPath.getAbsolutePath())
                    .setSensitivity(10)
                    .build(appContext);
        } catch (RhinoException e) {
            didFail = true;
        }

        assertTrue(didFail);
    }

    @Test
    public void testInitFailWithInvalidEndpointDurationSec() throws IOException {
        boolean didFail = false;
        File contextPath = new File(getContextFilepath("en/coffee_maker_android.rhn"));
        try {
            new Rhino.Builder()
                    .setAccessKey(accessKey)
                    .setDevice(device)
                    .setContextPath(contextPath.getAbsolutePath())
                    .setEndpointDurationSec(10.0f)
                    .build(appContext);
        } catch (RhinoException e) {
            didFail = true;
        }

        assertTrue(didFail);
    }

    @Test
    public void testInitFailWithWrongPlatform() throws IOException {
        boolean didFail = false;
        File contextPath = new File(getContextFilepath("en/coffee_maker_linux.rhn"));
        try {
            new Rhino.Builder()
                    .setAccessKey(accessKey)
                    .setDevice(device)
                    .setContextPath(contextPath.getAbsolutePath())
                    .build(appContext);
        } catch (RhinoException e) {
            didFail = true;
        }

        assertTrue(didFail);
    }


    @Test
    public void testInitWithNonAsciiModelName() throws RhinoException, IOException {
        File contextPath = new File(getContextFilepath("es/iluminación_inteligente_android.rhn"));
        File modelPath = new File(getModelFilepath("rhino_params_es.pv"));
        Rhino r = new Rhino.Builder()
                .setAccessKey(accessKey)
                .setDevice(device)
                .setContextPath(contextPath.getAbsolutePath())
                .setModelPath(modelPath.getAbsolutePath())
                .build(appContext);

        assertTrue(r.getContextInformation() != null && !r.getContextInformation().equals(""));
        r.delete();
    }

    @Test
    public void testReset() throws Exception {
        File contextPath = new File(getContextFilepath("en/coffee_maker_android.rhn"));

        Rhino r = new Rhino.Builder()
                .setAccessKey(accessKey)
                .setDevice(device)
                .setContextPath(contextPath.getAbsolutePath())
                .build(appContext);

        File testAudio = new File(getAudioFilepath("test_within_context.wav"));
        boolean isFinalized = processFileHelper(r, testAudio, 15);
        assertFalse(isFinalized);

        r.reset();
        isFinalized = processFileHelper(r, testAudio, -1);
        assertTrue(isFinalized);

        RhinoInference inference = r.getInference();
        assertTrue(inference.getIsUnderstood());
        r.delete();
    }

    @Test
    public void testErrorStack() throws IOException {
        File contextPath = new File(getContextFilepath("en/coffee_maker_android.rhn"));

        String[] error = {};
        try {
            new Rhino.Builder()
                    .setAccessKey("invalid")
                    .setDevice(device)
                    .setContextPath(contextPath.getAbsolutePath())
                    .build(appContext);
        } catch (RhinoException e) {
            error = e.getMessageStack();
        }

        assertTrue(0 < error.length);
        assertTrue(error.length <= 8);

        try {
            new Rhino.Builder()
                    .setAccessKey("invalid")
                    .setDevice(device)
                    .setContextPath(contextPath.getAbsolutePath())
                    .build(appContext);
        } catch (RhinoException e) {
            for (int i = 0; i < error.length; i++) {
                assertEquals(e.getMessageStack()[i], error[i]);
            }
        }
    }
}
