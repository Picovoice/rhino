import React, { Component } from 'react';
import { PermissionsAndroid, Platform, TouchableOpacity } from 'react-native';
import { StyleSheet, Text, View } from 'react-native';
import { RhinoManager } from '@picovoice/rhino-react-native';

const RNFS = require('react-native-fs')

type Props = {};
type State = {
  buttonText: string;
  rhinoText: string;
  isListening: boolean;
};

export default class App extends Component<Props, State> {
  _rhinoManager: RhinoManager | undefined;  

  constructor(props: Props) {
    super(props);
    this.state = {
      buttonText: 'Start',
      rhinoText: '',
      isListening: false
    };
  }

  async componentDidMount() {
    let contextName = 'coffee_maker';
    let contextFilename = contextName;
    let contextPath = ''
    if(Platform.OS == 'android'){
      contextFilename += "_android.rhn";      
      contextPath = `${RNFS.DocumentDirectoryPath}/${contextFilename}`;      
      await RNFS.copyFileRes(contextFilename, contextPath);
    }
    else if(Platform.OS == 'ios'){
      contextFilename += "_ios.rhn";  
      contextPath = `${RNFS.MainBundlePath}/${contextFilename}`;
    }

    // load context
    try{
      this._rhinoManager = await RhinoManager.create(contextPath, (inference:object)=>{    
        this.setState({
          rhinoText: JSON.stringify(inference, null, 4)
        });    
        
        this._stopProcessing();
      });
    }
    catch(e){
      console.error(e);
    }
  }

  componentWillUnmount() {
    if (this.state.isListening) {
      this._stopProcessing();
    }
    this._rhinoManager?.delete();
  }

  async _startProcessing() {
    if(this.state.isListening){
      return;
    }
    
    let recordAudioRequest;
    if (Platform.OS == 'android') {
      recordAudioRequest = this._requestRecordAudioPermission();
    } else {
      recordAudioRequest = new Promise(function (resolve, _) {
        resolve(true);
      });
    }

    recordAudioRequest.then((hasPermission) => {
      if (!hasPermission) {
        console.error("Required microphone permission was not granted.")
        return;
      }

      this._rhinoManager?.start();
      this.setState({
        buttonText: '...',
        isListening: true,
      });
    });
  }

  _stopProcessing() {
    this._rhinoManager?.stop();
    this.setState({
      buttonText: 'Start',
      isListening: false,
    });
  }

  async _requestRecordAudioPermission() {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        {
          title: 'Microphone Permission',
          message:
            'Rhino needs access to your microphone to make intent inferences.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        }
      );
      return (granted === PermissionsAndroid.RESULTS.GRANTED)        
    } catch (err) {
      console.error(err);
      return false;
    }
  }

  render() {    

    return (
      <View
        style={[
          styles.container,
          { backgroundColor: this.state.backgroundColour },
        ]}
      >
        <View style={styles.statusBar}>
          <Text style={styles.statusBarText}>Rhino</Text>
        </View>

        <View style={{flex:0.35, justifyContent:'center', alignContent:'center'}}>
          <TouchableOpacity
            style={{
              width:'50%',
              height:'50%',
              alignSelf:'center',
              justifyContent:'center',
              backgroundColor: '#377DFF',
              borderRadius: 100,
              }}
            onPress={() => this._startProcessing()}
          >
            <Text style={styles.buttonText}>{this.state.buttonText}</Text>
          </TouchableOpacity>
        </View>
        <View style={{flex:1, padding:20, }}>
          <View style={{flex:1, flexDirection:'row', justifyContent:'center', padding:30, backgroundColor:'#25187E'}}>
            <Text style={styles.rhinoText}>
                  {this.state.rhinoText}
            </Text>
          </View>
        </View>
        <View style={{ flex: 0.08, justifyContent: 'flex-end', paddingBottom:25}}>
          <Text style={styles.instructions}>
            Made in Vancouver, Canada by Picovoice
          </Text>
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'center',
    backgroundColor: '#F5FCFF',
  },
  subContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  statusBar: {
    flex: 0.20,
    backgroundColor: '#377DFF',
    justifyContent: 'flex-end'
  },
  statusBarText: {
    fontSize: 18,
    color: 'white',
    fontWeight: 'bold',
    marginLeft: 15,
    marginBottom:15,
  },
  
  buttonStyle: {
    backgroundColor: '#377DFF',
    borderRadius: 100,
  },
  buttonText: {
    fontSize: 30,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },
  rhinoText: {
    flex:1, 
    flexWrap:'wrap',
    color: 'white',    
    fontSize: 20,
  },
  itemStyle: {
    fontWeight: 'bold',
    fontSize: 20,
    textAlign: 'center',
  },
  instructions: {
    textAlign: 'center',
    color: '#666666'
  },
});
