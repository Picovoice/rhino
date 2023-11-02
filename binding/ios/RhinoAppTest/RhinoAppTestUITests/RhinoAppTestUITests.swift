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

class RhinoAppTestUITests: BaseTest {

    func testInitSuccessSimple() throws {
        let bundle = Bundle(for: type(of: self))
        let contextPath = bundle.path(
            forResource: "coffee_maker_ios",
            ofType: "rhn",
            inDirectory: "test_resources/context_files/en")!
        let r = try Rhino.init(
            accessKey: accessKey,
            contextPath: contextPath)

        XCTAssert(Rhino.version != "")
        XCTAssert(Rhino.frameLength > 0)
        XCTAssert(Rhino.sampleRate > 0)
        XCTAssert(r.contextInfo != "")
        r.delete()
    }

    func testInitSuccessWithCustomModelPath() throws {
        let bundle = Bundle(for: type(of: self))
        let contextPath = bundle.path(
            forResource: "coffee_maker_ios",
            ofType: "rhn",
            inDirectory: "test_resources/context_files/en")!
        let modelPath = bundle.path(
            forResource: "rhino_params",
            ofType: "pv",
            inDirectory: "test_resources/model_files")!

        let r = try Rhino.init(
            accessKey: accessKey,
            contextPath: contextPath,
            modelPath: modelPath)
        XCTAssert(r.contextInfo != "")
        r.delete()
    }

    func testInitSuccessWithCustomSensitivity() throws {
        let bundle = Bundle(for: type(of: self))
        let contextPath = bundle.path(
            forResource: "coffee_maker_ios",
            ofType: "rhn",
            inDirectory: "test_resources/context_files/en")!

        let r = try Rhino.init(
            accessKey: accessKey,
            contextPath: contextPath,
            sensitivity: 0.7)
        XCTAssert(r.contextInfo != "")
        r.delete()
    }

    func testInitSuccessWithCustomEndpointDuration() throws {
        let bundle = Bundle(for: type(of: self))
        let contextPath = bundle.path(
            forResource: "coffee_maker_ios",
            ofType: "rhn",
            inDirectory: "test_resources/context_files/en")!

        let r = try Rhino.init(
            accessKey: accessKey,
            contextPath: contextPath,
            endpointDurationSec: 3.0)
        XCTAssert(r.contextInfo != "")
        r.delete()
    }

    func testInitSuccessWithRequireEndpointOff() throws {
        let bundle = Bundle(for: type(of: self))
        let contextPath = bundle.path(
            forResource: "coffee_maker_ios",
            ofType: "rhn",
            inDirectory: "test_resources/context_files/en")!

        let r = try Rhino.init(
            accessKey: accessKey,
            contextPath: contextPath,
            requireEndpoint: false)
        XCTAssert(r.contextInfo != "")
        r.delete()
    }

    func testInitFailWithMismatchedLanguage() throws {
        let bundle = Bundle(for: type(of: self))
        let contextPath = bundle.path(
            forResource: "beleuchtung_ios",
            ofType: "rhn",
            inDirectory: "test_resources/context_files/de")!
        let modelPath = bundle.path(
            forResource: "rhino_params",
            ofType: "pv",
            inDirectory: "test_resources/model_files")!

        var didFail = false
        do {
            _ = try Rhino.init(
                accessKey: accessKey,
                contextPath: contextPath,
                modelPath: modelPath)
        } catch {
            didFail = true
        }

        XCTAssert(didFail)
    }

    func testInitFailWithInvalidContextPath() throws {
        let contextPath = "/bad_path/bad_path.rhn"

        var didFail = false
        do {
            _ = try Rhino.init(
                accessKey: accessKey,
                contextPath: contextPath)
        } catch {
            didFail = true
        }

        XCTAssert(didFail)
    }

    func testInitFailWithInvalidModelPath() throws {
        let bundle = Bundle(for: type(of: self))
        let contextPath = bundle.path(
            forResource: "coffee_maker_ios",
            ofType: "rhn",
            inDirectory: "test_resources/context_files/en")!
        let modelPath = "/bad_path/bad_path.pv"

        var didFail = false
        do {
            _ = try Rhino.init(
                accessKey: accessKey,
                contextPath: contextPath,
                modelPath: modelPath)
        } catch {
            didFail = true
        }

        XCTAssert(didFail)
    }

    func testInitFailWithInvalidSensitivity() throws {
        let bundle = Bundle(for: type(of: self))
        let contextPath = bundle.path(
            forResource: "coffee_maker_ios",
            ofType: "rhn",
            inDirectory: "test_resources/context_files/en")!

        var didFail = false
        do {
            _ = try Rhino.init(
                accessKey: accessKey,
                contextPath: contextPath,
                sensitivity: 10)
        } catch {
            didFail = true
        }

        XCTAssert(didFail)
    }

    func testInitFailWithInvalidEndpointDuration() throws {
        let bundle = Bundle(for: type(of: self))
        let contextPath = bundle.path(
            forResource: "coffee_maker_ios",
            ofType: "rhn",
            inDirectory: "test_resources/context_files/en")!

        var didFail = false
        do {
            _ = try Rhino.init(
                accessKey: accessKey,
                contextPath: contextPath,
                endpointDurationSec: 10.0)
        } catch {
            didFail = true
        }

        XCTAssert(didFail)
    }

    func testInitFailWithWrongPlatform() throws {
        let bundle = Bundle(for: type(of: self))
        let contextPath = bundle.path(
            forResource: "coffee_maker_linux",
            ofType: "rhn",
            inDirectory: "test_resources/context_files/en")!

        var didFail = false
        do {
            _ = try Rhino.init(
                accessKey: accessKey,
                contextPath: contextPath)
        } catch {
            didFail = true
        }

        XCTAssert(didFail)
    }

    func testInitWithNonAsciiModelName() throws {
        let bundle = Bundle(for: type(of: self))
        let contextPath = bundle.path(
            forResource: "iluminación_inteligente_ios",
            ofType: "rhn",
            inDirectory: "test_resources/context_files/es")!
        let modelPath = bundle.path(
            forResource: "rhino_params_es",
            ofType: "pv",
            inDirectory: "test_resources/model_files")!

        let r = try Rhino.init(
            accessKey: accessKey,
            contextPath: contextPath,
            modelPath: modelPath)
        XCTAssert(r.contextInfo != "")
        r.delete()
    }

    func testProcWithinContext() throws {
        let bundle = Bundle(for: type(of: self))
        let contextPath = bundle.path(
            forResource: "coffee_maker_ios",
            ofType: "rhn",
            inDirectory: "test_resources/context_files/en")!
        let r = try Rhino.init(
            accessKey: accessKey,
            contextPath: contextPath)

        let fileURL: URL = bundle.url(
            forResource: "test_within_context",
            withExtension: "wav",
            subdirectory: "test_resources/audio_samples")!
        let inference = try processFile(rhino: r, testAudioURL: fileURL)

        XCTAssert(inference.isUnderstood)
        XCTAssert(inference.intent == "orderBeverage")

        let expectedSlotValues = [
            "size": "medium",
            "numberOfShots": "double shot",
            "beverage": "americano"
        ]

        XCTAssert(expectedSlotValues == inference.slots)

        r.delete()
    }

    func testProcOutOfContext() throws {
        let bundle = Bundle(for: type(of: self))
        let contextPath = bundle.path(
            forResource: "coffee_maker_ios",
            ofType: "rhn",
            inDirectory: "test_resources/context_files/en")!
        let r = try Rhino.init(
            accessKey: accessKey,
            contextPath: contextPath)

        let fileURL: URL = bundle.url(
            forResource: "test_out_of_context",
            withExtension: "wav",
            subdirectory: "test_resources/audio_samples")!
        let inference = try processFile(rhino: r, testAudioURL: fileURL)
        XCTAssert(!inference.isUnderstood)

        r.delete()
    }

    func testReset() throws {
        let bundle = Bundle(for: type(of: self))
        let contextPath = bundle.path(
            forResource: "coffee_maker_ios",
            ofType: "rhn",
            inDirectory: "test_resources/context_files/en")!
        let fileURL: URL = bundle.url(
            forResource: "test_within_context",
            withExtension: "wav",
            subdirectory: "test_resources/audio_samples")!

        let r = try Rhino.init(accessKey: accessKey, contextPath: contextPath)
        var isFinalized = try processFileHelper(r, fileURL, 15)
        XCTAssert(!isFinalized)

        try r.reset()
        isFinalized = try processFileHelper(r, fileURL)
        XCTAssert(isFinalized)

        let inference = try r.getInference()
        XCTAssert(inference.isUnderstood)

        r.delete()
    }

    func testMessageStack() throws {
        let bundle = Bundle(for: type(of: self))
        let contextPath = bundle.path(
            forResource: "coffee_maker_ios",
            ofType: "rhn",
            inDirectory: "test_resources/context_files/en")!

        var first_error: String = ""
        do {
            let r = try Rhino.init(accessKey: "invalid", contextPath: contextPath)
            XCTAssertNil(r)
        } catch {
            first_error = "\(error.localizedDescription)"
            XCTAssert(first_error.count < 1024)
        }

        do {
            let r = try Rhino.init(accessKey: "invalid", contextPath: contextPath)
            XCTAssertNil(r)
        } catch {
            XCTAssert("\(error.localizedDescription)".count == first_error.count)
        }
    }

    func testProcessMessageStack() throws {
        let bundle = Bundle(for: type(of: self))
        let contextPath = bundle.path(
            forResource: "coffee_maker_ios",
            ofType: "rhn",
            inDirectory: "test_resources/context_files/en")!

        let r = try Rhino.init(accessKey: accessKey, contextPath: contextPath)
        r.delete()

        var testPcm: [Int16] = []
        testPcm.reserveCapacity(Int(Rhino.frameLength))

        do {
            let res = try r.process(pcm: testPcm)
            XCTAssert(res != true)
        } catch {
            XCTAssert("\(error.localizedDescription)".count > 0)
        }
    }
}
