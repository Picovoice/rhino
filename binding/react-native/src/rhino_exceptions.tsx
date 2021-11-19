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

class RhinoException extends Error {
    constructor(message: string) {
        super(message);
        this.name = "RhinoException";
    }
}

class RhinoMemoryException extends RhinoException {
    constructor(message: string) {
        super(message);
        this.name = "RhinoMemoryException";
    }
}

class RhinoIOException extends RhinoException {
    constructor(message: string) {
        super(message);
        this.name = "RhinoIOException";
    }
}

class RhinoInvalidArgumentException extends RhinoException {
    constructor(message: string) {
        super(message);
        this.name = "RhinoInvalidArgumentException";
    }
}

class RhinoStopIterationException extends RhinoException {
    constructor(message: string) {
        super(message);
        this.name = "RhinoStopIterationException";
    }
}

class RhinoKeyException extends RhinoException {
    constructor(message: string) {
        super(message);
        this.name = "RhinoKeyException";
    }
}

class RhinoInvalidStateException extends RhinoException {
    constructor(message: string) {
        super(message);
        this.name = "RhinoInvalidStateException";
    }
}

class RhinoRuntimeException extends RhinoException {
    constructor(message: string) {
        super(message);
        this.name = "RhinoRuntimeException";
    }
}

class RhinoActivationException extends RhinoException {
    constructor(message: string) {
        super(message);
        this.name = "RhinoActivationException";
    }
}

class RhinoActivationLimitException extends RhinoException {
    constructor(message: string) {
        super(message);
        this.name = "RhinoActivationLimitException";
    }
}

class RhinoActivationThrottledException extends RhinoException {
    constructor(message: string) {
        super(message);
        this.name = "RhinoActivationThrottledException";
    }
}

class RhinoActivationRefusedException extends RhinoException {
    constructor(message: string) {
        super(message);
        this.name = "RhinoActivationRefusedException";
    }
}

export {
    RhinoException,
    RhinoMemoryException,
    RhinoIOException,
    RhinoInvalidArgumentException,
    RhinoStopIterationException,
    RhinoKeyException,
    RhinoInvalidStateException,
    RhinoRuntimeException,
    RhinoActivationException,
    RhinoActivationLimitException,
    RhinoActivationThrottledException,
    RhinoActivationRefusedException
};