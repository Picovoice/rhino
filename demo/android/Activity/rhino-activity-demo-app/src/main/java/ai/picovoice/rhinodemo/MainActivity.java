/*
    Copyright 2018-2023 Picovoice Inc.

    You may not use this file except in compliance with the license. A copy of the license is
    located in the "LICENSE" file accompanying this source.

    Unless required by applicable law or agreed to in writing, software distributed under the
    License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
    express or implied. See the License for the specific language governing permissions and
    limitations under the License.
*/

package ai.picovoice.rhinodemo;

import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.util.Log;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.TextView;
import android.widget.ToggleButton;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;
import androidx.constraintlayout.widget.ConstraintLayout;
import androidx.constraintlayout.widget.Guideline;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import java.util.Map;
import java.util.Objects;

import ai.picovoice.rhino.RhinoActivationException;
import ai.picovoice.rhino.RhinoActivationLimitException;
import ai.picovoice.rhino.RhinoActivationRefusedException;
import ai.picovoice.rhino.RhinoActivationThrottledException;
import ai.picovoice.rhino.RhinoException;
import ai.picovoice.rhino.RhinoInference;
import ai.picovoice.rhino.RhinoInvalidArgumentException;
import ai.picovoice.rhino.RhinoManager;
import ai.picovoice.rhino.RhinoManagerCallback;
import ai.picovoice.rhino.RhinoManagerErrorCallback;


public class MainActivity extends AppCompatActivity {
    private static final String ACCESS_KEY = "${YOUR_ACCESS_KEY_HERE}"; // AccessKey obtained from Picovoice Console (https://console.picovoice.ai/)

    private String contextName = "";

    private ToggleButton recordButton;
    private Button cheatSheetButton;
    private TextView intentTextView;
    private final RhinoManagerCallback rhinoManagerCallback = new RhinoManagerCallback() {
        @Override
        public void invoke(final RhinoInference inference) {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    recordButton.setEnabled(true);
                    recordButton.setText("START");
                    recordButton.toggle();
                    intentTextView.setText("\n    {\n");
                    intentTextView.append(
                            String.format("        \"isUnderstood\" : \"%b\",\n", inference.getIsUnderstood()));
                    if (inference.getIsUnderstood()) {
                        intentTextView.append(
                                String.format("        \"intent\" : \"%s\",\n", inference.getIntent()));
                        final Map<String, String> slots = inference.getSlots();
                        if (slots.size() > 0) {
                            intentTextView.append("        \"slots\" : {\n");
                            for (String key : slots.keySet()) {
                                intentTextView.append(
                                        String.format("            \"%s\" : \"%s\",\n", key, slots.get(key)));
                            }
                            intentTextView.append("        }\n");
                        }
                    }
                    intentTextView.append("    }\n");
                }
            });
        }
    };
    private TextView errorTextView;
    private Guideline errorGuideline;
    private final RhinoManagerErrorCallback rhinoManagerErrorCallback = new RhinoManagerErrorCallback() {
        @Override
        public void invoke(final RhinoException error) {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    onRhinoError(error.getMessage());
                }
            });
        }
    };
    private RhinoManager rhinoManager;

    private void initRhino() {
        try {
            RhinoManager.Builder builder = new RhinoManager.Builder()
                    .setAccessKey(ACCESS_KEY)
                    .setContextPath("contexts/" + contextName + ".rhn")
                    .setSensitivity(0.25f)
                    .setErrorCallback(rhinoManagerErrorCallback);

            String model;
            if (Objects.equals(BuildConfig.FLAVOR, "en")) {
                model = "rhino_params.pv";
            } else {
                model = "rhino_params_" + BuildConfig.FLAVOR + ".pv";
            }
            builder.setModelPath("models/" + model);

            rhinoManager = builder.build(getApplicationContext(), rhinoManagerCallback);

            Log.i("RhinoManager", rhinoManager.getContextInformation());
        } catch (RhinoInvalidArgumentException e) {
            onRhinoError(e.getMessage());
        } catch (RhinoActivationException e) {
            onRhinoError("AccessKey activation error");
        } catch (RhinoActivationLimitException e) {
            onRhinoError("AccessKey reached its device limit");
        } catch (RhinoActivationRefusedException e) {
            onRhinoError("AccessKey refused");
        } catch (RhinoActivationThrottledException e) {
            onRhinoError("AccessKey has been throttled");
        } catch (RhinoException e) {
            onRhinoError("Failed to initialize Porcupine " + e.getMessage());
        }
    }

    private void onRhinoError(String errorMessage) {
        recordButton.setEnabled(false);
        recordButton.setBackground(ContextCompat.getDrawable(
                getApplicationContext(),
                R.drawable.button_disabled));

        cheatSheetButton.setEnabled(false);

        errorTextView.setText(errorMessage);
        errorTextView.setVisibility(View.VISIBLE);

        ConstraintLayout.LayoutParams intentParam = (ConstraintLayout.LayoutParams) intentTextView.getLayoutParams();
        intentParam.bottomToTop = errorGuideline.getId();
        intentTextView.requestLayout();
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_rhino_demo);

        recordButton = findViewById(R.id.startButton);
        TextView contextNameTextView = findViewById(R.id.contextName);
        cheatSheetButton = findViewById(R.id.cheatSheetButton);
        intentTextView = findViewById(R.id.intentView);
        errorTextView = findViewById(R.id.errorView);
        errorGuideline = findViewById(R.id.errorGuideLine);

        contextName = getApplicationContext().getString(R.string.pvContextName);
        contextNameTextView.setText(contextName);

        initRhino();
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();

        rhinoManager.delete();
    }

    private boolean hasRecordPermission() {
        return ActivityCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) ==
                PackageManager.PERMISSION_GRANTED;
    }

    private void requestRecordPermission() {
        ActivityCompat.requestPermissions(this, new String[]{Manifest.permission.RECORD_AUDIO}, 0);
    }

    @Override
    public void onRequestPermissionsResult(
            int requestCode,
            @NonNull String[] permissions,
            @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (grantResults.length == 0 || grantResults[0] == PackageManager.PERMISSION_DENIED) {
            recordButton.setEnabled(true);
            recordButton.setText("START");
            recordButton.toggle();
        } else {
            recordButton.setEnabled(false);
            recordButton.setText("...");
            try {
                rhinoManager.process();
            } catch (RhinoException e) {
                onRhinoError(e.getMessage());
            }
        }
    }

    public void onClick(View view) {
        if (recordButton.isChecked()) {
            recordButton.setEnabled(false);
            recordButton.setText("...");
            intentTextView.setText("");

            if (hasRecordPermission()) {
                try {
                    rhinoManager.process();
                } catch (RhinoException e) {
                    onRhinoError(e.getMessage());
                }
            } else {
                requestRecordPermission();
            }
        }
    }

    public void showContextCheatSheet(View view) {
        AlertDialog.Builder builder = new AlertDialog.Builder(MainActivity.this);
        ViewGroup viewGroup = findViewById(R.id.content);
        View dialogView = LayoutInflater.from(
                view.getContext()).inflate(R.layout.context_cheat_sheet, viewGroup, false);
        builder.setView(dialogView);

        TextView contextField = (TextView) dialogView.findViewById(R.id.contextField);
        try {
            contextField.setText(rhinoManager.getContextInformation());
        } catch (RhinoException e) {
            Log.e("Rhino", "Could not get Rhino context information: \n" + e);
        }

        AlertDialog dialog = builder.create();
        dialog.show();
    }
}

