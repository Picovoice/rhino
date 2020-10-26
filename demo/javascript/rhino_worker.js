/*
    Copyright 2018-2020 Picovoice Inc.
    You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
    file accompanying this source.
    Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
    an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
    specific language governing permissions and limitations under the License.
*/

let callback = function callback() {
  postMessage({ status: "rhn-init" });
};
let RhinoOptions = { callback: callback };

importScripts("pv_rhino.js");
importScripts("rhino.js");

onmessage = function (e) {
  switch (e.data.command) {
    case "init":
      init(e.data.context);
      break;
    case "process":
      process(e.data.inputFrame);
      break;
    case "pause":
      paused = true;
      break;
    case "resume":
      paused = false;
      break;
    case "release":
      release();
      break;
  }
};

let context;
let paused;
let rhino = null;

function init(context_) {
  context = context_;
  paused = false;

  rhino = Rhino.create(context);
}

function process(inputFrame) {
  if (rhino !== null && !paused) {
    let result = rhino.process(inputFrame);
    if ("isUnderstood" in result) {
      postMessage(result);
    }
  }
}

function release() {
  if (rhino != null) {
    rhino.release();
  }

  rhino = null;
  close();
}
