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

class RhinoWithinContextTests: BaseTest {
    static var testData: [[Any]] = [
        ["en", "coffee_maker", "orderBeverage", ["beverage": "americano", "numberOfShots": "double shot", "size": "medium"]],
        ["es", "iluminación_inteligente", "changeColor", ["location": "habitación", "color": "rosado"]],
        ["de", "beleuchtung", "changeState", ["state": "aus"]],
        ["fr", "éclairage_intelligent", "changeColor", ["color": "violet"]],
        ["it", "illuminazione", "spegnereLuce", ["luogo": "bagno"]],
        ["ja", "sumāto_shōmei", "色変更", ["色": "青"]],
        ["ko", "seumateu_jomyeong", "changeColor", ["color": "파란색"]],
        ["pt", "luz_inteligente", "ligueLuz", ["lugar": "cozinha"]]]

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

            for testCase in testData {
                let suffix = (testCase[0]) as! String == "en" ? "" : "_\(testCase[0])"
                for invocation in testInvocations {
                    let newTestCase = RhinoWithinContextTests(invocation: invocation)
                    newTestCase.language = testCase[0] as! String
                    newTestCase.modelPath = bundle.path(forResource: "rhino_params\(suffix)", ofType: "pv")!
                    newTestCase.contextPath = bundle.path(forResource: "\(testCase[1])_ios", ofType: "rhn")!
                    newTestCase.testAudioPath = bundle.url(forResource: "test_within_context\(suffix)", withExtension: "wav")!
                    newTestCase.expectedIntent = testCase[2] as! String
                    newTestCase.expectedSlots = testCase[3] as! [String: String]
                    xcTestSuite.addTest(newTestCase)
                }
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
    static var testData: [[Any]] = [
        ["en", "coffee_maker"],
        ["es", "iluminación_inteligente"],
        ["de", "beleuchtung"],
        ["fr", "éclairage_intelligent"],
        ["it", "illuminazione"],
        ["ja", "sumāto_shōmei"],
        ["ko", "seumateu_jomyeong"],
        ["pt", "luz_inteligente"]]

    var language: String = ""
    var modelPath: String = ""
    var contextPath: String = ""
    var testAudioPath: URL? = URL(string: "")

    override class var defaultTestSuite: XCTestSuite {
        get {
            let xcTestSuite = XCTestSuite(name: NSStringFromClass(self))
            let bundle = Bundle(for: self)

            for testCase in testData {
                let suffix = (testCase[0]) as! String == "en" ? "" : "_\(testCase[0])"
                for invocation in testInvocations {
                    let newTestCase = RhinoOutOfContextTests(invocation: invocation)
                    newTestCase.language = testCase[0] as! String
                    newTestCase.modelPath = bundle.path(forResource: "rhino_params\(suffix)", ofType: "pv")!
                    newTestCase.contextPath = bundle.path(forResource: "\(testCase[1])_ios", ofType: "rhn")!
                    newTestCase.testAudioPath = bundle.url(forResource: "test_out_of_context\(suffix)", withExtension: "wav")!
                    xcTestSuite.addTest(newTestCase)
                }
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