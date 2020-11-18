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
const ncp = require("ncp").ncp
const mkdirp = require("mkdirp");

// copy Android resources
fs.copyFileSync('../android/Rhino/rhino/src/main/java/ai/picovoice/rhino/Rhino.java','./android/src/main/java/ai/picovoice/reactnative/rhino/Rhino.java')
fs.copyFileSync('../android/Rhino/rhino/src/main/java/ai/picovoice/rhino/RhinoException.java','./android/src/main/java/ai/picovoice/reactnative/rhino/RhinoException.java')
fs.copyFileSync('../android/Rhino/rhino/src/main/java/ai/picovoice/rhino/RhinoInference.java','./android/src/main/java/ai/picovoice/reactnative/rhino/RhinoInference.java')
mkdirp.sync("./android/src/main/jniLibs")
ncp('../../lib/android','./android/src/main/jniLibs')
mkdirp.sync("./android/src/main/res/raw")
fs.copyFileSync('../../lib/common/rhino_params.pv','./android/src/main/res/raw/rhino_params.pv')

// copy iOS resources
// mkdirp.sync("./ios/resources")
// fs.copyFileSync('../../lib/common/rhino_params.pv','./ios/resources/rhino_params.pv')
// fs.copyFileSync('../../lib/ios/libpv_rhino.a','./ios/pv_rhino/libpv_rhino.a')
// fs.copyFileSync('../../include/picovoice.h','./ios/pv_rhino/picovoice.h')
// fs.copyFileSync('../../include/pv_rhino.h','./ios/pv_rhino/pv_rhino.h')