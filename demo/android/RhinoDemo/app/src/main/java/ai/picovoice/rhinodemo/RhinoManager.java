package ai.picovoice.rhinodemo;

import android.util.Log;

import ai.picovoice.rhino.Rhino;
import ai.picovoice.rhino.RhinoException;


public class RhinoManager implements AudioConsumer {
    private final RhinoCallback callback;
    private final Rhino rhino;
    private boolean isFinalized;

    RhinoManager(String modelFilePath, String contextFilePath, RhinoCallback callback) throws RhinoException {
        this.callback = callback;
        rhino = new Rhino(modelFilePath, contextFilePath);
    }

    @Override
    public void consume(short[] pcm) throws Exception {
        if (isFinalized) {
            return;
        }

        isFinalized = rhino.process(pcm);

        if (isFinalized) {
            Log.i("rhino", "finalized");
            if (rhino.isUnderstood()) {
                Log.i("rhino", "understood");
                final Rhino.RhinoIntent intent = rhino.getIntent();
                Log.i("rhino", intent.getIntent());
                Log.i("rhino", intent.getSlots().toString());
                callback.run(true, intent.getIntent(), intent.getSlots());
            } else {
                callback.run(false, null, null);
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
