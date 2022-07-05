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

package rhino

/*
#cgo linux LDFLAGS: -ldl
#cgo darwin LDFLAGS: -ldl
#cgo CFLAGS: -std=c99
#include <stdbool.h>
#include <stdint.h>
#include <stdlib.h>

#if defined(_WIN32) || defined(_WIN64)

	#include <windows.h>

#else

	#include <dlfcn.h>

#endif

static void *open_dl(const char *dl_path) {

#if defined(_WIN32) || defined(_WIN64)

    return LoadLibrary((LPCSTR) dl_path);

#else

    return dlopen(dl_path, RTLD_NOW);

#endif

}

static void *load_symbol(void *handle, const char *symbol) {

#if defined(_WIN32) || defined(_WIN64)

    return GetProcAddress((HMODULE) handle, symbol);

#else

    return dlsym(handle, symbol);

#endif

}

typedef int32_t (*pv_rhino_init_func)(
	const char *access_key,
	const char *model_path,
	const char *context_path,
	float sensitivity,
	float endpoint_duration_sec,
	bool endpoint_required,
	void **object);

int32_t pv_rhino_init_wrapper(
	void *f,
	const char *access_key,
	const char *model_path,
	const char *context_path,
	float sensitivity,
	float endpoint_duration_sec,
	bool endpoint_required,
	void **object) {
	return ((pv_rhino_init_func) f)(
		access_key,
		model_path,
		context_path,
		sensitivity,
		endpoint_duration_sec,
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
	libraryHandle                      unsafe.Pointer
	pv_rhino_init_ptr                  unsafe.Pointer
	pv_rhino_delete_ptr                unsafe.Pointer
	pv_rhino_process_ptr               unsafe.Pointer
	pv_rhino_is_understood_ptr         unsafe.Pointer
	pv_rhino_get_intent_ptr            unsafe.Pointer
	pv_rhino_free_slots_and_values_ptr unsafe.Pointer
	pv_rhino_reset_ptr                 unsafe.Pointer
	pv_rhino_context_info_ptr          unsafe.Pointer
	pv_rhino_version_ptr               unsafe.Pointer
	pv_rhino_frame_length_ptr          unsafe.Pointer
	pv_sample_rate_ptr                 unsafe.Pointer
	slotKeysPtr                        unsafe.Pointer
	slotValuePtr                       unsafe.Pointer
}

func (nr *nativeRhinoType) nativeInit(rhino *Rhino) (status PvStatus) {
	var (
		accessKeyC   = C.CString(rhino.AccessKey)
		libraryPathC = C.CString(rhino.LibraryPath)
		modelPathC   = C.CString(rhino.ModelPath)
		contextPathC = C.CString(rhino.ContextPath)
	)
	defer C.free(unsafe.Pointer(accessKeyC))
	defer C.free(unsafe.Pointer(libraryPathC))
	defer C.free(unsafe.Pointer(modelPathC))
	defer C.free(unsafe.Pointer(contextPathC))

	nr.libraryHandle = C.open_dl(libraryPathC)
	nr.pv_rhino_init_ptr = C.load_symbol(nr.libraryHandle, C.CString("pv_rhino_init"))
	nr.pv_rhino_delete_ptr = C.load_symbol(nr.libraryHandle, C.CString("pv_rhino_delete"))
	nr.pv_rhino_process_ptr = C.load_symbol(nr.libraryHandle, C.CString("pv_rhino_process"))
	nr.pv_rhino_is_understood_ptr = C.load_symbol(nr.libraryHandle, C.CString("pv_rhino_is_understood"))
	nr.pv_rhino_get_intent_ptr = C.load_symbol(nr.libraryHandle, C.CString("pv_rhino_get_intent"))
	nr.pv_rhino_free_slots_and_values_ptr = C.load_symbol(nr.libraryHandle, C.CString("pv_rhino_free_slots_and_values"))
	nr.pv_rhino_reset_ptr = C.load_symbol(nr.libraryHandle, C.CString("pv_rhino_reset"))
	nr.pv_rhino_context_info_ptr = C.load_symbol(nr.libraryHandle, C.CString("pv_rhino_context_info"))
	nr.pv_rhino_version_ptr = C.load_symbol(nr.libraryHandle, C.CString("pv_rhino_version"))
	nr.pv_rhino_frame_length_ptr = C.load_symbol(nr.libraryHandle, C.CString("pv_rhino_frame_length"))
	nr.pv_sample_rate_ptr = C.load_symbol(nr.libraryHandle, C.CString("pv_sample_rate"))

	var ret = C.pv_rhino_init_wrapper(
		nr.pv_rhino_init_ptr,
		accessKeyC,
		modelPathC,
		contextPathC,
		(C.float)(rhino.Sensitivity),
		(C.float)(rhino.EndpointDurationSec),
		(C.bool)(rhino.RequireEndpoint),
		&rhino.handle)

	return PvStatus(ret)
}

func (nr *nativeRhinoType) nativeDelete(rhino *Rhino) {
	C.pv_rhino_delete_wrapper(
		nr.pv_rhino_delete_ptr,
		rhino.handle)
	rhino.handle = nil
}

func (nr *nativeRhinoType) nativeProcess(rhino *Rhino, pcm []int16) (status PvStatus, isFinalized bool) {
	var finalized bool
	var ret = C.pv_rhino_process_wrapper(
		nr.pv_rhino_process_ptr,
		rhino.handle,
		(*C.int16_t)(unsafe.Pointer(&pcm[0])),
		(*C.bool)(unsafe.Pointer(&finalized)))
	return PvStatus(ret), finalized
}

func (nr *nativeRhinoType) nativeIsUnderstood(rhino *Rhino) (status PvStatus, inUnderstood bool) {
	var understood bool
	var ret = C.pv_rhino_is_understood_wrapper(
		nr.pv_rhino_is_understood_ptr,
		rhino.handle,
		(*C.bool)(unsafe.Pointer(&understood)))
	return PvStatus(ret), understood
}

func (nr *nativeRhinoType) nativeGetIntent(rhino *Rhino) (status PvStatus, intent string, slots map[string]string) {
	var (
		intentRet     string
		slotsRet      = make(map[string]string)
		intentPtr     unsafe.Pointer
		numSlots      int
		slotKeysPtr   unsafe.Pointer
		slotValuesPtr unsafe.Pointer
	)

	var ret = C.pv_rhino_get_intent_wrapper(
		nr.pv_rhino_get_intent_ptr,
		rhino.handle,
		(**C.char)(unsafe.Pointer(&intentPtr)),
		(*C.int32_t)(unsafe.Pointer(&numSlots)),
		(***C.char)(unsafe.Pointer(&slotKeysPtr)),
		(***C.char)(unsafe.Pointer(&slotValuesPtr)))
	intentRet = C.GoString((*C.char)(unsafe.Pointer(intentPtr)))

	for i := 0; i < numSlots; i++ {
		offset := uintptr(i) * unsafe.Sizeof(uintptr(0))
		slotKeyPtr := (**C.char)(unsafe.Pointer(uintptr(slotKeysPtr) + offset))
		slotValuePtr := (**C.char)(unsafe.Pointer(uintptr(slotValuesPtr) + offset))
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
		nr.pv_rhino_free_slots_and_values_ptr,
		rhino.handle,
		(**C.char)(nr.slotKeysPtr),
		(**C.char)(nr.slotValuePtr))
	nr.slotKeysPtr = nil
	nr.slotValuePtr = nil
	return PvStatus(ret)
}

func (nr *nativeRhinoType) nativeReset(rhino *Rhino) (status PvStatus) {
	var ret = C.pv_rhino_reset_wrapper(
		nr.pv_rhino_reset_ptr,
		rhino.handle)
	return PvStatus(ret)
}

func (nr *nativeRhinoType) nativeContextInfo(rhino *Rhino) (status PvStatus, contextInfo string) {
	var contextInfoPtr unsafe.Pointer
	var ret = C.pv_rhino_context_info_wrapper(
		nr.pv_rhino_context_info_ptr,
		rhino.handle,
		(**C.char)(unsafe.Pointer(&contextInfoPtr)))
	return PvStatus(ret), C.GoString((*C.char)(contextInfoPtr))
}

func (nr *nativeRhinoType) nativeVersion() (version string) {
	return C.GoString(C.pv_rhino_version_wrapper(nr.pv_rhino_version_ptr))
}

func (nr *nativeRhinoType) nativeFrameLength() (frameLength int) {
	return int(C.pv_rhino_frame_length_wrapper(nr.pv_rhino_frame_length_ptr))
}

func (nr *nativeRhinoType) nativeSampleRate() (sampleRate int) {
	return int(C.pv_rhino_sample_rate_wrapper(nr.pv_sample_rate_ptr))
}
