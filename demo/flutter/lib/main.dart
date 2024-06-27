//
// Copyright 2021-2023 Picovoice Inc.
//
// You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
// file accompanying this source.
//
// Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
// an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
// specific language governing permissions and limitations under the License.
//

import 'dart:async';
import 'dart:io';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:rhino_flutter/rhino.dart';
import 'package:rhino_flutter/rhino_manager.dart';
import 'package:rhino_flutter/rhino_error.dart';

void main() {
  runApp(MaterialApp(home: MyApp()));
}

class MyApp extends StatefulWidget {
  @override
  _MyAppState createState() => _MyAppState();
}

class _MyAppState extends State<MyApp> {
  final String accessKey =
      '{YOUR_ACCESS_KEY_HERE}'; // AccessKey obtained from Picovoice Console (https://console.picovoice.ai/)

  final GlobalKey<ScaffoldState> _scaffoldKey = GlobalKey<ScaffoldState>();

  bool isError = false;
  String errorMessage = "";

  bool isButtonDisabled = false;
  bool isProcessing = false;
  String contextName = "";
  String rhinoText = "";
  RhinoManager? _rhinoManager;

  @override
  void initState() {
    super.initState();
    setState(() {
      isButtonDisabled = true;
      rhinoText = "";
    });

    initRhino();
  }

  Future<void> initRhino() async {
    String language = "";
    try {
      final paramsString =
          await DefaultAssetBundle.of(context).loadString('assets/params.json');
      final params = json.decode(paramsString);

      language = params["language"];
      contextName = params["context"];
    } catch (_) {
      errorCallback(RhinoException(
          "Could not find `params.json`. Ensure 'prepare_demo.dart' script was run before launching the demo."));
      return;
    }

    String platform = Platform.isAndroid
        ? "android"
        : Platform.isIOS
            ? "ios"
            : throw RhinoRuntimeException(
                "This demo supports iOS and Android only.");
    String contextPath =
        "assets/contexts/$platform/${contextName}_$platform.rhn";
    String? modelPath =
        language != "en" ? "assets/models/rhino_params_$language.pv" : null;
    try {
      _rhinoManager = await RhinoManager.create(
          accessKey, contextPath, inferenceCallback,
          modelPath: modelPath, processErrorCallback: errorCallback);
    } on RhinoActivationException {
      errorCallback(RhinoActivationException("AccessKey activation error."));
    } on RhinoActivationLimitException {
      errorCallback(
          RhinoActivationLimitException("AccessKey reached its device limit."));
    } on RhinoActivationRefusedException {
      errorCallback(RhinoActivationRefusedException("AccessKey refused."));
    } on RhinoActivationThrottledException {
      errorCallback(
          RhinoActivationThrottledException("AccessKey has been throttled."));
    } on RhinoException catch (ex) {
      errorCallback(ex);
    } finally {
      setState(() {
        isButtonDisabled = false;
      });
    }
  }

  void inferenceCallback(RhinoInference inference) {
    setState(() {
      rhinoText = prettyPrintInference(inference);
      isButtonDisabled = false;
      isProcessing = false;
    });
  }

  void errorCallback(RhinoException error) {
    print(errorMessage);
    setState(() {
      isError = true;
      errorMessage = error.message!;
    });
  }

  String prettyPrintInference(RhinoInference inference) {
    String printText =
        "{\n    \"isUnderstood\" : \"${inference.isUnderstood}\",\n";
    if (inference.isUnderstood!) {
      printText += "    \"intent\" : \"${inference.intent}\",\n";
      if (inference.slots!.isNotEmpty) {
        printText += '    "slots" : {\n';
        Map<String, String> slots = inference.slots!;
        for (String key in slots.keys) {
          printText += "        \"$key\" : \"${slots[key]}\",\n";
        }
        printText += '    }\n';
      }
    }
    printText += '}';
    return printText;
  }

  Future<void> _startProcessing() async {
    if (isProcessing) {
      return;
    }

    setState(() {
      isButtonDisabled = true;
    });

    try {
      await _rhinoManager!.process();
      setState(() {
        isProcessing = true;
        rhinoText = "Listening...";
      });
    } on RhinoException catch (ex) {
      errorCallback(ex);
    }
  }

  _showContextInfo(context) {
    showDialog(
        context: context,
        builder: (BuildContext context) {
          return Dialog(
            child: Container(
              child: Padding(
                padding: const EdgeInsets.all(12.0),
                child: SingleChildScrollView(
                  child: RichText(
                    textAlign: TextAlign.justify,
                    text: TextSpan(
                        text: _rhinoManager!.contextInfo,
                        style: TextStyle(color: Colors.black)),
                  ),
                ),
              ),
            ),
          );
        });
  }

  Color picoBlue = Color.fromRGBO(55, 125, 255, 1);
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      key: _scaffoldKey,
      appBar: AppBar(
        title: const Text('Rhino Demo'),
        backgroundColor: picoBlue,
      ),
      body: Column(
        children: [
          buildContextHeader(context),
          buildRhinoTextArea(context),
          buildErrorMessage(context),
          buildStartButton(context),
          footer
        ],
      ),
    );
  }

  buildContextHeader(BuildContext context) {
    final ButtonStyle buttonStyle = ElevatedButton.styleFrom(
        backgroundColor: picoBlue, textStyle: TextStyle(color: Colors.white));

    return Expanded(
        flex: 1,
        child: Row(
          children: [
            Expanded(
                child: Container(
                    alignment: Alignment.centerLeft,
                    margin: EdgeInsets.only(left: 10, top: 10),
                    child: Text("Context: $contextName"))),
            Expanded(
                child: Container(
                    alignment: Alignment.centerRight,
                    margin: EdgeInsets.only(right: 10, top: 10),
                    child: ElevatedButton(
                      style: buttonStyle,
                      onPressed: (isProcessing || isButtonDisabled || isError)
                          ? null
                          : () {
                              _showContextInfo(context);
                            },
                      child:
                          Text("Context Info", style: TextStyle(fontSize: 15)),
                    )))
          ],
        ));
  }

  buildStartButton(BuildContext context) {
    final ButtonStyle buttonStyle = ElevatedButton.styleFrom(
        backgroundColor: picoBlue,
        shape: CircleBorder(),
        textStyle: TextStyle(color: Colors.white));

    return Expanded(
      flex: 4,
      child: Container(
          child: SizedBox(
              width: 130,
              height: 130,
              child: ElevatedButton(
                style: buttonStyle,
                onPressed: (isProcessing || isButtonDisabled || isError)
                    ? null
                    : _startProcessing,
                child: Text(isProcessing ? "..." : "Start",
                    style: TextStyle(fontSize: 30)),
              ))),
    );
  }

  buildRhinoTextArea(BuildContext context) {
    return Expanded(
        flex: 8,
        child: Container(
            alignment: Alignment.center,
            color: Color(0xff25187e),
            margin: EdgeInsets.only(left: 20, right: 20, top: 20),
            child: Text(
              rhinoText,
              style: TextStyle(color: Colors.white, fontSize: 20),
            )));
  }

  buildErrorMessage(BuildContext context) {
    return Expanded(
        flex: isError ? 3 : 0,
        child: Container(
            alignment: Alignment.center,
            margin: EdgeInsets.only(left: 20, right: 20),
            padding: EdgeInsets.all(5),
            decoration: !isError
                ? null
                : BoxDecoration(
                    color: Colors.red, borderRadius: BorderRadius.circular(5)),
            child: !isError
                ? null
                : Text(
                    errorMessage,
                    style: TextStyle(color: Colors.white, fontSize: 18),
                  )));
  }

  Widget footer = Expanded(
      flex: 1,
      child: Container(
          alignment: Alignment.bottomCenter,
          padding: EdgeInsets.only(bottom: 20),
          child: const Text(
            "Made in Vancouver, Canada by Picovoice",
            style: TextStyle(color: Color(0xff666666)),
          )));
}
