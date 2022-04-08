/*
    Copyright 2022 Picovoice Inc.

    You may not use this file except in compliance with the license. A copy of the license is
    located in the "LICENSE" file accompanying this source.

    Unless required by applicable law or agreed to in writing, software distributed under the
    License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
    express or implied. See the License for the specific language governing permissions and
    limitations under the License.
*/

package ai.picovoice.rhino;

import java.nio.file.Paths;

public class RhinoTestUtils {

    private static final String ENVIRONMENT_NAME;

    static {
        ENVIRONMENT_NAME = Utils.getEnvironmentName();
    }

    static String appendLanguage(String s, String language) {
        if (language.equals("en"))
            return s;
        return s + "_" + language;
    }

    static String getTestContextPath(String language, String context) {
        return Paths.get(System.getProperty("user.dir"))
                .resolve("../../resources")
                .resolve(appendLanguage("contexts", language))
                .resolve(ENVIRONMENT_NAME)
                .resolve(context + "_" + ENVIRONMENT_NAME + ".rhn")
                .toString();
    }

    static String getTestModelPath(String language) {
        return Paths.get(System.getProperty("user.dir"))
                .resolve("../../lib/common")
                .resolve(appendLanguage("rhino_params", language)+".pv")
                .toString();
    }

    static String getAudioFilePath(String audioFileName) {
        return Paths.get(System.getProperty("user.dir"))
                .resolve("../../resources/audio_samples")
                .resolve(audioFileName)
                .toString();
    }
}
