/*
    Copyright 2018-2022 Picovoice Inc.
    You may not use this file except in compliance with the license. A copy of the license is
    located in the "LICENSE" file accompanying this source.
    Unless required by applicable law or agreed to in writing, software distributed under the
    License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
    express or implied. See the License for the specific language governing permissions and
    limitations under the License.
*/

package ai.picovoice.rhino;

import android.content.Context;
import android.media.AudioFormat;
import android.media.AudioRecord;
import android.media.MediaRecorder;
import android.os.Handler;
import android.os.Looper;
import android.os.Process;
import android.util.Log;

import java.util.concurrent.Callable;
import java.util.concurrent.Executors;

/**
 * High-level Android binding for Rhino Speech-to-Intent engine. It handles recording audio from
 * microphone, processes it in real-time using Rhino, and notifies the client when an intent is
 * inferred from the spoken command. For detailed information about Rhino refer to ${@link Rhino}.
 */
public class RhinoManager {
    private final Rhino rhino;
    private final RhinoManagerCallback callback;
    private final RhinoManagerErrorCallback errorCallback;
    private final Handler callbackHandler = new Handler(Looper.getMainLooper());

    /**
     * Private constructor.
     *
     * @param rhino         Absolute path to the file containing model parameters.
     * @param callback      It is invoked upon completion of intent inference.
     * @param errorCallback A callback that reports errors encountered while processing audio.
     */
    private RhinoManager(
            Rhino rhino,
            RhinoManagerCallback callback,
            RhinoManagerErrorCallback errorCallback) {

        this.rhino = rhino;
        this.callback = callback;
        this.errorCallback = errorCallback;
    }

    /**
     * Start recording audio from the microphone and infers the user's intent from the spoken
     * command. Once the inference is finalized it will invoke the user provided callback and
     * terminates recording audio.
     */
    public void process() {
        Executors.newSingleThreadExecutor().submit(new Callable<Void>() {
            @Override
            public Void call() {
                android.os.Process.setThreadPriority(Process.THREAD_PRIORITY_URGENT_AUDIO);
                final int minBufferSize = AudioRecord.getMinBufferSize(
                        rhino.getSampleRate(),
                        AudioFormat.CHANNEL_IN_MONO,
                        AudioFormat.ENCODING_PCM_16BIT);
                final int bufferSize = Math.max(rhino.getSampleRate() / 2, minBufferSize);

                AudioRecord audioRecord = null;

                short[] buffer = new short[rhino.getFrameLength()];

                boolean isFinalized = false;
                try {
                    audioRecord = new AudioRecord(
                            MediaRecorder.AudioSource.MIC,
                            rhino.getSampleRate(),
                            AudioFormat.CHANNEL_IN_MONO,
                            AudioFormat.ENCODING_PCM_16BIT,
                            bufferSize);
                    audioRecord.startRecording();

                    while (!isFinalized) {
                        if (audioRecord.read(buffer, 0, buffer.length) == buffer.length) {
                            isFinalized = rhino.process(buffer);
                        }
                    }
                    audioRecord.stop();
                } catch (final Exception e) {
                    if (errorCallback != null) {
                        callbackHandler.post(new Runnable() {
                            @Override
                            public void run() {
                                errorCallback.invoke(new RhinoException(e));
                            }
                        });
                    } else {
                        Log.e("RhinoManager", e.toString());
                    }
                } finally {
                    if (audioRecord != null) {
                        audioRecord.release();
                    }

                    if (isFinalized) {
                        try {
                            final RhinoInference inference = rhino.getInference();
                            callbackHandler.post(new Runnable() {
                                @Override
                                public void run() {
                                    callback.invoke(inference);
                                }
                            });
                        } catch (final RhinoException e) {
                            if (errorCallback != null) {
                                callbackHandler.post(new Runnable() {
                                    @Override
                                    public void run() {
                                        errorCallback.invoke(new RhinoException(e));
                                    }
                                });
                            } else {
                                Log.e("RhinoManager", e.toString());
                            }
                        }
                    }
                }
                return null;
            }
        });
    }

    /**
     * Releases resources acquired by Rhino. It should be called when disposing the object.
     */
    public void delete() {
        rhino.delete();
    }

    /**
     * Getter for version.
     *
     * @return Version.
     */
    public String getVersion() {
        return rhino.getVersion();
    }

    /**
     * Getter for Rhino context information.
     *
     * @return Context information.
     */
    public String getContextInformation() throws RhinoException {
        return rhino.getContextInformation();
    }

    /**
     * Builder for creating an instance of RhinoManager with a mixture of default arguments
     */
    public static class Builder {

        private String accessKey = null;
        private String modelPath = null;
        private String contextPath = null;
        private float sensitivity = 0.5f;
        private float endpointDurationSec = 1.0f;
        private boolean requireEndpoint = true;
        private RhinoManagerErrorCallback errorCallback = null;

        public RhinoManager.Builder setAccessKey(String accessKey) {
            this.accessKey = accessKey;
            return this;
        }

        public RhinoManager.Builder setModelPath(String modelPath) {
            this.modelPath = modelPath;
            return this;
        }

        public RhinoManager.Builder setContextPath(String contextPath) {
            this.contextPath = contextPath;
            return this;
        }

        public RhinoManager.Builder setSensitivity(float sensitivity) {
            this.sensitivity = sensitivity;
            return this;
        }

        public RhinoManager.Builder setEndpointDurationSec(float endpointDurationSec) {
            this.endpointDurationSec = endpointDurationSec;
            return this;
        }

        public RhinoManager.Builder setRequireEndpoint(boolean requireEndpoint) {
            this.requireEndpoint = requireEndpoint;
            return this;
        }

        public RhinoManager.Builder setErrorCallback(RhinoManagerErrorCallback errorCallback) {
            this.errorCallback = errorCallback;
            return this;
        }

        /**
         * Creates an instance of RhinoManager.
         *
         * @param context  Android app context (for extracting Rhino resources)
         * @param callback A callback function that is invoked upon intent inference.
         * @return A RhinoManager instance
         * @throws RhinoException if there is an error while initializing Rhino.
         */
        public RhinoManager build(Context context, RhinoManagerCallback callback) throws RhinoException {
            Rhino rhino = new Rhino.Builder()
                    .setAccessKey(accessKey)
                    .setModelPath(modelPath)
                    .setContextPath(contextPath)
                    .setSensitivity(sensitivity)
                    .setEndpointDurationSec(endpointDurationSec)
                    .setRequireEndpoint(requireEndpoint)
                    .build(context);
            return new RhinoManager(rhino, callback, errorCallback);
        }
    }
}
