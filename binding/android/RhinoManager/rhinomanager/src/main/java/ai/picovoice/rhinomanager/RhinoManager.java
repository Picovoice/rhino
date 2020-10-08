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

import ai.picovoice.rhino.Rhino;
import ai.picovoice.rhino.RhinoException;

/**
 * High-level interface for Rhino Speech-to-Intent engine. It handles recording audio from microphone,
 * processes it in real-time using Rhino, and notifies the client when an intent is inferred from
 * the spoken command.
 */
public class RhinoManager {
    private final Rhino rhino;
    private final RhinoManagerCallback callback;

    /**
     * Constructor.
     *
     * @param modelPath   Absolute path to the file containing model parameters.
     * @param contextPath Absolute path to file containing context parameters. A context represents
     *                    the set of expressions (spoken commands), intents, and intent arguments
     *                    (slots) within a domain of interest.
     * @param sensitivity Inference sensitivity. It should be a number within [0, 1]. A higher
     *                    sensitivity value results in fewer misses at the cost of (potentially)
     *                    increasing the erroneous inference rate.
     * @param callback    It is invoked upon completion of intent inference.
     * @throws RhinoManagerException if there is an error in reading audio or intent inference.
     */
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
    }

    /**
     * Start recording audio from the microphone and infers the user's intent from the spoken
     * command. Once the inference is finalized it will invoke the user provided callback and
     * terminates recording audio.
     */
    public void process() {
        Executors.newSingleThreadExecutor().submit(new Callable<Void>() {
            @Override
            public Void call() throws RhinoManagerException {
                android.os.Process.setThreadPriority(Process.THREAD_PRIORITY_URGENT_AUDIO);
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

                    boolean isFinalized = false;

                    while (!isFinalized) {
                        if (audioRecord.read(buffer, 0, buffer.length) == buffer.length) {
                            isFinalized = rhino.process(buffer);
                            if (isFinalized) {
                                callback.invoke(rhino.getInference());
                            }
                        }
                    }

                    audioRecord.stop();
                } catch (Exception e) {
                    throw new RhinoManagerException(e);
                } finally {
                    if (audioRecord != null) {
                        audioRecord.release();
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
}
