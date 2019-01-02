package ai.picovoice.rhinodemowithporcupine;

import android.Manifest;
import android.content.pm.PackageManager;
import android.content.res.Resources;
import android.os.Bundle;
import android.support.v4.app.ActivityCompat;
import android.support.v7.app.AppCompatActivity;
import android.util.Log;
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

import ai.picovoice.rhino.Rhino;

public class RhinoDemoWithPorcupineActivity extends AppCompatActivity {
    private static final String TAG = "RHINO_DEMO";

    private static final int PORCUPINE_MODEL_FILE_ID = R.raw.porcupine_params;
    private static final int PORCUPINE_KEYWORD_FILE_ID = R.raw.hey_rachel_android;

    private static final String PORCUPINE_MODEL_FILENAME = "porcupine_params.pv";
    private static final String PORCUPINE_KEYWORD_FILENAME = "porcupine_keyword.ppn";

    private static final float PORCUPINE_SENSITIVITY = 0.5f;

    private static final int RHINO_MODEL_FILE_ID = R.raw.rhino_params;
    private static final int RHINO_CONTEXT_FILE_ID = R.raw.smart_lighting_android;

    private static final String RHINO_MODEL_FILENAME = "rhino_params.pv";
    private static final String RHINO_CONTEXT_FILENAME = "rhino_context.rhn";

    private TextView intentTextView;

    private AudioRecorder audioRecorder;
    private RhinoWithPorcupineAudioConsumer audioConsumer;

    private void copyResource(int resourceId, String filename) throws IOException {
        final Resources resources = this.getResources();

        InputStream is = null;
        OutputStream os = null;
        try {
            is = new BufferedInputStream(resources.openRawResource(resourceId));
            os = new BufferedOutputStream(this.openFileOutput(filename, AppCompatActivity.MODE_PRIVATE));

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

    private void copyResources() throws IOException {
        copyResource(PORCUPINE_MODEL_FILE_ID, PORCUPINE_MODEL_FILENAME);
        copyResource(PORCUPINE_KEYWORD_FILE_ID, PORCUPINE_KEYWORD_FILENAME);

        copyResource(RHINO_MODEL_FILE_ID, RHINO_MODEL_FILENAME);
        copyResource(RHINO_CONTEXT_FILE_ID, RHINO_CONTEXT_FILENAME);
    }

    private String getAbsolutePath(String filename) {
        return new File(this.getFilesDir(), filename).getAbsolutePath();
    }

    private void initRhino() throws Exception {
        audioConsumer = new RhinoWithPorcupineAudioConsumer(
                getAbsolutePath(PORCUPINE_MODEL_FILENAME),
                getAbsolutePath(PORCUPINE_KEYWORD_FILENAME),
                PORCUPINE_SENSITIVITY,
                getAbsolutePath(RHINO_MODEL_FILENAME),
                getAbsolutePath(RHINO_CONTEXT_FILENAME),
                new PorcupineCallback() {
                    @Override
                    public void run() {

                    }
                },
                new RhinoCallback() {
                    @Override
                    public void run(final boolean isUnderstood, final Rhino.Intent intent) {
                        runOnUiThread(new Runnable() {
                            @Override
                            public void run() {
                                if (isUnderstood) {
                                    intentTextView.setText("");
                                    intentTextView.append(String.format("intent: %s\n", intent.getIntent()));

                                    final Map<String, String> slots = intent.getSlots();
                                    for (String key: slots.keySet()) {
                                        intentTextView.append(String.format("%s: %s\n", key, slots.get(key)));
                                    }
                                } else {
                                    intentTextView.setText("command is not understood.\n");
                                }

                                try {
                                    audioRecorder.stop();
                                    audioConsumer.reset();
                                } catch (Exception e) {
                                    Log.e(TAG, e.getMessage());
                                }
                            }
                        });
                    }
                });
    }


    private String resourceIdToString(int id) {
        return this.getResources().getResourceEntryName(id).replace("_android", "").replace("_", " ");
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_rhino_demo_with_porcupine);

        try {
            copyResources();
        } catch (IOException e) {
            Log.e(TAG, "Failed to copy resource files.");
            Log.e(TAG, e.getMessage());

            Toast.makeText(this, "Failed to copy resource files.", Toast.LENGTH_SHORT).show();
        }

        intentTextView = findViewById(R.id.intentTextView);

        TextView wakeWordTextView = findViewById(R.id.wakeWordTextView);
        wakeWordTextView.setText("Wake Word: " + resourceIdToString(PORCUPINE_KEYWORD_FILE_ID));

        TextView contextTextView = findViewById(R.id.contextTextView);
        contextTextView.setText("Context: " + resourceIdToString(RHINO_CONTEXT_FILE_ID));

        try {
            initRhino();
        } catch (Exception e) {
            Log.e(TAG, "Failed to initialize Rhino.");
            Log.e(TAG, e.getMessage());

            Toast.makeText(this, "Failed to initialize Rhino.", Toast.LENGTH_SHORT).show();
        }
    }

    private boolean hasRecordPermission() {
        return ActivityCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED;
    }
}
