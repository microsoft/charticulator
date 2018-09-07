const fs = require("fs-extra");
const jsyaml = require("js-yaml");
const multirun = require("multirun");

/** Convert a YAML file to JSON */
function yamlToJSON(yamlFile, jsonFile) {
  return fs.readFile(yamlFile).then((contents) => {
    let doc = jsyaml.safeLoad(contents);
    let json = JSON.stringify(doc);
    return fs.writeFile(jsonFile, Buffer.from(json, "utf-8"));
  });
}

/** Convert a YAML file to JavaScript variable */
function yamlToJavaScript(yamlFile, javascriptFile, variableName, mixin) {
  return fs.readFile(yamlFile).then((contents) => {
    let doc = jsyaml.safeLoad(contents);
    if (mixin != undefined) {
      mixin(doc);
    }
    let json = JSON.stringify(doc);
    let javascript = `var ${variableName} = ${json};\n`;
    return fs.writeFile(javascriptFile, Buffer.from(javascript, "utf-8"));
  });
}

/** Copy folder1 to folder2 */
function copyFolder(folder1, folder2) {
  if (fs.existsSync(folder1)) {
    fs.copy(folder1, folder2);
  }
}

// Parse environment variable
const isProd = process.env.NODE_ENV === "production";

// The default dev sequence
const devSequence = ["cleanup", "makedirs", "copy", "third_party_data", "config", "pegjs", "typescript", "sass", "webpack"];

let COMMANDS = {

  // Remove the entire build directory
  cleanup: () => fs.remove("dist"),

  // Create necessary directories
  makedirs: [
    () => fs.mkdirs("dist/styles"),
    () => fs.mkdirs("dist/data"),
    () => fs.mkdirs("dist/scripts/core/expression")
  ],

  // Copy files
  copy: [
    () => fs.copy("src/core/expression/parser.d.ts", "dist/scripts/core/expression/parser.d.ts"),

    // Copy all of the public files
    () => copyFolder("./public", "./dist"),

    // Copy all of the extensions
    () => copyFolder("./extensions", "./dist/extensions"),

    // Copy all of the datasets
    () => copyFolder("./datasets", "./dist/datasets"),
  ],

  // Convert the THIRD_PARTY.yml to json
  third_party_data: () => yamlToJSON("THIRD_PARTY.yml", "dist/data/THIRD_PARTY.json"),

  // Convert the config.yml to config.js
  config: async () => {
    let mixin = (doc) => {
      if (fs.existsSync("datasets/files.json")) {
        let sampleDatasets = JSON.parse(fs.readFileSync("datasets/files.json"));
        sampleDatasets.forEach(dataset => {
          dataset.tables.forEach(table => {
            table.url = "datasets/" + table.url;
          });
        });
        if (doc.SampleDatasets) {
          doc.SampleDatasets = doc.SampleDatasets.concat(sampleDatasets);
        } else {
          doc.SampleDatasets = sampleDatasets;
        }
      }
    }
    await yamlToJavaScript("config.yml", "dist/data/config.js", "CHARTICULATOR_CONFIG", mixin);
  },

  // Compile sass files
  sass: {
    app: "node-sass sass/app.scss -o dist/styles",
    page: "node-sass sass/page.scss -o dist/styles"
  },

  // Compile the PEGJS parser
  pegjs: "pegjs --format commonjs --allowed-start-rules start,start_text -o dist/scripts/core/expression/parser.js src/core/expression/parser.pegjs",

  // Compile TypeScript
  typescript: "tsc",

  // Produce webpack bundles
  webpack: "webpack --mode=" + (isProd ? "production" : "development"),

  server: "http-server ./dist -a 127.0.0.1 -p 4000 -c-1 -s",
  public_server: "http-server ./dist -a 0.0.0.0 -p 4000 -c-1 -s",
  watch: {
    tsc: "tsc -w",
    webpack: "webpack -w --mode=" + (isProd ? "production" : "development"),
    sass: "node-sass --watch sass/app.scss sass/page.scss -o dist/styles",
    server: "http-server ./dist -a 127.0.0.1 -p 4000 -c-1 -s"
  },

  dev: () => runCommands(devSequence)
};

/** Run the specified commands names in sequence */
async function runCommands(sequence) {
  for (const cmd of sequence) {
    console.log("Build: " + cmd);
    await multirun.run(COMMANDS[cmd]);
  }
}

// Execute the specified commands, with no args, run the default sequence
let sequence = process.argv.slice(2);
if (sequence.length == 0) {
  sequence = devSequence;
}
runCommands(sequence).catch((e) => {
  console.log(e.message);
  process.exit(-1);
});