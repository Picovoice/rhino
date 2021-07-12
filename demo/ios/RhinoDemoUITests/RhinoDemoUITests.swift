import AVFoundation
import XCTest

import Rhino

class RhinoDemoUITests: XCTestCase {

    override func setUp() {
        super.setUp()
        continueAfterFailure = false
    }

    override func tearDown() {
       super.tearDown()
    }
    
    func testInitSuccessSimple() throws {
        let bundle = Bundle(for: type(of: self))
        let contextPath = bundle.path(forResource: "coffee_maker_ios", ofType: "rhn")!
        let r = try Rhino.init(contextPath: contextPath)
        
        XCTAssert(Rhino.version != "")
        XCTAssert(Rhino.frameLength > 0)
        XCTAssert(Rhino.sampleRate > 0)
        XCTAssert(r.contextInfo != "")
        r.delete()
    }
    
    func testInitSuccessWithCustomModelPath() throws {
        let bundle = Bundle(for: type(of: self))
        let contextPath = bundle.path(forResource: "coffee_maker_ios", ofType: "rhn")!
        let modelPath = bundle.path(forResource: "rhino_params", ofType: "pv")!
        
        let r = try Rhino.init(contextPath: contextPath, modelPath: modelPath)
        XCTAssert(r.contextInfo != "")
        r.delete()
    }
    
    func testInitSuccessWithCustomSensitivity() throws {
        let bundle = Bundle(for: type(of: self))
        let contextPath = bundle.path(forResource: "coffee_maker_ios", ofType: "rhn")!
        
        let r = try Rhino.init(contextPath: contextPath, sensitivity: 0.7)
        XCTAssert(r.contextInfo != "")
        r.delete()
    }
    
    func testInitSuccessDE() throws {
        let bundle = Bundle(for: type(of: self))
        let contextPath = bundle.path(forResource: "test_de_ios", ofType: "rhn")!
        let modelPath = bundle.path(forResource: "rhino_params_de", ofType: "pv")!
        
        let r = try Rhino.init(contextPath: contextPath, modelPath: modelPath)
        XCTAssert(r.contextInfo != "")
        r.delete()
    }
    
    func testInitSuccessES() throws {
        let bundle = Bundle(for: type(of: self))
        let contextPath = bundle.path(forResource: "test_es_ios", ofType: "rhn")!
        let modelPath = bundle.path(forResource: "rhino_params_es", ofType: "pv")!
        
        let r = try Rhino.init(contextPath: contextPath, modelPath: modelPath)
        XCTAssert(r.contextInfo != "")
        r.delete()
    }
    
    func testInitSuccessFR() throws {
        let bundle = Bundle(for: type(of: self))
        let contextPath = bundle.path(forResource: "test_fr_ios", ofType: "rhn")!
        let modelPath = bundle.path(forResource: "rhino_params_fr", ofType: "pv")!
        
        let r = try Rhino.init(contextPath: contextPath, modelPath: modelPath)
        XCTAssert(r.contextInfo != "")
        r.delete()
    }
    
    func testInitFailWithMismatchedLanguage() throws {
        let bundle = Bundle(for: type(of: self))
        let contextPath = bundle.path(forResource: "test_de_ios", ofType: "rhn")!
        let modelPath = bundle.path(forResource: "rhino_params", ofType: "pv")!
        
        var didFail = false
        do {
            _ = try Rhino.init(contextPath: contextPath, modelPath: modelPath)
        } catch {
            didFail = true
        }
        
        XCTAssert(didFail)
    }
    
    func testInitFailWithInvalidContextPath() throws {
        let contextPath = "/bad_path/bad_path.rhn"
        
        var didFail = false
        do {
            _ = try Rhino.init(contextPath: contextPath)
        } catch {
            didFail = true
        }
        
        XCTAssert(didFail)
    }
    
    func testInitFailWithInvalidModelPath() throws {
        let bundle = Bundle(for: type(of: self))
        let contextPath = bundle.path(forResource: "coffee_maker_ios", ofType: "rhn")!
        let modelPath = "/bad_path/bad_path.pv"
        
        var didFail = false
        do {
            _ = try Rhino.init(contextPath: contextPath, modelPath: modelPath)
        } catch {
            didFail = true
        }
        
        XCTAssert(didFail)
    }
    
    func testInitFailWithInvalidSensitivity() throws {
        let bundle = Bundle(for: type(of: self))
        let contextPath = bundle.path(forResource: "coffee_maker_ios", ofType: "rhn")!
        
        var didFail = false
        do {
            _ = try Rhino.init(contextPath: contextPath, sensitivity: 10)
        } catch {
            didFail = true
        }
        
        XCTAssert(didFail)
    }
    
    func testInitFailWithWrongPlatform() throws {
        let bundle = Bundle(for: type(of: self))
        let contextPath = bundle.path(forResource: "coffee_maker_linux", ofType: "rhn")!
        
        var didFail = false
        do {
            _ = try Rhino.init(contextPath: contextPath)
        } catch {
            didFail = true
        }
        
        XCTAssert(didFail)
    }
    
    func testProcWithinContext() throws {
        let bundle = Bundle(for: type(of: self))
        let contextPath = bundle.path(forResource: "coffee_maker_ios", ofType: "rhn")!
        let r = try Rhino.init(contextPath: contextPath)
        
        let fileURL:URL = bundle.url(forResource: "test_within_context", withExtension: "wav")!
        let data = try Data(contentsOf: fileURL)
        let frameLengthBytes = Int(Rhino.frameLength) * 2
        var pcmBuffer = Array<Int16>(repeating: 0, count: Int(Rhino.frameLength))
        var isFinalized = false
        var index = 44
        while(index + frameLengthBytes < data.count) {
            _ = pcmBuffer.withUnsafeMutableBytes { data.copyBytes(to: $0, from: index..<(index + frameLengthBytes)) }
            isFinalized = try r.process(pcm:pcmBuffer)
            if isFinalized {
                break;
            }
            
            index += frameLengthBytes
        }
        
        XCTAssert(isFinalized)
        
        let inference:Inference = try r.getInference()
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
        let contextPath = bundle.path(forResource: "coffee_maker_ios", ofType: "rhn")!
        let r = try Rhino.init(contextPath: contextPath)
        
        let fileURL:URL = bundle.url(forResource: "test_out_of_context", withExtension: "wav")!
        let data = try Data(contentsOf: fileURL)
        let frameLengthBytes = Int(Rhino.frameLength) * 2
        var pcmBuffer = Array<Int16>(repeating: 0, count: Int(Rhino.frameLength))
        var isFinalized = false
        var index = 44
        while(index + frameLengthBytes < data.count) {
            _ = pcmBuffer.withUnsafeMutableBytes { data.copyBytes(to: $0, from: index..<(index + frameLengthBytes)) }
            isFinalized = try r.process(pcm:pcmBuffer)
            if isFinalized {
                break;
            }
            
            index += frameLengthBytes
        }
        
        XCTAssert(isFinalized)
        
        let inference:Inference = try r.getInference()
        XCTAssert(!inference.isUnderstood)
        
        r.delete()
    }
}
