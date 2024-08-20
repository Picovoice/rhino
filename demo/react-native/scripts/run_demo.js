const child_process = require('child_process');
const fs = require('fs');
const path = require('path');
const testData = require('../../../resources/.test/test_data.json');

const availableLanguages = testData.tests.within_context.map((x) => x.language);

const args = process.argv.slice(2, -1);
const language = process.argv.slice(-1)[0];

if (!availableLanguages.includes(language)) {
  console.error(
    `Choose the language you would like to run the demo in with "yarn [android/ios]-run [language]".
Available languages are ${availableLanguages.join(', ')}`,
  );
  process.exit(1);
}

const suffix = language === 'en' ? '' : `_${language}`;
const rootDir = path.join(__dirname, '..', '..', '..');

const modelDir = path.join(rootDir, 'lib', 'common');
const contextDir = path.join(rootDir, 'resources', `contexts${suffix}`);

const androidAssetDir = path.join(
  __dirname,
  '..',
  'android',
  'rhino-rn-demo-app',
  'src',
  'main',
  'assets',
);

const iosBundleDir = path.join(__dirname, '..', 'ios', 'RhinoDemo');

fs.rmSync(path.join(androidAssetDir, 'models'), {
  recursive: true,
  force: true,
});
fs.rmSync(path.join(androidAssetDir, 'contexts'), {
  recursive: true,
  force: true,
});
fs.rmSync(path.join(iosBundleDir, 'models'), { recursive: true, force: true });
fs.rmSync(path.join(iosBundleDir, 'contexts'), {
  recursive: true,
  force: true,
});

fs.mkdirSync(path.join(androidAssetDir, 'models'), { recursive: true });
fs.mkdirSync(path.join(androidAssetDir, 'contexts'), { recursive: true });
fs.mkdirSync(path.join(iosBundleDir, 'models'), { recursive: true });
fs.mkdirSync(path.join(iosBundleDir, 'contexts'), { recursive: true });

let params = {
  language: language,
};

if (language !== 'en') {
  fs.copyFileSync(
    path.join(modelDir, `rhino_params${suffix}.pv`),
    path.join(androidAssetDir, 'models', `rhino_params${suffix}.pv`),
  );

  fs.copyFileSync(
    path.join(modelDir, `rhino_params${suffix}.pv`),
    path.join(iosBundleDir, 'models', `rhino_params${suffix}.pv`),
  );
}

for (const testParam of testData.tests.within_context) {
  if (testParam.language === language) {
    params.context = testParam.context_name;

    fs.copyFileSync(
      path.join(contextDir, 'android', `${params.context}_android.rhn`),
      path.join(androidAssetDir, 'contexts', `${params.context}_android.rhn`),
    );

    fs.copyFileSync(
      path.join(contextDir, 'ios', `${params.context}_ios.rhn`),
      path.join(iosBundleDir, 'contexts', `${params.context}_ios.rhn`),
    );
  }
}

fs.writeFileSync(
  path.join(__dirname, '..', 'params.json'),
  JSON.stringify(params),
);

const command = process.platform === 'win32' ? 'npx.cmd' : 'npx';

child_process.execSync(`${command} react-native ${args.join(' ')}`, {
  shell: true,
  stdio: 'inherit',
});
