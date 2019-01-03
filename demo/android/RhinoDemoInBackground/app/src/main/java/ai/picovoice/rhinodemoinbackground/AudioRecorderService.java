package ai.picovoice.rhinodemoinbackground;

import android.app.Notification;
import android.app.PendingIntent;
import android.app.Service;
import android.content.ComponentName;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.os.Bundle;
import android.os.IBinder;
import android.support.annotation.Nullable;
import android.support.v4.app.NotificationCompat;
import android.util.Log;

import ai.picovoice.rhino.Rhino;

public class AudioRecorderService extends Service {
    private static final String TAG = "RHINO_SERVICE";

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    static final String START_RECORDING = "START_RECORDING";
    static final String STOP_RECORDING = "STOP_RECORDING";

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        final String action = intent.getAction();

        if (action == null) {
            throw new IllegalArgumentException("Action is null");
        }

        switch (action) {
            case START_RECORDING:
                startRecording(intent);
                break;
            case STOP_RECORDING:
                stopRecording();
                break;
            default:
                throw new UnsupportedOperationException(action);
        }

        return super.onStartCommand(intent, flags, startId);
    }

    private AudioRecorder audioRecorder;
    private RhinoWithPorcupineAudioConsumer audioConsumer;

    private void startRecording(Intent intent) {
        Log.i(TAG, "start recording");

        Bundle extras = intent.getExtras();
        if (extras == null) {
            throw new IllegalArgumentException("Parameters are null");
        }

        final String porcupineModelFilePath = extras.getString("porcupineModelFilePath");
        final String porcupineKeywordFilePath = extras.getString("porcupineKeywordFilePath");
        final float porcupineSensitivity = extras.getFloat("porcupineSensitivity");
        final String rhinoModelFilePath = extras.getString("rhinoModelFilePath");
        final String rhinoContextFilePath = extras.getString("rhinoContextFilePath");


        try {
            audioConsumer = new RhinoWithPorcupineAudioConsumer(
                    porcupineModelFilePath,
                    porcupineKeywordFilePath,
                    porcupineSensitivity,
                    rhinoModelFilePath,
                    rhinoContextFilePath,
                    new PorcupineCallback() {
                        @Override
                        public void run() {
                            Log.i(TAG, "wake word detected");
                        }
                    },
                    new RhinoCallback() {
                        @Override
                        public void run(boolean isUnderstood, Rhino.Intent intent) {
                            Log.i(TAG, isUnderstood ? "true" : "false");
                            Log.i(TAG, intent.getIntent());
                        }
                    });
        } catch (Exception e) {
            Log.e(TAG, e.getMessage());
        }
        audioRecorder = new AudioRecorder(audioConsumer);
        audioRecorder.start();
        PendingIntent pendingIntent = PendingIntent.getActivity(this, 0, intent, 0);

        // Create notification builder.
        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, "SOME_CHANNEL");

        // Make notification show big text.
        NotificationCompat.BigTextStyle bigTextStyle = new NotificationCompat.BigTextStyle();
        bigTextStyle.bigText("Demo for speech-to-intent and wake-word detection engines.");
        bigTextStyle.setBigContentTitle("Picovoice");
        // Set big text style.
        builder.setStyle(bigTextStyle);

        builder.setWhen(System.currentTimeMillis());
        builder.setSmallIcon(R.mipmap.ic_launcher);
        Bitmap largeIconBitmap = BitmapFactory.decodeResource(getResources(), R.drawable.ic_launcher_background);
        builder.setLargeIcon(largeIconBitmap);
        // Make the notification max priority.
        builder.setPriority(Notification.PRIORITY_MAX);
        // Make head-up notification.
        builder.setFullScreenIntent(pendingIntent, true);

        // Build the notification.
        Notification notification = builder.build();

        startForeground(1, notification);
    }

    private void stopRecording() {
        Log.i(TAG, "stop recording");

        try {
            audioRecorder.stop();
            audioConsumer.delete();
        } catch (Exception e) {
            Log.e(TAG, e.getMessage());
        }

        audioRecorder = null;
        audioConsumer = null;

        stopForeground(true);
        stopSelf();
    }

    @Override
    public ComponentName startForegroundService(Intent service) {
        return super.startForegroundService(service);
    }
}
