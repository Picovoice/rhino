// Copyright 2021 Picovoice Inc.
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
	rhino "github.com/Picovoice/rhino/binding/go"
	"github.com/go-audio/wav"
)

func main() {
	accessKeyArg := flag.String("access_key", "", "AccessKey obtained from Picovoice Console (https://console.picovoice.ai/)")
	contextPathArg := flag.String("context_path", "", "Path to Rhino context file (.rhn)")
	modelPathArg := flag.String("model_path", "", "Path to Rhino model file (.pv)")
	sensitivityArg := flag.Float64("sensitivity", 0.5, "Inference sensitivity. "+
		"The value should be a number within [0, 1]. A higher sensitivity value results in "+
		"fewer misses at the cost of (potentially) increasing the erroneous inference rate. "+
		"If not set, 0.5 will be used.")
	endpointRequiredArg := flag.Bool("endpoint_required", false,
		"If set to `true`, Rhino requires an endpoint (chunk of silence) before finishing inference.")
	audioDeviceIndex := flag.Int("audio_device_index", -1, "Index of capture device to use.")
	outputPathArg := flag.String("output_path", "", "Path to recorded audio (for debugging)")
	showAudioDevices := flag.Bool("show_audio_devices", false, "Display all available capture devices")
	flag.Parse()

	if *showAudioDevices {
		printAudioDevices()
		return
	}

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

	r := rhino.Rhino{
		IsEndpointRequired: *endpointRequiredArg,
	}

	if *accessKeyArg == "" {
		log.Fatalf("AccessKey is required.")
	}
	r.AccessKey = *accessKeyArg

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
		log.Fatalf("Senstivity value of '%f' is invalid. Must be between [0, 1].", sensitivityFloat)
	}
	r.Sensitivity = sensitivityFloat

	err := r.Init()
	if err != nil {
		log.Fatal(err)
	}
	defer r.Delete()

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
