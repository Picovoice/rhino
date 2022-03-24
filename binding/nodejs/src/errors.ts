//
// Copyright 2020-2022 Picovoice Inc.
//
// You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
// file accompanying this source.
//
// Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
// an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
// specific language governing permissions and limitations under the License.
//
"use strict";

import PvStatus from "./pv_status_t";

export class RhinoError extends Error {}

export class RhinoOutOfMemoryError extends RhinoError {}
export class RhinoIoError extends RhinoError {}
export class RhinoInvalidArgumentError extends RhinoError {}
export class RhinoStopIterationError extends RhinoError {}
export class RhinoKeyError extends RhinoError {}
export class RhinoInvalidStateError extends RhinoError {}
export class RhinoRuntimeError extends RhinoError {}
export class RhinoActivationError extends RhinoError {}
export class RhinoActivationLimitReached extends RhinoError {}
export class RhinoActivationThrottled extends RhinoError {}
export class RhinoActivationRefused extends RhinoError {}


export function pvStatusToException(pvStatus: PvStatus, errorMessage: string) {
  switch (pvStatus) {
    case PvStatus.OUT_OF_MEMORY:
      throw new RhinoOutOfMemoryError(errorMessage);
    case PvStatus.IO_ERROR:
      throw new RhinoIoError(errorMessage);
    case PvStatus.INVALID_ARGUMENT:
      throw new RhinoInvalidArgumentError(errorMessage);
    case PvStatus.STOP_ITERATION:
      throw new RhinoStopIterationError(errorMessage);
    case PvStatus.KEY_ERROR:
      throw new RhinoKeyError(errorMessage);
    case PvStatus.INVALID_STATE:
      throw new RhinoInvalidStateError(errorMessage);
    case PvStatus.RUNTIME_ERROR:
      throw new RhinoRuntimeError(errorMessage);
    case PvStatus.ACTIVATION_ERROR:
      throw new RhinoActivationError(errorMessage);
    case PvStatus.ACTIVATION_LIMIT_REACHED:
      throw new RhinoActivationLimitReached(errorMessage);
    case PvStatus.ACTIVATION_THROTTLED:
      throw new RhinoActivationThrottled(errorMessage);
    case PvStatus.ACTIVATION_REFUSED:
      throw new RhinoActivationRefused(errorMessage);
    default:
      console.warn(`Unmapped error code: ${pvStatus}`);
      throw new RhinoError(errorMessage);
  }
}
