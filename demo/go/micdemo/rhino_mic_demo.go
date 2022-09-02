// Copyright 2021-2022 Picovoice Inc.
//
// You may not use this file except in compliance with the license. A copy of the license is
// located in the "LICENSE" file accompanying this source.
//
// Unless required by applicable law or agreed to in writing, software distributed under the
// License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
// express or implied. See the License for the specific language governing permissions and
// limitations under the License.

package main

import (
	"flag"
	"fmt"
	"log"
	"os"
	"os/signal"
	"path/filepath"

	pvrecorder "github.com/Picovoice/pvrecorder/sdk/go"
	rhino "github.com/Picovoice/rhino/binding/go/v2"
	"github.com/go-audio/wav"
)

func main() {
	accessKeyArg := flag.String("access_key", "", "AccessKey obtained from Picovoice Console (https://console.picovoice.ai/)")
	contextPathArg := flag.String("context_path", "", "Path to Rhino context file (.rhn)")
	libraryPathArg := flag.String("library_path", "", "Path to Rhino dynamic library file (.so/.dylib/.dll)")
	modelPathArg := flag.String("model_path", "", "Path to Rhino model file (.pv)")
	sensitivityArg := flag.Float64("sensitivity", 0.5, "Inference sensitivity. "+
		"The value should be a number within [0, 1]. A higher sensitivity value results in "+
		"fewer misses at the cost of (potentially) increasing the erroneous inference rate. "+
		"If not set, 0.5 will be used.")
	endpointDurationArg := flag.Float64("endpoint_duration", 1.0, "Endpoint duration in seconds. "+
		"An endpoint is a chunk of silence at the end of an utterance that marks the end of spoken command. "+
		"It should be a positive number within [0.5, 5]. If not set, 1.0 will be used.")
	requireEndpointArg := flag.String("require_endpoint", "true",
		"If set to `true`, Rhino requires an endpoint (chunk of silence) before finishing inference.")
	audioDeviceIndex := flag.Int("audio_device_index", -1, "Index of capture device to use.")
	outputPathArg := flag.String("output_path", "", "Path to recorded audio (for debugging)")
	showAudioDevices := flag.Bool("show_audio_devices", false, "Display all available capture devices")
	flag.Parse()

	if *showAudioDevices {
		printAudioDevices()
		return
	}

	r := rhino.Rhino{
		RequireEndpoint: true,
	}
	if *requireEndpointArg == "false" {
		r.RequireEndpoint = false
	}
	if *accessKeyArg == "" {
		log.Fatalf("AccessKey is required.")
	}
	r.AccessKey = *accessKeyArg

	// validate library path
	if *libraryPathArg != "" {
		libraryPath, _ := filepath.Abs(*libraryPathArg)
		if _, err := os.Stat(libraryPath); os.IsNotExist(err) {
			log.Fatalf("Could not find library file at %s", libraryPath)
		}

		r.LibraryPath = libraryPath
	}

	// validate model
	if *modelPathArg != "" {
		modelPath, _ := filepath.Abs(*modelPathArg)
		if _, err := os.Stat(modelPath); os.IsNotExist(err) {
			log.Fatalf("Could not find model file at %s", modelPath)
		}

		r.ModelPath = modelPath
	}

	// context path
	if *contextPathArg != "" {
		contextPath, _ := filepath.Abs(*contextPathArg)
		if _, err := os.Stat(contextPath); os.IsNotExist(err) {
			log.Fatalf("Could not find context file at %s", contextPath)
		}

		r.ContextPath = contextPath
	}

	// validate sensitivity
	sensitivityFloat := float32(*sensitivityArg)
	if sensitivityFloat < 0 || sensitivityFloat > 1 {
		log.Fatalf("Sensitivity value of '%f' is invalid. Must be between [0, 1].", sensitivityFloat)
	}
	r.Sensitivity = sensitivityFloat

	// validate endpoint duration
	endpointDurationFloat := float32(*endpointDurationArg)
	if endpointDurationFloat < 0.5 || endpointDurationFloat > 5.0 {
		log.Fatalf("Endpoint duration value of '%f' is invalid. Must be between [0.5, 5.0].", endpointDurationFloat)
	}
	r.EndpointDurationSec = endpointDurationFloat

	err := r.Init()
	if err != nil {
		log.Fatal(err)
	}
	defer r.Delete()

	var outputWav *wav.Encoder
	if *outputPathArg != "" {
		outputFilePath, _ := filepath.Abs(*outputPathArg)
		outputFile, err := os.Create(outputFilePath)
		if err != nil {
			log.Fatalf("Failed to create output audio at path %s", outputFilePath)
		}
		defer outputFile.Close()

		outputWav = wav.NewEncoder(outputFile, rhino.SampleRate, 16, 1, 1)
		defer outputWav.Close()
	}

	recorder := pvrecorder.PvRecorder{
		DeviceIndex:    *audioDeviceIndex,
		FrameLength:    rhino.FrameLength,
		BufferSizeMSec: 1000,
		LogOverflow:    0,
	}

	if err := recorder.Init(); err != nil {
		log.Fatalf("Error: %s.\n", err.Error())
	}
	defer recorder.Delete()

	fmt.Println(r.ContextInfo)
	fmt.Printf("Using device: %s\n", recorder.GetSelectedDevice())
	fmt.Println("Listening...")

	if err := recorder.Start(); err != nil {
		log.Fatalf("Error: %s.\n", err.Error())
	}

	signalCh := make(chan os.Signal, 1)
	waitCh := make(chan struct{})
	signal.Notify(signalCh, os.Interrupt)

	go func() {
		<-signalCh
		close(waitCh)
	}()

waitLoop:
	for {
		select {
		case <-waitCh:
			fmt.Println("Stopping...")
			break waitLoop
		default:
			pcm, err := recorder.Read()
			if err != nil {
				log.Fatalf("Error: %s.\n", err.Error())
			}
			isFinalized, err := r.Process(pcm)
			if err != nil {
				log.Fatal(err)
			}

			if isFinalized {
				inference, err := r.GetInference()
				if err != nil {
					log.Fatalf("Rhino failed to get inference: \n%v", err)
				}
				if inference.IsUnderstood {
					fmt.Println("{")
					fmt.Printf("  intent : '%s'\n", inference.Intent)
					fmt.Println("  slots : {")
					for k, v := range inference.Slots {
						fmt.Printf("    %s : '%s'\n", k, v)
					}
					fmt.Println("  }")
					fmt.Println("}")
				} else {
					fmt.Println("Didn't understand the command")
				}
			}
			// write to debug file
			if outputWav != nil {
				for outputBufIndex := range pcm {
					outputWav.WriteFrame(pcm[outputBufIndex])
				}
			}
		}
	}
}

func printAudioDevices() {
	if devices, err := pvrecorder.GetAudioDevices(); err != nil {
		log.Fatalf("Error: %s.\n", err.Error())
	} else {
		for i, device := range devices {
			fmt.Printf("Index: %d, device name: %s\n", i, device)
		}
	}
}
