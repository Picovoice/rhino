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

package ai.picovoice.rhinodemowithporcupine;

import ai.picovoice.porcupine.Porcupine;
import ai.picovoice.porcupine.PorcupineException;
import ai.picovoice.rhino.Rhino;
import ai.picovoice.rhino.RhinoException;

public class RhinoWithPorcupineAudioConsumer implements AudioConsumer {
    private final Porcupine porcupine;
    private final Rhino rhino;
    private final PorcupineCallback porcupineCallback;
    private final RhinoCallback rhinoCallback;
    private boolean wakeWordDetected;
    private boolean intentInferenceIsFinalized;

    RhinoWithPorcupineAudioConsumer(
            String porcupineModelFilePath,
            String porcupineKeywordFilePath,
            float porcupineSensitivity,
            String rhinoModelFilePath,
            String rhinoContextFilePath,
            PorcupineCallback porcupineCallback,
            RhinoCallback rhinoCallback) throws PorcupineException, RhinoException {
        porcupine = new Porcupine(porcupineModelFilePath, porcupineKeywordFilePath, porcupineSensitivity);
        rhino = new Rhino(rhinoModelFilePath, rhinoContextFilePath);

        this.porcupineCallback = porcupineCallback;
        this.rhinoCallback = rhinoCallback;

        wakeWordDetected = false;
        intentInferenceIsFinalized = false;
    }

    @Override
    public void consume(short[] pcm) throws Exception {
        if (!wakeWordDetected) {
            wakeWordDetected = porcupine.processFrame(pcm);

            if (wakeWordDetected) {
                porcupineCallback.run();
            }
        } else if (!intentInferenceIsFinalized) {
            intentInferenceIsFinalized = rhino.process(pcm);

            if (intentInferenceIsFinalized) {
                final boolean isUnderstood = rhino.isUnderstood();
                final Rhino.Intent rhinoIntent = isUnderstood ? rhino.getIntent() : null;
                rhinoCallback.run(isUnderstood, rhinoIntent);
            }
        }
    }

    void reset() throws RhinoException {
        rhino.reset();

        wakeWordDetected = false;
        intentInferenceIsFinalized = false;
    }

    void delete() throws RhinoException {
        porcupine.delete();
        rhino.delete();
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
