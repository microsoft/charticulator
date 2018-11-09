const fs = require("fs-extra");
const jsyaml = require("js-yaml");
const multirun = require("multirun");
const path = require("path");
const crypto = require("crypto");

let isProd = false;
let sequence = [];
process.argv.slice(2).forEach(arg => {
  const m = arg.match(/^--([0-9a-zA-Z]+)\=(.*)$/);
  if (m) {
    const name = m[1],
      value = m[2];
    if (name == "mode") {
      isProd = value == "production";
    }
  } else {
    sequence.push(arg);
  }
});

function digestFile(path) {
  const contents = fs.readFileSync(path);
  return crypto
    .createHash("sha256")
    .update(contents)
    .digest();
}

async function addHASHToHTMLs() {
  // Append hash to html scripts
  const htmls = ["dist/index.html", "dist/about.html"];
  for (const html of htmls) {
    let contents = await fs.readFile(html, "utf-8");
    contents = contents.replace(
      /(src|href)\=['"](.*?\.(js|css))(\?[^\"]+)?['"]/g,
      (m, kind, relpath) => {
        const digest = digestFile(path.join(path.dirname(html), relpath));
        const hexDigest = digest.toString("hex");
        const base64Digest = digest.toString("base64");
        return `${kind}="${relpath}?sha256=${hexDigest}" integrity="sha256-${base64Digest}"`;
      }
    );
    await fs.writeFile(html, contents, "utf-8");
  }
}

async function fixDTSBundle(filename) {
  let contents = await fs.readFile(filename, "utf-8");
  // Single file imports causes errors
  contents = contents.replace(/import +\".*?\";/g, "");
  await fs.writeFile(filename, contents, "utf-8");
}

/** Convert a YAML file to JSON */
async function yamlToJSON(yamlFile, jsonFile) {
  const contents = await fs.readFile(yamlFile);
  let doc = jsyaml.safeLoad(contents);
  let json = JSON.stringify(doc);
  await fs.writeFile(jsonFile, Buffer.from(json, "utf-8"));
}

/** Convert a YAML file to JavaScript variable */
async function yamlToJavaScript(yamlFile, javascriptFile, variableName, mixin) {
  const contents = await fs.readFile(yamlFile);
  let doc = jsyaml.safeLoad(contents);
  if (mixin != undefined) {
    mixin(doc);
  }
  let json = JSON.stringify(doc);
  let javascript = `var ${variableName} = ${json};\n`;
  await fs.writeFile(javascriptFile, Buffer.from(javascript, "utf-8"));
}

/** Copy folder1 to folder2 */
async function copyFolder(folder1, folder2) {
  if (await fs.exists(folder1)) {
    await fs.copy(folder1, folder2);
  }
}

// The default dev sequence
const devSequence = [
  "cleanup",
  "makedirs",
  "copy",
  "third_party_data",
  "pegjs",
  "typescript",
  "dtsBundle",
  "sass",
  "webpack",
  "config",
  ...(isProd ? ["add_hash"] : [])
];

let COMMANDS = {
  // Remove the entire build directory
  cleanup: () => fs.remove("dist"),

  // Create necessary directories
  makedirs: [
    () => fs.mkdirs("dist/styles"),
    () => fs.mkdirs("dist/data"),
    () => fs.mkdirs("dist/scripts/core/expression")
  ],

  dtsBundle: [
    "dts-bundle --name CharticulatorContainer --main dist/scripts/container/index.d.ts --baseDir dist/scripts --out ../../dist/scripts/container.bundle.d.ts",
    () => fixDTSBundle("dist/scripts/container.bundle.d.ts"),
    "dts-bundle --name Charticulator --main dist/scripts/app/index.d.ts --baseDir dist/scripts --out ../../dist/scripts/app.bundle.d.ts",
    () => fixDTSBundle("dist/scripts/app.bundle.d.ts")
  ],

  // Copy files
  copy: [
    () =>
      fs.copy(
        "src/core/expression/parser.d.ts",
        "dist/scripts/core/expression/parser.d.ts"
      ),

    // Copy all of the public files
    isProd
      ? () => copyFolder("./public", "./dist")
      : [
          () => copyFolder("./public", "./dist"),
          () => copyFolder("./public_test", "./dist")
        ],

    // Copy all of the extensions
    () => copyFolder("./extensions", "./dist/extensions"),

    // Copy all of the datasets
    () => copyFolder("./datasets", "./dist/datasets")
  ],

  // Convert the THIRD_PARTY.yml to json
  third_party_data: () =>
    yamlToJSON("THIRD_PARTY.yml", "dist/data/THIRD_PARTY.json"),

  // Convert the config.yml to config.js
  config: async () => {
    let mixin = doc => {
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
      if (isProd && doc.Extensions) {
        for (let item of doc.Extensions) {
          if (item.script) {
            const digest = digestFile(path.join("dist", item.script));
            item.script = {
              src: item.script,
              integrity: "sha256-" + digest.toString("base64"),
              sha256: digest.toString("hex")
            };
          }
        }
      }
      doc.WorkerURL = "./scripts/worker.bundle.js";
      if (isProd) {
        const digest = digestFile(path.join("dist", doc.WorkerURL));
        doc.WorkerURL += "?sha256=" + digest.toString("hex");
      }
      doc.ContainerURL = "./scripts/container.bundle.js";
      if (isProd) {
        const digest = digestFile(path.join("dist", doc.ContainerURL));
        doc.ContainerURL += "?sha256=" + digest.toString("hex");
      }
    };
    await yamlToJavaScript(
      "config.yml",
      "dist/data/config.js",
      "CHARTICULATOR_CONFIG",
      mixin
    );
  },

  // Compile sass files
  sass: {
    app: "node-sass sass/app.scss -o dist/styles",
    page: "node-sass sass/page.scss -o dist/styles"
  },

  // Compile the PEGJS parser
  pegjs:
    "pegjs --format commonjs --allowed-start-rules start,start_text -o dist/scripts/core/expression/parser.js src/core/expression/parser.pegjs",

  // Compile TypeScript
  typescript: "tsc",

  // Produce webpack bundles
  webpack: "webpack --mode=" + (isProd ? "production" : "development"),

  // Add ?sha256=... and integrity tags to script and css
  add_hash: () => addHASHToHTMLs(),

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
if (sequence.length == 0) {
  sequence = devSequence;
}
runCommands(sequence).catch(e => {
  console.log(e.message);
  process.exit(-1);
});
