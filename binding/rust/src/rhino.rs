/*
    Copyright 2021-2023 Picovoice Inc.

    You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
    file accompanying this source.

    Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
    an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
    specific language governing permissions and limitations under the License.
*/

use std::cmp::PartialEq;
use std::collections::HashMap;
use std::ffi::{CStr, CString};
use std::path::{Path, PathBuf};
use std::ptr::{addr_of, addr_of_mut};
use std::sync::Arc;

use libc::{c_char, c_float};
use libloading::{Library, Symbol};

use crate::util::{pathbuf_to_cstring, pv_library_path, pv_model_path};

#[cfg(unix)]
use libloading::os::unix::Symbol as RawSymbol;
#[cfg(windows)]
use libloading::os::windows::Symbol as RawSymbol;

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
    endpoint_duration_sec: c_float,
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
    status: RhinoErrorStatus,
    message: String,
}

impl RhinoError {
    pub fn new(status: RhinoErrorStatus, message: impl Into<String>) -> Self {
        Self {
            status,
            message: message.into(),
        }
    }
}

impl std::fmt::Display for RhinoError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}: {:?}", self.message, self.status)
    }
}

impl std::error::Error for RhinoError {}

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
    endpoint_duration_sec: f32,
    require_endpoint: bool,
}

impl RhinoBuilder {
    const DEFAULT_SENSITIVITY: f32 = 0.5;
    const DEFAULT_ENDPOINT_DURATION_SEC: f32 = 1.0;
    const DEFAULT_REQUIRE_ENDPOINT: bool = true;

    pub fn new<S: Into<String>, P: Into<PathBuf>>(access_key: S, context_path: P) -> Self {
        Self {
            access_key: access_key.into(),
            library_path: pv_library_path(),
            model_path: pv_model_path(),
            context_path: context_path.into(),
            sensitivity: Self::DEFAULT_SENSITIVITY,
            endpoint_duration_sec: Self::DEFAULT_ENDPOINT_DURATION_SEC,
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

    pub fn endpoint_duration_sec(&mut self, endpoint_duration_sec: f32) -> &mut Self {
        self.endpoint_duration_sec = endpoint_duration_sec;
        self
    }

    pub fn require_endpoint(&mut self, require_endpoint: bool) -> &mut Self {
        self.require_endpoint = require_endpoint;
        self
    }

    pub fn init(&self) -> Result<Rhino, RhinoError> {
        RhinoInner::init(
            &self.access_key,
            self.library_path.clone(),
            self.model_path.clone(),
            self.context_path.clone(),
            self.sensitivity,
            self.endpoint_duration_sec,
            self.require_endpoint,
        )
        .map(|inner| Rhino {
            inner: Arc::new(inner),
        })
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

/// Safety:
/// The caller must uphold that the library is alive as long as the raw symbol
/// will be used. See the libloading documentation for details.
unsafe fn load_library_fn<T>(
    library: &Library,
    function_name: &[u8],
) -> Result<RawSymbol<T>, RhinoError> {
    library
        .get(function_name)
        .map(|s: Symbol<T>| s.into_raw())
        .map_err(|err| {
            RhinoError::new(
                RhinoErrorStatus::LibraryLoadError,
                format!("Failed to load function symbol from rhino library: {err}"),
            )
        })
}

fn check_fn_call_status(status: PvStatus, function_name: &str) -> Result<(), RhinoError> {
    match status {
        PvStatus::SUCCESS => Ok(()),
        _ => Err(RhinoError::new(
            RhinoErrorStatus::LibraryError(status),
            format!("Function '{function_name}' in the rhino library failed"),
        )),
    }
}

struct RhinoInnerVTable {
    pv_rhino_process: RawSymbol<PvRhinoProcessFn>,
    pv_rhino_delete: RawSymbol<PvRhinoDeleteFn>,
    pv_rhino_is_understood: RawSymbol<PvRhinoIsUnderstoodFn>,
    pv_rhino_get_intent: RawSymbol<PvRhinoGetIntentFn>,
    pv_rhino_free_slots_and_values: RawSymbol<PvRhinoFreeSlotsAndValuesFn>,
    pv_rhino_reset: RawSymbol<PvRhinoResetFn>,

    _lib_guard: Library,
}

impl RhinoInnerVTable {
    pub fn new(lib: Library) -> Result<Self, RhinoError> {
        // SAFETY: the library will be hold by this struct and therefore the symbols can't outlive the library
        unsafe {
            Ok(Self {
                pv_rhino_process: load_library_fn::<PvRhinoProcessFn>(&lib, b"pv_rhino_process")?,
                pv_rhino_delete: load_library_fn::<PvRhinoDeleteFn>(&lib, b"pv_rhino_delete")?,
                pv_rhino_is_understood: load_library_fn::<PvRhinoIsUnderstoodFn>(
                    &lib,
                    b"pv_rhino_is_understood",
                )?,
                pv_rhino_get_intent: load_library_fn::<PvRhinoGetIntentFn>(
                    &lib,
                    b"pv_rhino_get_intent",
                )?,
                pv_rhino_free_slots_and_values: load_library_fn::<PvRhinoFreeSlotsAndValuesFn>(
                    &lib,
                    b"pv_rhino_free_slots_and_values",
                )?,
                pv_rhino_reset: load_library_fn::<PvRhinoResetFn>(&lib, b"pv_rhino_reset")?,

                _lib_guard: lib,
            })
        }
    }
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
    pub fn init<P: AsRef<Path>>(
        access_key: &str,
        library_path: P,
        model_path: P,
        context_path: P,
        sensitivity: f32,
        endpoint_duration_sec: f32,
        require_endpoint: bool,
    ) -> Result<Self, RhinoError> {
        if access_key.is_empty() {
            return Err(RhinoError::new(
                RhinoErrorStatus::ArgumentError,
                "AccessKey is required for Rhino initialization",
            ));
        }

        if !library_path.as_ref().exists() {
            return Err(RhinoError::new(
                RhinoErrorStatus::ArgumentError,
                format!(
                    "Couldn't find Rhino's dynamic library at {}",
                    library_path.as_ref().display()
                ),
            ));
        }

        if !model_path.as_ref().exists() {
            return Err(RhinoError::new(
                RhinoErrorStatus::ArgumentError,
                format!(
                    "Couldn't find model file at {}",
                    model_path.as_ref().display()
                ),
            ));
        }

        if !context_path.as_ref().exists() {
            return Err(RhinoError::new(
                RhinoErrorStatus::ArgumentError,
                format!(
                    "Couldn't find context file at {}",
                    context_path.as_ref().display()
                ),
            ));
        }

        if !(0.0..=1.0).contains(&sensitivity) {
            return Err(RhinoError::new(
                RhinoErrorStatus::ArgumentError,
                format!("Sensitivity value {sensitivity} should be within [0, 1]"),
            ));
        }

        if !(0.5..=5.0).contains(&endpoint_duration_sec) {
            return Err(RhinoError::new(
                RhinoErrorStatus::ArgumentError,
                format!(
                    "Endpoint duration value {endpoint_duration_sec} should be within [0.5, 5.0]"
                ),
            ));
        }

        let lib = unsafe { Library::new(library_path.as_ref()) }.map_err(|err| {
            RhinoError::new(
                RhinoErrorStatus::LibraryLoadError,
                format!("Failed to load rhino dynamic library: {err}"),
            )
        })?;

        let pv_access_key = CString::new(access_key).map_err(|err| {
            RhinoError::new(
                RhinoErrorStatus::ArgumentError,
                format!("AccessKey is not a valid C string {err}"),
            )
        })?;
        let pv_model_path = pathbuf_to_cstring(model_path);
        let pv_context_path = pathbuf_to_cstring(context_path);

        // SAFETY: most of the unsafe comes from the `load_library_fn` which is
        // safe, because we don't use the raw symbols after this function
        // anymore, therefore they live as long as the library does
        let (crhino, sample_rate, frame_length, version, context_info) = unsafe {
            let pv_rhino_init = load_library_fn::<PvRhinoInitFn>(&lib, b"pv_rhino_init")?;
            let pv_rhino_version = load_library_fn::<PvRhinoVersionFn>(&lib, b"pv_rhino_version")?;
            let pv_rhino_context_info =
                load_library_fn::<PvRhinoContextInfoFn>(&lib, b"pv_rhino_context_info")?;
            let pv_sample_rate = load_library_fn::<PvSampleRateFn>(&lib, b"pv_sample_rate")?;
            let pv_rhino_frame_length =
                load_library_fn::<PvRhinoFrameLengthFn>(&lib, b"pv_rhino_frame_length")?;

            let mut crhino = std::ptr::null_mut();
            check_fn_call_status(
                pv_rhino_init(
                    pv_access_key.as_ptr(),
                    pv_model_path.as_ptr(),
                    pv_context_path.as_ptr(),
                    sensitivity,
                    endpoint_duration_sec,
                    require_endpoint,
                    addr_of_mut!(crhino),
                ),
                "pv_rhino_init",
            )?;

            let version = match CStr::from_ptr(pv_rhino_version()).to_str() {
                Ok(string) => string.to_string(),
                Err(err) => {
                    return Err(RhinoError::new(
                        RhinoErrorStatus::LibraryLoadError,
                        format!("Failed to get version info from Rhino Library: {err}"),
                    ))
                }
            };

            let context_info_ptr = std::ptr::null();
            check_fn_call_status(
                pv_rhino_context_info(crhino, addr_of!(context_info_ptr)),
                "pv_rhino_context_info",
            )?;

            (
                crhino,
                pv_sample_rate(),
                pv_rhino_frame_length(),
                version,
                CStr::from_ptr(context_info_ptr),
            )
        };

        Ok(Self {
            crhino,
            sample_rate,
            frame_length,
            version,
            context_info: context_info.to_string_lossy().to_string(),
            vtable: RhinoInnerVTable::new(lib)?,
        })
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

        let mut is_finalized = false;
        let status = unsafe {
            (self.vtable.pv_rhino_process)(self.crhino, pcm.as_ptr(), addr_of_mut!(is_finalized))
        };
        check_fn_call_status(status, "pv_rhino_process")?;

        Ok(is_finalized)
    }

    fn is_understood(&self) -> Result<bool, RhinoError> {
        let mut is_understood = false;
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

                let mut num_slots = 0;

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
