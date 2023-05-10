//
//  Copyright 2022 Picovoice Inc.
//  You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
//  file accompanying this source.
//  Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
//  an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
//  specific language governing permissions and limitations under the License.
//

import AVFoundation
import XCTest

import Rhino

struct TestData: Decodable {
    var tests: TestDataTests
}

struct TestDataTests: Decodable {
    var within_context: [TestDataWithinContextTest]
    var out_of_context: [TestDataOutOfContextTest]
}

struct TestDataWithinContextTest: Decodable {
    var language: String
    var context_name: String
    var inference: TestDataInference
}

struct TestDataInference: Decodable {
    var intent: String
    var slots: [String: String]
}

struct TestDataOutOfContextTest: Decodable {
    var language: String
    var context_name: String
}

class RhinoWithinContextTests: BaseTest {
    func testWrapper() throws {
        let bundle = Bundle(for: type(of: self))
        let testDataJsonUrl = bundle.url(
            forResource: "test_data",
            withExtension: "json",
            subdirectory: "test_resources")!

        let testDataJsonData = try Data(contentsOf: testDataJsonUrl)
        let testData = try JSONDecoder().decode(TestData.self, from: testDataJsonData)

        for testCase in testData.tests.within_context {
            let suffix = testCase.language == "en" ? "" : "_\(testCase.language)"

            let language: String = testCase.language
            let modelPath: String = bundle.path(
                forResource: "rhino_params\(suffix)",
                ofType: "pv",
                inDirectory: "test_resources/model_files")!
            let contextPath: String = bundle.path(
                forResource: "\(testCase.context_name)_ios",
                ofType: "rhn",
                inDirectory: "test_resources/context_files/\(testCase.language)")!
            let testAudioPath: URL = bundle.url(
                forResource: "test_within_context\(suffix)",
                withExtension: "wav",
                subdirectory: "test_resources/audio_samples")!
            let expectedIntent: String = testCase.inference.intent
            let expectedSlots: [String: String] = testCase.inference.slots

            try XCTContext.runActivity(named: "(\(language))") { _ in
                let r = try Rhino.init(
                    accessKey: accessKey,
                    contextPath: contextPath,
                    modelPath: modelPath)
                XCTAssert(Rhino.version != "")
                XCTAssert(Rhino.frameLength > 0)
                XCTAssert(Rhino.sampleRate > 0)
                XCTAssert(r.contextInfo != "")

                let inference = try processFile(rhino: r, testAudioURL: testAudioPath)
                r.delete()

                XCTAssert(inference.isUnderstood)
                XCTAssert(inference.intent == expectedIntent)
                XCTAssert(inference.slots == expectedSlots)
            }
        }
    }
}

class RhinoOutOfContextTests: BaseTest {
    func testWrapper() throws {
        let bundle = Bundle(for: type(of: self))

        let testDataJsonUrl = bundle.url(
            forResource: "test_data",
            withExtension: "json",
            subdirectory: "test_resources")!
        let testDataJsonData = try Data(contentsOf: testDataJsonUrl)
        let testData = try JSONDecoder().decode(TestData.self, from: testDataJsonData)

        for testCase in testData.tests.out_of_context {
            let suffix = testCase.language == "en" ? "" : "_\(testCase.language)"

            let language: String = testCase.language
            let modelPath: String = bundle.path(
                forResource: "rhino_params\(suffix)",
                ofType: "pv",
                inDirectory: "test_resources/model_files")!
            let contextPath: String = bundle.path(
                forResource: "\(testCase.context_name)_ios",
                ofType: "rhn",
                inDirectory: "test_resources/context_files/\(testCase.language)")!
            let testAudioPath: URL = bundle.url(
                forResource: "test_out_of_context\(suffix)",
                withExtension: "wav",
                subdirectory: "test_resources/audio_samples")!

            try XCTContext.runActivity(named: "(\(language))") { _ in
                let r = try Rhino.init(
                    accessKey: accessKey,
                    contextPath: contextPath,
                    modelPath: modelPath)
                XCTAssert(Rhino.version != "")
                XCTAssert(Rhino.frameLength > 0)
                XCTAssert(Rhino.sampleRate > 0)
                XCTAssert(r.contextInfo != "")
                let inference = try processFile(rhino: r, testAudioURL: testAudioPath)
                r.delete()

                XCTAssert(!inference.isUnderstood)
            }
        }
    }
}
