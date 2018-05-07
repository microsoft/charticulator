const webpack = require('webpack');
const yaml = require("js-yaml");
const fs = require("fs");

class Definitions {
    constructor(myName) {
        Object.defineProperty(this, 'CHARTICULATOR_PACKAGE', {
            enumerable: true,
            get: function () {
                let package_json = require("./package.json");
                let git_revision = require('child_process').execSync('git rev-parse HEAD').toString().trim()
                return JSON.stringify({
                    version: package_json.version,
                    buildTimestamp: new Date().getTime(),
                    revision: git_revision
                })
            }
        });
    }
}

module.exports = [
    {
        entry: {
            app: "./dist/scripts/app/index.js"
        },
        output: {
            filename: "[name].bundle.js",
            path: __dirname + "/dist/scripts",
            // Export the app as a global variable "Charticulator"
            libraryTarget: "var",
            library: "Charticulator"
        },
        externals: {
            // To switch to preact, comment the following 3 lines:
            "react": "React",
            "react-dom": "ReactDOM",
            "react-dom/server": "ReactDOMServer",
            "d3": "d3"
        },
        resolve: {
            alias: {
                "resources": __dirname + "/resources"
            }
        },
        plugins: [
            new webpack.DefinePlugin(new Definitions())
        ]
    },
    {
        entry: {
            worker: "./dist/scripts/worker/worker_main.js"
        },
        output: {
            filename: "[name].bundle.js",
            path: __dirname + "/dist/scripts",
        },
        resolve: {
            alias: {
                "resources": __dirname + "/resources"
            }
        },
        plugins: [
            new webpack.DefinePlugin(new Definitions())
        ]
    },
    {
        entry: {
            container: "./dist/scripts/container/container.js"
        },
        output: {
            filename: "[name].bundle.js",
            path: __dirname + "/dist/scripts",
            // Export the app as a global variable "Charticulator"
            libraryTarget: "var",
            library: "CharticulatorContainer"
        },
        resolve: {
            alias: {
                "resources": __dirname + "/resources"
            }
        },
        plugins: [
            new webpack.DefinePlugin(new Definitions())
        ]
    }
];