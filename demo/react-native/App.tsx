import React, { Component } from 'react';
import {
  Modal,
  Platform,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  RhinoManager,
  RhinoInference,
  RhinoErrors,
} from '@picovoice/rhino-react-native';

import { language, context } from './params.json';

type Props = {};
type State = {
  buttonText: string;
  buttonDisabled: boolean;
  rhinoText: string;
  isListening: boolean;
  isError: boolean;
  errorMessage: string;
  showContextInfo: boolean;
};

const marginOffset = Platform.OS === 'ios' ? 30 : 0;

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
      showContextInfo: false,
    };
  }

  async componentDidMount() {
    let contextPath = `contexts/${context}_${Platform.OS}.rhn`;
    let modelPath: string | undefined;
    if (language !== 'en') {
      modelPath = `models/rhino_params_${language}.pv`;
    }

    try {
      this._rhinoManager = await RhinoManager.create(
        this._accessKey,
        contextPath,
        this.inferenceCallback.bind(this),
        (error) => {
          this.errorCallback(error.message);
        },
        modelPath,
      );
    } catch (err) {
      let errorMessage;
      if (err instanceof RhinoErrors.RhinoInvalidArgumentError) {
        errorMessage = err.message;
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

    try {
      await this._rhinoManager?.process();
      this.setState({
        buttonText: '...',
        rhinoText: '',
        buttonDisabled: false,
        isListening: true,
      });
    } catch (e: any) {
      this.setState({
        isError: true,
        errorMessage: e.message,
      });
    }
  }

  showContextInfo() {
    if (!this.state.isError) {
      this.setState({ showContextInfo: true });
    }
  }

  render() {
    return (
      <View style={[styles.container]}>
        <View style={styles.statusBar}>
          <Text style={styles.statusBarText}>Rhino</Text>
          <View style={styles.statusBarButtonContainer}>
            <TouchableOpacity
              style={{ backgroundColor: '#ffd105' }}
              onPress={() => this.showContextInfo()}>
              <Text style={styles.statusBarButtonStyle}>Context Info</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Modal
          animationType="slide"
          transparent={true}
          visible={this.state.showContextInfo}>
          <View style={styles.modalView}>
            <ScrollView style={{ flex: 0.95, marginBottom: 10 }}>
              <Text>{this._rhinoManager?.contextInfo}</Text>
            </ScrollView>
            <TouchableOpacity
              style={{
                alignSelf: 'center',
                justifyContent: 'center',
                backgroundColor: '#377DFF',
                padding: 3,
                flex: 0.05,
              }}
              onPress={() => this.setState({ showContextInfo: false })}>
              <Text style={{ color: 'white' }}>CLOSE</Text>
            </TouchableOpacity>
          </View>
        </Modal>

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
    justifyContent: 'space-between',
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusBarText: {
    fontSize: 18,
    color: 'white',
    fontWeight: 'bold',
    marginLeft: 15,
    marginTop: marginOffset,
  },
  statusBarButtonContainer: {
    marginRight: 5,
    marginTop: marginOffset,
  },
  statusBarButtonStyle: {
    padding: 7.5,
    fontWeight: '500',
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
    marginTop: 5,
    marginBottom: 5,
    padding: 10,
    textAlign: 'center',
  },
  modalView: {
    margin: 10,
    marginTop: 10 + marginOffset,
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
});
