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
	"path/filepath"

	rhino "github.com/Picovoice/rhino/binding/go"
	"github.com/go-audio/audio"
	"github.com/go-audio/wav"
)

func main() {
	inputAudioPathArg := flag.String("input_audio_path", "", "Path to input audio file (mono, WAV, 16-bit, 16kHz)")
	accessKeyArg := flag.String("access_key", "", "AccessKey obtained from Picovoice Console (https://console.picovoice.ai/)")
	contextPathArg := flag.String("context_path", "", "Path to Rhino context file (.rhn)")
	modelPathArg := flag.String("model_path", "", "Path to Rhino model file (.pv)")
	sensitivityArg := flag.Float64("sensitivity", 0.5, "Inference sensitivity. "+
		"The value should be a number within [0, 1]. A higher sensitivity value results in "+
		"fewer misses at the cost of (potentially) increasing the erroneous inference rate. "+
		"If not set, 0.5 will be used.")
	requireEndpointArg := flag.Bool("require_endpoint", false,
		"If set to `true`, Rhino requires an endpoint (chunk of silence) before finishing inference.")
	flag.Parse()

	// validate input audio
	if *inputAudioPathArg == "" {
		log.Fatal("No input audio file provided.")
	}
	inputAudioPath, _ := filepath.Abs(*inputAudioPathArg)
	f, err := os.Open(inputAudioPath)
	if err != nil {
		log.Fatalf("Unable to find or open input audio at %s", inputAudioPath)
	}
	defer f.Close()

	wavFile := wav.NewDecoder(f)
	if !wavFile.IsValidFile() || wavFile.BitDepth != 16 || wavFile.SampleRate != 16000 || wavFile.NumChans != 1 {
		log.Fatal("Invalid WAV file. File must contain mono, 16-bit, 16kHz linearly encoded PCM.")
	}

	r := rhino.Rhino{
		RequireEndpoint: *requireEndpointArg,
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

	err = r.Init()
	if err != nil {
		log.Fatal(err)
	}
	defer r.Delete()

	buf := &audio.IntBuffer{
		Format: &audio.Format{
			NumChannels: 1,
			SampleRate:  16000,
		},
		Data:           make([]int, rhino.FrameLength),
		SourceBitDepth: 16,
	}

	shortBuf := make([]int16, rhino.FrameLength)
	var n int
	totalRead := 0
	isFinalized := false
	for err == nil {
		n, err = wavFile.PCMBuffer(buf)
		if err != nil {
			log.Fatal("Failed to read from WAV file.", err)
		}

		if n == 0 {
			break
		}

		totalRead += n
		for i := range buf.Data {
			shortBuf[i] = int16(buf.Data[i])
		}

		isFinalized, err = r.Process(shortBuf)
		if err != nil {
			log.Fatal(err)
		}

		if isFinalized {
			break
		}
	}
	if !isFinalized {
		fmt.Println("Reached the end of the file before Rhino returned an inference.")
		return
	}

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
