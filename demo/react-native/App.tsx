import React, { Component } from 'react';
import { PermissionsAndroid, Platform, TouchableOpacity } from 'react-native';
import { StyleSheet, Text, View } from 'react-native';
import {
  RhinoManager,
  RhinoInference,
  RhinoErrors,
} from '@picovoice/rhino-react-native';

type Props = {};
type State = {
  buttonText: string;
  buttonDisabled: boolean;
  rhinoText: string;
  isListening: boolean;
  isError: boolean;
  errorMessage: string;
};

export default class App extends Component<Props, State> {
  readonly _accessKey: string = '${YOUR_ACCESS_KEY_HERE}'; // AccessKey obtained from Picovoice Console (https://console.picovoice.ai/)

  _rhinoManager: RhinoManager | undefined;

  constructor(props: Props) {
    super(props);
    this.state = {
      buttonText: 'Start',
      buttonDisabled: false,
      rhinoText: '',
      isListening: false,
      isError: false,
      errorMessage: '',
    };
  }

  async componentDidMount() {
    let contextPath = `smart_lighting_${Platform.OS}.rhn`;

    // load context
    try {
      this._rhinoManager = await RhinoManager.create(
        this._accessKey,
        contextPath,
        this.inferenceCallback.bind(this),
        (error) => {
          this.errorCallback(error.message);
        },
      );
    } catch (err) {
      let errorMessage;
      if (err instanceof RhinoErrors.RhinoInvalidArgumentError) {
        errorMessage = `${err.message}\nPlease make sure your accessKey '${this._accessKey}'' is a valid access key.`;
      } else if (err instanceof RhinoErrors.RhinoActivationError) {
        errorMessage = 'AccessKey activation error';
      } else if (err instanceof RhinoErrors.RhinoActivationLimitError) {
        errorMessage = 'AccessKey reached its device limit';
      } else if (err instanceof RhinoErrors.RhinoActivationRefusedError) {
        errorMessage = 'AccessKey refused';
      } else if (err instanceof RhinoErrors.RhinoActivationThrottledError) {
        errorMessage = 'AccessKey has been throttled';
      } else {
        errorMessage = err.toString();
      }
      this.errorCallback(errorMessage);
    }
  }

  inferenceCallback(inference: RhinoInference) {
    this.setState({
      rhinoText: this.prettyPrint(inference),
      buttonText: 'Start',
      buttonDisabled: false,
      isListening: false,
    });
  }

  errorCallback(error: string) {
    this.setState({
      isError: true,
      errorMessage: error,
    });
  }

  prettyPrint(inference: RhinoInference): string {
    let printText = `{\n    "isUnderstood" : "${inference.isUnderstood}",\n`;
    if (inference.isUnderstood) {
      printText += `    "intent" : "${inference.intent}",\n`;
      if (Object.entries(inference.slots).length > 0) {
        printText += '    "slots" : {\n';
        for (let [key, slot] of Object.entries(inference.slots)) {
          printText += `        "${key}" : "${slot}",\n`;
        }
        printText += '    }\n';
      }
    }
    printText += '}';
    return printText;
  }

  componentWillUnmount() {
    this._rhinoManager?.delete();
  }

  async _startProcessing() {
    if (this.state.isListening) {
      return;
    }

    this.setState({
      buttonDisabled: true,
    });

    let recordAudioRequest;
    if (Platform.OS === 'android') {
      recordAudioRequest = this._requestRecordAudioPermission();
    } else {
      recordAudioRequest = new Promise(function (resolve, _) {
        resolve(true);
      });
    }

    recordAudioRequest.then((hasPermission) => {
      if (!hasPermission) {
        console.error('Required microphone permission was not granted.');
        return;
      }

      this._rhinoManager.process().then((didStart) => {
        if (didStart) {
          this.setState({
            buttonText: '...',
            rhinoText: '',
            buttonDisabled: false,
            isListening: true,
          });
        }
      });
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
        },
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (err) {
      this.errorCallback(err.toString());
      return false;
    }
  }

  render() {
    return (
      <View style={[styles.container]}>
        <View style={styles.statusBar}>
          <Text style={styles.statusBarText}>Rhino</Text>
        </View>

        <View
          style={{
            flex: 0.35,
            justifyContent: 'center',
            alignContent: 'center',
          }}>
          <TouchableOpacity
            style={{
              width: '50%',
              height: '50%',
              alignSelf: 'center',
              justifyContent: 'center',
              backgroundColor: this.state.isError ? '#cccccc' : '#377DFF',
              borderRadius: 100,
            }}
            onPress={() => this._startProcessing()}
            disabled={this.state.buttonDisabled || this.state.isError}>
            <Text style={styles.buttonText}>{this.state.buttonText}</Text>
          </TouchableOpacity>
        </View>
        <View style={{ flex: 1, padding: 20 }}>
          <View
            style={{
              flex: 1,
              flexDirection: 'row',
              justifyContent: 'center',
              padding: 30,
              backgroundColor: '#25187E',
            }}>
            <Text style={styles.rhinoText}>{this.state.rhinoText}</Text>
          </View>
        </View>
        {this.state.isError && (
          <View style={styles.errorBox}>
            <Text
              style={{
                color: 'white',
                fontSize: 16,
              }}>
              {this.state.errorMessage}
            </Text>
          </View>
        )}
        <View
          style={{ flex: 0.08, justifyContent: 'flex-end', paddingBottom: 25 }}>
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
    flex: 0.2,
    backgroundColor: '#377DFF',
    justifyContent: 'flex-end',
  },
  statusBarText: {
    fontSize: 18,
    color: 'white',
    fontWeight: 'bold',
    marginLeft: 15,
    marginBottom: 10,
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
    flex: 1,
    flexWrap: 'wrap',
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
    color: '#666666',
  },
  errorBox: {
    backgroundColor: 'red',
    borderRadius: 5,
    margin: 20,
    padding: 20,
    textAlign: 'center',
  },
});
