/*
    Copyright 2018-2020 Picovoice Inc.

    You may not use this file except in compliance with the license. A copy of the license is
    located in the "LICENSE" file accompanying this source.

    Unless required by applicable law or agreed to in writing, software distributed under the
    License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
    express or implied. See the License for the specific language governing permissions and
    limitations under the License.
*/

package ai.picovoice.rhinodemo;

import ai.picovoice.rhino.Rhino;
import ai.picovoice.rhino.RhinoInference;
import org.apache.commons.cli.*;

import javax.sound.sampled.AudioFormat;
import javax.sound.sampled.AudioInputStream;
import javax.sound.sampled.AudioSystem;
import javax.sound.sampled.UnsupportedAudioFileException;
import java.io.File;
import java.io.IOException;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.util.Map;

public class FileDemo {

    public static void runDemo(String accessKey, File inputAudioFile, String libraryPath, String modelPath,
                               String contextPath, float sensitivity, float endpointDuration, boolean requireEndpoint) {

        AudioInputStream audioInputStream;
        try {
            audioInputStream = AudioSystem.getAudioInputStream(inputAudioFile);
        } catch (UnsupportedAudioFileException e) {
            System.err.println("Audio format not supported. Please provide an input file of .au, .aiff or .wav format");
            return;
        } catch (IOException e) {
            System.err.println("Could not find input audio file at " + inputAudioFile);
            return;
        }

        Rhino rhino = null;
        try {
            rhino = new Rhino.Builder()
                    .setAccessKey(accessKey)
                    .setLibraryPath(libraryPath)
                    .setModelPath(modelPath)
                    .setContextPath(contextPath)
                    .setSensitivity(sensitivity)
                    .setEndpointDuration(endpointDuration)
                    .setRequireEndpoint(requireEndpoint)
                    .build();

            AudioFormat audioFormat = audioInputStream.getFormat();

            if (audioFormat.getSampleRate() != 16000.0f || audioFormat.getSampleSizeInBits() != 16) {
                throw new IllegalArgumentException(String.format("Invalid input audio file format. " +
                        "Input file must be a %dkHz, 16-bit audio file.", rhino.getSampleRate()));
            }

            if (audioFormat.getChannels() > 1) {
                System.out.println("Picovoice processes single-channel audio, but a multi-channel file was provided. " +
                        "Processing leftmost channel only.");
            }

            int frameIndex = 0;
            short[] rhinoFrame = new short[rhino.getFrameLength()];

            ByteBuffer sampleBuffer = ByteBuffer.allocate(audioFormat.getFrameSize());
            sampleBuffer.order(ByteOrder.LITTLE_ENDIAN);
            while (audioInputStream.available() != 0) {

                int numBytesRead = audioInputStream.read(sampleBuffer.array());
                if (numBytesRead < 2) {
                    break;
                }

                rhinoFrame[frameIndex++] = sampleBuffer.getShort(0);

                if (frameIndex == rhinoFrame.length) {

                    boolean isFinalized = rhino.process(rhinoFrame);
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
                        return;
                    }
                    frameIndex = 0;
                }
            }
            System.out.println("Reached end of audio file before Rhino returned an inference.");
        } catch (Exception e) {
            System.out.println(e.toString());
        } finally {
            if (rhino != null) {
                rhino.delete();
            }
        }
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
            formatter.printHelp("rhinofiledemo", options);
            System.exit(1);
            return;
        }

        if (cmd.hasOption("help")) {
            formatter.printHelp("rhinofiledemo", options);
            return;
        }

        String accessKey = cmd.getOptionValue("access_key");
        String inputAudioPath = cmd.getOptionValue("input_audio_path");
        String libraryPath = cmd.getOptionValue("library_path");
        String modelPath = cmd.getOptionValue("model_path");
        String contextPath = cmd.getOptionValue("context_path");
        String sensitivityStr = cmd.getOptionValue("sensitivity");
        String endpointDurationStr = cmd.getOptionValue("endpoint_duration");
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

        if(inputAudioPath == null){
            throw new IllegalArgumentException("No input audio file provided. This is a required argument.");
        }
        File inputAudioFile = new File(inputAudioPath);
        if (!inputAudioFile.exists()) {
            throw new IllegalArgumentException(String.format("Audio file at path %s does not exits.", inputAudioPath));
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

        boolean requireEndpoint = true;
        if (requireEndpointValue != null && requireEndpointValue.toLowerCase().equals("false")) {
            requireEndpoint = false;
        }

        runDemo(accessKey, inputAudioFile, libraryPath, modelPath, contextPath, sensitivity, endpointDuration, requireEndpoint);
    }

    private static Options BuildCommandLineOptions() {
        Options options = new Options();

        options.addOption(Option.builder("a")
                .longOpt("access_key")
                .hasArg(true)
                .desc("AccessKey obtained from Picovoice Console (https://console.picovoice.ai/).")
                .build());

        options.addOption(Option.builder("i")
                .longOpt("input_audio_path")
                .hasArg(true)
                .desc("Absolute path to input audio file.")
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

        options.addOption(new Option("h", "help", false, ""));

        return options;
    }
}
