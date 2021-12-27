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
	"flag"
	"fmt"
	"io/ioutil"
	// "log"
	"math"
	"os"
	"path/filepath"
	"reflect"
	"testing"
)

var r Rhino
var pvTestAccessKey string

func TestMain(m *testing.M) {

	flag.StringVar(&pvTestAccessKey, "access_key", "", "AccessKey for testing")
	flag.Parse()

	os.Exit(m.Run())
}

func appendLanguage(s string, language string) string {
	if language == "en" {
		return s;
	}
	return s + "_" + language
}

func getTestModelPath(language string) string {
	modelPath, _ := filepath.Abs(fmt.Sprintf(
		"../../lib/common/%s.pv",
		appendLanguage("rhino_params", language)))
	return modelPath
}

func getTestContextPath(language string, context string) string {
	contextPath, _ :=  filepath.Abs(fmt.Sprintf(
		"../../resources/%s/%s/%s_%s.rhn",
		appendLanguage("contexts", language),
		osName,
		context,
		osName))
	return contextPath
}

func runTestCase(t *testing.T, r Rhino, audioFileName string, isWithinContext bool, expectedIntent string, expectedSlots map[string]string) {
	audioFilePath := filepath.Join("../../resources/audio_samples", audioFileName)
	testFile, _ := filepath.Abs(audioFilePath)

	err := r.Init()
	if err != nil {
		t.Fatalf("%v", err)
	}

	t.Logf("Porcupine Version: %s", Version)
	t.Logf("Frame Length: %d", FrameLength)
	t.Logf("Samples Rate: %d", SampleRate)

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

	if isWithinContext {
		if !inference.IsUnderstood {
			t.Fatalf("Didn't understand.")
		}
	
		if inference.Intent != expectedIntent {
			t.Fatalf("Incorrect intent '%s'", inference.Intent)
		}
	
		if !reflect.DeepEqual(inference.Slots, expectedSlots) {
			t.Fatalf("Incorrect slots '%v'", inference.Slots)
		}
	} else {
		if inference.IsUnderstood {
			t.Fatalf("Rhino understood a command outside of its context. %v", inference)
		}
	}

	delErr := r.Delete()
	if delErr != nil {
		t.Fatalf("%v", delErr)
	}
}

func TestWithinContext(t *testing.T) {

	r = NewRhino(pvTestAccessKey, getTestContextPath("en", "coffee_maker"))
	runTestCase(
		t,
		r,
		"test_within_context.wav",
		true,
		"orderBeverage",
		map[string]string{"beverage": "americano", "numberOfShots": "double shot", "size": "medium"})
}

func TestOutOfContext(t *testing.T) {

	r = NewRhino(pvTestAccessKey, getTestContextPath("en", "coffee_maker"))
	runTestCase(
		t,
		r,
		"test_out_of_context.wav",
		false,
		"",
		map[string]string{})
}

func TestWithinContextDe(t *testing.T) {

	language := "de"
	r = Rhino{
		AccessKey: pvTestAccessKey,
		ContextPath: getTestContextPath(language, "beleuchtung"),
		Sensitivity: 0.5,
		ModelPath: getTestModelPath(language)}
	runTestCase(
		t,
		r,
		"test_within_context_de.wav",
		true,
		"changeState",
		map[string]string{"state": "aus"})
}

func TestOutOfContextDe(t *testing.T) {

	language := "de"
	r = Rhino{
		AccessKey: pvTestAccessKey,
		ContextPath: getTestContextPath(language, "beleuchtung"),
		Sensitivity: 0.5,
		ModelPath: getTestModelPath(language)}
	runTestCase(
		t,
		r,
		"test_out_of_context_de.wav",
		false,
		"",
		map[string]string{})
}

func TestWithinContextEs(t *testing.T) {

	language := "es"
	r = Rhino{
		AccessKey: pvTestAccessKey,
		ContextPath: getTestContextPath(language, "luz"),
		Sensitivity: 0.5,
		ModelPath: getTestModelPath(language)}
	runTestCase(
		t,
		r,
		"test_within_context_es.wav",
		true,
		"changeColor",
		map[string]string{"location": "habitación", "color": "rosado"})
}

func TestOutOfContextEs(t *testing.T) {

	language := "es"
	r = Rhino{
		AccessKey: pvTestAccessKey,
		ContextPath: getTestContextPath(language, "luz"),
		Sensitivity: 0.5,
		ModelPath: getTestModelPath(language)}
	runTestCase(
		t,
		r,
		"test_out_of_context_es.wav",
		false,
		"",
		map[string]string{})
}