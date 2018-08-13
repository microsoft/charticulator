const webpack = require('webpack');
const childProcess = require('child_process');
const { version } = require("./package.json");
const revision = childProcess.execSync('git rev-parse HEAD').toString().trim()

const plugins = [
    new webpack.DefinePlugin({
        CHARTICULATOR_PACKAGE: JSON.stringify({
            version,
            revision,
            buildTimestamp: new Date().getTime(),
        }),
        "process.env": {
            "NODE_ENV": JSON.stringify(process.env.NODE_ENV || "development") 
        }
    })
];

module.exports = [
    {
        // devtool: "eval",
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
        resolve: {
            alias: {
                "resources": __dirname + "/resources"
            }
        },
        plugins
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
        plugins
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
        plugins
    }
];