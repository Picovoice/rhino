//
//  Copyright 2022-2023 Picovoice Inc.
//  You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
//  file accompanying this source.
//  Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
//  an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
//  specific language governing permissions and limitations under the License.
//

import AVFoundation
import XCTest

import Rhino

class BaseTest: XCTestCase {

    let accessKey: String = "{TESTING_ACCESS_KEY_HERE}"

    override func setUp() {
        super.setUp()
        continueAfterFailure = false
    }

    func processFileHelper(
        _ rhino: Rhino,
        _ testAudioURL: URL,
        _ maxProcessCount: Int32 = -1) throws -> Bool {
        var processed = 0

        let data = try Data(contentsOf: testAudioURL)
        let frameLengthBytes = Int(Rhino.frameLength) * 2
        var pcmBuffer = [Int16](repeating: 0, count: Int(Rhino.frameLength))
        var isFinalized = false
        var index = 44
        while index + frameLengthBytes < data.count {
            _ = pcmBuffer.withUnsafeMutableBytes {
                data.copyBytes(to: $0, from: index..<(index + frameLengthBytes))
            }
            isFinalized = try rhino.process(pcm: pcmBuffer)
            if isFinalized {
                break
            }

            index += frameLengthBytes

            if maxProcessCount != -1 && processed >= maxProcessCount {
                break
            }
            processed += 1
        }

        return isFinalized
    }

    func processFile(rhino: Rhino, testAudioURL: URL) throws -> Inference {
        let isFinalized = try processFileHelper(rhino, testAudioURL)
        XCTAssert(isFinalized)

        return try rhino.getInference()
    }
}
