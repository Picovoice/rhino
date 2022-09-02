// Copyright 2021-2022 Picovoice Inc.
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
	"crypto/sha256"
	"embed"
	"encoding/hex"
	"errors"
	"fmt"
	"io/ioutil"
	"log"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
)
import "unsafe"

//go:embed embedded
var embeddedFS embed.FS

// PvStatus type
type PvStatus int

// Possible status return codes from the Rhino library
const (
	SUCCESS                  PvStatus = 0
	OUT_OF_MEMORY            PvStatus = 1
	IO_ERROR                 PvStatus = 2
	INVALID_ARGUMENT         PvStatus = 3
	STOP_ITERATION           PvStatus = 4
	KEY_ERROR                PvStatus = 5
	INVALID_STATE            PvStatus = 6
	RUNTIME_ERROR            PvStatus = 7
	ACTIVATION_ERROR         PvStatus = 8
	ACTIVATION_LIMIT_REACHED PvStatus = 9
	ACTIVATION_THROTTLED     PvStatus = 10
	ACTIVATION_REFUSED       PvStatus = 11
)

type RhinoError struct {
	StatusCode PvStatus
	Message    string
}

func (e *RhinoError) Error() string {
	return fmt.Sprintf("%s: %s", pvStatusToString(e.StatusCode), e.Message)
}

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
	case RUNTIME_ERROR:
		return "RUNTIME_ERROR"
	case ACTIVATION_ERROR:
		return "ACTIVATION_ERROR"
	case ACTIVATION_LIMIT_REACHED:
		return "ACTIVATION_LIMIT_REACHED"
	case ACTIVATION_THROTTLED:
		return "ACTIVATION_THROTTLED"
	case ACTIVATION_REFUSED:
		return "ACTIVATION_REFUSED"
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
	handle unsafe.Pointer

	// whether Rhino has made an inference
	isFinalized bool

	// AccessKey obtained from Picovoice Console (https://console.picovoice.ai/).
	AccessKey string

	// Absolute path to Rhino's dynamic library.
	LibraryPath string

	// Absolute path to the file containing model parameters.
	ModelPath string

	// Inference sensitivity. A higher sensitivity value results in
	// fewer misses at the cost of (potentially) increasing the erroneous inference rate.
	// Sensitivity should be a floating-point number within 0 and 1.
	Sensitivity float32

	// Endpoint duration in seconds. An endpoint is a chunk of silence at the end of an
	// utterance that marks the end of spoken command. It should be a positive number within [0.5, 5]. A lower endpoint
	// duration reduces delay and improves responsiveness. A higher endpoint duration assures Rhino doesn't return inference
	// preemptively in case the user pauses before finishing the request.
	EndpointDurationSec float32

	// Absolute path to the Rhino context file (.rhn).
	ContextPath string

	// If set to `true`, Rhino requires an endpoint (a chunk of silence) after the spoken command.
	// If set to `false`, Rhino tries to detect silence, but if it cannot, it still will provide inference regardless. Set
	// to `false` only if operating in an environment with overlapping speech (e.g. people talking in the background).
	RequireEndpoint bool

	// Once initialized, stores the source of the Rhino context in YAML format. Shows the list of intents,
	// which expressions map to those intents, as well as slots and their possible values.
	ContextInfo string
}

// Returns a Rhino struct with the given context file and default parameters
func NewRhino(accessKey string, contextPath string) Rhino {
	return Rhino{
		AccessKey:           accessKey,
		ContextPath:         contextPath,
		Sensitivity:         0.5,
		EndpointDurationSec: 1.0,
		LibraryPath:         defaultLibPath,
		ModelPath:           defaultModelFile,
		RequireEndpoint:     true,
	}
}

// private vars
var (
	osName, cpu   = getOS()
	extractionDir = filepath.Join(os.TempDir(), "rhino")

	defaultModelFile = extractDefaultModel()
	defaultLibPath   = extractLib()
	nativeRhino      = nativeRhinoType{}
)

var (
	// Number of audio samples per frame.
	FrameLength int

	// Audio sample rate accepted by Picovoice.
	SampleRate int

	// Rhino version
	Version string
)

// Init function for Rhino. Must be called before attempting process
func (rhino *Rhino) Init() error {
	if rhino.AccessKey == "" {
		return &RhinoError{
			INVALID_ARGUMENT,
			"No AccessKey provided to Rhino"}
	}

	if rhino.LibraryPath == "" {
		rhino.LibraryPath = defaultLibPath
	}

	if _, err := os.Stat(rhino.LibraryPath); os.IsNotExist(err) {
		return &RhinoError{
			INVALID_ARGUMENT,
			fmt.Sprintf("Specified library file could not be found at %s", rhino.LibraryPath)}
	}

	if rhino.ModelPath == "" {
		rhino.ModelPath = defaultModelFile
	}

	if _, err := os.Stat(rhino.ModelPath); os.IsNotExist(err) {
		return &RhinoError{
			INVALID_ARGUMENT,
			fmt.Sprintf("Specified model file could not be found at %s", rhino.ModelPath)}
	}

	if rhino.ContextPath == "" {
		return &RhinoError{
			INVALID_ARGUMENT,
			"No valid context was provided"}
	}

	if _, err := os.Stat(rhino.ContextPath); os.IsNotExist(err) {
		return &RhinoError{
			INVALID_ARGUMENT,
			fmt.Sprintf("Context file could not be found at %s", rhino.ContextPath)}
	}

	if rhino.Sensitivity < 0 || rhino.Sensitivity > 1 {
		return &RhinoError{
			INVALID_ARGUMENT,
			fmt.Sprintf("Sensitivity value of %f is invalid. Must be between [0, 1]", rhino.Sensitivity)}
	}

	if rhino.EndpointDurationSec < 0.5 || rhino.EndpointDurationSec > 5.0 {
		return &RhinoError{
			INVALID_ARGUMENT,
			fmt.Sprintf("EndpointDurationSec value of %f is invalid. Must be between [0.5, 5.0]", rhino.EndpointDurationSec)}
	}

	status := nativeRhino.nativeInit(rhino)
	if PvStatus(status) != SUCCESS {
		return &RhinoError{
			PvStatus(status),
			"Rhino init failed"}
	}

	FrameLength = nativeRhino.nativeFrameLength()
	SampleRate = nativeRhino.nativeSampleRate()
	Version = nativeRhino.nativeVersion()

	status, rhino.ContextInfo = nativeRhino.nativeContextInfo(rhino)
	if PvStatus(status) != SUCCESS {
		return &RhinoError{
			PvStatus(status),
			"Could not get context from rhino instance"}
	}

	return nil
}

// Releases resources acquired by Rhino
func (rhino *Rhino) Delete() error {
	if rhino.handle == nil {
		return &RhinoError{
			INVALID_STATE,
			"Rhino has not been initialized or has already been deleted"}
	}

	nativeRhino.nativeDelete(rhino)
	return nil
}

// Process a frame of pcm audio with the speech-to-intent engine.
// isFinalized returns true when Rhino has an inference ready to return
func (rhino *Rhino) Process(pcm []int16) (isFinalized bool, err error) {

	if rhino.handle == nil {
		return false, &RhinoError{
			INVALID_STATE,
			"Rhino has not been initialized or has been deleted"}
	}

	if len(pcm) != FrameLength {
		return false, &RhinoError{
			INVALID_ARGUMENT,
			fmt.Sprintf("Input data frame size (%d) does not match required size of %d", len(pcm), FrameLength)}
	}

	status, isFinalized := nativeRhino.nativeProcess(rhino, pcm)
	if PvStatus(status) != SUCCESS {
		return false, &RhinoError{
			PvStatus(status),
			"Rhino process failed"}
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
		return RhinoInference{},
			&RhinoError{
				INVALID_STATE,
				"GetInference called before rhino had finalized. Call GetInference only after Process has returned true"}
	}

	status, isUnderstood := nativeRhino.nativeIsUnderstood(rhino)
	if PvStatus(status) != SUCCESS {
		return RhinoInference{},
			&RhinoError{
				PvStatus(status),
				"Rhino GetInference failed at IsUnderstood"}
	}

	var intent string
	var slots map[string]string
	if isUnderstood {
		status, intent, slots = nativeRhino.nativeGetIntent(rhino)
		if PvStatus(status) != SUCCESS {
			return RhinoInference{},
				&RhinoError{
					PvStatus(status),
					"GetInference failed at GetIntent"}
		}

		status = nativeRhino.nativeFreeSlotsAndValues(rhino)
		if PvStatus(status) != SUCCESS {
			return RhinoInference{},
				&RhinoError{
					PvStatus(status),
					"GetInference failed at FreeSlotsAndValues"}

		}
	}

	status = nativeRhino.nativeReset(rhino)
	if PvStatus(status) != SUCCESS {
		return RhinoInference{},
			&RhinoError{
				PvStatus(status),
				"GetInference failed at Reset"}
	}

	return RhinoInference{
		IsUnderstood: isUnderstood,
		Intent:       intent,
		Slots:        slots}, nil
}

func getOS() (string, string) {
	switch os := runtime.GOOS; os {
	case "darwin":
		return "mac", getMacArch()
	case "linux":
		osName, cpu := getLinuxDetails()
		return osName, cpu
	case "windows":
		return "windows", "amd64"
	default:
		log.Fatalf("%s is not a supported OS", os)
		return "", ""
	}
}

func getMacArch() string {
	if runtime.GOARCH == "arm64" {
		return "arm64"
	} else {
		return "x86_64"
	}
}

func getLinuxDetails() (string, string) {
	var archInfo = ""

	if runtime.GOARCH == "amd64" {
		return "linux", "x86_64"
	} else if runtime.GOARCH == "arm64" {
		archInfo = "-aarch64"
	}

	cmd := exec.Command("cat", "/proc/cpuinfo")
	cpuInfo, err := cmd.Output()

	if err != nil {
		log.Fatalf("Failed to get CPU details: %s", err.Error())
	}

	var cpuPart = ""
	for _, line := range strings.Split(string(cpuInfo), "\n") {
		if strings.Contains(line, "CPU part") {
			split := strings.Split(line, " ")
			cpuPart = strings.ToLower(split[len(split)-1])
			break
		}
	}

	switch cpuPart {
	case "0xb76":
		return "raspberry-pi", "arm11"
	case "0xc07":
		return "raspberry-pi", "cortex-a7"
	case "0xd03":
		return "raspberry-pi", "cortex-a53" + archInfo
	case "0xd07":
		return "jetson", "cortex-a57" + archInfo
	case "0xd08":
		return "raspberry-pi", "cortex-a72" + archInfo
	case "0xc08":
		return "beaglebone", ""
	default:
		log.Fatalf("Unsupported CPU:\n%s", cpuPart)
		return "", ""
	}
}

func extractDefaultModel() string {
	modelPath := "embedded/lib/common/rhino_params.pv"
	return extractFile(modelPath, extractionDir)
}

func extractLib() string {
	var libPath string
	switch os := runtime.GOOS; os {
	case "darwin":
		libPath = fmt.Sprintf("embedded/lib/%s/%s/libpv_rhino.dylib", osName, cpu)
	case "linux":
		if cpu == "" {
			libPath = fmt.Sprintf("embedded/lib/%s/libpv_rhino.so", osName)
		} else {
			libPath = fmt.Sprintf("embedded/lib/%s/%s/libpv_rhino.so", osName, cpu)
		}
	case "windows":
		libPath = fmt.Sprintf("embedded/lib/%s/amd64/libpv_rhino.dll", osName)
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

	srcHash := sha256sumBytes(bytes)
	hashedDstDir := filepath.Join(dstDir, srcHash)
	extractedFilepath := filepath.Join(hashedDstDir, srcFile)

	if _, err := os.Stat(extractedFilepath); errors.Is(err, os.ErrNotExist) {
		err = os.MkdirAll(filepath.Dir(extractedFilepath), 0777)
		if err != nil {
			log.Fatalf("Could not create rhino directory: %v", err)
		}

		writeErr := ioutil.WriteFile(extractedFilepath, bytes, 0777)
		if writeErr != nil {
			log.Fatalf("%v", writeErr)
		}
	}

	return extractedFilepath
}

func sha256sumBytes(bytes []byte) string {
	sum := sha256.Sum256(bytes)
	return hex.EncodeToString(sum[:])
}
