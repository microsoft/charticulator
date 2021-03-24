"use strict";

import { Config, ConfigOptions } from "karma";
const path = require("path");

const tsconfig = require("./tsconfig.test.json");
const webpack = require("./webpack.config.test.js");
const testRecursivePath = "./tests/karma/**/*.ts";
const karmaSnapshotsDirectory = "tests/karma/__snapshots__/**/*.md";

const styles = ["../dist/styles/app.css", "../dist/styles/page.css"];

function resolve(basePath: string, suiteName: string) {
  return path.join(basePath, "tests/karma/__snapshots__", suiteName + ".md");
}

process.env.CHROME_BIN = require("puppeteer").executablePath();
const webpackConfig = webpack(undefined, { mode: "developement" });

module.exports = (config: Config) => {
  config.set({
    mode: "development",
    browserNoActivityTimeout: 100000,
    browsers: ["ChromeHeadless"],
    colors: true,
    frameworks: ["mocha", "webpack", "snapshot", "mocha-snapshot", "viewport"],
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
      require.resolve("karma-snapshot"),
      require.resolve("karma-mocha-snapshot"),
      require.resolve("karma-viewport"),
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
      karmaSnapshotsDirectory,
    ],
    preprocessors: {
      [testRecursivePath]: ["webpack"],
      [karmaSnapshotsDirectory]: ["snapshot"],
    },
    snapshot: {
      update: false,
      prune: false,
      checkSourceFile: false,
      pathResolver: resolve,
    },
    viewport: {},
    mochaReporter: {
      showDiff: true,
    },
    client: {
      mocha: {
        reporter: "html",
        ui: "bdd",
      },
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
