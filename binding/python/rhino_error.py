#
# Copyright 2021 Picovoice Inc.
#
# You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
# file accompanying this source.
#
# Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
# an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
# specific language governing permissions and limitations under the License.
#

class RhinoError(Exception):
    pass


class RhinoMemoryError(RhinoError):
    pass


class RhinoIOError(RhinoError):
    pass


class RhinoInvalidArgumentError(RhinoError):
    pass


class RhinoStopIterationError(RhinoError):
    pass


class RhinoKeyError(RhinoError):
    pass


class RhinoInvalidStateError(RhinoError):
    pass


class RhinoRuntimeError(RhinoError):
    pass


class RhinoActivationError(RhinoError):
    pass


class RhinoActivationLimitError(RhinoError):
    pass


class RhinoActivationThrottledError(RhinoError):
    pass


class RhinoActivationRefusedError(RhinoError):
    pass
