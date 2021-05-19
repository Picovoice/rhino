//
// Copyright 2021 Picovoice Inc.
//
// You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
// file accompanying this source.
//
// Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
// an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
// specific language governing permissions and limitations under the License.
//

class PvAudioException implements Exception {
  final String? message;
  PvAudioException([this.message]);
}

class PvError extends Error {
  final String? message;
  PvError([this.message]);
}

class PvArgumentError extends PvError {
  PvArgumentError(String message) : super(message);
}

class PvStateError extends PvError {
  PvStateError(String message) : super(message);
}

/// PV_STATUS_OUT_OF_MEMORY
class PvStatusOutOfMemoryError extends PvError {
  PvStatusOutOfMemoryError(String message) : super(message);
}

/// PV_STATUS_IO_ERROR
class PvStatusIoError extends PvError {
  PvStatusIoError(String message) : super(message);
}

/// PV_STATUS_INVALID_ARGUMENT
class PvStatusInvalidArgumentError extends PvError {
  PvStatusInvalidArgumentError(String message) : super(message);
}

/// PV_STATUS_STOP_ITERATION
class PvStatusStopIterationError extends PvError {
  PvStatusStopIterationError(String message) : super(message);
}

/// PV_STATUS_KEY_ERROR
class PvStatusKeyError extends PvError {
  PvStatusKeyError(String message) : super(message);
}

/// PV_STATUS_INVALID_STATE
class PvStatusInvalidStateError extends PvError {
  PvStatusInvalidStateError(String message) : super(message);
}

enum PvStatus {
  SUCCESS,
  OUT_OF_MEMORY,
  IO_ERROR,
  INVALID_ARGUMENT,
  STOP_ITERATION,
  KEY_ERROR,
  INVALID_STATE
}

/// convert [pvStatus] to PvError type
pvStatusToException(PvStatus pvStatus, String errorMessage) {
  switch (pvStatus) {
    case PvStatus.OUT_OF_MEMORY:
      throw new PvStatusOutOfMemoryError(errorMessage);
    case PvStatus.IO_ERROR:
      throw new PvStatusIoError(errorMessage);
    case PvStatus.INVALID_ARGUMENT:
      throw new PvStatusInvalidArgumentError(errorMessage);
    case PvStatus.STOP_ITERATION:
      throw new PvStatusStopIterationError(errorMessage);
    case PvStatus.KEY_ERROR:
      throw new PvStatusKeyError(errorMessage);
    case PvStatus.INVALID_STATE:
      throw new PvStatusInvalidStateError(errorMessage);
    default:
      print("Unmapped error code: $pvStatus");
      throw new PvError(errorMessage);
  }
}
