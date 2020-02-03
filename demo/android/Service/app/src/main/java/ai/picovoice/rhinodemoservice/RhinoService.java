/*
    Copyright 2018 Picovoice Inc.
    You may not use this file except in compliance with the license. A copy of the license is
    located in the "LICENSE" file accompanying this source.
    Unless required by applicable law or agreed to in writing, software distributed under the
    License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
    express or implied. See the License for the specific language governing permissions and
    limitations under the License.
*/

package ai.picovoice.rhinodemoservice;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.IBinder;
import android.util.Log;

import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;

import java.io.File;
import java.util.Map;

import ai.picovoice.porcupine.PorcupineException;
import ai.picovoice.rhino.RhinoException;
import ai.picovoice.rhinomanager.AudioRecorder;

public class RhinoService extends Service {
    private static final String CHANNEL_ID = "PorcupineRhinoServiceChannel";

    private AudioRecorder audioRecorder;

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel notificationChannel = new NotificationChannel(
                    CHANNEL_ID,
                    "PorcupineRhinoServiceChannel",
                    NotificationManager.IMPORTANCE_HIGH);

            NotificationManager manager = getSystemService(NotificationManager.class);
            assert manager != null;
            manager.createNotificationChannel(notificationChannel);
        }
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        createNotificationChannel();

        PendingIntent pendingIntent = PendingIntent.getActivity(
                this,
                0,
                new Intent(this, MainActivity.class),
                0);

        Notification notification = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle("Rhino")
                .setContentText("listening ...")
                .setSmallIcon(R.drawable.ic_launcher_background)
                .setContentIntent(pendingIntent)
                .build();

        startForeground(1234, notification);

        String porcupineModelFilePath = new File(this.getFilesDir(), "porcupine_params.pv").getAbsolutePath();
        String rhinoModelFilePath = new File(getFilesDir(), "rhino_params.pv").getAbsolutePath();

        String keywordFileName = intent.getStringExtra("keywordFileName");
        assert keywordFileName != null;
        String keywordFilePath = new File(getFilesDir(), keywordFileName).getAbsolutePath();


        String contextFileName = intent.getStringExtra("contextFileName");
        assert contextFileName != null;
        String contextFilePath = new File(this.getFilesDir(), contextFileName).getAbsolutePath();

        try {
            PorcupineRhinoAudioConsumer audioConsumer = new PorcupineRhinoAudioConsumer(
                    porcupineModelFilePath,
                    keywordFilePath,
                    rhinoModelFilePath,
                    contextFilePath,
                    (isWakeWordDetected, isUnderstood, rhinoIntent) -> {
                        CharSequence title = "PorcupineRhino";
                        PendingIntent contentIntent = PendingIntent.getActivity(
                                this,
                                0,
                                new Intent(this, MainActivity.class),
                                0);

                        String contextText;
                        if (isWakeWordDetected) {
                            contextText = "wake word detected. listening ...";
                        } else if (isUnderstood) {
                            contextText = "intent : " + rhinoIntent.getIntent() + " - ";
                            final Map<String, String> slots = rhinoIntent.getSlots();
                            for (String key : slots.keySet()) {
                                contextText += key + " : " + slots.get(key) + " - ";
                            }
                        } else {
                            contextText = "did not understand the command";
                        }

                        Notification n = new NotificationCompat.Builder(this, CHANNEL_ID)
                                .setContentTitle(title)
                                .setContentText(contextText)
                                .setSmallIcon(R.drawable.ic_launcher_background)
                                .setContentIntent(contentIntent)
                                .build();

                        NotificationManager notificationManager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
                        assert notificationManager != null;
                        notificationManager.notify(1234, n);
                    });

            audioRecorder = new AudioRecorder(audioConsumer);

            audioRecorder.start();
        } catch (RhinoException | PorcupineException e) {
            Log.e("PORCUPINE_SERVICE", e.toString());
        }

        return super.onStartCommand(intent, flags, startId);
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public void onDestroy() {
        try {
            if (audioRecorder != null) {
                audioRecorder.stop();
            }
        } catch (InterruptedException e) {
            //
        }

        super.onDestroy();
    }
}
