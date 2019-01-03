package ai.picovoice.rhinodemoinbackground;

import android.content.Intent;
import android.content.res.Resources;
import android.os.Bundle;
import android.support.v7.app.AppCompatActivity;
import android.util.Log;
import android.view.View;
import android.widget.Toast;
import android.widget.ToggleButton;

import java.io.BufferedInputStream;
import java.io.BufferedOutputStream;
import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;

public class RhinoDemoInBackgroundActivity extends AppCompatActivity {
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

    private ToggleButton recordButton;


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

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_rhino_demo_in_background);


        try {
            copyResources();
        } catch (IOException e) {
            Log.e(TAG, "Failed to copy resource files.");
            Log.e(TAG, e.getMessage());

            Toast.makeText(this, "Failed to copy resource files.", Toast.LENGTH_SHORT).show();
        }

        recordButton = findViewById(R.id.recordButton);

        recordButton.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                Intent intent = new Intent(RhinoDemoInBackgroundActivity.this, AudioRecorderService.class)
                        .putExtra("porcupineModelFilePath", getAbsolutePath(PORCUPINE_MODEL_FILENAME))
                        .putExtra("porcupineKeywordFilePath", getAbsolutePath(PORCUPINE_KEYWORD_FILENAME))
                        .putExtra("porcupineSensitivity", PORCUPINE_SENSITIVITY)
                        .putExtra("rhinoModelFilePath", getAbsolutePath(RHINO_MODEL_FILENAME))
                        .putExtra("rhinoContextFilePath", getAbsolutePath(RHINO_CONTEXT_FILENAME));
                intent.setAction(recordButton.isChecked() ? AudioRecorderService.START_RECORDING : AudioRecorderService.STOP_RECORDING);
                startService(intent);
            }
        });
    }
}
