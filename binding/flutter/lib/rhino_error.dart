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

class RhinoException implements Exception {
  final String? message;
  RhinoException([this.message]);
}

class RhinoMemoryException extends RhinoException {
  RhinoMemoryException(String? message) : super(message);
}

class RhinoIOException extends RhinoException {
  RhinoIOException(String? message) : super(message);
}

class RhinoInvalidArgumentException extends RhinoException {
  RhinoInvalidArgumentException(String? message) : super(message);
}

class RhinoStopIterationException extends RhinoException {
  RhinoStopIterationException(String? message) : super(message);
}

class RhinoKeyException extends RhinoException {
  RhinoKeyException(String? message) : super(message);
}

class RhinoInvalidStateException extends RhinoException {
  RhinoInvalidStateException(String? message) : super(message);
}

class RhinoRuntimeException extends RhinoException {
  RhinoRuntimeException(String? message) : super(message);
}

class RhinoActivationException extends RhinoException {
  RhinoActivationException(String? message) : super(message);
}

class RhinoActivationLimitException extends RhinoException {
  RhinoActivationLimitException(String? message) : super(message);
}

class RhinoActivationThrottledException extends RhinoException {
  RhinoActivationThrottledException(String? message) : super(message);
}

class RhinoActivationRefusedException extends RhinoException {
  RhinoActivationRefusedException(String? message) : super(message);
}

rhinoStatusToException(String code, String? message) {
  switch (code) {
    case 'RhinoException':
      return RhinoException(message);
    case 'RhinoMemoryException':
      return RhinoMemoryException(message);
    case 'RhinoIOException':
      return RhinoIOException(message);
    case 'RhinoInvalidArgumentException':
      return RhinoInvalidArgumentException(message);
    case 'RhinoStopIterationException':
      return RhinoStopIterationException(message);
    case 'RhinoKeyException':
      return RhinoKeyException(message);
    case 'RhinoInvalidStateException':
      return RhinoInvalidStateException(message);
    case 'RhinoRuntimeException':
      return RhinoRuntimeException(message);
    case 'RhinoActivationException':
      return RhinoActivationException(message);
    case 'RhinoActivationLimitException':
      return RhinoActivationLimitException(message);
    case 'RhinoActivationThrottledException':
      return RhinoActivationThrottledException(message);
    case 'RhinoActivationRefusedException':
      return RhinoActivationRefusedException(message);
    default:
      return RhinoException("unexpected code: $code, message: $message");
  }
}
