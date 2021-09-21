const path = require('path');
const webpack = require("webpack");
const childProcess = require("child_process");
const { version } = require("./package.json");
const tsconfig = require("./tsconfig.test.json");

let revision = "unknown";
try {
  revision = childProcess
    .execSync("git rev-parse HEAD")
    .toString()
    .trim();
} catch (e) { }

module.exports = (env, { mode }) => {
  if (mode == null) {
    mode = "development";
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
  return {
    entry: {
      app: "./src/tests/karma/application_ui.test.ts",
    },
    output: {
      path: __dirname + "/dist/scripts",
    },
    module: {
      rules: [
        {
          test: /\.ya?ml$/,
          loader: 'js-yaml-loader'
        },
        {
          test: /\.pegjs$/,
          loader: 'pegjs-loader',
          options: {
            allowedStartRules: ["start", "start_text"],
            cache: true,
            optimize: "size"
          }
        },
        {
          test: /(\.ts)x|\.ts$/,
          use: [
            {
              loader: require.resolve('babel-loader')
            },
            {
              loader: require.resolve('ts-loader'),
              options: {
                transpileOnly: false,
                experimentalWatchApi: false,
                compilerOptions: tsconfig.compilerOptions
              }
            }
          ]
        },
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
        resources: path.resolve(__dirname, './resources'),
      },
      extensions: ['.tsx', '.ts', '.jsx', '.js', '.css', 'svg']
    },
    plugins
  }
};
