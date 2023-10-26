//
// Copyright 2023 Picovoice Inc.
//
// You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
// file accompanying this source.
//
// Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
// an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
// specific language governing permissions and limitations under the License.
//

import { PvError } from "@picovoice/web-utils";
import { PvStatus } from "./types";

class RhinoError extends Error {
  private readonly _status: PvStatus;
  private readonly _shortMessage: string;
  private readonly _messageStack: string[];

  constructor(status: PvStatus, message: string, messageStack: string[] = [], pvError: PvError | null = null) {
    super(RhinoError.errorToString(message, messageStack, pvError));
    this._status = status;
    this.name = 'RhinoError';
    this._shortMessage = message;
    this._messageStack = messageStack;
  }

  get status(): PvStatus {
    return this._status;
  }

  get shortMessage(): string {
    return this._shortMessage;
  }

  get messageStack(): string[] {
    return this._messageStack;
  }

  private static errorToString(
    initial: string,
    messageStack: string[],
    pvError: PvError | null = null,
  ): string {
    let msg = initial;

    if (pvError) {
      const pvErrorMessage = pvError.getErrorString();
      if (pvErrorMessage.length > 0) {
        msg += `\nDetails: ${pvErrorMessage}`;
      }
    }

    if (messageStack.length > 0) {
      msg += `: ${messageStack.reduce((acc, value, index) =>
        acc + '\n  [' + index + '] ' + value, '')}`;
    }

    return msg;
  }
}

class RhinoOutOfMemoryError extends RhinoError {
  constructor(message: string, messageStack?: string[], pvError: PvError | null = null) {
    super(PvStatus.OUT_OF_MEMORY, message, messageStack, pvError);
    this.name = 'RhinoOutOfMemoryError';
  }
}

class RhinoIOError extends RhinoError {
  constructor(message: string, messageStack: string[] = [], pvError: PvError | null = null) {
    super(PvStatus.IO_ERROR, message, messageStack, pvError);
    this.name = 'RhinoIOError';
  }
}

class RhinoInvalidArgumentError extends RhinoError {
  constructor(message: string, messageStack: string[] = [], pvError: PvError | null = null) {
    super(PvStatus.INVALID_ARGUMENT, message, messageStack, pvError);
    this.name = 'RhinoInvalidArgumentError';
  }
}

class RhinoStopIterationError extends RhinoError {
  constructor(message: string, messageStack: string[] = [], pvError: PvError | null = null) {
    super(PvStatus.STOP_ITERATION, message, messageStack, pvError);
    this.name = 'RhinoStopIterationError';
  }
}

class RhinoKeyError extends RhinoError {
  constructor(message: string, messageStack: string[] = [], pvError: PvError | null = null) {
    super(PvStatus.KEY_ERROR, message, messageStack, pvError);
    this.name = 'RhinoKeyError';
  }
}

class RhinoInvalidStateError extends RhinoError {
  constructor(message: string, messageStack: string[] = [], pvError: PvError | null = null) {
    super(PvStatus.INVALID_STATE, message, messageStack, pvError);
    this.name = 'RhinoInvalidStateError';
  }
}

class RhinoRuntimeError extends RhinoError {
  constructor(message: string, messageStack: string[] = [], pvError: PvError | null = null) {
    super(PvStatus.RUNTIME_ERROR, message, messageStack, pvError);
    this.name = 'RhinoRuntimeError';
  }
}

class RhinoActivationError extends RhinoError {
  constructor(message: string, messageStack: string[] = [], pvError: PvError | null = null) {
    super(PvStatus.ACTIVATION_ERROR, message, messageStack, pvError);
    this.name = 'RhinoActivationError';
  }
}

class RhinoActivationLimitReachedError extends RhinoError {
  constructor(message: string, messageStack: string[] = [], pvError: PvError | null = null) {
    super(PvStatus.ACTIVATION_LIMIT_REACHED, message, messageStack, pvError);
    this.name = 'RhinoActivationLimitReachedError';
  }
}

class RhinoActivationThrottledError extends RhinoError {
  constructor(message: string, messageStack: string[] = [], pvError: PvError | null = null) {
    super(PvStatus.ACTIVATION_THROTTLED, message, messageStack, pvError);
    this.name = 'RhinoActivationThrottledError';
  }
}

class RhinoActivationRefusedError extends RhinoError {
  constructor(message: string, messageStack: string[] = [], pvError: PvError | null = null) {
    super(PvStatus.ACTIVATION_REFUSED, message, messageStack, pvError);
    this.name = 'RhinoActivationRefusedError';
  }
}

export {
  RhinoError,
  RhinoOutOfMemoryError,
  RhinoIOError,
  RhinoInvalidArgumentError,
  RhinoStopIterationError,
  RhinoKeyError,
  RhinoInvalidStateError,
  RhinoRuntimeError,
  RhinoActivationError,
  RhinoActivationLimitReachedError,
  RhinoActivationThrottledError,
  RhinoActivationRefusedError,
};

export function pvStatusToException(
    pvStatus: PvStatus,
    errorMessage: string,
    messageStack: string[] = [],
    pvError: PvError | null = null
  ): RhinoError {
    switch (pvStatus) {
      case PvStatus.OUT_OF_MEMORY:
        return new RhinoOutOfMemoryError(errorMessage, messageStack, pvError);
      case PvStatus.IO_ERROR:
        return new RhinoIOError(errorMessage, messageStack, pvError);
      case PvStatus.INVALID_ARGUMENT:
        return new RhinoInvalidArgumentError(errorMessage, messageStack, pvError);
      case PvStatus.STOP_ITERATION:
        return new RhinoStopIterationError(errorMessage, messageStack, pvError);
      case PvStatus.KEY_ERROR:
        return new RhinoKeyError(errorMessage, messageStack, pvError);
      case PvStatus.INVALID_STATE:
        return new RhinoInvalidStateError(errorMessage, messageStack, pvError);
      case PvStatus.RUNTIME_ERROR:
        return new RhinoRuntimeError(errorMessage, messageStack, pvError);
      case PvStatus.ACTIVATION_ERROR:
        return new RhinoActivationError(errorMessage, messageStack, pvError);
      case PvStatus.ACTIVATION_LIMIT_REACHED:
        return new RhinoActivationLimitReachedError(errorMessage, messageStack, pvError);
      case PvStatus.ACTIVATION_THROTTLED:
        return new RhinoActivationThrottledError(errorMessage, messageStack, pvError);
      case PvStatus.ACTIVATION_REFUSED:
        return new RhinoActivationRefusedError(errorMessage, messageStack, pvError);
      default:
        // eslint-disable-next-line no-console
        console.warn(`Unmapped error code: ${pvStatus}`);
        return new RhinoError(pvStatus, errorMessage);
    }
  }
