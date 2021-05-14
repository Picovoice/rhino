import fs, { readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

console.log("Converting .rhn wasm file(s) to base64 ...");

const __dirname = dirname(fileURLToPath(import.meta.url));

const rhnContextDirectoryWasm = join(
  __dirname,
  "..",
  "..",
  "..",
  "resources",
  "contexts",
  "wasm"
);

const outputDirectory = join(__dirname, "..", "src", "dist");
fs.mkdirSync(outputDirectory, { recursive: true });

const contextName = "clock";

const rhnModel = readFileSync(
  join(rhnContextDirectoryWasm, `${contextName}_wasm.rhn`)
);
const strBase64 = Buffer.from(rhnModel).toString("base64");
const jsSourceFileOutput = `export const ${contextName.toUpperCase()}_EN_64 = "${strBase64}"\n`;

writeFileSync(
  join(outputDirectory, `rhn_contexts_base64.ts`),
  jsSourceFileOutput
);

console.log("Done!");
