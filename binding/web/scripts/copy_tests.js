import fs from "fs";
import ncp from "ncp";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

for (const language of ["en"]) {
  for (const flavour of ["factory"]) {
    console.log(`Template: ${language} ${flavour}`);

    const projectRootPath = join(__dirname, "..");
    const testFile = join(projectRootPath, "tests", `${language}-${flavour}`);
    const projectLocation = join(
      projectRootPath,
      `rhino-web-${language}-${flavour}`,
      "test"
    );

    // 1 Create the output directory structure, if it doesn't exist
    fs.mkdirSync(projectLocation, { recursive: true });

    // 2. Copy test files into applicable project
    ncp(testFile, projectLocation, (err) => {
      if (err) {
        console.error(err);
      }
    });
  }
}
