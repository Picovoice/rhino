//
// Copyright 2021-2023 Picovoice Inc.
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
        private string[] _messageStack;

        public RhinoException() { }

        public RhinoException(string message) : base(message) { }

        public RhinoException(string message, string[] messageStack) : base(ModifyMessages(message, messageStack))
        {
            this._messageStack = messageStack;
        }

        public string[] MessageStack
        {
            get => _messageStack;
        }

        private static string ModifyMessages(string message, string[] messageStack)
        {
            string messageString = message;
            if (messageStack.Length > 0)
            {
                messageString += ":";
                for (int i = 0; i < messageStack.Length; i++)
                {
                    messageString += String.Format("\n  [{0}] {1}", i, messageStack[i]);
                }
            }
            return messageString;
        }
    }

    public class RhinoMemoryException : RhinoException
    {
        public RhinoMemoryException() { }

        public RhinoMemoryException(string message) : base(message) { }

        public RhinoMemoryException(string message, string[] messageStack) : base(message, messageStack) { }
    }

    public class RhinoIOException : RhinoException
    {
        public RhinoIOException() { }

        public RhinoIOException(string message) : base(message) { }

        public RhinoIOException(string message, string[] messageStack) : base(message, messageStack) { }
    }

    public class RhinoInvalidArgumentException : RhinoException
    {
        public RhinoInvalidArgumentException() { }

        public RhinoInvalidArgumentException(string message) : base(message) { }

        public RhinoInvalidArgumentException(string message, string[] messageStack) : base(message, messageStack) { }
    }

    public class RhinoStopIterationException : RhinoException
    {
        public RhinoStopIterationException() { }

        public RhinoStopIterationException(string message) : base(message) { }

        public RhinoStopIterationException(string message, string[] messageStack) : base(message, messageStack) { }
    }

    public class RhinoKeyException : RhinoException
    {
        public RhinoKeyException() { }

        public RhinoKeyException(string message) : base(message) { }

        public RhinoKeyException(string message, string[] messageStack) : base(message, messageStack) { }
    }

    public class RhinoInvalidStateException : RhinoException
    {
        public RhinoInvalidStateException() { }

        public RhinoInvalidStateException(string message) : base(message) { }

        public RhinoInvalidStateException(string message, string[] messageStack) : base(message, messageStack) { }
    }

    public class RhinoRuntimeException : RhinoException
    {
        public RhinoRuntimeException() { }

        public RhinoRuntimeException(string message) : base(message) { }

        public RhinoRuntimeException(string message, string[] messageStack) : base(message, messageStack) { }
    }

    public class RhinoActivationException : RhinoException
    {
        public RhinoActivationException() { }

        public RhinoActivationException(string message) : base(message) { }

        public RhinoActivationException(string message, string[] messageStack) : base(message, messageStack) { }
    }

    public class RhinoActivationLimitException : RhinoException
    {
        public RhinoActivationLimitException() { }

        public RhinoActivationLimitException(string message) : base(message) { }

        public RhinoActivationLimitException(string message, string[] messageStack) : base(message, messageStack) { }
    }

    public class RhinoActivationThrottledException : RhinoException
    {
        public RhinoActivationThrottledException() { }

        public RhinoActivationThrottledException(string message) : base(message) { }

        public RhinoActivationThrottledException(string message, string[] messageStack) : base(message, messageStack) { }
    }

    public class RhinoActivationRefusedException : RhinoException
    {
        public RhinoActivationRefusedException() { }

        public RhinoActivationRefusedException(string message) : base(message) { }

        public RhinoActivationRefusedException(string message, string[] messageStack) : base(message, messageStack) { }
    }
}
