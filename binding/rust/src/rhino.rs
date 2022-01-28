/*
    Copyright 2021 Picovoice Inc.

    You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
    file accompanying this source.

    Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
    an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
    specific language governing permissions and limitations under the License.
*/

use lazy_static::lazy_static;
use libc::{c_char, c_float};
use libloading::{Library, Symbol};
use std::cmp::PartialEq;
use std::collections::HashMap;

use std::ffi::{CStr, CString};
use std::path::PathBuf;
use std::ptr::{addr_of, addr_of_mut};
use std::sync::Arc;

use crate::util::{pathbuf_to_cstring, pv_library_path, pv_model_path};

lazy_static! {
    static ref PV_RHINO_LIB: Result<Library, RhinoError> = {
        unsafe {
            match Library::new(pv_library_path()) {
                Ok(symbol) => Ok(symbol),
                Err(err) => Err(RhinoError::new(
                    RhinoErrorStatus::LibraryLoadError,
                    format!("Failed to load rhino dynamic library: {}", err),
                )),
            }
        }
    };
}

#[repr(C)]
struct CRhino {}

#[repr(C)]
#[derive(PartialEq, Clone, Debug)]
#[allow(non_camel_case_types)]
pub enum PvStatus {
    SUCCESS = 0,
    OUT_OF_MEMORY = 1,
    IO_ERROR = 2,
    INVALID_ARGUMENT = 3,
    STOP_ITERATION = 4,
    KEY_ERROR = 5,
    INVALID_STATE = 6,
    RUNTIME_ERROR = 7,
    ACTIVATION_ERROR = 8,
    ACTIVATION_LIMIT_REACHED = 9,
    ACTIVATION_THROTTLED = 10,
    ACTIVATION_REFUSED = 11,
}

type PvRhinoInitFn = unsafe extern "C" fn(
    access_key: *const c_char,
    model_path: *const c_char,
    context_path: *const c_char,
    sensitivity: c_float,
    require_endpoint: bool,
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

#[derive(PartialEq, Clone, Debug)]
pub enum RhinoErrorStatus {
    LibraryError(PvStatus),
    LibraryLoadError,
    FrameLengthError,
    ArgumentError,
}

#[derive(PartialEq, Clone, Debug)]
pub struct RhinoError {
    pub status: RhinoErrorStatus,
    pub message: Option<String>,
}

impl RhinoError {
    pub fn new(status: RhinoErrorStatus, message: impl Into<String>) -> Self {
        Self {
            status,
            message: Some(message.into()),
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
    access_key: String,
    library_path: PathBuf,
    model_path: PathBuf,
    context_path: PathBuf,
    sensitivity: f32,
    require_endpoint: bool,
}

impl RhinoBuilder {
    const DEFAULT_SENSITIVITY: f32 = 0.5;
    const DEFAULT_REQUIRE_ENDPOINT: bool = true;

    pub fn new<S: Into<String>, P: Into<PathBuf>>(access_key: S, context_path: P) -> Self {
        Self {
            access_key: access_key.into(),
            library_path: pv_library_path(),
            model_path: pv_model_path(),
            context_path: context_path.into(),
            sensitivity: Self::DEFAULT_SENSITIVITY,
            require_endpoint: Self::DEFAULT_REQUIRE_ENDPOINT,
        }
    }

    pub fn access_key<S: Into<String>>(&mut self, access_key: S) -> &mut Self {
        self.access_key = access_key.into();
        self
    }

    pub fn library_path<P: Into<PathBuf>>(&mut self, library_path: P) -> &mut Self {
        self.library_path = library_path.into();
        self
    }

    pub fn model_path<P: Into<PathBuf>>(&mut self, model_path: P) -> &mut Self {
        self.model_path = model_path.into();
        self
    }

    pub fn context_path<P: Into<PathBuf>>(&mut self, context_path: P) -> &mut Self {
        self.context_path = context_path.into();
        self
    }

    pub fn sensitivity(&mut self, sensitivity: f32) -> &mut Self {
        self.sensitivity = sensitivity;
        self
    }

    pub fn require_endpoint(&mut self, require_endpoint: bool) -> &mut Self {
        self.require_endpoint = require_endpoint;
        self
    }

    pub fn init(&self) -> Result<Rhino, RhinoError> {
        let inner = RhinoInner::init(
            self.access_key.clone(),
            self.library_path.clone(),
            self.model_path.clone(),
            self.context_path.clone(),
            self.sensitivity,
            self.require_endpoint,
        );
        match inner {
            Ok(inner) => Ok(Rhino {
                inner: Arc::new(inner),
            }),
            Err(err) => Err(err),
        }
    }
}

#[derive(Clone)]
pub struct Rhino {
    inner: Arc<RhinoInner>,
}

impl Rhino {
    pub fn process(&self, pcm: &[i16]) -> Result<bool, RhinoError> {
        self.inner.process(pcm)
    }

    pub fn get_inference(&self) -> Result<RhinoInference, RhinoError> {
        self.inner.get_inference()
    }

    pub fn context_info(&self) -> String {
        self.inner.context_info.clone()
    }

    pub fn frame_length(&self) -> u32 {
        self.inner.frame_length as u32
    }

    pub fn sample_rate(&self) -> u32 {
        self.inner.sample_rate as u32
    }

    pub fn version(&self) -> String {
        self.inner.version.clone()
    }
}

fn load_library_fn<T>(function_name: &[u8]) -> Result<Symbol<T>, RhinoError> {
    match &*PV_RHINO_LIB {
        Ok(lib) => unsafe {
            lib.get(function_name).map_err(|err| {
                RhinoError::new(
                    RhinoErrorStatus::LibraryLoadError,
                    format!("Failed to load function symbol from rhino library: {}", err),
                )
            })
        },
        Err(err) => Err((*err).clone()),
    }
}

fn check_fn_call_status(status: PvStatus, function_name: &str) -> Result<(), RhinoError> {
    match status {
        PvStatus::SUCCESS => Ok(()),
        _ => Err(RhinoError::new(
            RhinoErrorStatus::LibraryError(status),
            format!("Function '{}' in the rhino library failed", function_name),
        )),
    }
}

struct RhinoInnerVTable {
    pv_rhino_process: Symbol<'static, PvRhinoProcessFn>,
    pv_rhino_delete: Symbol<'static, PvRhinoDeleteFn>,
    pv_rhino_is_understood: Symbol<'static, PvRhinoIsUnderstoodFn>,
    pv_rhino_get_intent: Symbol<'static, PvRhinoGetIntentFn>,
    pv_rhino_free_slots_and_values: Symbol<'static, PvRhinoFreeSlotsAndValuesFn>,
    pv_rhino_reset: Symbol<'static, PvRhinoResetFn>,
}

struct RhinoInner {
    crhino: *mut CRhino,
    frame_length: i32,
    sample_rate: i32,
    version: String,
    context_info: String,
    vtable: RhinoInnerVTable,
}

impl RhinoInner {
    pub fn init<S: Into<String>, P: Into<PathBuf>>(
        access_key: S,
        library_path: P,
        model_path: P,
        context_path: P,
        sensitivity: f32,
        require_endpoint: bool,
    ) -> Result<Self, RhinoError> {
        unsafe {
            let access_key: String = access_key.into();
            let library_path: PathBuf = library_path.into();
            let model_path: PathBuf = model_path.into();
            let context_path: PathBuf = context_path.into();

            if access_key.is_empty() {
                return Err(RhinoError::new(
                    RhinoErrorStatus::ArgumentError,
                    "AccessKey is required for Rhino initialization",
                ));
            }

            if !library_path.exists() {
                return Err(RhinoError::new(
                    RhinoErrorStatus::ArgumentError,
                    format!(
                        "Couldn't find Rhino's dynamic library at {}",
                        library_path.display()
                    ),
                ));
            }

            if !model_path.exists() {
                return Err(RhinoError::new(
                    RhinoErrorStatus::ArgumentError,
                    format!("Couldn't find model file at {}", model_path.display()),
                ));
            }

            if !context_path.exists() {
                return Err(RhinoError::new(
                    RhinoErrorStatus::ArgumentError,
                    format!("Couldn't find context file at {}", context_path.display()),
                ));
            }

            if !(0.0..=1.0).contains(&sensitivity) {
                return Err(RhinoError::new(
                    RhinoErrorStatus::ArgumentError,
                    format!("Sensitivity value {} should be within [0, 1]", sensitivity),
                ));
            }

            let _lib = match Library::new(library_path) {
                Ok(symbol) => symbol,
                Err(err) => {
                    return Err(RhinoError::new(
                        RhinoErrorStatus::LibraryLoadError,
                        format!("Failed to load rhino dynamic library: {}", err),
                    ))
                }
            };

            let pv_rhino_init: Symbol<PvRhinoInitFn> = load_library_fn(b"pv_rhino_init")?;

            let pv_access_key = CString::new(access_key).map_err(|err| {
                RhinoError::new(
                    RhinoErrorStatus::ArgumentError,
                    format!("AccessKey is not a valid C string {}", err),
                )
            })?;
            let pv_model_path = pathbuf_to_cstring(&model_path);
            let pv_context_path = pathbuf_to_cstring(&context_path);
            let mut crhino = std::ptr::null_mut();

            let status = pv_rhino_init(
                pv_access_key.as_ptr(),
                pv_model_path.as_ptr(),
                pv_context_path.as_ptr(),
                sensitivity,
                require_endpoint,
                addr_of_mut!(crhino),
            );
            if status != PvStatus::SUCCESS {
                return Err(RhinoError::new(
                    RhinoErrorStatus::LibraryLoadError,
                    "Failed to initialize the Rhino library",
                ));
            }

            let pv_rhino_process: Symbol<PvRhinoProcessFn> = load_library_fn(b"pv_rhino_process")?;

            let pv_rhino_delete: Symbol<PvRhinoDeleteFn> = load_library_fn(b"pv_rhino_delete")?;

            let pv_rhino_is_understood: Symbol<PvRhinoIsUnderstoodFn> =
                load_library_fn(b"pv_rhino_is_understood")?;

            let pv_rhino_get_intent: Symbol<PvRhinoGetIntentFn> =
                load_library_fn(b"pv_rhino_get_intent")?;

            let pv_rhino_free_slots_and_values: Symbol<PvRhinoFreeSlotsAndValuesFn> =
                load_library_fn(b"pv_rhino_free_slots_and_values")?;

            let pv_rhino_reset: Symbol<PvRhinoResetFn> = load_library_fn(b"pv_rhino_reset")?;

            let pv_rhino_context_info: Symbol<PvRhinoContextInfoFn> =
                load_library_fn(b"pv_rhino_context_info")?;

            let pv_sample_rate: Symbol<PvSampleRateFn> = load_library_fn(b"pv_sample_rate")?;

            let pv_rhino_frame_length: Symbol<PvRhinoFrameLengthFn> =
                load_library_fn(b"pv_rhino_frame_length")?;

            let pv_rhino_version: Symbol<PvRhinoVersionFn> = load_library_fn(b"pv_rhino_version")?;

            let sample_rate = pv_sample_rate();
            let frame_length = pv_rhino_frame_length();
            let version = match CStr::from_ptr(pv_rhino_version()).to_str() {
                Ok(string) => string.to_string(),
                Err(err) => {
                    return Err(RhinoError::new(
                        RhinoErrorStatus::LibraryLoadError,
                        format!("Failed to get version info from Rhino Library: {}", err),
                    ))
                }
            };

            let context_info_ptr = std::ptr::null();
            let status = pv_rhino_context_info(crhino, addr_of!(context_info_ptr));
            check_fn_call_status(status, "pv_rhino_context_info")?;
            let context_info = CStr::from_ptr(context_info_ptr);

            let vtable = RhinoInnerVTable {
                pv_rhino_process,
                pv_rhino_delete,
                pv_rhino_is_understood,
                pv_rhino_get_intent,
                pv_rhino_free_slots_and_values,
                pv_rhino_reset,
            };

            Ok(Self {
                crhino,
                sample_rate,
                frame_length,
                version,
                context_info: context_info.to_string_lossy().to_string(),
                vtable,
            })
        }
    }

    pub fn process(&self, pcm: &[i16]) -> Result<bool, RhinoError> {
        if pcm.len() as i32 != self.frame_length {
            return Err(RhinoError::new(
                RhinoErrorStatus::FrameLengthError,
                format!(
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
        check_fn_call_status(status, "pv_rhino_process")?;

        Ok(is_finalized)
    }

    fn is_understood(&self) -> Result<bool, RhinoError> {
        let mut is_understood: bool = false;
        let status = unsafe {
            (self.vtable.pv_rhino_is_understood)(self.crhino, addr_of_mut!(is_understood))
        };
        check_fn_call_status(status, "pv_rhino_is_understood")?;

        Ok(is_understood)
    }

    fn reset(&self) -> Result<(), RhinoError> {
        let status = unsafe { (self.vtable.pv_rhino_reset)(self.crhino) };
        check_fn_call_status(status, "pv_rhino_reset")?;

        Ok(())
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
                check_fn_call_status(status, "pv_rhino_get_intent")?;

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
                check_fn_call_status(status, "pv_rhino_free_slots_and_values")?;
            }
        }

        self.reset()?;

        Ok(RhinoInference {
            is_understood,
            intent,
            slots,
        })
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
