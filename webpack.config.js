const webpack = require("webpack");
const childProcess = require("child_process");
const { version } = require("./package.json");

let revision = "unknown";
try {
  revision = childProcess
    .execSync("git rev-parse HEAD")
    .toString()
    .trim();
} catch (e) { }

module.exports = (env, { mode }) => {
  if (mode == null) {
    mode = "production";
  }
  const plugins = [
    new webpack.DefinePlugin({
      CHARTICULATOR_PACKAGE: JSON.stringify({
        version,
        revision,
        buildTimestamp: new Date().getTime()
      }),
      "process.env": {
        NODE_ENV: JSON.stringify(mode)
      }
    })
  ];
  return [
    {
      // devtool: "eval",
      entry:
        mode == "production"
          ? {
            app: "./dist/scripts/app/index.js"
          }
          : {
            app: "./dist/scripts/app/index.js",
            test: "./dist/scripts/tests/test_app/index.js"
          },
      output: {
        filename: "[name].bundle.js",
        path: __dirname + "/dist/scripts",
        // Export the app as a global variable "Charticulator"
        libraryTarget: "var",
        library: "Charticulator"
      },
      module: {
        rules: [
          {
              test: /\.(woff|ttf|ico|woff2|jpg|jpeg|png|webp|svg)$/i,
              use: [
                  {
                      loader: require.resolve('url-loader'),
                      options: {
                        esModule: false,
                        limit: 65536
                      }
                  }
              ]
          }
        ]
      },
      resolve: {
        alias: {
          resources: __dirname + "/resources"
        }
      },
      plugins
    },
    {
      // devtool: "eval",
      entry: {
        about: "./dist/scripts/about.js"
      },
      output: {
        filename: "[name].bundle.js",
        path: __dirname + "/dist/scripts"
      },
      plugins
    },
    {
      entry: {
        worker: "./dist/scripts/worker/worker_main.js"
      },
      output: {
        filename: "[name].bundle.js",
        path: __dirname + "/dist/scripts"
      },
      resolve: {
        alias: {
          resources: __dirname + "/resources"
        }
      },
      plugins
    },
    {
      entry: {
        container: "./dist/scripts/container/index.js"
      },
      module: {
        rules: [
          {
              test: /\.(woff|ttf|ico|woff2|jpg|jpeg|png|webp|svg)$/i,
              use: [
                  {
                      loader: require.resolve('url-loader'),
                      options: {
                        esModule: false,
                        limit: 65536
                      }
                  }
              ]
          }
        ]
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
          resources: __dirname + "/resources",
          react: "preact-compat",
          "react-dom": "preact-compat",
          // Not necessary unless you consume a module using `createClass`
          "create-react-class": "preact-compat/lib/create-react-class",
          // Not necessary unless you consume a module requiring `react-dom-factories`
          "react-dom-factories": "preact-compat/lib/react-dom-factories"
        }
      },
      plugins
    }
  ];
};
