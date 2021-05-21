// Copyright 2021 Picovoice Inc.
//
// You may not use this file except in compliance with the license. A copy of the license is
// located in the "LICENSE" file accompanying this source.
//
// Unless required by applicable law or agreed to in writing, software distributed under the
// License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
// express or implied. See the License for the specific language governing permissions and
// limitations under the License.
//

// Go binding for Rhino Speech-to-Intent engine. It directly infers the user's intent from spoken commands in
// real-time. Rhino processes incoming audio in consecutive frames and indicates if the inference is finalized. When
// finalized, the inferred intent can be retrieved as structured data in the form of an intent string and pairs of
// slots and values. The number of samples per frame can be attained by from the `FrameLength` property. The incoming audio
// needs to have a sample rate equal to `SampleRate` property and be 16-bit linearly-encoded. Rhino operates on single-channel audio.

package rhino

import (
	"C"
	"embed"
	"fmt"
	"io/ioutil"
	"log"
	"os"
	"path/filepath"
	"runtime"
)

//go:embed embedded
var embeddedFS embed.FS

// PvStatus type
type PvStatus int

// Possible status return codes from the Rhino library
const (
	SUCCESS          PvStatus = 0
	OUT_OF_MEMORY    PvStatus = 1
	IO_ERROR         PvStatus = 2
	INVALID_ARGUMENT PvStatus = 3
	STOP_ITERATION   PvStatus = 4
	KEY_ERROR        PvStatus = 5
	INVALID_STATE    PvStatus = 6
)

func pvStatusToString(status PvStatus) string {
	switch status {
	case SUCCESS:
		return "SUCCESS"
	case OUT_OF_MEMORY:
		return "OUT_OF_MEMORY"
	case IO_ERROR:
		return "IO_ERROR"
	case INVALID_ARGUMENT:
		return "INVALID_ARGUMENT"
	case STOP_ITERATION:
		return "STOP_ITERATION"
	case KEY_ERROR:
		return "KEY_ERROR"
	case INVALID_STATE:
		return "INVALID_STATE"
	default:
		return fmt.Sprintf("Unknown error code: %d", status)
	}
}

type RhinoInference struct {
	// Indicates whether Rhino understood what it heard based on the context
	IsUnderstood bool

	// If IsUnderstood, name of intent that was inferred
	Intent string

	// If isUnderstood, dictionary of slot keys and values that were inferred
	Slots map[string]string
}

// Rhino struct
type Rhino struct {
	// pointer to native rhino instance
	handle uintptr

	// whether Rhino has made an inference
	isFinalized bool

	// Absolute path to the file containing model parameters.
	ModelPath string

	// Inference sensitivity. A higher sensitivity value results in
	// fewer misses at the cost of (potentially) increasing the erroneous inference rate.
	// Sensitivity should be a floating-point number within 0 and 1.
	Sensitivity float32

	// Absolute path to the Rhino context file (.rhn).
	ContextPath string

	// Once initialized, stores the source of the Rhino context in YAML format. Shows the list of intents,
	// which expressions map to those intents, as well as slots and their possible values.
	ContextInfo string
}

// Returns a Rhino struct with the given context file and default parameters
func NewRhino(contextPath string) Rhino {
	return Rhino{ContextPath: contextPath, Sensitivity: 0.5, ModelPath: defaultModelFile}
}

// native interface
type nativeRhinoInterface interface {
	nativeInit(*Rhino)
	nativeProcess(*Rhino, []int)
	nativeDelete(*Rhino)

	nativeIsUnderstood(*Rhino)
	nativeGetIntent(*Rhino)
	nativeFreeSlotsAndValues(*Rhino)
	nativeReset(*Rhino)

	nativeContextInfo(*Rhino)
	nativeSampleRate()
	nativeFrameLength()
	nativeVersion()
}
type nativeRhinoType struct {
	slotKeysPtr  uintptr
	slotValuePtr uintptr
}

// private vars
var (
	extractionDir = filepath.Join(os.TempDir(), "rhino")

	defaultModelFile = extractDefaultModel()
	libName          = extractLib()
	nativeRhino      = nativeRhinoType{}
)

var (
	// Number of audio samples per frame.
	FrameLength = nativeRhino.nativeFrameLength()

	// Audio sample rate accepted by Picovoice.
	SampleRate = nativeRhino.nativeSampleRate()

	// Rhino version
	Version = nativeRhino.nativeVersion()
)

// Init function for Rhino. Must be called before attempting process
func (rhino *Rhino) Init() error {
	if rhino.ModelPath == "" {
		rhino.ModelPath = defaultModelFile
	}

	if _, err := os.Stat(rhino.ModelPath); os.IsNotExist(err) {
		return fmt.Errorf("%s: Specified model file could not be found at %s", pvStatusToString(INVALID_ARGUMENT), rhino.ModelPath)
	}

	if rhino.ContextPath == "" {
		return fmt.Errorf("%s: No valid context was provided.", pvStatusToString(INVALID_ARGUMENT))
	}

	if _, err := os.Stat(rhino.ContextPath); os.IsNotExist(err) {
		return fmt.Errorf("%s: Context file could not be found at %s", pvStatusToString(INVALID_ARGUMENT), rhino.ContextPath)
	}

	if rhino.Sensitivity < 0 || rhino.Sensitivity > 1 {
		return fmt.Errorf("%s: Sensitivity value of %f is invalid. Must be between [0, 1].",
			pvStatusToString(INVALID_ARGUMENT), rhino.Sensitivity)
	}

	status := nativeRhino.nativeInit(rhino)
	if PvStatus(status) != SUCCESS {
		return fmt.Errorf("Rhino returned error %s", pvStatusToString(INVALID_ARGUMENT))
	}

	status, rhino.ContextInfo = nativeRhino.nativeContextInfo(rhino)
	if PvStatus(status) != SUCCESS {
		return fmt.Errorf("%s: Could not get context from rhino instance.", pvStatusToString(INVALID_ARGUMENT))
	}

	return nil
}

// Releases resources acquired by Rhino
func (rhino *Rhino) Delete() error {
	if rhino.handle == 0 {
		return fmt.Errorf("Rhino has not been initialized or has already been deleted.")
	}

	nativeRhino.nativeDelete(rhino)
	return nil
}

// Process a frame of pcm audio with the speech-to-intent engine.
// isFinalized returns true when Rhino has an inference ready to return
func (rhino *Rhino) Process(pcm []int16) (isFinalized bool, err error) {

	if rhino.handle == 0 {
		return false, fmt.Errorf("Rhino has not been initialized or has been deleted.")
	}

	if len(pcm) != FrameLength {
		return false, fmt.Errorf("Input data frame size (%d) does not match required size of %d", len(pcm), FrameLength)
	}

	status, isFinalized := nativeRhino.nativeProcess(rhino, pcm)
	if PvStatus(status) != SUCCESS {
		return false, fmt.Errorf("Process audio frame failed with PvStatus: %d", status)
	}
	rhino.isFinalized = isFinalized
	return isFinalized, nil
}

// Gets inference results from Rhino. If the spoken command was understood, it includes the specific intent name
// that was inferred, and (if applicable) slot keys and specific slot values. Should only be called after the
// process function returns true, otherwise Rhino has not yet reached an inference conclusion.
// Returns an inference struct with `.IsUnderstood`, '.Intent` , and `.Slots`.
func (rhino *Rhino) GetInference() (inference RhinoInference, err error) {
	if !rhino.isFinalized {
		return RhinoInference{}, fmt.Errorf("GetInference called before rhino had finalized. Call GetInference only after Process has returned true.")
	}

	status, isUnderstood := nativeRhino.nativeIsUnderstood(rhino)
	if PvStatus(status) != SUCCESS {
		return RhinoInference{}, fmt.Errorf("GetInference failed at IsUnderstood with PvStatus: %d", status)
	}

	var intent string
	var slots map[string]string
	if isUnderstood {
		status, intent, slots = nativeRhino.nativeGetIntent(rhino)
		if PvStatus(status) != SUCCESS {
			return RhinoInference{}, fmt.Errorf("GetInference failed at GetIntent with PvStatus: %d", status)
		}

		status = nativeRhino.nativeFreeSlotsAndValues(rhino)
		if PvStatus(status) != SUCCESS {
			return RhinoInference{}, fmt.Errorf("GetInference failed at FreeSlotsAndValues with PvStatus: %d", status)
		}
	}

	status = nativeRhino.nativeReset(rhino)
	if PvStatus(status) != SUCCESS {
		return RhinoInference{}, fmt.Errorf("GetInference failed at Reset with PvStatus: %d", status)
	}

	return RhinoInference{IsUnderstood: isUnderstood, Intent: intent, Slots: slots}, nil
}

func extractDefaultModel() string {
	modelPath := "embedded/lib/common/rhino_params.pv"
	return extractFile(modelPath, extractionDir)
}

func extractLib() string {
	var libPath string
	switch os := runtime.GOOS; os {
	case "darwin":
		libPath = fmt.Sprintf("embedded/lib/mac/x86_64/libpv_rhino.dylib")
	case "linux":
		libPath = fmt.Sprintf("embedded/lib/linux/x86_64/libpv_rhino.so")
	case "windows":
		libPath = fmt.Sprintf("embedded/lib/windows/amd64/libpv_rhino.dll")
	default:
		log.Fatalf("%s is not a supported OS", os)
	}

	return extractFile(libPath, extractionDir)
}

func extractFile(srcFile string, dstDir string) string {
	bytes, readErr := embeddedFS.ReadFile(srcFile)
	if readErr != nil {
		log.Fatalf("%v", readErr)
	}

	extractedFilepath := filepath.Join(dstDir, srcFile)
	err := os.MkdirAll(filepath.Dir(extractedFilepath), 0777)
	if err != nil {
		log.Fatalf("Could not create rhino directory: %v", err)
	}

	writeErr := ioutil.WriteFile(extractedFilepath, bytes, 0777)
	if writeErr != nil {
		log.Fatalf("%v", writeErr)
	}
	return extractedFilepath
}
