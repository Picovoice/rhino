//
//  Copyright 2018-2023 Picovoice Inc.
//  You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
//  file accompanying this source.
//  Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
//  an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
//  specific language governing permissions and limitations under the License.
//

import SwiftUI
import Rhino

struct SheetView: View {
    @Binding var contextInfo: String

    var body: some View {
        ScrollView {
            Text(self.contextInfo)
                .padding()
                .font(.system(size: 14))
        }
    }
}

struct ContentView: View {

    let language: String = ProcessInfo.processInfo.environment["LANGUAGE"]!
    let context: String = ProcessInfo.processInfo.environment["CONTEXT"]!

    @State var rhinoManager: RhinoManager!
    @State var buttonLabel = "START"
    @State var result: String = ""
    @State var errorMessage: String = ""
    @State var contextInfo: String = ""
    @State var showInfo: Bool = false

    let ACCESS_KEY = "${YOUR_ACCESS_KEY_HERE}" // Obtained from Picovoice Console (https://console.picovoice.ai)

    func initRhino() {
        let contextPath = Bundle.main.url(
            forResource: "\(context)_ios",
            withExtension: "rhn",
            subdirectory: "contexts")!.path

        let modelPath = (language == "en") ? nil :
            Bundle.main.url(
                forResource: "rhino_params_\(language)",
                withExtension: "pv",
                subdirectory: "models")!.path

        do {
            self.rhinoManager = try RhinoManager(
                accessKey: self.ACCESS_KEY,
                contextPath: contextPath,
                modelPath: modelPath,
                onInferenceCallback: { x in
                    DispatchQueue.main.async {
                        result = "{\n"
                        self.result += "    \"isUnderstood\" : \"" +
                            x.isUnderstood.description + "\",\n"
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
            self.contextInfo = self.rhinoManager.contextInfo
        } catch let error as RhinoInvalidArgumentError {
            errorMessage =
                "\(error.localizedDescription)\nEnsure your AccessKey '\(ACCESS_KEY)' is valid"
        } catch is RhinoActivationError {
            errorMessage = "ACCESS_KEY activation error"
        } catch is RhinoActivationRefusedError {
            errorMessage = "ACCESS_KEY activation refused"
        } catch is RhinoActivationLimitError {
            errorMessage = "ACCESS_KEY reached its limit"
        } catch is RhinoActivationThrottledError {
            errorMessage = "ACCESS_KEY is throttled"
        } catch {
            errorMessage = "\(error)"
        }
    }

    var body: some View {
        NavigationView {
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
                Button {
                    if self.buttonLabel == "START" {
                        self.result = ""
                        if self.rhinoManager == nil {
                            initRhino()
                        }

                        do {
                            if self.rhinoManager != nil {
                                try self.rhinoManager.process()
                                self.buttonLabel = "    ...    "
                            }
                        } catch {
                            errorMessage = "\(error)"
                        }

                    } else {
                        self.buttonLabel = "START"
                    }
                } label: {
                    Text("\(buttonLabel)")
                        .padding()
                        .background(errorMessage.isEmpty ? Color.blue: Color.gray)
                        .foregroundColor(Color.white)
                        .font(.largeTitle)

                }.disabled(!errorMessage.isEmpty)
            }
            .padding()
            .frame(minWidth: 0, maxWidth: .infinity, minHeight: 0, maxHeight: .infinity)
            .background(Color.white)
            .navigationBarItems(trailing: Button("Context Info") {
                if self.rhinoManager == nil {
                    initRhino()
                }
                self.showInfo = true
            })
        }
        .sheet(isPresented: self.$showInfo) {
            SheetView(contextInfo: self.$contextInfo)
        }
    }
}

struct ContentView_Previews: PreviewProvider {
    static var previews: some View {
        ContentView()
    }
}
