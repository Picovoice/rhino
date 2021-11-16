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

using System;


namespace Pv.Unity
{
    public class RhinoException : Exception
    {
        public RhinoException() { }

        public RhinoException(string message) : base(message) { }
    }

    public class RhinoMemoryException : RhinoException
    {
        public RhinoMemoryException() { }

        public RhinoMemoryException(string message) : base(message) { }
    }

    public class RhinoIOException : RhinoException
    {
        public RhinoIOException() { }

        public RhinoIOException(string message) : base(message) { }
    }

    public class RhinoInvalidArgumentException : RhinoException
    {
        public RhinoInvalidArgumentException() { }

        public RhinoInvalidArgumentException(string message) : base(message) { }
    }

    public class RhinoStopIterationException : RhinoException
    {
        public RhinoStopIterationException() { }

        public RhinoStopIterationException(string message) : base(message) { }
    }

    public class RhinoKeyException : RhinoException
    {
        public RhinoKeyException() { }

        public RhinoKeyException(string message) : base(message) { }
    }

    public class RhinoInvalidStateException : RhinoException
    {
        public RhinoInvalidStateException() { }

        public RhinoInvalidStateException(string message) : base(message) { }
    }

    public class RhinoRuntimeException : RhinoException
    {
        public RhinoRuntimeException() { }

        public RhinoRuntimeException(string message) : base(message) { }
    }

    public class RhinoActivationException : RhinoException
    {
        public RhinoActivationException() { }

        public RhinoActivationException(string message) : base(message) { }
    }

    public class RhinoActivationLimitException : RhinoException
    {
        public RhinoActivationLimitException() { }

        public RhinoActivationLimitException(string message) : base(message) { }
    }

    public class RhinoActivationThrottledException : RhinoException
    {
        public RhinoActivationThrottledException() { }

        public RhinoActivationThrottledException(string message) : base(message) { }
    }

    public class RhinoActivationRefusedException : RhinoException
    {
        public RhinoActivationRefusedException() { }

        public RhinoActivationRefusedException(string message) : base(message) { }
    }
}