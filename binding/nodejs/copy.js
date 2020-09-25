//
// Copyright 2020 Picovoice Inc.
//
// You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
// file accompanying this source.
//
// Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
// an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
// specific language governing permissions and limitations under the License.
//
"use strict";

const mkdirp = require("mkdirp");
const ncp = require("ncp").ncp;

console.log("Copying library files...");

// Library & Model
mkdirp.sync("./lib/common");
ncp(
  "../../lib/common/rhino_params.pv",
  "./lib/common/rhino_params.pv",
  function (err) {
    if (err) {
      return console.error(err);
    }
    console.log("../../lib/common copied.");
  }
);

let platforms = ["mac", "raspberry-pi", "windows", "linux"];

function copyLibraryFilter(path) {
  return !path.includes("arm11");
}

for (let platform of platforms) {
  ncp(
    `../../lib/${platform}`,
    `./lib/${platform}`,
    { filter: copyLibraryFilter },
    function (err) {
      if (err) {
        return console.error(err);
      }
      console.log(`../../lib/${platform}.`);
    }
  );
}
