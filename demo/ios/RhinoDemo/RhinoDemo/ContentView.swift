//
//  ContentView.swift
//  RhinoDemo
//
//  Created by Alireza Kenarsari Anhari on 2019-11-04.
//  Copyright © 2019 Picovoice Inc. All rights reserved.
//

import SwiftUI

struct ContentView: View {
    @State var count: Int = 0
    
    var body: some View {
        VStack {
            Text("\(count)")
            Button(action: {self.count = self.count + 1}) {
                Text(/*@START_MENU_TOKEN@*/"Start"/*@END_MENU_TOKEN@*/)
                    .font(.largeTitle)
            }
        }
    }
}

struct ContentView_Previews: PreviewProvider {
    static var previews: some View {
        ContentView()
    }
}
