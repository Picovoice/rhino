//
//  Copyright 2022 Picovoice Inc.
//  You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
//  file accompanying this source.
//  Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
//  an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
//  specific language governing permissions and limitations under the License.
//

import Foundation
import XCTest

import Rhino

class PerformanceTest: XCTestCase {
    let accessKey: String = "{TESTING_ACCESS_KEY_HERE}"
    let iterationString: String = "{NUM_TEST_ITERATIONS}"
    let thresholdString: String = "{PERFORMANCE_THRESHOLD_SEC}"

    override func setUp() {
        super.setUp()
        continueAfterFailure = false
    }

    func testPerformance() throws {
        try XCTSkipIf(thresholdString == "{PERFORMANCE_THRESHOLD_SEC}")

        let numTestIterations = Int(iterationString) ?? 100
        let performanceThresholdSec = Double(thresholdString)
        try XCTSkipIf(performanceThresholdSec == nil)

        let bundle = Bundle(for: type(of: self))
        let contextPath = bundle.path(forResource: "coffee_maker_ios", ofType: "rhn")!
        let r = try Rhino.init(accessKey: accessKey, contextPath: contextPath)

        let fileURL: URL = bundle.url(forResource: "test_within_context", withExtension: "wav")!

        let data = try Data(contentsOf: fileURL)
        let frameLengthBytes = Int(Rhino.frameLength) * 2

        var results: [Double] = []
        for _ in 0...numTestIterations {
            var pcmBuffer = [Int16](repeating: 0, count: Int(Rhino.frameLength))

            var totalNSec = 0.0
            var index = 44
            while index + frameLengthBytes < data.count {
                _ = pcmBuffer.withUnsafeMutableBytes {
                    data.copyBytes(to: $0, from: index..<(index + frameLengthBytes))
                }
                let before = CFAbsoluteTimeGetCurrent()
                try r.process(pcm: pcmBuffer)
                let after = CFAbsoluteTimeGetCurrent()
                totalNSec += (after - before)
                index += frameLengthBytes
            }
            results.append(totalNSec)
        }
        r.delete()

        let avgNSec = results.reduce(0.0, +) / Double(numTestIterations)
        let avgSec = Double(round(avgNSec * 1000) / 1000)
        XCTAssertLessThanOrEqual(avgSec, performanceThresholdSec!)
    }
}
