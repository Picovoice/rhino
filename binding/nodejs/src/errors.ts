//
// Copyright 2020-2023 Picovoice Inc.
//
// You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
// file accompanying this source.
//
// Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
// an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
// specific language governing permissions and limitations under the License.
//
'use strict';

import PvStatus from './pv_status_t';

export class RhinoError extends Error {
  private readonly _message: string;
  private readonly _messageStack: string[];

  constructor(message: string, messageStack: string[] = []) {
    super(RhinoError.errorToString(message, messageStack));
    this._message = message;
    this._messageStack = messageStack;
  }

  get message(): string {
    return this._message;
  }

  get messageStack(): string[] {
    return this._messageStack;
  }

  private static errorToString(
    initial: string,
    messageStack: string[]
  ): string {
    let msg = initial;

    if (messageStack.length > 0) {
      msg += `: ${messageStack.reduce((acc, value, index) =>
        acc + '\n  [' + index + '] ' + value, '')}`;
    }

    return msg;
  }
}

export class RhinoOutOfMemoryError extends RhinoError {}
export class RhinoIOError extends RhinoError {}
export class RhinoInvalidArgumentError extends RhinoError {}
export class RhinoStopIterationError extends RhinoError {}
export class RhinoKeyError extends RhinoError {}
export class RhinoInvalidStateError extends RhinoError {}
export class RhinoRuntimeError extends RhinoError {}
export class RhinoActivationError extends RhinoError {}
export class RhinoActivationLimitReachedError extends RhinoError {}
export class RhinoActivationThrottledError extends RhinoError {}
export class RhinoActivationRefusedError extends RhinoError {}

export function pvStatusToException(
  pvStatus: PvStatus,
  errorMessage: string,
  messageStack: string[] = []
): void {
  switch (pvStatus) {
    case PvStatus.OUT_OF_MEMORY:
      throw new RhinoOutOfMemoryError(errorMessage, messageStack);
    case PvStatus.IO_ERROR:
      throw new RhinoIOError(errorMessage, messageStack);
    case PvStatus.INVALID_ARGUMENT:
      throw new RhinoInvalidArgumentError(errorMessage, messageStack);
    case PvStatus.STOP_ITERATION:
      throw new RhinoStopIterationError(errorMessage, messageStack);
    case PvStatus.KEY_ERROR:
      throw new RhinoKeyError(errorMessage, messageStack);
    case PvStatus.INVALID_STATE:
      throw new RhinoInvalidStateError(errorMessage, messageStack);
    case PvStatus.RUNTIME_ERROR:
      throw new RhinoRuntimeError(errorMessage, messageStack);
    case PvStatus.ACTIVATION_ERROR:
      throw new RhinoActivationError(errorMessage, messageStack);
    case PvStatus.ACTIVATION_LIMIT_REACHED:
      throw new RhinoActivationLimitReachedError(errorMessage, messageStack);
    case PvStatus.ACTIVATION_THROTTLED:
      throw new RhinoActivationThrottledError(errorMessage, messageStack);
    case PvStatus.ACTIVATION_REFUSED:
      throw new RhinoActivationRefusedError(errorMessage, messageStack);
    default:
      // eslint-disable-next-line no-console
      console.warn(`Unmapped error code: ${pvStatus}`);
      throw new RhinoError(errorMessage);
  }
}
