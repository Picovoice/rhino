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

import ai.picovoice.rhino.Rhino;

public class RhinoDemoActivity extends AppCompatActivity {
    private final String TAG = "RHINO_DEMO";

    private static final int[] RESOURCE_IDS = {
            R.raw.rhino_params,
            R.raw.smart_lighting_android,
            R.raw.coffee_maker_android,
    };

    private ToggleButton recordButton;
    private TextView intentTextView;

    private AudioRecorder audioRecorder;
    private RhinoAudioConsumer rhinoAudioConsumer;

    private void copyResources() throws IOException {
        final Resources resources = this.getResources();

        for (int id : RESOURCE_IDS) {
            final String filename = resources.getResourceEntryName(id);
            final String extension = (id == R.raw.rhino_params) ? ".pv" : ".rhn";

            InputStream is = null;
            OutputStream os = null;
            try {
                is = new BufferedInputStream(resources.openRawResource(id));
                os = new BufferedOutputStream(this.openFileOutput(filename + extension, AppCompatActivity.MODE_PRIVATE));

                int x;
                while ((x = is.read()) != -1) {
                    os.write(x);
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
            Log.e(TAG, "Failed to copy resource files.");
            Log.e(TAG, e.getMessage());

            Toast.makeText(this, "Failed to copy resource files.", Toast.LENGTH_SHORT).show();
        }

        recordButton = findViewById(R.id.startButton);
        intentTextView = findViewById(R.id.intentView);

        try {
            createRhino();
        } catch (Exception e) {
            Log.e(TAG, "Failed to initialize rhino and/or audio recording.");
            Log.e(TAG, e.getMessage());

            Toast.makeText(this, "Failed to initialize rhino and/or audio recording.", Toast.LENGTH_SHORT).show();
        }
    }

    private boolean hasRecordPermission() {
        return ActivityCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED;
    }

    public void onClick(View view) {
        try {
            if (recordButton.isChecked()) {
                intentTextView.setText("");

                if (hasRecordPermission()) {
                    audioRecorder = new AudioRecorder(rhinoAudioConsumer);
                    audioRecorder.start();
                } else {
                    recordButton.toggle();
                    Toast.makeText(this, "Does not have record permission.", Toast.LENGTH_SHORT).show();
                }
            } else {
                audioRecorder.stop();
                rhinoAudioConsumer.reset();
            }
        } catch (Exception e) {
            Log.e(TAG, e.getMessage());

            Toast.makeText(this, "Something went wrong.", Toast.LENGTH_SHORT).show();
        }
    }

    private String getAbsolutePath(String filename) {
        return new File(this.getFilesDir(), filename).getAbsolutePath();
    }

    private void createRhino() throws Exception {
        rhinoAudioConsumer = new RhinoAudioConsumer(
                getAbsolutePath("rhino_params.pv"),
                getAbsolutePath("coffee_maker_android.rhn"),
                new RhinoCallback() {
                    @Override
                    public void run(final boolean isUnderstood, final Rhino.RhinoIntent intent) {
                        Log.i(TAG, isUnderstood ? "true" : "false");
                        Log.i(TAG, intent.getIntent());
                        for (String key: intent.getSlots().keySet()) {
                            Log.i(TAG, key + ": " + intent.getSlots().get(key));
                        }

                        runOnUiThread(new Runnable() {
                            @Override
                            public void run() {
                                recordButton.toggle();
                                if (isUnderstood) {
                                    intentTextView.setText("");
                                    intentTextView.append(String.format("intent: %s\n", intent.getIntent()));
                                    for (String key: intent.getSlots().keySet()) {
                                        intentTextView.append(String.format("%s: %s\n", key, intent.getSlots().get(key)));
                                    }
                                } else {
                                    intentTextView.setText("command is not understood.\n");
                                }
                                try {
                                    audioRecorder.stop();
                                    rhinoAudioConsumer.reset();
                                } catch (Exception e) {
                                    Log.e(TAG, e.getMessage());
                                }
                            }
                        });
                    }
                });
    }
}
