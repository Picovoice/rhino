/*
    Copyright 2021 Picovoice Inc.

    You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
    file accompanying this source.

    Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
    an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
    specific language governing permissions and limitations under the License.
*/

use libc::{c_char, c_float};
use libloading::{Library, Symbol};
use std::cmp::PartialEq;
use std::collections::HashMap;
use std::convert::AsRef;
use std::ffi::CStr;
use std::path::{Path, PathBuf};
use std::ptr::{addr_of, addr_of_mut};
use std::sync::Arc;

#[cfg(target_family = "unix")]
use libloading::os::unix::Symbol as RawSymbol;

#[cfg(target_family = "windows")]
use libloading::os::windows::Symbol as RawSymbol;

use crate::util::*;

#[repr(C)]
struct CRhino {}

#[repr(C)]
#[derive(PartialEq, Debug)]
#[allow(non_camel_case_types)]
pub enum PvStatus {
    SUCCESS = 0,
    OUT_OF_MEMORY = 1,
    IO_ERROR = 2,
    INVALID_ARGUMENT = 3,
    STOP_ITERATION = 4,
    KEY_ERROR = 5,
    INVALID_STATE = 6,
}

type PvRhinoInitFn = unsafe extern "C" fn(
    model_path: *const c_char,
    context_path: *const c_char,
    sensitivity: c_float,
    object: *mut *mut CRhino,
) -> PvStatus;
type PvRhinoDeleteFn = unsafe extern "C" fn(object: *mut CRhino);
type PvRhinoProcessFn = unsafe extern "C" fn(
    object: *mut CRhino,
    pcm: *const i16,
    is_understood: *mut bool,
) -> PvStatus;
type PvRhinoIsUnderstoodFn =
    unsafe extern "C" fn(object: *const CRhino, is_understood: *mut bool) -> PvStatus;
type PvRhinoGetIntentFn = unsafe extern "C" fn(
    object: *const CRhino,
    intent: *const *const c_char,
    num_slots: *mut i32,
    slots: *const *const *const c_char,
    values: *const *const *const c_char,
) -> PvStatus;
type PvRhinoFreeSlotsAndValuesFn = unsafe extern "C" fn(
    object: *const CRhino,
    slots: *const *const c_char,
    values: *const *const c_char,
) -> PvStatus;
type PvRhinoResetFn = unsafe extern "C" fn(object: *mut CRhino) -> PvStatus;
type PvRhinoContextInfoFn =
    unsafe extern "C" fn(object: *const CRhino, context_info: *const *const c_char) -> PvStatus;
type PvRhinoVersionFn = unsafe extern "C" fn() -> *mut c_char;
type PvRhinoFrameLengthFn = unsafe extern "C" fn() -> i32;
type PvSampleRateFn = unsafe extern "C" fn() -> i32;

#[derive(Debug)]
pub enum RhinoErrorStatus {
    LibraryError(PvStatus),
    LibraryLoadError,
    FrameLengthError,
    ArgumentError,
}

#[derive(Debug)]
pub struct RhinoError {
    pub status: RhinoErrorStatus,
    pub message: Option<String>,
}

impl RhinoError {
    pub fn new(status: RhinoErrorStatus, message: &str) -> Self {
        RhinoError {
            status,
            message: Some(message.to_string()),
        }
    }
}

impl std::fmt::Display for RhinoError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match &self.message {
            Some(message) => write!(f, "{}: {:?}", message, self.status),
            None => write!(f, "Rhino error: {:?}", self.status),
        }
    }
}

pub struct RhinoInference {
    pub is_understood: bool,
    pub intent: Option<String>,
    pub slots: HashMap<String, String>,
}

pub struct RhinoBuilder {
    library_path: PathBuf,
    model_path: PathBuf,
    context_path: PathBuf,
    sensitivity: f32,
}

impl RhinoBuilder {
    pub fn new<P: AsRef<Path>>(context_path: P) -> Self {
        return Self {
            library_path: pv_library_path(),
            model_path: pv_model_path(),
            context_path: PathBuf::from(context_path.as_ref()),
            sensitivity: 0.5f32,
        };
    }

    pub fn new_with_default() -> Self {
        return Self::new(pv_context_path());
    }

    pub fn library_path<'a, P: AsRef<Path>>(&'a mut self, library_path: P) -> &'a mut Self {
        self.library_path = PathBuf::from(library_path.as_ref());
        return self;
    }

    pub fn model_path<'a, P: AsRef<Path>>(&'a mut self, model_path: P) -> &'a mut Self {
        self.model_path = PathBuf::from(model_path.as_ref());
        return self;
    }

    pub fn context_path<'a, P: AsRef<Path>>(&'a mut self, context_path: P) -> &'a mut Self {
        self.context_path = PathBuf::from(context_path.as_ref());
        return self;
    }

    pub fn sensitivity<'a>(&'a mut self, sensitivity: f32) -> &'a mut Self {
        self.sensitivity = sensitivity;
        return self;
    }

    pub fn init(&self) -> Result<Rhino, RhinoError> {
        let inner = RhinoInner::init(
            self.library_path.clone(),
            self.model_path.clone(),
            self.context_path.clone(),
            self.sensitivity,
        );
        return match inner {
            Ok(inner) => Ok(Rhino {
                inner: Arc::new(inner),
            }),
            Err(err) => Err(err),
        };
    }
}

#[derive(Clone)]
pub struct Rhino {
    inner: Arc<RhinoInner>,
}

impl Rhino {
    pub fn process(&self, pcm: &[i16]) -> Result<bool, RhinoError> {
        return self.inner.process(pcm);
    }

    pub fn get_inference(&self) -> Result<RhinoInference, RhinoError> {
        return self.inner.get_inference();
    }

    pub fn context_info(&self) -> String {
        return self.inner.context_info.clone();
    }

    pub fn frame_length(&self) -> u32 {
        return self.inner.frame_length as u32;
    }

    pub fn sample_rate(&self) -> u32 {
        return self.inner.sample_rate as u32;
    }

    pub fn version(&self) -> String {
        return self.inner.version.clone();
    }
}

macro_rules! load_library_fn {
    ($lib:ident, $function_name:literal) => {
        match $lib.get($function_name) {
            Ok(symbol) => symbol,
            Err(err) => {
                return Err(RhinoError::new(
                    RhinoErrorStatus::LibraryLoadError,
                    &format!("Failed to load function symbol from Rhino library: {}", err),
                ))
            }
        };
    };
}

macro_rules! check_fn_call_status {
    ($status:ident, $function_name:literal) => {
        if $status != PvStatus::SUCCESS {
            return Err(RhinoError::new(
                RhinoErrorStatus::LibraryError($status),
                &format!("Function '{}' in the Rhino library failed", $function_name),
            ));
        }
    };
}

struct RhinoInnerVTable {
    pv_rhino_process: RawSymbol<PvRhinoProcessFn>,
    pv_rhino_delete: RawSymbol<PvRhinoDeleteFn>,
    pv_rhino_is_understood: RawSymbol<PvRhinoIsUnderstoodFn>,
    pv_rhino_get_intent: RawSymbol<PvRhinoGetIntentFn>,
    pv_rhino_free_slots_and_values: RawSymbol<PvRhinoFreeSlotsAndValuesFn>,
    pv_rhino_reset: RawSymbol<PvRhinoResetFn>,
}

struct RhinoInner {
    crhino: *mut CRhino,
    _lib: Library,
    frame_length: i32,
    sample_rate: i32,
    version: String,
    context_info: String,
    vtable: RhinoInnerVTable,
}

impl RhinoInner {
    pub fn init<P: AsRef<Path>>(
        library_path: P,
        model_path: P,
        context_path: P,
        sensitivity: f32,
    ) -> Result<Self, RhinoError> {
        unsafe {
            if !library_path.as_ref().exists() {
                return Err(RhinoError::new(
                    RhinoErrorStatus::ArgumentError,
                    &format!(
                        "Couldn't find Rhino's dynamic library at {}",
                        library_path.as_ref().display()
                    ),
                ));
            }

            if !model_path.as_ref().exists() {
                return Err(RhinoError::new(
                    RhinoErrorStatus::ArgumentError,
                    &format!(
                        "Couldn't find model file at {}",
                        model_path.as_ref().display()
                    ),
                ));
            }

            if !context_path.as_ref().exists() {
                return Err(RhinoError::new(
                    RhinoErrorStatus::ArgumentError,
                    &format!(
                        "Couldn't find context file at {}",
                        context_path.as_ref().display()
                    ),
                ));
            }

            if sensitivity < 0.0 || sensitivity > 1.0 {
                return Err(RhinoError::new(
                    RhinoErrorStatus::ArgumentError,
                    &format!("Sensitivity value {} should be within [0, 1]", sensitivity),
                ));
            }

            let lib = match Library::new(library_path.as_ref()) {
                Ok(symbol) => symbol,
                Err(err) => {
                    return Err(RhinoError::new(
                        RhinoErrorStatus::LibraryLoadError,
                        &format!("Failed to load rhino dynamic library: {}", err),
                    ))
                }
            };

            let pv_rhino_init: Symbol<PvRhinoInitFn> = load_library_fn!(lib, b"pv_rhino_init");

            let pv_model_path = pathbuf_to_cstring(&model_path);
            let pv_context_path = pathbuf_to_cstring(&context_path);
            let mut crhino = std::ptr::null_mut();

            let status = pv_rhino_init(
                pv_model_path.as_ptr(),
                pv_context_path.as_ptr(),
                sensitivity,
                addr_of_mut!(crhino),
            );
            if status != PvStatus::SUCCESS {
                return Err(RhinoError::new(
                    RhinoErrorStatus::LibraryLoadError,
                    "Failed to initialize the Rhino library",
                ));
            }

            let pv_rhino_process: Symbol<PvRhinoProcessFn> =
                load_library_fn!(lib, b"pv_rhino_process");

            let pv_rhino_delete: Symbol<PvRhinoDeleteFn> =
                load_library_fn!(lib, b"pv_rhino_delete");

            let pv_rhino_is_understood: Symbol<PvRhinoIsUnderstoodFn> =
                load_library_fn!(lib, b"pv_rhino_is_understood");

            let pv_rhino_get_intent: Symbol<PvRhinoGetIntentFn> =
                load_library_fn!(lib, b"pv_rhino_get_intent");

            let pv_rhino_free_slots_and_values: Symbol<PvRhinoFreeSlotsAndValuesFn> =
                load_library_fn!(lib, b"pv_rhino_free_slots_and_values");

            let pv_rhino_reset: Symbol<PvRhinoResetFn> = load_library_fn!(lib, b"pv_rhino_reset");

            let pv_rhino_context_info: Symbol<PvRhinoContextInfoFn> =
                load_library_fn!(lib, b"pv_rhino_context_info");

            let pv_sample_rate: Symbol<PvSampleRateFn> = load_library_fn!(lib, b"pv_sample_rate");

            let pv_rhino_frame_length: Symbol<PvRhinoFrameLengthFn> =
                load_library_fn!(lib, b"pv_rhino_frame_length");

            let pv_rhino_version: Symbol<PvRhinoVersionFn> =
                load_library_fn!(lib, b"pv_rhino_version");

            let sample_rate = pv_sample_rate();
            let frame_length = pv_rhino_frame_length();
            let version = match CStr::from_ptr(pv_rhino_version()).to_str() {
                Ok(string) => string.to_string(),
                Err(err) => {
                    return Err(RhinoError::new(
                        RhinoErrorStatus::LibraryLoadError,
                        &format!("Failed to get version info from Rhino Library: {}", err),
                    ))
                }
            };

            let context_info_ptr = std::ptr::null();
            let status = pv_rhino_context_info(crhino, addr_of!(context_info_ptr));
            check_fn_call_status!(status, "pv_rhino_context_info");
            let context_info = CStr::from_ptr(context_info_ptr);

            // Using the raw symbols means we have to ensure that "lib" outlives these refrences
            let vtable = RhinoInnerVTable {
                pv_rhino_process: pv_rhino_process.into_raw(),
                pv_rhino_delete: pv_rhino_delete.into_raw(),
                pv_rhino_is_understood: pv_rhino_is_understood.into_raw(),
                pv_rhino_get_intent: pv_rhino_get_intent.into_raw(),
                pv_rhino_free_slots_and_values: pv_rhino_free_slots_and_values.into_raw(),
                pv_rhino_reset: pv_rhino_reset.into_raw(),
            };

            return Ok(Self {
                crhino,
                _lib: lib,
                sample_rate,
                frame_length,
                version,
                context_info: context_info.to_string_lossy().to_string(),
                vtable,
            });
        }
    }

    pub fn process(&self, pcm: &[i16]) -> Result<bool, RhinoError> {
        if pcm.len() as i32 != self.frame_length {
            return Err(RhinoError::new(
                RhinoErrorStatus::FrameLengthError,
                &format!(
                    "Found a frame length of {} Expected {}",
                    pcm.len(),
                    self.frame_length
                ),
            ));
        }

        let mut is_finalized: bool = false;
        let status = unsafe {
            (self.vtable.pv_rhino_process)(self.crhino, pcm.as_ptr(), addr_of_mut!(is_finalized))
        };
        check_fn_call_status!(status, "pv_rhino_process");

        return Ok(is_finalized);
    }

    fn is_understood(&self) -> Result<bool, RhinoError> {
        let mut is_understood: bool = false;
        let status = unsafe {
            (self.vtable.pv_rhino_is_understood)(self.crhino, addr_of_mut!(is_understood))
        };
        check_fn_call_status!(status, "pv_rhino_is_understood");

        return Ok(is_understood);
    }

    fn reset(&self) -> Result<(), RhinoError> {
        let status = unsafe { (self.vtable.pv_rhino_reset)(self.crhino) };
        check_fn_call_status!(status, "pv_rhino_reset");

        return Ok(());
    }

    pub fn get_inference(&self) -> Result<RhinoInference, RhinoError> {
        let is_understood = self.is_understood()?;
        let mut slots = HashMap::new();
        let mut intent = None;

        if is_understood {
            unsafe {
                let intent_c_buffer = Vec::new();
                let intent_c_ptr = intent_c_buffer.as_ptr();

                let mut num_slots: i32 = 0;

                let slot_keys_ptr: *const c_char = std::ptr::null();
                let slot_keys_ptr_ptr = addr_of!(slot_keys_ptr);

                let slot_values_ptr: *const c_char = std::ptr::null();
                let slot_values_ptr_ptr = addr_of!(slot_values_ptr);

                let status = (self.vtable.pv_rhino_get_intent)(
                    self.crhino,
                    addr_of!(intent_c_ptr),
                    addr_of_mut!(num_slots),
                    addr_of!(slot_keys_ptr_ptr),
                    addr_of!(slot_values_ptr_ptr),
                );
                check_fn_call_status!(status, "pv_rhino_get_intent");

                let intent_c = CStr::from_ptr(intent_c_ptr);
                intent = Some(intent_c.to_string_lossy().to_string());

                for i in 0..num_slots as usize {
                    let slot_key = CStr::from_ptr(*slot_keys_ptr_ptr.add(i));
                    let slot_value = CStr::from_ptr(*slot_values_ptr_ptr.add(i));

                    let key = slot_key.to_string_lossy().to_string();
                    let value = slot_value.to_string_lossy().to_string();

                    slots.insert(key, value);
                }

                let status = (self.vtable.pv_rhino_free_slots_and_values)(
                    self.crhino,
                    slot_keys_ptr_ptr,
                    slot_values_ptr_ptr,
                );
                check_fn_call_status!(status, "pv_rhino_free_slots_and_values");
            }
        }

        self.reset()?;

        return Ok(RhinoInference {
            is_understood,
            intent,
            slots,
        });
    }
}

unsafe impl Send for RhinoInner {}
unsafe impl Sync for RhinoInner {}

impl Drop for RhinoInner {
    fn drop(&mut self) {
        unsafe {
            (self.vtable.pv_rhino_delete)(self.crhino);
        }
    }
}
