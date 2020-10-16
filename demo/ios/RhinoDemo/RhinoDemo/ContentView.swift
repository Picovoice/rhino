//
//  Copyright 2018-2020 Picovoice Inc.
//  You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
//  file accompanying this source.
//  Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
//  an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
//  specific language governing permissions and limitations under the License.
//

import SwiftUI

struct ContentView: View {
    let modelPath = Bundle.main.path(forResource: "rhino_params", ofType: "pv")
    let contextPath = Bundle.main.path(forResource: "smart_lighting_ios", ofType: "rhn")
    
    @State var rhinoManager: RhinoManager!
    @State var buttonLabel = "START"
    @State var result: String = ""
    
    var body: some View {
        VStack {
            Button(action: {
                if self.buttonLabel == "START" {
                    self.result = ""
                    
                    do {
                        self.rhinoManager = try RhinoManager(
                            modelPath: self.modelPath!,
                            contextPath: self.contextPath!,
                            sensitivity: 0.0,
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
                    } catch {
                        
                    }
                    
                    self.buttonLabel = "    ...    "
                } else {
                    self.buttonLabel = "START"
                }
            }) {
                Text("\(buttonLabel)")
                    .padding()
                    .background(Color.blue)
                    .foregroundColor(Color.white)
                    .font(.largeTitle)
            }
            
            Text("\(result)")
                .padding()
        }
    }
}

struct ContentView_Previews: PreviewProvider {
    static var previews: some View {
        ContentView()
    }
}
