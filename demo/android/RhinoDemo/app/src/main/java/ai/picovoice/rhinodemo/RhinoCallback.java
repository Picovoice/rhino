package ai.picovoice.rhinodemo;

import ai.picovoice.rhino.Rhino;

public interface RhinoCallback {
    void run(final boolean isUnderstood, final Rhino.RhinoIntent intent);
}
