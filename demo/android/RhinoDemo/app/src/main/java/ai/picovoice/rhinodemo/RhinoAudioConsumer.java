/*
 * Copyright 2018 Picovoice Inc.
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

package ai.picovoice.rhinodemo;

import ai.picovoice.rhino.Rhino;
import ai.picovoice.rhino.RhinoException;
import ai.picovoice.rhino.RhinoIntent;

/**
 * An implementation of {@link ai.picovoice.rhinodemo.AudioConsumer} for Picovoice's speech-to-intent
 * engine (aka Rhino).
 */
public class RhinoAudioConsumer implements AudioConsumer {
    private final Rhino rhino;
    private final RhinoCallback callback;
    private boolean isFinalized;

    /**
     * Constructor.
     * @param modelFilePath Absolute path to model file.
     * @param contextFilePath Absolute path to context file.
     * @param callback Callback to be executed upon inference of the intent.
     * @throws RhinoException On failure.
     */
    RhinoAudioConsumer(String modelFilePath, String contextFilePath, RhinoCallback callback) throws RhinoException {
        rhino = new Rhino(modelFilePath, contextFilePath);
        this.callback = callback;
    }

    /**
     * Releases resources acquired by Rhino.
     * @throws RhinoException On failure.
     */
    void delete() throws RhinoException {
        rhino.delete();
    }

    @Override
    public void consume(short[] pcm) throws Exception {
        if (isFinalized) {
            return;
        }

        isFinalized = rhino.process(pcm);

        if (isFinalized) {
            final boolean isUnderstood = rhino.isUnderstood();
            final RhinoIntent intent = isUnderstood ? rhino.getIntent() : null;
            callback.run(isUnderstood, intent);
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

    /**
     * Resets the internal state of the engine. It should be called before the engine can be used
     * to infer intent from a new stream of audio.
     * @throws RhinoException On failure.
     */
    void reset() throws RhinoException {
        rhino.reset();
        isFinalized = false;
    }
}
