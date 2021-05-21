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
	"encoding/binary"
	"flag"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"runtime"
	"strconv"
	"strings"

	. "github.com/Picovoice/rhino/binding/go"
	"github.com/gen2brain/malgo"
	"github.com/go-audio/wav"
)

func main() {
	contextPathArg := flag.String("context_path", "", "Path to Rhino context file (.rhn)")
	modelPathArg := flag.String("model_path", "", "Path to Rhino model file (.pv)")
	sensitivityArg := flag.String("sensitivity", "", "Inference sensitivity. "+
		"The value should be a number within [0, 1]. A higher sensitivity value results in "+
		"fewer misses at the cost of (potentially) increasing the erroneous inference rate. "+
		"If not set, 0.5 will be used.")
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

		outputWav = wav.NewEncoder(outputFile, SampleRate, 16, 1, 1)
		defer outputWav.Close()
	}

	r := Rhino{}

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

	// validate sensitivities
	if *sensitivityArg == "" {
		r.Sensitivity = 0.5

	} else {
		sensitivityFloat, err := strconv.ParseFloat(*sensitivityArg, 32)
		if err != nil || sensitivityFloat < 0 || sensitivityFloat > 1 {
			log.Fatalf("Senstivity value of '%s' is invalid. Must be a float32 between [0, 1].", *sensitivityArg)
		}
		r.Sensitivity = float32(sensitivityFloat)
	}

	var backends []malgo.Backend = nil
	if runtime.GOOS == "windows" {
		backends = []malgo.Backend{malgo.BackendWinmm}
	} else if runtime.GOOS == "linux" {
		backends = []malgo.Backend{malgo.BackendAlsa}
	}

	context, err := malgo.InitContext(backends, malgo.ContextConfig{}, func(message string) {
		fmt.Printf("%v\n", message)
	})
	if err != nil {
		log.Fatal(err)
	}
	defer func() {
		_ = context.Uninit()
		context.Free()
	}()

	deviceConfig := malgo.DefaultDeviceConfig(malgo.Duplex)
	deviceConfig.Capture.Format = malgo.FormatS16
	deviceConfig.Capture.Channels = 1
	deviceConfig.SampleRate = 16000

	if *audioDeviceIndex >= 0 {
		infos, err := context.Devices(malgo.Capture)
		if err != nil {
			log.Fatal(err)
		}

		if *audioDeviceIndex > len(infos)-1 {
			fmt.Printf("Audio device at index %d does not exist. Using default capture device.\n", *audioDeviceIndex)
		} else {
			deviceConfig.Capture.DeviceID = infos[*audioDeviceIndex].ID.Pointer()
		}
	}

	err = r.Init()
	if err != nil {
		log.Fatal(err)
	}
	defer r.Delete()

	var shortBufIndex, shortBufOffset int
	shortBuf := make([]int16, FrameLength)

	onRecvFrames := func(pSample2, pSample []byte, framecount uint32) {
		for i := 0; i < len(pSample); i += 2 {
			shortBuf[shortBufIndex+shortBufOffset] = int16(binary.LittleEndian.Uint16(pSample[i : i+2]))
			shortBufOffset++

			if shortBufIndex+shortBufOffset == FrameLength {
				shortBufIndex = 0
				shortBufOffset = 0

				isFinalized, err := r.Process(shortBuf)
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
					for outputBufIndex := range shortBuf {
						outputWav.WriteFrame(shortBuf[outputBufIndex])
					}
				}
			}
		}
		shortBufIndex += shortBufOffset
		shortBufOffset = 0
	}

	captureCallbacks := malgo.DeviceCallbacks{
		Data: onRecvFrames,
	}
	device, err := malgo.InitDevice(context.Context, deviceConfig, captureCallbacks)
	if err != nil {
		log.Fatal(err)
	}

	err = device.Start()
	if err != nil {
		log.Fatal(err)
	}

	fmt.Println("Press Enter to stop recording.")
	fmt.Println("Listening...")
	fmt.Scanln()

	device.Uninit()
}

func printAudioDevices() {
	context, err := malgo.InitContext(nil, malgo.ContextConfig{}, nil)
	if err != nil {
		log.Fatal(err)
	}
	defer func() {
		_ = context.Uninit()
		context.Free()
	}()

	// Capture devices.
	infos, err := context.Devices(malgo.Capture)
	if err != nil {
		log.Fatal(err)
	}

	fmt.Println("Capture Devices")
	for i, info := range infos {
		fmt.Printf("    %d: %s\n", i, strings.Replace(info.Name(), "\x00", "", -1))
	}
}
