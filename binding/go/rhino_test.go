// Copyright 2021-2023 Picovoice Inc.
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
	"encoding/json"
	"flag"
	"fmt"
	"io/ioutil"
	"log"
	"math"
	"os"
	"path/filepath"
	"reflect"
	"testing"
)

var (
	testAccessKey string
	rhino         Rhino
	withinContextTestParameters []WithinContextTestData
	outOfContextTestParameters  []OutOfContextTestData
)

type WithinContextTestData struct {
	language       string
	context        string
	expectedIntent string
	expectedSlots  map[string]string
}

type OutOfContextTestData struct {
	language string
	context  string
}

func TestMain(m *testing.M) {

	flag.StringVar(&testAccessKey, "access_key", "", "AccessKey for testing")
	flag.Parse()

	withinContextTestParameters, outOfContextTestParameters = loadTestData()
	os.Exit(m.Run())
}

func appendLanguage(s string, language string) string {
	if language == "en" {
		return s
	}
	return s + "_" + language
}

func getTestModelPath(language string) string {
	modelRelPath := fmt.Sprintf(
		"../../lib/common/%s.pv",
		appendLanguage("rhino_params", language))
	modelPath, _ := filepath.Abs(modelRelPath)
	return modelPath
}

func getTestContextPath(language string, context string) string {
	contextRelPath := fmt.Sprintf(
		"../../resources/%s/%s/%s_%s.rhn",
		appendLanguage("contexts", language),
		osName,
		context,
		osName)
	contextPath, _ := filepath.Abs(contextRelPath)
	return contextPath
}

func loadTestData() ([]WithinContextTestData, []OutOfContextTestData) {
	content, err := ioutil.ReadFile("../../resources/test/test_data.json")
	if err != nil {
		log.Fatalf("Could not read test data json: %v", err)
	}

	var testData struct {
		Tests struct {
			WithinContext []struct {
				Language string `json:"language"`
				ContextName  string `json:"context_name"`
				Inference struct {
					Intent string `json:"intent"`
					Slots map[string]string `json:"slots"`
				} `json:"inference"`
			} `json:"within_context"`
			OutOfContext []struct {
				Language string `json:"language"`
				ContextName  string `json:"context_name"`
			} `json:"out_of_context"`
		} `json:"tests"`
	}
	err = json.Unmarshal(content, &testData)
	if err != nil {
		log.Fatalf("Could not decode test data json: %v", err)
	}

	for _, x := range testData.Tests.WithinContext {
		withinContextTestData := WithinContextTestData{
			language:      	x.Language,
			context:       	x.ContextName,
			expectedIntent:	x.Inference.Intent,
			expectedSlots:  x.Inference.Slots,
		}

		withinContextTestParameters = append(withinContextTestParameters, withinContextTestData)
	}

	for _, x := range testData.Tests.OutOfContext {
		outOfContextTestData := OutOfContextTestData{
			language:      	x.Language,
			context:       	x.ContextName,
		}

		outOfContextTestParameters = append(outOfContextTestParameters, outOfContextTestData)
	}
	return withinContextTestParameters, outOfContextTestParameters
}

func runTestCase(t *testing.T, rhino *Rhino, audioFileName string, isWithinContext bool, expectedIntent string, expectedSlots map[string]string) {
	err := rhino.Init()
	if err != nil {
		t.Fatalf("%v", err)
	}
	fmt.Printf("Rhino Version: %s\n", Version)
	fmt.Printf("Frame Length: %d\n", FrameLength)
	fmt.Printf("Sample Rate: %d\n", SampleRate)

	testAudioPath, _ := filepath.Abs(filepath.Join("../../resources/audio_samples", audioFileName))
	data, err := ioutil.ReadFile(testAudioPath)
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

		isFinalized, err = rhino.Process(sampleBuffer)
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

	inference, err := rhino.GetInference()
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
}

func TestWithinContext(t *testing.T) {
	for _, tt := range withinContextTestParameters {
		t.Run(tt.language+" within context", func(t *testing.T) {
			rhino = NewRhino(testAccessKey, getTestContextPath(tt.language, tt.context))
			rhino.ModelPath = getTestModelPath(tt.language)
			runTestCase(
				t,
				&rhino,
				fmt.Sprintf("%s.wav", appendLanguage("test_within_context", tt.language)),
				true,
				tt.expectedIntent,
				tt.expectedSlots)
			delErr := rhino.Delete()
			if delErr != nil {
				t.Fatalf("%v", delErr)
			}
		})
	}
}

func TestOutOfContext(t *testing.T) {
	for _, tt := range outOfContextTestParameters {
		t.Run(tt.language+" out of context", func(t *testing.T) {
			rhino = NewRhino(testAccessKey, getTestContextPath(tt.language, tt.context))
			rhino.ModelPath = getTestModelPath(tt.language)
			runTestCase(
				t,
				&rhino,
				fmt.Sprintf("%s.wav", appendLanguage("test_out_of_context", tt.language)),
				false,
				"",
				nil)
			delErr := rhino.Delete()
			if delErr != nil {
				t.Fatalf("%v", delErr)
			}
		})
	}
}
