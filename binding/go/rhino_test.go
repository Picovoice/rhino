// Copyright 2021 Picovoice Inc.
//
// You may not use this file except in compliance with the license. A copy of the license is
// located in the "LICENSE" file accompanying this source.
//
// Unless required by applicable law or agreed to in writing, software distributed under the
// License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
// express or implied. See the License for the specific language governing permissions and
// limitations under the License.

package rhino

import (
	"encoding/binary"
	"fmt"
	"io/ioutil"
	"log"
	"math"
	"os"
	"path/filepath"
	"reflect"
	"runtime"
	"testing"
)

var osName = getOS()
var r Rhino

func TestMain(m *testing.M) {
	// call flag.Parse() here if TestMain uses flags
	contextFile, _ := filepath.Abs(fmt.Sprintf("../../resources/contexts/%s/coffee_maker_%s.rhn", osName, osName))
	r = NewRhino(contextFile)
	err := r.Init()
	if err != nil {
		log.Fatalf("%v", err)
	}
	defer r.Delete()

	fmt.Printf("Rhino Version: %s\n", Version)
	fmt.Printf("Frame Length: %d\n", FrameLength)
	fmt.Printf("Samples Rate: %d\n", SampleRate)

	os.Exit(m.Run())
}

func TestWithinContext(t *testing.T) {

	testFile, _ := filepath.Abs("../../resources/audio_samples/test_within_context.wav")

	data, err := ioutil.ReadFile(testFile)
	if err != nil {
		t.Fatalf("Could not read test file: %v", err)
	}
	data = data[44:] // skip header

	isFinalized := false
	frameLenBytes := FrameLength * 2
	frameCount := int(math.Floor(float64(len(data)) / float64(frameLenBytes)))
	sampleBuffer := make([]int16, FrameLength)
	for i := 0; i < frameCount; i++ {
		start := i * frameLenBytes

		for j := 0; j < FrameLength; j++ {
			dataOffset := start + (j * 2)
			sampleBuffer[j] = int16(binary.LittleEndian.Uint16(data[dataOffset : dataOffset+2]))
		}

		isFinalized, err = r.Process(sampleBuffer)
		if err != nil {
			t.Fatalf("Could not read test file: %v", err)
		}

		if isFinalized {
			break
		}
	}

	if !isFinalized {
		t.Fatalf("Rhino reached end of file without finalizing.")
	}

	inference, err := r.GetInference()
	if err != nil {
		t.Fatalf("Rhino failed to get inference: \n%v", err)
	}

	if !inference.IsUnderstood {
		t.Fatalf("Didn't understand.")
	}

	if inference.Intent != "orderBeverage" {
		t.Fatalf("Incorrect intent '%s'", inference.Intent)
	}

	expectedSlotValues := map[string]string{"beverage": "americano", "numberOfShots": "double shot", "size": "medium"}
	if !reflect.DeepEqual(inference.Slots, expectedSlotValues) {
		t.Fatalf("Incorrect slots '%v'", inference.Slots)
	}
}

func TestOutOfContext(t *testing.T) {

	testFile, _ := filepath.Abs("../../resources/audio_samples/test_out_of_context.wav")

	data, err := ioutil.ReadFile(testFile)
	if err != nil {
		t.Fatalf("Could not read test file: %v", err)
	}
	data = data[44:] // skip header

	isFinalized := false
	frameLenBytes := FrameLength * 2
	frameCount := int(math.Floor(float64(len(data)) / float64(frameLenBytes)))
	sampleBuffer := make([]int16, FrameLength)
	for i := 0; i < frameCount; i++ {
		start := i * frameLenBytes

		for j := 0; j < FrameLength; j++ {
			dataOffset := start + (j * 2)
			sampleBuffer[j] = int16(binary.LittleEndian.Uint16(data[dataOffset : dataOffset+2]))
		}

		isFinalized, err = r.Process(sampleBuffer)
		if err != nil {
			t.Fatalf("Could not read test file: %v", err)
		}

		if isFinalized {
			break
		}
	}

	if !isFinalized {
		t.Fatalf("Rhino reached end of file without finalizing.")
	}

	inference, err := r.GetInference()
	if err != nil {
		t.Fatalf("Rhino failed to get inference: \n%v", err)
	}

	if inference.IsUnderstood {
		t.Fatalf("Rhino understood a command outside of its context. %v", inference)
	}
}

func getOS() string {
	switch os := runtime.GOOS; os {
	case "darwin":
		return "mac"
	case "linux":
		return "linux"
	case "windows":
		return "windows"
	default:
		log.Fatalf("%s is not a supported OS", os)
		return ""
	}
}
