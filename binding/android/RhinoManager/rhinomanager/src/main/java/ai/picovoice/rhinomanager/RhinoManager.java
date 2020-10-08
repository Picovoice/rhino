/*
    Copyright 2018-2020 Picovoice Inc.
    You may not use this file except in compliance with the license. A copy of the license is
    located in the "LICENSE" file accompanying this source.
    Unless required by applicable law or agreed to in writing, software distributed under the
    License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
    express or implied. See the License for the specific language governing permissions and
    limitations under the License.
*/

package ai.picovoice.rhinomanager;

import android.media.AudioFormat;
import android.media.AudioRecord;
import android.media.MediaRecorder;
import android.os.Process;

import java.util.concurrent.Callable;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;

import ai.picovoice.rhino.Rhino;
import ai.picovoice.rhino.RhinoException;

public class RhinoManager {
    private class MicrophoneReader {
        private AtomicBoolean started = new AtomicBoolean(false);
        private AtomicBoolean stop = new AtomicBoolean(false);
        private AtomicBoolean stopped = new AtomicBoolean(false);

        void start() {
            if (started.get()) {
                return;
            }

            started.set(true);

            Executors.newSingleThreadExecutor().submit(new Callable<Void>() {
                @Override
                public Void call() throws RhinoManagerException {
                    android.os.Process.setThreadPriority(Process.THREAD_PRIORITY_URGENT_AUDIO);
                    read();
                    return null;
                }
            });
        }

        void stop() throws InterruptedException {
            if (!started.get()) {
                return;
            }

            stop.set(true);

            while (!stopped.get()) {
                Thread.sleep(10);
            }

            started.set(false);
            stop.set(false);
            stopped.set(false);
        }

        private void read() throws RhinoManagerException {
            final int minBufferSize = AudioRecord.getMinBufferSize(
                    rhino.getSampleRate(),
                    AudioFormat.CHANNEL_IN_MONO,
                    AudioFormat.ENCODING_PCM_16BIT);
            final int bufferSize = Math.max(rhino.getSampleRate() / 2, minBufferSize);

            AudioRecord audioRecord = null;

            short[] buffer = new short[rhino.getFrameLength()];

            try {
                audioRecord = new AudioRecord(
                        MediaRecorder.AudioSource.MIC,
                        rhino.getSampleRate(),
                        AudioFormat.CHANNEL_IN_MONO,
                        AudioFormat.ENCODING_PCM_16BIT,
                        bufferSize);
                audioRecord.startRecording();

                while (!stop.get()) {
                    if (audioRecord.read(buffer, 0, buffer.length) == buffer.length) {
                        try {
                            final boolean isFinalized = rhino.process(buffer);
                            if (isFinalized) {
                                callback.invoke(rhino.getInference());
                            }
                        } catch (RhinoException e) {
                            throw new RhinoManagerException(e);
                        }
                    }
                }

                audioRecord.stop();
            } catch (IllegalArgumentException | IllegalStateException e) {
                throw new RhinoManagerException(e);
            } finally {
                if (audioRecord != null) {
                    audioRecord.release();
                }

                stopped.set(true);
            }
        }
    }

    private final MicrophoneReader microphoneReader;
    private final Rhino rhino;
    private final RhinoManagerCallback callback;

    public RhinoManager(
            String modelPath,
            String contextPath,
            float sensitivity,
            RhinoManagerCallback callback) throws RhinoManagerException {
        try {
            rhino = new Rhino(modelPath, contextPath, sensitivity);
        } catch (RhinoException e) {
            throw new RhinoManagerException(e);
        }

        this.callback = callback;
        microphoneReader = new MicrophoneReader();
    }

    public void delete() {
        rhino.delete();
    }

    public void start() {
        microphoneReader.start();
    }

    public void stop() throws RhinoManagerException {
        try {
            microphoneReader.stop();
        } catch (InterruptedException e) {
            throw new RhinoManagerException(e);
        }
    }
}
