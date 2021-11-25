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

// +build darwin linux

package rhino

/*
#cgo LDFLAGS: -ldl
#cgo CFLAGS: -std=c99
#include <dlfcn.h>
#include <stdbool.h>
#include <stdint.h>
#include <stdlib.h>

typedef int32_t (*pv_rhino_init_func)(
	const char *access_key,
	const char *model_path,
	const char *context_path,
	float sensitivity,
	bool endpoint_required,
	void **object);

int32_t pv_rhino_init_wrapper(
	void *f,
	const char *access_key,
	const char *model_path,
	const char *context_path,
	float sensitivity,
	bool endpoint_required,
	void **object) {
	return ((pv_rhino_init_func) f)(
		access_key,
		model_path,
		context_path,
		sensitivity,
		endpoint_required,
		object);
}

typedef void (*pv_rhino_delete_func)(void *object);

void pv_rhino_delete_wrapper(void *f, void *object) {
	return ((pv_rhino_delete_func) f)(object);
}

typedef int32_t (*pv_rhino_process_func)(
	void *object,
	const int16_t *pcm,
	bool *is_finalized);

int32_t pv_rhino_process_wrapper(
	void *f,
	void *object,
	const int16_t *pcm,
	bool *is_finalized) {
	return ((pv_rhino_process_func) f)(
		object,
		pcm,
		is_finalized);
}

typedef int32_t (*pv_rhino_is_understood_func)(
	const void *object,
	bool *is_understood);

int32_t pv_rhino_is_understood_wrapper(
	void *f,
	const void *object,
	bool *is_understood) {
	return ((pv_rhino_is_understood_func) f)(
		object,
		is_understood);
}

typedef int32_t (*pv_rhino_get_intent_func)(
	const void *object,
	const char **intent,
	int32_t *num_slots,
	const char ***slots,
	const char ***values);

int32_t pv_rhino_get_intent_wrapper(
	void *f,
	const void *object,
	const char **intent,
	int32_t *num_slots,
	const char ***slots,
	const char ***values) {
	return ((pv_rhino_get_intent_func) f)(
		object,
		intent,
		num_slots,
		slots,
		values);
}

typedef int32_t (*pv_rhino_free_slots_and_values_func)(
	const void *object,
	const char **slots,
	const char **values);

int32_t pv_rhino_free_slots_and_values_wrapper(
	void *f,
	const void *object,
	const char **slots,
	const char **values) {
	return ((pv_rhino_free_slots_and_values_func) f)(
		object,
		slots,
		values);
}

typedef int32_t (*pv_rhino_reset_func)(void *object);

int32_t pv_rhino_reset_wrapper(
	void *f,
	void *object) {
	return ((pv_rhino_reset_func) f)(object);
}

typedef int32_t (*pv_rhino_context_info_func)(
	const void *object,
	const char **context_info);

int32_t pv_rhino_context_info_wrapper(
	void *f,
	const void *object,
	const char **context_info) {
	return ((pv_rhino_context_info_func) f)(
		object,
		context_info);
}

typedef char* (*pv_rhino_version_func)();

char* pv_rhino_version_wrapper(void* f) {
     return ((pv_rhino_version_func) f)();
}

typedef int32_t (*pv_rhino_frame_length_func)();

int32_t pv_rhino_frame_length_wrapper(void* f) {
     return ((pv_rhino_frame_length_func) f)();
}

typedef int32_t (*pv_rhino_sample_rate_func)();

int32_t pv_rhino_sample_rate_wrapper(void *f) {
     return ((pv_rhino_sample_rate_func) f)();
}
*/
import "C"

import (
	"unsafe"
)

var (
	lib                                = C.dlopen(C.CString(libName), C.RTLD_NOW)
	pv_rhino_init_ptr                  = C.dlsym(lib, C.CString("pv_rhino_init"))
	pv_rhino_delete_ptr                = C.dlsym(lib, C.CString("pv_rhino_delete"))
	pv_rhino_process_ptr               = C.dlsym(lib, C.CString("pv_rhino_process"))
	pv_rhino_is_understood_ptr         = C.dlsym(lib, C.CString("pv_rhino_is_understood"))
	pv_rhino_get_intent_ptr            = C.dlsym(lib, C.CString("pv_rhino_get_intent"))
	pv_rhino_free_slots_and_values_ptr = C.dlsym(lib, C.CString("pv_rhino_free_slots_and_values"))
	pv_rhino_reset_ptr                 = C.dlsym(lib, C.CString("pv_rhino_reset"))
	pv_rhino_context_info_ptr          = C.dlsym(lib, C.CString("pv_rhino_context_info"))
	pv_rhino_version_ptr               = C.dlsym(lib, C.CString("pv_rhino_version"))
	pv_rhino_frame_length_ptr          = C.dlsym(lib, C.CString("pv_rhino_frame_length"))
	pv_sample_rate_ptr                 = C.dlsym(lib, C.CString("pv_sample_rate"))
)

func (nr nativeRhinoType) nativeInit(rhino *Rhino) (status PvStatus) {
	var (
		accessKeyC   = C.CString(rhino.AccessKey)
		modelPathC   = C.CString(rhino.ModelPath)
		contextPathC = C.CString(rhino.ContextPath)
		ptrC         = make([]unsafe.Pointer, 1)
	)
	defer C.free(unsafe.Pointer(accessKeyC))
	defer C.free(unsafe.Pointer(modelPathC))
	defer C.free(unsafe.Pointer(contextPathC))

	var ret = C.pv_rhino_init_wrapper(
		pv_rhino_init_ptr,
		accessKeyC,
		modelPathC,
		contextPathC,
		(C.float)(rhino.Sensitivity),
		(C.bool)(rhino.RequireEndpoint),
		&ptrC[0])

	rhino.handle = uintptr(ptrC[0])
	return PvStatus(ret)
}

func (nr nativeRhinoType) nativeDelete(rhino *Rhino) {
	C.pv_rhino_delete_wrapper(
		pv_rhino_delete_ptr,
		unsafe.Pointer(rhino.handle))
	rhino.handle = uintptr(0)
}

func (nr nativeRhinoType) nativeProcess(rhino *Rhino, pcm []int16) (status PvStatus, isFinalized bool) {
	var finalized bool
	var ret = C.pv_rhino_process_wrapper(
		pv_rhino_process_ptr,
		unsafe.Pointer(rhino.handle),
		(*C.int16_t)(unsafe.Pointer(&pcm[0])),
		(*C.bool)(unsafe.Pointer(&finalized)))
	return PvStatus(ret), finalized
}

func (nr nativeRhinoType) nativeIsUnderstood(rhino *Rhino) (status PvStatus, inUnderstood bool) {
	var understood bool
	var ret = C.pv_rhino_is_understood_wrapper(
		pv_rhino_is_understood_ptr,
		unsafe.Pointer(rhino.handle),
		(*C.bool)(unsafe.Pointer(&understood)))
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

	var ret = C.pv_rhino_get_intent_wrapper(
		pv_rhino_get_intent_ptr,
		unsafe.Pointer(rhino.handle),
		(**C.char)(unsafe.Pointer(&intentPtr)),
		(*C.int32_t)(unsafe.Pointer(&numSlots)),
		(***C.char)(unsafe.Pointer(&slotKeysPtr)),
		(***C.char)(unsafe.Pointer(&slotValuesPtr)))
	intentRet = C.GoString((*C.char)(unsafe.Pointer(intentPtr)))

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
	var ret = C.pv_rhino_free_slots_and_values_wrapper(
		pv_rhino_free_slots_and_values_ptr,
		unsafe.Pointer(rhino.handle),
		(**C.char)(unsafe.Pointer(nr.slotKeysPtr)),
		(**C.char)(unsafe.Pointer(nr.slotValuePtr)))
	nr.slotKeysPtr = 0
	nr.slotValuePtr = 0
	return PvStatus(ret)
}

func (nr nativeRhinoType) nativeReset(rhino *Rhino) (status PvStatus) {
	var ret = C.pv_rhino_reset_wrapper(
		pv_rhino_reset_ptr,
		unsafe.Pointer(rhino.handle))
	return PvStatus(ret)
}

func (nr nativeRhinoType) nativeContextInfo(rhino *Rhino) (status PvStatus, contextInfo string) {
	var contextInfoPtr uintptr
	var ret = C.pv_rhino_context_info_wrapper(
		pv_rhino_context_info_ptr,
		unsafe.Pointer(rhino.handle),
		(**C.char)(unsafe.Pointer(&contextInfoPtr)))
	return PvStatus(ret), C.GoString((*C.char)(unsafe.Pointer(contextInfoPtr)))
}

func (nr nativeRhinoType) nativeVersion() (version string) {
	return C.GoString(C.pv_rhino_version_wrapper(pv_rhino_version_ptr))
}

func (nr nativeRhinoType) nativeFrameLength() (frameLength int) {
	return int(C.pv_rhino_frame_length_wrapper(pv_rhino_frame_length_ptr))
}

func (nr nativeRhinoType) nativeSampleRate() (sampleRate int) {
	return int(C.pv_rhino_sample_rate_wrapper(pv_sample_rate_ptr))
}
