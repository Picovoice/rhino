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

const fs = require("fs")
const mkdirp = require("mkdirp");

// copy Android resources
mkdirp.sync("./android/rhino-rn-demo-app/src/main/assets")
fs.copyFileSync('../../resources/contexts/android/smart_lighting_android.rhn','./android/rhino-rn-demo-app/src/main/assets/smart_lighting_android.rhn')

// copy iOS resources
fs.copyFileSync('../../resources/contexts/ios/smart_lighting_ios.rhn','./ios/smart_lighting_ios.rhn')