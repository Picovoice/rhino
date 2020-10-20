/*
    Copyright 2018-2020 Picovoice Inc.

    You may not use this file except in compliance with the license. A copy of the license is
    located in the "LICENSE" file accompanying this source.

    Unless required by applicable law or agreed to in writing, software distributed under the
    License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
    express or implied. See the License for the specific language governing permissions and
    limitations under the License.
*/

package ai.picovoice.rhino;

import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.net.URISyntaxException;
import java.net.URL;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Enumeration;
import java.util.Locale;
import java.util.jar.JarEntry;
import java.util.jar.JarFile;
import java.util.logging.Logger;

class Utils {

    private static final Path RESOURCE_DIRECTORY;
    private static final String ENVIRONMENT_NAME;
    private final static Logger logger = Logger.getLogger(Logger.GLOBAL_LOGGER_NAME);

    static {
        RESOURCE_DIRECTORY = getResourceDirectory();
        ENVIRONMENT_NAME = getEnvironmentName();
    }

    public static boolean isResourcesAvailable() {
        return RESOURCE_DIRECTORY != null;
    }

    public static boolean isEnvironmentSupported() {
        return ENVIRONMENT_NAME != null;
    }

    private static Path getResourceDirectory() {
        // location of resources, either a JAR file or a directory
        final URL resourceURL = Rhino.class.getProtectionDomain().getCodeSource().getLocation();
        Path resourcePath;

        try {
            resourcePath = Paths.get(resourceURL.toURI());
        } catch (URISyntaxException e) {
            resourcePath = Paths.get(resourceURL.getPath());
        }

        if (resourcePath.toString().endsWith(".jar")) {
            try {
                resourcePath = extractResources(resourcePath);
            } catch (IOException e) {
                logger.severe("Failed to extract resources from Rhino JAR.");
                e.printStackTrace();
                return null;
            }
        }

        return resourcePath.resolve("rhino");
    }

    private static Path extractResources(Path jarPath) throws IOException {
        // use jar name to create versioned extraction directory
        String extractionDirName = jarPath.getFileName().toString().replace(".jar", "");

        // extract jar resources to temp directory
        String systemTempDir = System.getProperty("java.io.tmpdir");
        Path resourceDirectoryPath = new File(systemTempDir, extractionDirName).toPath();

        // try to create tmp dir for extraction
        if (!Files.exists(resourceDirectoryPath)) {
            try {
                Files.createDirectory(resourceDirectoryPath);
            } catch (IOException e) {
                logger.severe("Failed to create extraction directory at " + jarPath.toString());
                e.printStackTrace();

                // default extraction directly to tmp
                resourceDirectoryPath = new File(systemTempDir).toPath();
            }
        }

        // read jar file entries
        JarFile jf = new JarFile(jarPath.toFile());
        Enumeration<JarEntry> entries = jf.entries();

        while (entries.hasMoreElements()) {
            JarEntry jarEntry = entries.nextElement();
            String jarEntryName = jarEntry.getName();


            if (jarEntryName.startsWith("rhino")) {
                // copy contents into resource directory
                if (jarEntry.isDirectory()) {
                    Path dstPath = resourceDirectoryPath.resolve(jarEntryName);
                    if (!dstPath.toFile().exists())
                        Files.createDirectory(dstPath);
                } else {
                    Path file = resourceDirectoryPath.resolve(jarEntryName);
                    if (!Files.exists(file)) {
                        try (InputStream is = jf.getInputStream(jarEntry)) {
                            Files.copy(is, file, StandardCopyOption.REPLACE_EXISTING);
                        }
                    }
                }
            }

        }

        return resourceDirectoryPath;
    }

    private static String getEnvironmentName() throws RuntimeException {
        String arch = System.getProperty("os.arch");
        if (arch.equals("amd64") || arch.equals("x86_64")) {
            String os = System.getProperty("os.name", "generic").toLowerCase(Locale.ENGLISH);
            if (os.contains("mac") || os.contains("darwin")) {
                return "mac";
            } else if (os.contains("win")) {
                return "windows";
            } else if (os.contains("linux")) {
                return "linux";
            } else {
                logger.severe("Execution environment not supported. " +
                        "Rhino Java is supported on macOS, Linux and Windows");
                return null;
            }
        } else {
            logger.severe(String.format("Platform architecture (%s) not supported. " +
                    "Rhino Java is only supported on amd64 and x86_64 architectures.", arch));
            return null;
        }
    }

    public static String getPackagedModelPath() {
        return RESOURCE_DIRECTORY.resolve("lib/common/rhino_params.pv").toString();
    }

    public static String getPackagedLibraryPath() {
        if (ENVIRONMENT_NAME == null) {
            return null;
        }

        return switch (ENVIRONMENT_NAME) {
            case "windows" -> RESOURCE_DIRECTORY.resolve("lib/java/windows/amd64/pv_rhino_jni.dll").toString();
            case "mac" -> RESOURCE_DIRECTORY.resolve("lib/java/mac/x86_64/libpv_rhino_jni.dylib").toString();
            case "linux" -> RESOURCE_DIRECTORY.resolve("lib/java/linux/x86_64/libpv_rhino_jni.so").toString();
            default -> null;
        };
    }

    public static String getTestContextPath() {
        return String.format("../../resources/contexts/%s/coffee_maker_%s.rhn", ENVIRONMENT_NAME, ENVIRONMENT_NAME);
    }
}
