/*
    Copyright 2018-2021 Picovoice Inc.

    You may not use this file except in compliance with the license. A copy of the license is
    located in the "LICENSE" file accompanying this source.

    Unless required by applicable law or agreed to in writing, software distributed under the
    License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
    express or implied. See the License for the specific language governing permissions and
    limitations under the License.
*/

package ai.picovoice.rhinodemo;

import ai.picovoice.rhino.*;
import org.apache.commons.cli.*;

import java.io.File;
import java.io.IOException;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.util.Map;
import javax.sound.sampled.*;

public class MicDemo {
    public static void runDemo(String accessKey, String contextPath, String libraryPath, String modelPath,
                               float sensitivity, float endpointDuration, int audioDeviceIndex, String outputPath, boolean requireEndpoint) {

        // for file output
        File outputFile = null;
        ByteArrayOutputStream outputStream = null;
        long totalBytesCaptured = 0;
        AudioFormat format = new AudioFormat(16000f, 16, 1, true, false);

        // get audio capture device
        DataLine.Info dataLineInfo = new DataLine.Info(TargetDataLine.class, format);
        TargetDataLine micDataLine;
        try {
            micDataLine = getAudioDevice(audioDeviceIndex, dataLineInfo);
            micDataLine.open(format);
        } catch (LineUnavailableException e) {
            System.err.println("Failed to get a valid capture device. Use --show_audio_devices to " +
                    "show available capture devices and their indices");
            System.exit(1);
            return;
        }

        Rhino rhino = null;
        try {

            rhino = new Rhino.Builder()
                    .setAccessKey(accessKey)
                    .setContextPath(contextPath)
                    .setLibraryPath(libraryPath)
                    .setModelPath(modelPath)
                    .setSensitivity(sensitivity)
                    .setEndpointDuration(endpointDuration)
                    .setRequireEndpoint(requireEndpoint)
                    .build();

            if (outputPath != null) {
                outputFile = new File(outputPath);
                outputStream = new ByteArrayOutputStream();
            }

            micDataLine.start();

            System.out.println(rhino.getContextInformation());
            System.out.println("Press enter to stop recording.");
            System.out.println("Listening...");

            // buffers for processing audio
            int frameLength = rhino.getFrameLength();
            ByteBuffer captureBuffer = ByteBuffer.allocate(frameLength * 2);
            captureBuffer.order(ByteOrder.LITTLE_ENDIAN);
            short[] rhinoBuffer = new short[frameLength];

            int numBytesRead;
            while (System.in.available() == 0) {

                // read a buffer of audio
                numBytesRead = micDataLine.read(captureBuffer.array(), 0, captureBuffer.capacity());
                totalBytesCaptured += numBytesRead;

                // write to output if we're recording
                if (outputStream != null) {
                    outputStream.write(captureBuffer.array(), 0, numBytesRead);
                }

                // don't pass to rhino if we don't have a full buffer
                if (numBytesRead != frameLength * 2) {
                    continue;
                }

                // copy into 16-bit buffer
                captureBuffer.asShortBuffer().get(rhinoBuffer);

                // process with rhino
                boolean isFinalized = rhino.process(rhinoBuffer);
                if (isFinalized) {

                    RhinoInference inference = rhino.getInference();
                    if (inference.getIsUnderstood()) {

                        System.out.println("{");
                        System.out.println(String.format("  intent : '%s'", inference.getIntent()));
                        System.out.println("  slots : {");
                        for (Map.Entry<String, String> slot : inference.getSlots().entrySet()) {
                            System.out.println(String.format("    %s : '%s'", slot.getKey(), slot.getValue()));
                        }
                        System.out.println("  }");
                        System.out.println("}");
                    } else {
                        System.out.println("Didn't understand the command.");
                    }
                }
            }
            System.out.println("Stopping...");
        } catch (Exception e) {
            System.err.println(e.toString());
        } finally {
            if (outputStream != null && outputFile != null) {

                // need to transfer to input stream to write
                ByteArrayInputStream writeArray = new ByteArrayInputStream(outputStream.toByteArray());
                AudioInputStream writeStream = new AudioInputStream(writeArray, format, totalBytesCaptured / format.getFrameSize());

                try {
                    AudioSystem.write(writeStream, AudioFileFormat.Type.WAVE, outputFile);
                } catch (IOException e) {
                    System.err.printf("Failed to write audio to '%s'.\n", outputFile.getPath());
                    e.printStackTrace();
                }
            }

            if (rhino != null) {
                rhino.delete();
            }
        }
    }

    private static void showAudioDevices() {

        // get available audio devices
        Mixer.Info[] allMixerInfo = AudioSystem.getMixerInfo();
        Line.Info captureLine = new Line.Info(TargetDataLine.class);

        for (int i = 0; i < allMixerInfo.length; i++) {

            // check if supports capture in the format we need
            Mixer mixer = AudioSystem.getMixer(allMixerInfo[i]);
            if (mixer.isLineSupported(captureLine)) {
                System.out.printf("Device %d: %s\n", i, allMixerInfo[i].getName());
            }
        }
    }

    private static TargetDataLine getDefaultCaptureDevice(DataLine.Info dataLineInfo) throws LineUnavailableException {

        if (!AudioSystem.isLineSupported(dataLineInfo)) {
            throw new LineUnavailableException("Default capture device does not support the audio " +
                    "format required by Picovoice (16kHz, 16-bit, linearly-encoded, single-channel PCM).");
        }

        return (TargetDataLine) AudioSystem.getLine(dataLineInfo);
    }

    private static TargetDataLine getAudioDevice(int deviceIndex, DataLine.Info dataLineInfo) throws LineUnavailableException {

        if (deviceIndex >= 0) {
            try {
                Mixer.Info mixerInfo = AudioSystem.getMixerInfo()[deviceIndex];
                Mixer mixer = AudioSystem.getMixer(mixerInfo);

                if (mixer.isLineSupported(dataLineInfo)) {
                    return (TargetDataLine) mixer.getLine(dataLineInfo);
                } else {
                    System.err.printf("Audio capture device at index %s does not support the audio format required by " +
                            "Picovoice. Using default capture device.", deviceIndex);
                }
            } catch (Exception e) {
                System.err.printf("No capture device found at index %s. Using default capture device.", deviceIndex);
            }
        }

        // use default capture device if we couldn't get the one requested
        return getDefaultCaptureDevice(dataLineInfo);
    }

    public static void main(String[] args) {

        Options options = BuildCommandLineOptions();
        CommandLineParser parser = new DefaultParser();
        HelpFormatter formatter = new HelpFormatter();

        CommandLine cmd;
        try {
            cmd = parser.parse(options, args);
        } catch (ParseException e) {
            System.out.println(e.getMessage());
            formatter.printHelp("rhinomicdemo", options);
            System.exit(1);
            return;
        }

        if (cmd.hasOption("help")) {
            formatter.printHelp("rhinomicdemo", options);
            return;
        }

        if (cmd.hasOption("show_audio_devices")) {
            showAudioDevices();
            return;
        }

        String accessKey = cmd.getOptionValue("access_key");
        String libraryPath = cmd.getOptionValue("library_path");
        String modelPath = cmd.getOptionValue("model_path");
        String contextPath = cmd.getOptionValue("context_path");
        String sensitivityStr = cmd.getOptionValue("sensitivity");
        String endpointDurationStr = cmd.getOptionValue("endpoint_duration");
        String audioDeviceIndexStr = cmd.getOptionValue("audio_device_index");
        String outputPath = cmd.getOptionValue("output_path");
        String requireEndpointValue = cmd.getOptionValue("require_endpoint");

        if (accessKey == null || accessKey.length() == 0) {
            throw new IllegalArgumentException("AccessKey is required for Rhino.");
        }

        // Parse sensitivity
        float sensitivity = 0.5f;
        if (sensitivityStr != null) {
            try {
                sensitivity = Float.parseFloat(sensitivityStr);
            } catch (Exception e) {
                throw new IllegalArgumentException("Failed to parse sensitivity value. " +
                        "Must be a floating-point number between [0,1].");
            }

            if (sensitivity < 0 || sensitivity > 1) {
                throw new IllegalArgumentException(String.format("Failed to parse sensitivity value (%s). " +
                        "Must be a floating-point number between [0,1].", sensitivity));
            }
        }

        // Parse endpoint duration
        float endpointDuration = 1.0f;
        if (endpointDurationStr != null) {
            try {
                endpointDuration = Float.parseFloat(endpointDurationStr);
            } catch (Exception e) {
                throw new IllegalArgumentException("Failed to parse endpointDuration value. " +
                        "Must be a floating-point number between [0.5, 5.0].");
            }

            if (endpointDuration < 0.5 || endpointDuration > 5.0) {
                throw new IllegalArgumentException(String.format("Failed to parse endpointDuration value (%s). " +
                        "Must be a floating-point number between [0.5, 5.0].", endpointDuration));
            }
        }

        if(contextPath == null){
            throw new IllegalArgumentException("No context file provided. This is a required argument.");
        }
        File contextFile = new File(contextPath);
        if (!contextFile.exists()) {
            throw new IllegalArgumentException(String.format("Context file at path '%s' does not exist", contextPath));
        }

        if (libraryPath == null) {
            libraryPath = Rhino.LIBRARY_PATH;
        }

        if (modelPath == null) {
            modelPath = Rhino.MODEL_PATH;
        }

        int audioDeviceIndex = -1;
        if (audioDeviceIndexStr != null) {
            try {
                audioDeviceIndex = Integer.parseInt(audioDeviceIndexStr);
                if (audioDeviceIndex < 0) {
                    throw new IllegalArgumentException(String.format("Audio device index %s is not a " +
                            "valid positive integer.", audioDeviceIndexStr));
                }
            } catch (Exception e) {
                throw new IllegalArgumentException(String.format("Audio device index '%s' is not a " +
                        "valid positive integer.", audioDeviceIndexStr));
            }
        }

        boolean requireEndpoint = true;
        if (requireEndpointValue != null && requireEndpointValue.toLowerCase().equals("false")) {
            requireEndpoint = false;
        }

        runDemo(accessKey, contextPath, libraryPath, modelPath, sensitivity, endpointDuration, audioDeviceIndex, outputPath, requireEndpoint);
    }

    private static Options BuildCommandLineOptions() {
        Options options = new Options();

        options.addOption(Option.builder("a")
                .longOpt("access_key")
                .hasArg(true)
                .desc("AccessKey obtained from Picovoice Console (https://console.picovoice.ai/).")
                .build());

        options.addOption(Option.builder("c")
                .longOpt("context_path")
                .hasArg(true)
                .desc("Absolute path to context file.")
                .build());

        options.addOption(Option.builder("l")
                .longOpt("library_path")
                .hasArg(true)
                .desc("Absolute path to the Rhino native runtime library.")
                .build());

        options.addOption(Option.builder("m")
                .longOpt("model_path")
                .hasArg(true)
                .desc("Absolute path to the file containing model parameters.")
                .build());

        options.addOption(Option.builder("s")
                .longOpt("sensitivity")
                .hasArgs()
                .desc("Inference sensitivity. It should be a number within [0, 1]. A higher sensitivity value results in " +
                        "fewer misses at the cost of (potentially) increasing the erroneous inference rate. " +
                        "If not set 0.5 will be used.")
                .build());

        options.addOption(Option.builder("u")
                .longOpt("endpoint_duration")
                .hasArgs()
                .desc("Endpoint duration in seconds. An endpoint is a chunk of silence at the end of an " +
                        "utterance that marks the end of spoken command. It should be a positive number within [0.5, 5]. A lower endpoint " +
                        "duration reduces delay and improves responsiveness. A higher endpoint duration assures Rhino doesn't return inference " +
                        "preemptively in case the user pauses before finishing the request.")
                .build());

        options.addOption(Option.builder("e")
                .longOpt("require_endpoint")
                .hasArg(true)
                .desc("If set to `true`, Rhino requires an endpoint (a chunk of silence) after the spoken command. " +
                        "If set to `false`, Rhino tries to detect silence, but if it cannot, it still will provide inference regardless. Set " +
                        "to `false` only if operating in an environment with overlapping speech (e.g. people talking in the background).")
                .build());

        options.addOption(Option.builder("o")
                .longOpt("output_path")
                .hasArg(true)
                .desc("Absolute path to recorded audio for debugging.")
                .build());

        options.addOption(Option.builder("di")
                .longOpt("audio_device_index")
                .hasArg(true)
                .desc("Index of input audio device.")
                .build());

        options.addOption(new Option("sd", "show_audio_devices", false, "Print available recording devices."));
        options.addOption(new Option("h", "help", false, ""));

        return options;
    }
}
