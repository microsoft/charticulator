"use strict";

import { Config, ConfigOptions } from "karma";

const tsconfig = require("./tsconfig.test.json");
const webpack = require("./webpack.config.test.js");
const testRecursivePath = "./tests/karma/**/*.ts";

const styles = ["../dist/styles/app.css", "../dist/styles/page.css"];

process.env.CHROME_BIN = require("puppeteer").executablePath();
const webpackConfig = webpack(undefined, { mode: "developement" });

module.exports = (config: Config) => {
  config.set({
    mode: "development",
    browserNoActivityTimeout: 100000,
    browsers: ["ChromeHeadless"],
    colors: true,
    frameworks: ["mocha", "webpack"],
    reporters: ["mocha"],
    singleRun: true,
    autoWatch: true,
    plugins: [
      require.resolve("karma-coverage"),
      require.resolve("karma-typescript"),
      require.resolve("karma-mocha"),
      require.resolve("karma-mocha-reporter"),
      require.resolve("karma-sourcemap-loader"),
      require.resolve("karma-chrome-launcher"),
      require.resolve("karma-webpack"),
    ],
    basePath: __dirname + "/src",
    files: [
      {
        pattern: "../dist/scripts/config.json",
        watched: false,
        served: true,
        included: false,
      },
      testRecursivePath,
      ...styles,
    ],
    preprocessors: {
      [testRecursivePath]: ["webpack"],
    },
    typescriptPreprocessor: {
      ...tsconfig,
      options: tsconfig.compilerOptions,
    },
    mime: {
      "text/x-typescript": ["ts", "tsx"],
    },
    webpack: webpackConfig,
    webpackMiddleware: {
      stats: "errors-only",
    },
  } as ConfigOptions);
};
