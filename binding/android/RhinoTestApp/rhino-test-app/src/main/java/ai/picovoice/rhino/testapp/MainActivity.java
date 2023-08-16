/*
    Copyright 2018-2023 Picovoice Inc.

    You may not use this file except in compliance with the license. A copy of the license is
    located in the "LICENSE" file accompanying this source.

    Unless required by applicable law or agreed to in writing, software distributed under the
    License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
    express or implied. See the License for the specific language governing permissions and
    limitations under the License.
*/

package ai.picovoice.rhino.testapp;


import android.os.Bundle;
import android.view.View;
import android.widget.Button;
import android.widget.ListView;
import android.widget.SimpleAdapter;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.content.ContextCompat;

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
import java.util.ArrayList;
import java.util.HashMap;

import ai.picovoice.rhino.Rhino;
import ai.picovoice.rhino.RhinoException;
import ai.picovoice.rhino.RhinoInference;


public class MainActivity extends AppCompatActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);
    }

    @Override
    protected void onStop() {
        super.onStop();
    }

    public void startTest(View view) {
        Button testButton = findViewById(R.id.testButton);
        testButton.setBackground(ContextCompat.getDrawable(
                getApplicationContext(),
                R.drawable.button_disabled));
        runTest();

        testButton.setBackground(ContextCompat.getDrawable(
                getApplicationContext(),
                R.drawable.button_background));
    }

    public void runTest() {
        String accessKey = getApplicationContext().getString(R.string.pvTestingAccessKey);

        ArrayList<TestResult> results = new ArrayList<>();

        String modelFile = getModelFile();
        String contextFile = getContextFile();

        TestResult result = new TestResult();
        result.testName = "Test Init";
        Rhino rhino = null;
        try {
            rhino = new Rhino.Builder()
                    .setAccessKey(accessKey)
                    .setModelPath(modelFile)
                    .setContextPath(contextFile)
                    .build(getApplicationContext());
            result.success = true;
        } catch (RhinoException e) {
            result.success = false;
            result.errorMessage = String.format("Failed to init rhino with '%s'", e);
        } finally {
            results.add(result);
        }

        result = new TestResult();
        result.testName = "Test Process";
        try {
            String suffix = "_" + BuildConfig.FLAVOR;
            if (BuildConfig.FLAVOR == "en") {
                suffix = "";
            }

            String audioPath = "audio_samples/test_within_context" + suffix + ".wav";

            RhinoInference inference = processTestAudio(rhino, audioPath);
            if (inference != null) {
                result.success = true;
            } else {
                result.success = false;
                result.errorMessage = "Process returned invalid result.";
            }
        } catch (Exception e) {
            result.success = false;
            result.errorMessage = String.format("Failed to process with '%s'", e);
        } finally {
            results.add(result);
        }

        result = new TestResult();
        result.testName = "Test Exception";
        try {
            new Rhino.Builder()
                    .setAccessKey("")
                    .setModelPath(modelFile)
                    .setContextPath(contextFile)
                    .build(getApplicationContext());
            result.success = false;
            result.errorMessage = "Init should have throw an exception";
        } catch (RhinoException e) {
            result.success = true;
        } finally {
            results.add(result);
        }

        displayTestResults(results);
    }

    private void displayTestResults(ArrayList<TestResult> results) {
        ListView resultList = findViewById(R.id.resultList);

        int passed = 0;
        int failed = 0;

        ArrayList<HashMap<String, String>> list = new ArrayList<>();
        for (TestResult result : results) {
            HashMap<String, String> map = new HashMap<>();
            map.put("testName", result.testName);

            String message;
            if (result.success) {
                message = "Test Passed";
                passed += 1;
            } else {
                message = String.format("Test Failed: %s", result.errorMessage);
                failed += 1;
            }

            map.put("testMessage", message);
            list.add(map);
        }

        SimpleAdapter adapter = new SimpleAdapter(
                getApplicationContext(),
                list,
                R.layout.list_view,
                new String[]{"testName", "testMessage"},
                new int[]{R.id.testName, R.id.testMessage});

        resultList.setAdapter(adapter);

        TextView passedView = findViewById(R.id.testNumPassed);
        TextView failedView = findViewById(R.id.testNumFailed);

        passedView.setText(String.valueOf(passed));
        failedView.setText(String.valueOf(failed));

        TextView resultView = findViewById(R.id.testResult);
        if (passed == 0 || failed > 0) {
            resultView.setText("Failed");
        } else {
            resultView.setText("Passed");
        }
    }

    private String getModelFile() {
        String suffix = (!BuildConfig.FLAVOR.equals("en")) ? String.format("_%s", BuildConfig.FLAVOR) : "";
        return String.format("models/rhino_params%s.pv", suffix);
    }

    private String getContextFile() {
        try {
            String[] contexts = getApplicationContext().getAssets().list("contexts");
            if (contexts.length > 0) {
                return String.format("contexts/%s", contexts[0]);
            } else {
                return "";
            }
        } catch (IOException e) {
            e.printStackTrace();
            return "";
        }
    }

    private RhinoInference processTestAudio(@NonNull Rhino r, String audioPath) throws Exception {
        File testAudio = new File(getApplicationContext().getFilesDir(), audioPath);

        if (!testAudio.exists()) {
            testAudio.getParentFile().mkdirs();
            extractFile(audioPath);
        }

        FileInputStream audioInputStream = new FileInputStream(testAudio);

        byte[] rawData = new byte[r.getFrameLength() * 2];
        short[] pcm = new short[r.getFrameLength()];
        ByteBuffer pcmBuff = ByteBuffer.wrap(rawData).order(ByteOrder.LITTLE_ENDIAN);

        audioInputStream.skip(44);

        while (audioInputStream.available() > 0) {
            int numRead = audioInputStream.read(pcmBuff.array());
            if (numRead == r.getFrameLength() * 2) {
                pcmBuff.asShortBuffer().get(pcm);
                boolean isFinalized = r.process(pcm);
                if (isFinalized) {
                    break;
                }
            }
        }

        return r.getInference();
    }

    private void extractFile(String filepath) throws IOException {
        System.out.println(filepath);
        InputStream is = new BufferedInputStream(getAssets().open(filepath), 256);
        File absPath = new File(getApplicationContext().getFilesDir(), filepath);
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
