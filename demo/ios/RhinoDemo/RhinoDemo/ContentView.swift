//
// Copyright 2019 Picovoice Inc.
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
// http://www.apache.org/licenses/LICENSE-2.0
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//

import SwiftUI

struct ContentView: View {
    
    let modelFilePath = Bundle.main.path(forResource: "rhino_params", ofType: "pv")
    let contextFilePath = Bundle.main.path(forResource: "smart_lighting_ios", ofType: "rhn")
    
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
                            modelFilePath: self.modelFilePath!,
                            contextFilePath: self.contextFilePath!,
                            onInferenceCallback: { info in
                                if !info.isUnderstood {
                                    self.result = "did not understand the command"
                                } else {
                                    self.result = "intent : " + info.intent + "\n"
                                    for (k, v) in info.slots {
                                        self.result += k + " : " + v + "\n"
                                    }
                                }
                                self.rhinoManager.stopListening()
                                self.buttonLabel = "START"
                            })
                        try self.rhinoManager.startListening()
                    } catch {
                        
                    }
                    
                    self.buttonLabel = "STOP"
                } else {
                    self.rhinoManager.stopListening()
                    self.buttonLabel = "START"
                }
            }) {
                Text("\(buttonLabel)")
                    .padding()
                    .background(Color.gray)
                    .foregroundColor(Color.blue)
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
