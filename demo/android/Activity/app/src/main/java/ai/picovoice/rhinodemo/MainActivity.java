/*
 * Copyright 2018-2020 Picovoice Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package ai.picovoice.rhinodemo;

import android.Manifest;
import android.content.Context;
import android.content.pm.PackageManager;
import android.content.res.Resources;
import android.os.Bundle;
import android.view.View;
import android.widget.TextView;
import android.widget.Toast;
import android.widget.ToggleButton;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;

import java.io.BufferedInputStream;
import java.io.BufferedOutputStream;
import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.Map;

import ai.picovoice.rhino.RhinoInference;
import ai.picovoice.rhinomanager.RhinoManager;
import ai.picovoice.rhinomanager.RhinoManagerCallback;


public class MainActivity extends AppCompatActivity {
    private ToggleButton recordButton;
    private TextView intentTextView;
    private RhinoManager rhinoManager;

    private void copyResourceFile(int resourceID, String filename) throws IOException {
        final Resources resources = getResources();
        try (
                InputStream is = new BufferedInputStream(resources.openRawResource(resourceID), 256);
                OutputStream os = new BufferedOutputStream(openFileOutput(filename, Context.MODE_PRIVATE), 256)) {
            int r;
            while ((r = is.read()) != -1) {
                os.write(r);
            }
            os.flush();
        }
    }

    private String getAbsolutePath(String filename) {
        return new File(this.getFilesDir(), filename).getAbsolutePath();
    }

    private void initRhino() throws Exception {
        rhinoManager = new RhinoManager(
                getAbsolutePath("rhino_params.pv"),
                getAbsolutePath("rhino_context.rhn"),
                0.25f,
                new RhinoManagerCallback() {
                    @Override
                    public void invoke(final RhinoInference inference) {
                        runOnUiThread(new Runnable() {
                            @Override
                            public void run() {
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
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_rhino_demo);

        try {
            copyResourceFile(R.raw.rhino_params, "rhino_params.pv");
            copyResourceFile(R.raw.smart_lighting_android, "rhino_context.rhn");
        } catch (IOException e) {
            Toast.makeText(this, "Failed to copy resource files.", Toast.LENGTH_SHORT).show();
        }

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
        if (grantResults.length == 0 || grantResults[0] == PackageManager.PERMISSION_DENIED) {
            recordButton.toggle();
        } else {
                rhinoManager.process();
        }
    }

    public void onClick(View view) {
        if (recordButton.isChecked()) {
            intentTextView.setText("");

            if (hasRecordPermission()) {
                rhinoManager.process();
            } else {
                recordButton.toggle();
                requestRecordPermission();
            }
        }
    }
}
