package ai.picovoice.rhinodemo;

import android.util.Log;

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
            final Rhino.RhinoIntent intent = isUnderstood ? rhino.getIntent() : null;
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

    public void reset() throws RhinoException {
        rhino.reset();
        isFinalized = false;
    }
}
