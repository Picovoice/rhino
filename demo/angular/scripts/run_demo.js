const child_process = require("child_process");
const fs = require("fs");
const path = require("path");
const testData = require("../../../resources/.test/test_data.json");

const availableLanguages = testData["tests"]["within_context"].map(
  (x) => x["language"]
);

const args = process.argv.slice(2, -1);
const language = process.argv.slice(-1)[0];

if (!availableLanguages.includes(language)) {
  console.error(
    `Choose the language you would like to run the demo in with "yarn start [language]".\nAvailable languages are ${availableLanguages.join(
      ", "
    )}`
  );
  process.exit(1);
}

const context = testData["tests"]["within_context"].find(
  (x) => x["language"] === language
)["context_name"];
const contextFileName = `${context}_wasm.rhn`;


const version = process.env.npm_package_version;
const suffix = language === "en" ? "" : `_${language}`;
const rootDir = path.join(__dirname, "..", "..", "..");

const contextDir = path.join(rootDir, "resources", `contexts${suffix}`, "wasm");

const libDirectory = path.join(__dirname, "..", "src", "lib");
let outputDirectory = path.join(__dirname, "..", "src", "assets", "contexts");
if (fs.existsSync(outputDirectory)) {
  fs.readdirSync(outputDirectory).forEach((f) => {
    fs.unlinkSync(path.join(outputDirectory, f));
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
  path.join(libDirectory, "rhinoContext.js"),
  `const rhinoContext = {
  publicPath: "assets/contexts/${contextFileName}",
  customWritePath: "${version}_${contextFileName}",
};

(function () {
  if (typeof module !== "undefined" && typeof module.exports !== "undefined")
    module.exports = rhinoContext;
})();`
);

const modelDir = path.join(rootDir, "lib", "common");

outputDirectory = path.join(__dirname, "..", "src", "assets", "models");
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
  path.join(libDirectory, "rhinoModel.js"),
  `const rhinoModel = {
  publicPath: "assets/models/${modelName}",
  customWritePath: "${version}_${modelName}",
};

(function () {
  if (typeof module !== "undefined" && typeof module.exports !== "undefined")
    module.exports = rhinoModel;
})();`
);

const command = (process.platform === "win32") ? "npx.cmd" : "npx";

child_process.execSync(`${command} ng ${args.join(" ")}`, {
  shell: true,
  stdio: 'inherit'
});
