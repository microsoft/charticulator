const fs = require("fs-extra");
const jsyaml = require("js-yaml");
const multirun = require("multirun");

function yamlToJSON(yamlFile, jsonFile) {
    return fs.readFile(yamlFile).then((contents) => {
        let doc = jsyaml.safeLoad(contents);
        let json = JSON.stringify(doc);
        return fs.writeFile(jsonFile, new Buffer(json, "utf-8"));
    });
}

function yamlToJavaScript(yamlFile, javascriptFile, variableName, addlConfig = {}) {
    return fs.readFile(yamlFile).then((contents) => {
        let doc = {
            ...(jsyaml.safeLoad(contents)),
            ...addlConfig
        };
        let json = JSON.stringify(doc);
        let javascript = `var ${variableName} = ${json};\n`;
        return fs.writeFile(javascriptFile, new Buffer(javascript, "utf-8"));
    });
}

function copyFolder(folder1, folder2) {
    if (fs.existsSync(folder1)) {
        fs.copy(folder1, folder2);
    }
}

const isProd = process.env.NODE_ENV === 'production';

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
    config: () => {
        let mixin = {};
        if (fs.existsSync('datasets/files.json')) {
            mixin.SampleDatasets = JSON.parse(fs.readFileSync('datasets/files.json'));
            mixin.SampleDatasets.forEach(dataset => {
                dataset.tables.forEach(table => {
                    table.url = 'datasets/' + table.url;
                });
            });
        }
        yamlToJavaScript("config.yml", "dist/data/config.js", "CHARTICULATOR_CONFIG", mixin)
    },

    // Compile sass files
    sass: [
        "node-sass sass/app.scss -o dist/styles",
        "node-sass sass/page.scss -o dist/styles"
    ],

    // Compile the PEGJS parser
    pegjs: [
        "pegjs --format commonjs --allowed-start-rules start -o dist/scripts/core/expression/parser.js src/core/expression/parser.pegjs",
    ],

    // Compile TypeScript
    typescript: "tsc",

    // Produce webpack bundles
    webpack: "webpack --mode=" + (isProd ? "production" : "development"),

    server: "http-server ./dist -a 127.0.0.1 -p 4000 -c-1 -s",
    public_server: "http-server ./dist -a 0.0.0.0 -p 4000 -c-1 -s",
    watch: [
        "tsc -w",
        "webpack -w --mode=" + (isProd ? "production" : "development"),
        "node-sass --watch sass/app.scss sass/page.scss -o dist/styles",
        () => multirun.run(COMMANDS["server"])
    ]
};

// Execute the specified commands, with no args, run the default sequence
let sequence = process.argv.slice(2);
if (sequence.length == 0) {
    sequence = ["cleanup", "makedirs", "copy", "third_party_data", "config", "pegjs", "typescript", "sass", "webpack"];
}
multirun.runCommands(COMMANDS, sequence, "Build");