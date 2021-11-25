//
//  Copyright 2018-2021 Picovoice Inc.
//  You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
//  file accompanying this source.
//  Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
//  an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
//  specific language governing permissions and limitations under the License.
//

import SwiftUI
import Rhino
struct ContentView: View {
    
    let contextPath = Bundle.main.path(forResource: "smart_lighting_ios", ofType: "rhn")
    
    @State var rhinoManager: RhinoManager!
    @State var buttonLabel = "START"
    @State var result: String = ""
    @State var errorMessage: String = ""
    
    let ACCESS_KEY = "${YOUR_ACCESS_KEY_HERE}" // Obtained from Picovoice Console (https://console.picovoice.ai)
    
    var body: some View {
        VStack {
            Spacer()
            Spacer()
            Text("\(result)")
                .foregroundColor(Color.black)
                .padding()
            
            Text(errorMessage)
                .padding()
                .background(Color.red)
                .foregroundColor(Color.white)
                .frame(minWidth: 0, maxWidth: UIScreen.main.bounds.width - 50)
                .font(.body)
                .opacity(errorMessage.isEmpty ? 0 : 1)
                .cornerRadius(.infinity)
            Spacer()
            Button(action: {
                if self.buttonLabel == "START" {
                    self.result = ""
                    
                    do {
                        self.rhinoManager = try RhinoManager(
                            accessKey: self.ACCESS_KEY,
                            contextPath: self.contextPath!,
                            onInferenceCallback: { x in
                                DispatchQueue.main.async {
                                    result = "{\n"
                                    self.result += "    \"isUnderstood\" : \"" + x.isUnderstood.description + "\",\n"
                                    if x.isUnderstood {
                                        self.result += "    \"intent : \"" + x.intent + "\",\n"
                                        if !x.slots.isEmpty {
                                            result += "    \"slots\" : {\n"
                                            for (k, v) in x.slots {
                                                self.result += "        \"" + k + "\" : \"" + v + "\",\n"
                                            }
                                            result += "    }\n"
                                        }
                                    }
                                    result += "}\n"
                                    
                                    self.buttonLabel = "START"
                                }
                            })
                        try self.rhinoManager.process()
                        self.buttonLabel = "    ...    "
                    } catch let error as RhinoInvalidArgumentError{
                        errorMessage = "\(error.localizedDescription)\nEnsure your AccessKey '\(ACCESS_KEY)' is valid"
                    } catch is RhinoActivationError {
                        errorMessage = "ACCESS_KEY activation error"
                    } catch is RhinoActivationRefusedError {
                        errorMessage = "ACCESS_KEY activation refused"
                    } catch is RhinoActivationLimitError {
                        errorMessage = "ACCESS_KEY reached its limit"
                    } catch is RhinoActivationThrottledError  {
                        errorMessage = "ACCESS_KEY is throttled"
                    } catch {
                        errorMessage = "\(error)"
                    }
                    
                } else {
                    self.buttonLabel = "START"
                }
            }) {
                Text("\(buttonLabel)")
                    .padding()
                    .background(errorMessage.isEmpty ? Color.blue : Color.gray)
                    .foregroundColor(Color.white)
                    .font(.largeTitle)
                    
            }.disabled(!errorMessage.isEmpty)
        }
        .padding()
        .frame(minWidth: 0, maxWidth: .infinity, minHeight: 0, maxHeight: .infinity)
        .background(Color.white)
    }
}

struct ContentView_Previews: PreviewProvider {
    static var previews: some View {
        ContentView()
    }
}
