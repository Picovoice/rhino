var fs = require("fs")

source_directory = "./models"
output_directory = "./src/picovoice"

// Convert all WASM RHN binary model files to base64 strings; add a little JavaScript to export them
let filenames = fs.readdirSync(source_directory)
filenames.forEach(function (filename) {
  rhnModel = fs.readFileSync(`${source_directory}/${filename}`)
  let strBase64 = Buffer.from(rhnModel).toString("base64")
  let contextName = filename.slice(0, -4)
  let jsOutput = `export const ${contextName.toUpperCase()}_CONTEXT = '${strBase64}'`
  fs.writeFileSync(`${output_directory}/${contextName}_64.js`, jsOutput)
})
