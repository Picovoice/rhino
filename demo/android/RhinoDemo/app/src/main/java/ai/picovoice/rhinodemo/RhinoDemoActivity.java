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
import android.content.Context;
import android.content.pm.PackageManager;
import android.content.res.Resources;
import android.os.Bundle;
import android.util.Log;
import android.view.View;
import android.widget.TextView;
import android.widget.Toast;
import android.widget.ToggleButton;

import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;

import java.io.BufferedInputStream;
import java.io.BufferedOutputStream;
import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.Map;

import ai.picovoice.rhino.RhinoIntent;
import ai.picovoice.rhinomanager.AudioRecorder;
import ai.picovoice.rhinomanager.RhinoAudioConsumer;
import ai.picovoice.rhinomanager.RhinoCallback;


public class RhinoDemoActivity extends AppCompatActivity {
    private static final String TAG = "PV_RHINO_DEMO";

    private static final String PARAM_FILENAME = "rhino_params.pv";
    private static final String CONTEXT_FILENAME = "rhino_context.rhn";

    private ToggleButton recordButton;
    private TextView intentTextView;
    private AudioRecorder audioRecorder;
    private RhinoAudioConsumer rhinoAudioConsumer;

    private void copyResourceFile(int resourceID, String filename) throws IOException {
        Resources resources = getResources();
        try (InputStream is = new BufferedInputStream(resources.openRawResource(resourceID), 256); OutputStream os = new BufferedOutputStream(openFileOutput(filename, Context.MODE_PRIVATE), 256)) {
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
        rhinoAudioConsumer = new RhinoAudioConsumer(
                getAbsolutePath("rhino_params.pv"),
                getAbsolutePath("rhino_context.rhn"),
                new RhinoCallback() {
                    @Override
                    public void run(final boolean isUnderstood, final RhinoIntent intent) {
                        runOnUiThread(new Runnable() {
                            @Override
                            public void run() {
                                recordButton.toggle();
                                if (isUnderstood) {
                                    intentTextView.setText("");
                                    intentTextView.append(String.format("intent: %s\n", intent.getIntent()));

                                    final Map<String, String> slots = intent.getSlots();
                                    for (String key : slots.keySet()) {
                                        intentTextView.append(String.format("%s: %s\n", key, slots.get(key)));
                                    }
                                } else {
                                    intentTextView.setText("spoken command is not understood.\n");
                                }

                                try {
                                    audioRecorder.stop();
                                    rhinoAudioConsumer.reset();
                                } catch (Exception e) {
                                    Log.e(TAG, "failed to stop recording audio and reset Rhino");
                                }
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
            copyResourceFile(R.raw.rhino_params, PARAM_FILENAME);
            copyResourceFile(R.raw.coffee_maker_android, CONTEXT_FILENAME);
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
        try {
            rhinoAudioConsumer.delete();
        } catch (Exception e) {
            //
        }
    }

    private boolean hasRecordPermission() {
        return ActivityCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED;
    }

    private void requestRecordPermission() {
        ActivityCompat.requestPermissions(this, new String[]{Manifest.permission.RECORD_AUDIO}, 0);
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
                    requestRecordPermission();
                }
            } else {
                audioRecorder.stop();
                rhinoAudioConsumer.reset();
            }
        } catch (Exception e) {
            Toast.makeText(this, "Something went wrong.", Toast.LENGTH_SHORT).show();
        }
    }
}
