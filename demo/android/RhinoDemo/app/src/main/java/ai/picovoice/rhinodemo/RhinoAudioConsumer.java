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


public class RhinoAudioConsumer implements AudioConsumer {
    private final Rhino rhino;
    private final RhinoCallback callback;
    private boolean isFinalized;

    RhinoAudioConsumer(String modelFilePath, String contextFilePath, RhinoCallback callback) throws RhinoException {
        rhino = new Rhino(modelFilePath, contextFilePath);
        this.callback = callback;
    }

    @Override
    public void consume(short[] pcm) throws Exception {
        if (isFinalized) {
            return;
        }

        isFinalized = rhino.process(pcm);

        if (isFinalized) {
            final boolean isUnderstood = rhino.isUnderstood();
            final Rhino.Intent intent = isUnderstood ? rhino.getIntent() : null;
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

    void reset() throws RhinoException {
        rhino.reset();
        isFinalized = false;
    }
}
