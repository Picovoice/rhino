/*
 * Copyright 2018 Picovoice Inc.
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
import android.content.pm.PackageManager;
import android.content.res.Resources;
import android.os.Bundle;
import android.support.annotation.NonNull;
import android.support.v4.app.ActivityCompat;
import android.support.v7.app.AppCompatActivity;
import android.util.Log;
import android.view.View;
import android.widget.TextView;
import android.widget.Toast;
import android.widget.ToggleButton;

import java.io.BufferedInputStream;
import java.io.BufferedOutputStream;
import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.Map;

public class RhinoDemoActivity extends AppCompatActivity {
    private AudioRecorder audioRecorder;
    private ToggleButton startButton;
    private TextView intentView;

    private void copyResources() throws IOException{
        int[] resourceIds = {
                R.raw.smart_lighting_android,
                R.raw.coffee_maker_android,
                R.raw.rhino_params
        };

        Resources resources = this.getResources();

        for (int id : resourceIds) {
            final String filename = resources.getResourceEntryName(id);
            final String extension = (id == R.raw.rhino_params) ? ".pv" : ".rhn";

            InputStream is = null;
            OutputStream os = null;
            try {
                is = new BufferedInputStream(resources.openRawResource(id));
                os = new BufferedOutputStream(this.openFileOutput(filename + extension, AppCompatActivity.MODE_PRIVATE));

                int b;
                while ((b = is.read()) != -1) {
                    os.write(b);
                }
                os.flush();
            } finally {
                if (is != null) {
                    is.close();
                }
                if (os != null) {
                    os.close();
                }
            }
        }
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_rhino_demo);

        try {
            copyResources();
        } catch (IOException e) {
            Log.e(TAG, e.getMessage());
            Toast.makeText(this, e.getMessage(), Toast.LENGTH_SHORT).show();
        }

        startButton = findViewById(R.id.startButton);
        intentView = findViewById(R.id.intentView);
    }

    private boolean hasRecordPermission() {
        int permResult = ActivityCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO);
        return permResult == PackageManager.PERMISSION_GRANTED;
    }

    void showRecordPermission() {
        ActivityCompat.requestPermissions(this, new String[]{Manifest.permission.RECORD_AUDIO}, 0);
    }

    public void onClick(View view) {
        try {
            if (startButton.isChecked()) {
                if (hasRecordPermission()) {
                    RhinoManager rhinoManager = createRhino();
                    audioRecorder = new AudioRecorder(rhinoManager);
                    audioRecorder.start();
                    Log.i(TAG, "yo");
                } else {
                    Log.i(TAG, "hello");
                    showRecordPermission();
                }
            } else {
                Log.i(TAG, "boo");
                if (audioRecorder != null) {
                    audioRecorder.stop();
                }
            }
        } catch (Exception e) {
            Log.e(TAG, e.getMessage());
            Toast.makeText(this, e.getMessage(), Toast.LENGTH_SHORT).show();
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode,
                                           @NonNull String permissions[],
                                           @NonNull int[] grantResults) {
        // We only ask for record permission.
        if (grantResults.length == 0 || grantResults[0] == PackageManager.PERMISSION_DENIED) {
            ToggleButton tbtn = findViewById(R.id.startButton);
            tbtn.toggle();
        } else {
            try {
                RhinoManager rhinoManager = createRhino();
                audioRecorder = new AudioRecorder(rhinoManager);
                audioRecorder.start();
            } catch (Exception e) {
                Log.e(TAG, e.getMessage());
            }
        }
    }

    private String getAbsolutePath(String filename) {
        return new File(this.getFilesDir(), filename).getAbsolutePath();
    }

    private final String TAG = "RhinoDemo";

    private RhinoManager createRhino() throws Exception {
        return new RhinoManager(
                getAbsolutePath("rhino_params.pv"),
                getAbsolutePath("coffee_maker_android.rhn"),
                new RhinoCallback() {
                    @Override
                    public void run(final boolean isUnderstood, final String intent, final Map<String, String> slots) {
                        Log.i(TAG, isUnderstood ? "true" : "false");
                        Log.i(TAG, intent);
                        for (String key: slots.keySet()) {
                            Log.i(TAG, key + ": " + slots.get(key));
                        }

                        runOnUiThread(new Runnable() {
                            @Override
                            public void run() {
                                Log.i(TAG, "before toggle!");
                                startButton.toggle();
                                Log.i(TAG, "after toggle");
                                if (isUnderstood) {
                                    intentView.setText("");
                                    intentView.append(String.format("intent: %s\n", intent));
                                    for (String key: slots.keySet()) {
                                        intentView.append(String.format("%s: %s\n", key, slots.get(key)));
                                    }
                                    Log.i(TAG, "set text!");
                                } else {
                                    intentView.setText("command is not understood.\n");
                                }
                            }
                        });
                    }
                });
    }
}
