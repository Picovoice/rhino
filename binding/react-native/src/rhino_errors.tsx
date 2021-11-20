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

class RhinoError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "RhinoError";
    }
}

class RhinoMemoryError extends RhinoError {
    constructor(message: string) {
        super(message);
        this.name = "RhinoMemoryError";
    }
}

class RhinoIOError extends RhinoError {
    constructor(message: string) {
        super(message);
        this.name = "RhinoIOError";
    }
}

class RhinoInvalidArgumentError extends RhinoError {
    constructor(message: string) {
        super(message);
        this.name = "RhinoInvalidArgumentError";
    }
}

class RhinoStopIterationError extends RhinoError {
    constructor(message: string) {
        super(message);
        this.name = "RhinoStopIterationError";
    }
}

class RhinoKeyError extends RhinoError {
    constructor(message: string) {
        super(message);
        this.name = "RhinoKeyError";
    }
}

class RhinoInvalidStateError extends RhinoError {
    constructor(message: string) {
        super(message);
        this.name = "RhinoInvalidStateError";
    }
}

class RhinoRuntimeError extends RhinoError {
    constructor(message: string) {
        super(message);
        this.name = "RhinoRuntimeError";
    }
}

class RhinoActivationError extends RhinoError {
    constructor(message: string) {
        super(message);
        this.name = "RhinoActivationError";
    }
}

class RhinoActivationLimitError extends RhinoError {
    constructor(message: string) {
        super(message);
        this.name = "RhinoActivationLimitError";
    }
}

class RhinoActivationThrottledError extends RhinoError {
    constructor(message: string) {
        super(message);
        this.name = "RhinoActivationThrottledError";
    }
}

class RhinoActivationRefusedError extends RhinoError {
    constructor(message: string) {
        super(message);
        this.name = "RhinoActivationRefusedError";
    }
}

export {
    RhinoError,
    RhinoMemoryError,
    RhinoIOError,
    RhinoInvalidArgumentError,
    RhinoStopIterationError,
    RhinoKeyError,
    RhinoInvalidStateError,
    RhinoRuntimeError,
    RhinoActivationError,
    RhinoActivationLimitError,
    RhinoActivationThrottledError,
    RhinoActivationRefusedError
};