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

struct TestData : Decodable {
    var tests: TestDataTests
}

struct TestDataTests : Decodable {
    var within_context: [TestDataWithinContextTest]
    var out_of_context: [TestDataOutOfContextTest]
}

struct TestDataWithinContextTest : Decodable {
    var language: String
    var context_name: String
    var inference: TestDataInference
}

struct TestDataInference : Decodable {
    var intent: String
    var slots: [String : String]
}

struct TestDataOutOfContextTest : Decodable {
    var language: String
    var context_name: String
}

class RhinoWithinContextTests: BaseTest {
    var language: String = ""
    var modelPath: String = ""
    var contextPath: String = ""
    var testAudioPath: URL? = URL(string: "")
    var expectedIntent: String = ""
    var expectedSlots: [String: String] = [:]

    override class var defaultTestSuite: XCTestSuite {
        get {
            let xcTestSuite = XCTestSuite(name: NSStringFromClass(self))
            let bundle = Bundle(for: self)
            
            let testDataJsonUrl = bundle.url(forResource: "test_data", withExtension: "json", subdirectory: "test_resources")!
            do {
                let testDataJsonData = try Data(contentsOf: testDataJsonUrl)
                let testData = try JSONDecoder().decode(TestData.self, from: testDataJsonData)
            
                for testCase in testData.tests.within_context {
                    let suffix = testCase.language == "en" ? "" : "_\(testCase.language)"
                    for invocation in testInvocations {
                        let newTestCase = RhinoWithinContextTests(invocation: invocation)
                        newTestCase.language = testCase.language
                        newTestCase.modelPath = bundle.path(forResource: "rhino_params\(suffix)", ofType: "pv", inDirectory: "test_resources/model_files")!
                        newTestCase.contextPath = bundle.path(forResource: "\(testCase.context_name)_ios", ofType: "rhn", inDirectory: "test_resources/context_files/\(testCase.language)")!
                        newTestCase.testAudioPath = bundle.url(forResource: "test_within_context\(suffix)", withExtension: "wav", subdirectory: "test_resources/audio_samples")!
                        newTestCase.expectedIntent = testCase.inference.intent
                        newTestCase.expectedSlots = testCase.inference.slots
                        xcTestSuite.addTest(newTestCase)
                    }
                }
            } catch {
                return xcTestSuite
            }
            
            return xcTestSuite
        }
    }

    func testWrapper() throws {
        let inference = try XCTContext.runActivity(named: "(\(language))") { _ -> Inference in
            let r = try Rhino.init(
                    accessKey: accessKey,
                    contextPath: contextPath,
                    modelPath: modelPath)
            XCTAssert(Rhino.version != "")
            XCTAssert(Rhino.frameLength > 0)
            XCTAssert(Rhino.sampleRate > 0)
            XCTAssert(r.contextInfo != "")

            let ret = try processFile(rhino: r, testAudioURL: testAudioPath!)
            r.delete()
            return ret
        }

        XCTAssert(inference.isUnderstood)
        XCTAssert(inference.intent == expectedIntent)
        XCTAssert(inference.slots == expectedSlots)
    }
}

class RhinoOutOfContextTests: BaseTest {
    var language: String = ""
    var modelPath: String = ""
    var contextPath: String = ""
    var testAudioPath: URL? = URL(string: "")

    override class var defaultTestSuite: XCTestSuite {
        get {
            let xcTestSuite = XCTestSuite(name: NSStringFromClass(self))
            let bundle = Bundle(for: self)

            let testDataJsonUrl = bundle.url(forResource: "test_data", withExtension: "json", subdirectory: "test_resources")!
            do {
                let testDataJsonData = try Data(contentsOf: testDataJsonUrl)
                let testData = try JSONDecoder().decode(TestData.self, from: testDataJsonData)
            
                for testCase in testData.tests.out_of_context {
                    let suffix = testCase.language == "en" ? "" : "_\(testCase.language)"
                    for invocation in testInvocations {
                        let newTestCase = RhinoOutOfContextTests(invocation: invocation)
                        newTestCase.language = testCase.language
                        newTestCase.modelPath = bundle.path(forResource: "rhino_params\(suffix)", ofType: "pv", inDirectory: "test_resources/model_files")!
                        newTestCase.contextPath = bundle.path(forResource: "\(testCase.context_name)_ios", ofType: "rhn", inDirectory: "test_resources/context_files/\(testCase.language)")!
                        newTestCase.testAudioPath = bundle.url(forResource: "test_out_of_context\(suffix)", withExtension: "wav", subdirectory: "test_resources/audio_samples")!
                        xcTestSuite.addTest(newTestCase)
                    }
                }
            } catch {
                return xcTestSuite
            }
            
            return xcTestSuite
        }
    }

    func testWrapper() throws {
        let inference = try XCTContext.runActivity(named: "(\(language))") { _ -> Inference in
            let r = try Rhino.init(
                    accessKey: accessKey,
                    contextPath: contextPath,
                    modelPath: modelPath)
            XCTAssert(Rhino.version != "")
            XCTAssert(Rhino.frameLength > 0)
            XCTAssert(Rhino.sampleRate > 0)
            XCTAssert(r.contextInfo != "")
            let ret = try processFile(rhino: r, testAudioURL: testAudioPath!)
            r.delete()
            return ret
        }

        XCTAssert(!inference.isUnderstood)
    }
}
