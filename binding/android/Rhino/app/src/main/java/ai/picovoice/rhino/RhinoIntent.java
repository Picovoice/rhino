/*
    Copyright 2018 Picovoice Inc.
    You may not use this file except in compliance with the license. A copy of the license is
    located in the "LICENSE" file accompanying this source.
    Unless required by applicable law or agreed to in writing, software distributed under the
    License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
    express or implied. See the License for the specific language governing permissions and
    limitations under the License.
*/

package ai.picovoice.rhino;

import java.util.Map;

/**
 * Data object representing an inferred intent from spoken command.
 */
public class RhinoIntent {
    final private String intent;
    final private Map<String, String> slots;

    /**
     * Constructor.
     * @param intent Intent.
     * @param slots Intent slots (arguments).
     */
    RhinoIntent(String intent, Map<String, String> slots) {
        this.intent = intent;
        this.slots = slots;
    }

    /**
     * Getter for intent.
     * @return Intent.
     */
    public String getIntent() {
        return intent;
    }

    /**
     * Getter for intent slots (arguments).
     * @return slots.
     */
    public Map<String, String> getSlots() {
        return slots;
    }
}
