var fs = require("fs")

source_directory = "./models"
output_directory = "./src/picovoice"

// Convert all WASM RHN binary model files to base64 strings; add a little JavaScript to export them
let filenames = fs.readdirSync(source_directory)
filenames.forEach(function (filename) {
  model = fs.readFileSync(`${source_directory}/${filename}`)
  let strBase64 = Buffer.from(model).toString("base64")
  let name = filename.slice(0, -4)
  let type = filename.slice(-3)
  if (type === "ppn"){
    let jsOutput = `export const ${name.toUpperCase()}_64 = '${strBase64}'`
    fs.writeFileSync(`${output_directory}/${name}_64.js`, jsOutput)
  } else if (type === "rhn"){
    let jsOutput = `export const ${name.toUpperCase()}_CONTEXT = '${strBase64}'`
    fs.writeFileSync(`${output_directory}/${name}_context.js`, jsOutput)
  }
  
})
