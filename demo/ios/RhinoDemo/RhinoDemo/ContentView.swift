//
//  ContentView.swift
//  RhinoDemo
//
//  Created by Alireza Kenarsari Anhari on 2019-11-04.
//  Copyright © 2019 Picovoice Inc. All rights reserved.
//

import SwiftUI

struct ContentView: View {
    
    let modelFilePath = Bundle.main.path(forResource: "rhino_params", ofType: "pv")
    let contextFilePath = Bundle.main.path(forResource: "smart_lighting_ios", ofType: "rhn")
    
    @State var rhinoManager: RhinoManager!
    @State var isRecording = false
    @State var count: Int = 0
    
    let inferenceCallback: ((InferenceInfo) -> Void) = { info in
    }
    
    var body: some View {
        VStack {
            Text("\(count)")
            
            Button(action: {
                do {
                    self.rhinoManager = try RhinoManager(modelFilePath: self.modelFilePath!, contextFilePath: self.contextFilePath!, onInference: self.inferenceCallback)
                    try self.rhinoManager.startListening()
                } catch {
                    
                }
                
                
            }) {
                Text(/*@START_MENU_TOKEN@*/"Start"/*@END_MENU_TOKEN@*/).font(.largeTitle)
            }
        }
    }
}

struct ContentView_Previews: PreviewProvider {
    static var previews: some View {
        ContentView()
    }
}
