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

import ai.picovoice.rhino.RhinoIntent;

/**
 * Callback to be used by Rhino (Picovoice's speech to intent engine) upon inferring user's intent.
 */
public interface RhinoCallback {
    /**
     * Callback function.
     * @param isUnderstood Flag indicating if the spoken command is understood and is within domain
     *                     of interest.
     * @param intent User's intent.
     */
    void run(final boolean isUnderstood, final RhinoIntent intent);
}
