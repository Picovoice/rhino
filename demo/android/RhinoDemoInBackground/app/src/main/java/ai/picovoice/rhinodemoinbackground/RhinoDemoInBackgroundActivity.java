package ai.picovoice.rhinodemoinbackground;

import android.content.Intent;
import android.os.Bundle;
import android.support.v7.app.AppCompatActivity;
import android.view.View;
import android.widget.ToggleButton;

public class RhinoDemoInBackgroundActivity extends AppCompatActivity {
    private ToggleButton recordButton;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_rhino_demo_in_background);

        recordButton = findViewById(R.id.recordButton);

        recordButton.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                Intent intent = new Intent(RhinoDemoInBackgroundActivity.this, AudioRecorderService.class);
                intent.setAction(recordButton.isChecked() ? AudioRecorderService.START_RECORDING : AudioRecorderService.STOP_RECORDING);
                startService(intent);
            }
        });
    }
}
