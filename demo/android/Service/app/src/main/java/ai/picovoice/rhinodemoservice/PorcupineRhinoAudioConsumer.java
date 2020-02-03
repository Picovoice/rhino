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

import ai.picovoice.porcupine.Porcupine;
import ai.picovoice.porcupine.PorcupineException;
import ai.picovoice.rhino.Rhino;
import ai.picovoice.rhino.RhinoException;
import ai.picovoice.rhino.RhinoIntent;
import ai.picovoice.rhinomanager.AudioConsumer;

public class PorcupineRhinoAudioConsumer implements AudioConsumer {
    private final Porcupine porcupine;
    private final Rhino rhino;
    private final PorcupineRhinoCallback callback;
    private boolean isWakeWordDetected;

    PorcupineRhinoAudioConsumer(
            String porcupineModelFilePath,
            String porcupineKeywordFilePath,
            String rhinoModelFilePath,
            String rhinoContextFilePath,
            PorcupineRhinoCallback callback) throws PorcupineException, RhinoException {
        porcupine = new Porcupine(porcupineModelFilePath, porcupineKeywordFilePath, 0.5f);
        rhino = new Rhino(rhinoModelFilePath, rhinoContextFilePath);
        this.callback = callback;
        isWakeWordDetected = false;
    }

    public void delete() throws RhinoException {
        porcupine.delete();
        rhino.delete();
    }

    @Override
    public void consume(short[] pcm) throws Exception {
        if (!isWakeWordDetected) {
            isWakeWordDetected = porcupine.process(pcm) == 0;
            if (isWakeWordDetected) {
                callback.run(true, false, null);
            }
        } else {
            final boolean isFinalized = rhino.process(pcm);
            if (isFinalized) {
                final boolean isUnderstood = rhino.isUnderstood();
                final RhinoIntent intent = isUnderstood ? rhino.getIntent() : null;
                callback.run(false, isUnderstood, intent);
                isWakeWordDetected = false;
                rhino.reset();
            }
        }
    }

    @Override
    public int getFrameLength() {
        return rhino.frameLength();
    }

    @Override
    public int getSampleRate() {
        return rhino.sampleRate();
    }
}
