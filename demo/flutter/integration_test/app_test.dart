import 'dart:convert';
import 'dart:io';
import 'dart:math';
import 'dart:typed_data';

import 'package:flutter/services.dart' show rootBundle;
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:wav/wav.dart';

import 'package:rhino_flutter/rhino.dart';
import 'package:rhino_flutter/rhino_error.dart';

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  final String accessKey = "{TESTING_ACCESS_KEY_HERE}";
  final String platform = Platform.isAndroid ? "android" : Platform.isIOS ? "ios" : throw ("Unsupported platform");

  Future<List<int>> loadAudioFile(String audioPath) async {
      const INT16_MAX = 32767;
      const INT16_MIN = -32768;

      var audioFileData = await rootBundle.load(audioPath);
      Wav audioFile = await Wav.read(audioFileData.buffer.asUint8List());
      List<int> pcm = audioFile.channels[0].map((f) {
          var i = (f * INT16_MAX).truncate();
          if (f > INT16_MAX) i = INT16_MAX;
          if (f < INT16_MIN) i = INT16_MIN;
          return i;
        }).toList();
    return pcm;
  }

  group('Rhino Context Tests', () {
    late dynamic testData;

    setUp(() async {
      String testDataJson = await rootBundle.loadString('assets/test_resources/test_data.json');
      testData = json.decode(testDataJson);
    });

    testWidgets('Test within_context all languages',
      (tester) async {
        for (int t = 0; t < testData['tests']['within_context'].length; t++) {
          String language = testData['tests']['within_context'][t]['language'];
          String contextName = testData['tests']['within_context'][t]['context_name'];
          var expectedInference = testData['tests']['within_context'][t]['inference'];

          String contextPath = "assets/test_resources/context_files/${contextName}_${platform}.rhn";
          String modelPath = "assets/test_resources/model_files/rhino_params${language != "en" ? "_${language}" : ""}.pv";

          Rhino rhino;
          try {
             rhino = await Rhino.create(
              accessKey,
              contextPath,
              modelPath: modelPath);
          } on RhinoException catch (ex) {
            expect(ex, equals(null), reason: "Failed to initialize Rhino for ${language}: ${ex}");
            return;
          }

          String audioPath = "assets/test_resources/audio_samples/test_within_context${language != "en" ? "_${language}" : ""}.wav";
          List<int> pcm = await loadAudioFile(audioPath);

          RhinoInference? inference;
          final int frameLength = rhino.frameLength;
          for (int i = 0; i < (pcm.length - frameLength); i += frameLength) {
            inference = await rhino.process(pcm.sublist(i, i + frameLength));
            if (inference.isFinalized) {
              break;
            }
          }

          rhino.delete();
          expect(inference, isNot(equals(null)), reason: "Rhino returned wrong inference for ${language} ${contextName}");
          expect(inference?.isUnderstood, equals(true), reason: "Rhino returned wrong inference for ${language} ${contextName}");
          expect(inference?.intent, equals(expectedInference['intent']), reason: "Rhino returned wrong inference for ${language} ${contextName}");
          expect(inference?.slots, equals(expectedInference['slots']), reason: "Rhino returned wrong inference for ${language} ${contextName}");
        }
      });

testWidgets('Test out_of_context all languages',
      (tester) async {
        for (int t = 0; t < testData['tests']['out_of_context'].length; t++) {
          String language = testData['tests']['out_of_context'][t]['language'];
          String contextName = testData['tests']['out_of_context'][t]['context_name'];

          String contextPath = "assets/test_resources/context_files/${contextName}_${platform}.rhn";
          String modelPath = "assets/test_resources/model_files/rhino_params${language != "en" ? "_${language}" : ""}.pv";

          Rhino rhino;
          try {
             rhino = await Rhino.create(
              accessKey,
              contextPath,
              modelPath: modelPath);
          } on RhinoException catch (ex) {
            expect(ex, equals(null), reason: "Failed to initialize Rhino for ${language}: ${ex}");
            return;
          }

          String audioPath = "assets/test_resources/audio_samples/test_out_of_context${language != "en" ? "_${language}" : ""}.wav";
          List<int> pcm = await loadAudioFile(audioPath);

          RhinoInference? inference;
          final int frameLength = rhino.frameLength;
          for (int i = 0; i < (pcm.length - frameLength); i += frameLength) {
            inference = await rhino.process(pcm.sublist(i, i + frameLength));
            if (inference.isFinalized) {
              break;
            }
          }

          rhino.delete();
          expect(inference, isNot(equals(null)), reason: "Rhino returned wrong inference for ${language} ${contextName}");
          expect(inference?.isUnderstood, equals(false), reason: "Rhino returned wrong inference for ${language} ${contextName}");
        }
      });
  });
}
