import "package:path/path.dart";

import "dart:convert";
import "dart:io";

final String resourcePath =
    join(dirname(Platform.script.path), "..", "..", "..", "resources");
final String libPath =
    join(dirname(Platform.script.path), "..", "..", "..", "lib");
final String testDataPath = join(resourcePath, ".test", "test_data.json");

final String assetsPath = join(dirname(Platform.script.path), "..", "assets");
final String contextsPath = join(assetsPath, "contexts");
final String modelsPath = join(assetsPath, "models");

Future<Map> readJsonFile(String filePath) async {
  var input = await File(filePath).readAsString();
  var map = jsonDecode(input);
  return map;
}

void main(List<String> arguments) async {
  var testData = await readJsonFile(testDataPath);
  List<String> availableLanguages = List<String>.from(
      testData["tests"]["within_context"].map((x) => x["language"]).toList());

  if (arguments.isEmpty) {
    print(
        "Choose the language you would like to run the demo in with 'dart scripts/prepare_demo.dart [language]'.\n"
        "Available languages are ${availableLanguages.join(", ")}.");
    exit(1);
  }

  String language = arguments[0];
  String suffix = (language == "en") ? "" : "_$language";
  if (!availableLanguages.contains(language)) {
    print("'$language' is not an available demo language.\n"
        "Available languages are ${availableLanguages.join(", ")}.");
    exit(1);
  }

  String contextName = testData["tests"]["within_context"]
      .firstWhere((x) => x["language"] == language)["context_name"];

  var androidContextsDirSrc =
      Directory(join(resourcePath, "contexts$suffix", "android"));
  var iOSContextsDirSrc =
      Directory(join(resourcePath, "contexts$suffix", "ios"));

  var androidContextsDirDst = Directory(join(contextsPath, 'android'));
  if (androidContextsDirDst.existsSync()) {
    androidContextsDirDst.deleteSync(recursive: true);
  }
  androidContextsDirDst.createSync(recursive: true);

  var iOSContextsDirDst = Directory(join(contextsPath, 'ios'));
  if (iOSContextsDirDst.existsSync()) {
    iOSContextsDirDst.deleteSync(recursive: true);
  }
  iOSContextsDirDst.createSync(recursive: true);

  var modelDir = Directory(modelsPath);
  if (modelDir.existsSync()) {
    modelDir.deleteSync(recursive: true);
  }
  modelDir.createSync(recursive: true);

  var params = <String, String>{};
  params["language"] = language;
  params["context"] = contextName;

  File androidContextSrc =
      File(join(androidContextsDirSrc.path, "${contextName}_android.rhn"));
  androidContextSrc.copySync(
      join(androidContextsDirDst.path, basename(androidContextSrc.path)));

  File iOSContextSrc =
      File(join(iOSContextsDirSrc.path, "${contextName}_ios.rhn"));
  iOSContextSrc
      .copySync(join(iOSContextsDirDst.path, basename(iOSContextSrc.path)));

  if (language != "en") {
    File model = File(join(libPath, "common", "rhino_params$suffix.pv"));
    model.copySync(join(modelDir.path, basename(model.path)));
  }

  var encoded = json.encode(params);
  File f = File(join(assetsPath, "params.json"));
  f.writeAsStringSync(encoded);

  print("Demo is ready to run!");
}
