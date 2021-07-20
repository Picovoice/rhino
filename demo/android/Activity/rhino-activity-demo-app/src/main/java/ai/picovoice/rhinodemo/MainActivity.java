/*
    Copyright 2018-2020 Picovoice Inc.

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
import android.widget.TextView;
import android.widget.Toast;
import android.widget.ToggleButton;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;

import java.util.Map;

import ai.picovoice.rhino.RhinoInference;
import ai.picovoice.rhino.RhinoManager;
import ai.picovoice.rhino.RhinoManagerCallback;


public class MainActivity extends AppCompatActivity {
    private ToggleButton recordButton;
    private TextView intentTextView;
    private RhinoManager rhinoManager;

    private void initRhino() throws Exception {
        rhinoManager = new RhinoManager.Builder()
                .setContextPath("smart_lighting_android.rhn")
                .setSensitivity(0.25f)
                .build(getApplicationContext(), new RhinoManagerCallback() {
                    @Override
                    public void invoke(final RhinoInference inference) {
                        runOnUiThread(new Runnable() {
                            @Override
                            public void run() {
                                recordButton.setEnabled(true);
                                recordButton.setText("START");
                                recordButton.toggle();
                                intentTextView.setText("\n    {\n");
                                intentTextView.append(String.format("        \"isUnderstood\" : \"%b\",\n", inference.getIsUnderstood()));
                                if (inference.getIsUnderstood()) {
                                    intentTextView.append(String.format("        \"intent\" : \"%s\",\n", inference.getIntent()));
                                    final Map<String, String> slots = inference.getSlots();
                                    if (slots.size() > 0) {
                                        intentTextView.append("        \"slots\" : {\n");
                                        for (String key : slots.keySet()) {
                                            intentTextView.append(String.format("            \"%s\" : \"%s\",\n", key, slots.get(key)));
                                        }
                                        intentTextView.append("        }\n");
                                    }
                                }
                                intentTextView.append("    }\n");
                            }
                        });
                    }
                });

        Log.i("RhinoManager", rhinoManager.getContextInformation());
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_rhino_demo);

        recordButton = findViewById(R.id.startButton);
        intentTextView = findViewById(R.id.intentView);

        try {
            initRhino();
        } catch (Exception e) {
            Toast.makeText(this, "Failed to initialize Rhino.", Toast.LENGTH_SHORT).show();
        }
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();

        rhinoManager.delete();
    }

    private boolean hasRecordPermission() {
        return ActivityCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED;
    }

    private void requestRecordPermission() {
        ActivityCompat.requestPermissions(this, new String[]{Manifest.permission.RECORD_AUDIO}, 0);
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions, @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (grantResults.length == 0 || grantResults[0] == PackageManager.PERMISSION_DENIED) {
            recordButton.setEnabled(true);
            recordButton.setText("START");
            recordButton.toggle();
        } else {
            recordButton.setEnabled(false);
            recordButton.setText("...");
            rhinoManager.process();
        }
    }

    public void onClick(View view) {
        if (recordButton.isChecked()) {
            recordButton.setEnabled(false);
            recordButton.setText("...");
            intentTextView.setText("");

            if (hasRecordPermission()) {
                rhinoManager.process();
            } else {
                recordButton.toggle();
                requestRecordPermission();
            }
        }
    }

    public void showContextCheatSheet(View view) {
        AlertDialog.Builder builder = new AlertDialog.Builder(MainActivity.this);
        ViewGroup viewGroup = findViewById(R.id.content);
        View dialogView = LayoutInflater.from(view.getContext()).inflate(R.layout.context_cheat_sheet, viewGroup, false);
        builder.setView(dialogView);

        TextView contextField = (TextView) dialogView.findViewById(R.id.contextField);
        contextField.setText(rhinoManager.getContextInformation());

        AlertDialog dialog = builder.create();
        dialog.show();
    }
}
