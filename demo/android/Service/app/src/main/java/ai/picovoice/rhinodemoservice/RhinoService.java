/*
 * Copyright 2019 Picovoice Inc.
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

import ai.picovoice.rhino.RhinoException;
import ai.picovoice.rhinomanager.RhinoAudioConsumer;

public class RhinoService extends Service {
    private static final String CHANNEL_ID = "RhinoServiceChannel";

    private RhinoAudioConsumer rhinoAudioConsumer;

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel notificationChannel = new NotificationChannel(
                    CHANNEL_ID,
                    "PorcupineServiceChannel",
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

        String modelFilePath = new File(this.getFilesDir(), "porcupine_params.pv").getAbsolutePath();

        String contextFileName = intent.getStringExtra("contextFileName");
        assert contextFileName != null;
        String contextFilePath = new File(this.getFilesDir(), contextFileName).getAbsolutePath();

        try {
            rhinoAudioConsumer = new RhinoAudioConsumer(
                    modelFilePath,
                    contextFilePath,
                    (isUnderstood, rhinoIntent) -> {
//                        numKeywordsDetected++;
//
//                        CharSequence title = "Porcupine";
//                        PendingIntent contentIntent = PendingIntent.getActivity(
//                                this,
//                                0,
//                                new Intent(this, MainActivity.class),
//                                0);
//
//                        Notification n = new NotificationCompat.Builder(this, CHANNEL_ID)
//                                .setContentTitle(title)
//                                .setContentText("num detected : " + numKeywordsDetected)
//                                .setSmallIcon(R.drawable.ic_launcher_background)
//                                .setContentIntent(contentIntent)
//                                .build();
//
//                        NotificationManager notificationManager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
//                        assert notificationManager != null;
//                        notificationManager.notify(1234, n);
                    });
//            rhinoAudioConsumer.start();
        } catch (RhinoException e) {
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
//        try {
//            rhinoAudioConsumer.stop();
//        } catch (RhinoException e) {
//            Log.e("PORCUPINE_SERVICE", e.toString());
//        }

        super.onDestroy();
    }
}
