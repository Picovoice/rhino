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

// +build windows

package rhino

//#include <stdlib.h>
import "C"

import (
	"unsafe"

	"golang.org/x/sys/windows"
)

var (
	lib                        = windows.NewLazyDLL(libName)
	init_func                  = lib.NewProc("pv_rhino_init")
	delete_func                = lib.NewProc("pv_rhino_delete")
	process_func               = lib.NewProc("pv_rhino_process")
	is_understood_func         = lib.NewProc("pv_rhino_is_understood")
	get_intent_func            = lib.NewProc("pv_rhino_get_intent")
	free_slots_and_values_func = lib.NewProc("pv_rhino_free_slots_and_values")
	reset_func                 = lib.NewProc("pv_rhino_reset")
	context_info_func          = lib.NewProc("pv_rhino_context_info")
	version_func               = lib.NewProc("pv_rhino_version")
	frame_length_func          = lib.NewProc("pv_rhino_frame_length")
	sample_rate_func           = lib.NewProc("pv_sample_rate")
)

func (nr nativeRhinoType) nativeInit(rhino *Rhino) (status PvStatus) {
	var (
		modelPathC   = C.CString(rhino.ModelPath)
		contextPathC = C.CString(rhino.ContextPath)
	)
	defer C.free(unsafe.Pointer(modelPathC))
	defer C.free(unsafe.Pointer(contextPathC))

	ret, _, _ := init_func.Call(
		uintptr(unsafe.Pointer(modelPathC)),
		uintptr(unsafe.Pointer(contextPathC)),
		uintptr(rhino.Sensitivity),
		uintptr(unsafe.Pointer(&rhino.handle)))

	return PvStatus(ret)
}

func (nr nativeRhinoType) nativeDelete(rhino *Rhino) {
	delete_func.Call(rhino.handle)
	rhino.handle = uintptr(0)
}

func (nr nativeRhinoType) nativeProcess(rhino *Rhino, pcm []int16) (status PvStatus, isFinalized bool) {
	var finalized bool
	ret, _, _ := process_func.Call(
		rhino.handle,
		uintptr(unsafe.Pointer(&pcm[0])),
		uintptr(unsafe.Pointer(&finalized)))
	return PvStatus(ret), finalized
}

func (nr nativeRhinoType) nativeIsUnderstood(rhino *Rhino) (status PvStatus, inUnderstood bool) {
	var understood bool
	ret, _, _ := is_understood_func.Call(
		rhino.handle,
		uintptr(unsafe.Pointer(&understood)))
	return PvStatus(ret), understood
}

func (nr *nativeRhinoType) nativeGetIntent(rhino *Rhino) (status PvStatus, intent string, slots map[string]string) {
	var (
		intentRet     string
		slotsRet      = make(map[string]string)
		intentPtr     uintptr
		numSlots      int
		slotKeysPtr   uintptr
		slotValuesPtr uintptr
	)

	ret, _, _ := get_intent_func.Call(
		rhino.handle,
		uintptr(unsafe.Pointer(&intentPtr)),
		uintptr(unsafe.Pointer(&numSlots)),
		uintptr(unsafe.Pointer(&slotKeysPtr)),
		uintptr(unsafe.Pointer(&slotValuesPtr)))
	intentRet = C.GoString((*C.char)(unsafe.Pointer(intentPtr)))

	// do slots
	for i := 0; i < numSlots; i++ {
		offset := uintptr(i) * unsafe.Sizeof(uintptr(0))
		slotKeyPtr := (**C.char)(unsafe.Pointer(slotKeysPtr + offset))
		slotValuePtr := (**C.char)(unsafe.Pointer(slotValuesPtr + offset))
		slotKey := C.GoString(*slotKeyPtr)
		slotValue := C.GoString(*slotValuePtr)
		slotsRet[slotKey] = slotValue
	}

	nr.slotKeysPtr = slotKeysPtr
	nr.slotValuePtr = slotValuesPtr
	return PvStatus(ret), intentRet, slotsRet
}

func (nr *nativeRhinoType) nativeFreeSlotsAndValues(rhino *Rhino) (status PvStatus) {
	ret, _, _ := free_slots_and_values_func.Call(rhino.handle, nr.slotKeysPtr, nr.slotValuePtr)
	nr.slotKeysPtr = 0
	nr.slotValuePtr = 0
	return PvStatus(ret)
}

func (nr nativeRhinoType) nativeReset(rhino *Rhino) (status PvStatus) {
	ret, _, _ := reset_func.Call(rhino.handle)
	return PvStatus(ret)
}

func (nr nativeRhinoType) nativeContextInfo(rhino *Rhino) (status PvStatus, contextInfo string) {
	var contextInfoPtr uintptr
	ret, _, _ := context_info_func.Call(
		rhino.handle,
		uintptr(unsafe.Pointer(&contextInfoPtr)))
	return PvStatus(ret), C.GoString((*C.char)(unsafe.Pointer(contextInfoPtr)))
}

func (nr nativeRhinoType) nativeSampleRate() (sampleRate int) {
	ret, _, _ := sample_rate_func.Call()
	return int(ret)
}

func (nr nativeRhinoType) nativeFrameLength() (frameLength int) {
	ret, _, _ := frame_length_func.Call()
	return int(ret)
}

func (nr nativeRhinoType) nativeVersion() (version string) {
	ret, _, _ := version_func.Call()
	return C.GoString((*C.char)(unsafe.Pointer(ret)))
}
