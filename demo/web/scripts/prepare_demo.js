const fs = require("fs");
const path = require("path");
const testData = require("../../../resources/.test/test_data.json");

availableLanguages = testData["tests"]["within_context"].map(
  (x) => x["language"]
);

const language = process.argv.slice(2)[0];
if (language === "==") {
  console.error(`Choose the language you would like to run the demo in with "yarn start [language]". 
        Available languages are ${availableLanguages.join(", ")}`);
  process.exit(1);
}

if (!availableLanguages.includes(language)) {
  console.error(`'${language}' is not an available demo language. 
        Available languages are ${availableLanguages.join(", ")}`);
  process.exit(1);
}

const context = testData["tests"]["within_context"].find(
  (x) => x["language"] === language
)["context_name"];
const contextFileName = `${context}_wasm.rhn`;

const suffix = language === "en" ? "" : `_${language}`;
const rootDir = path.join(__dirname, "..", "..", "..");

const contextDir = path.join(rootDir, "resources", `contexts${suffix}`, "wasm");

let outputDirectory = path.join(__dirname, "..", "contexts");
if (fs.existsSync(outputDirectory)) {
  fs.readdirSync(outputDirectory).forEach((k) => {
    fs.unlinkSync(path.join(outputDirectory, k));
  });
} else {
  fs.mkdirSync(outputDirectory, { recursive: true });
}

try {
  fs.copyFileSync(
    path.join(contextDir, contextFileName),
    path.join(outputDirectory, contextFileName)
  );
} catch (error) {
  console.error(error);
  process.exit(1);
}

fs.writeFileSync(
  path.join(outputDirectory, "rhinoContext.js"),
  `const rhinoContext = {
  publicPath: "contexts/${contextFileName}",
  forceWrite: true,
};

(function () {
  if (typeof module !== "undefined" && typeof module.exports !== "undefined")
    module.exports = rhinoContext;
})();`
);

const modelDir = path.join(rootDir, "lib", "common");

outputDirectory = path.join(__dirname, "..", "models");
if (fs.existsSync(outputDirectory)) {
  fs.readdirSync(outputDirectory).forEach((k) => {
    fs.unlinkSync(path.join(outputDirectory, k));
  });
} else {
  fs.mkdirSync(outputDirectory, { recursive: true });
}

const modelName = `rhino_params${suffix}.pv`;
fs.copyFileSync(
  path.join(modelDir, modelName),
  path.join(outputDirectory, modelName)
);

fs.writeFileSync(
  path.join(outputDirectory, "rhinoModel.js"),
  `const rhinoModel = {
  publicPath: "models/${modelName}",
  forceWrite: true,
};

(function () {
  if (typeof module !== "undefined" && typeof module.exports !== "undefined")
    module.exports = rhinoModel;
})();`
);
