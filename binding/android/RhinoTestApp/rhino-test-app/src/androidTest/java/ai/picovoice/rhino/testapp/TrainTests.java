/*
    Copyright 2026 Picovoice Inc.

    You may not use this file except in compliance with the license. A copy of the license is
    located in the "LICENSE" file accompanying this source.

    Unless required by applicable law or agreed to in writing, software distributed under the
    License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
    express or implied. See the License for the specific language governing permissions and
    limitations under the License.
*/

package ai.picovoice.rhino.testapp;

import static org.junit.Assert.assertTrue;

import org.junit.Test;
import org.junit.runner.RunWith;

import java.io.IOException;
import java.util.Arrays;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;

import ai.picovoice.rhino.Rhino;
import ai.picovoice.rhino.RhinoException;

import androidx.test.ext.junit.runners.AndroidJUnit4;

@RunWith(AndroidJUnit4.class)
public class TrainTests extends BaseTest {

    @Test
    public void testTrainModel() throws RhinoException, IOException {
        String contextPath = getContextFilepath("en/coffee_maker_android.rhn");
        String outputPath = appContext.getFileStreamPath("custom_coffee_maker_android.rhn").getAbsolutePath();

        Map<String, Set<String>> slots = new HashMap<>();
        slots.put("size", new HashSet<>(Arrays.asList("macchiato", "cortado")));

        Rhino.trainContextFromDynamicSlots(
                appContext,
                accessKey,
                outputPath,
                "en",
                contextPath,
                getModelFilepath("rhino_params.pv"),
                slots
        );

        Rhino r = new Rhino.Builder()
                .setAccessKey(accessKey)
                .setDevice(device)
                .setContextPath(outputPath)
                .build(appContext);

        assertTrue(r.getVersion() != null && !r.getVersion().equals(""));
        assertTrue(r.getFrameLength() > 0);
        assertTrue(r.getSampleRate() > 0);
        assertTrue(r.getContextInformation() != null && !r.getContextInformation().equals(""));

        r.delete();
    }

    @Test
    public void testTrainModelInvalidSlots() throws IOException {
        String contextPath = getContextFilepath("en/coffee_maker_android.rhn");
        String outputPath = appContext.getFileStreamPath("custom_coffee_maker_android.rhn").getAbsolutePath();

        Map<String, Set<String>> slots = new HashMap<>();
        slots.put("size", new HashSet<>(Arrays.asList("blue", "Blue")));

        boolean didFail = false;
        try {
            Rhino.trainContextFromDynamicSlots(
                    appContext,
                    accessKey,
                    outputPath,
                    "en",
                    contextPath,
                    getModelFilepath("rhino_params.pv"),
                    slots
            );
        } catch (RhinoException e) {
            didFail = true;
        }

        assertTrue(didFail);
    }

}
