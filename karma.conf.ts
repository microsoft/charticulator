"use strict";

import { Config, ConfigOptions } from "karma";

const tsconfig = require("./tsconfig.test.json");

const testRecursivePath = "./src/tests/unit/*.test.ts";

const styles = ["./dist/styles/app.css", "./dist/styles/page.css"];

process.env.CHROME_BIN = require("puppeteer").executablePath();

module.exports = (config: Config) => {
  config.set({
    mode: "development",
    browserNoActivityTimeout: 100000,
    browsers: ["Chrome"],
    colors: true,
    frameworks: ["mocha", "karma-typescript"],
    reporters: ["mocha"],
    singleRun: false,
    autoWatch: true,
    plugins: [
      require.resolve("karma-coverage"),
      require.resolve("karma-typescript"),
      require.resolve("karma-mocha"),
      require.resolve("karma-mocha-reporter"),
      require.resolve("karma-sourcemap-loader"),
      require.resolve("karma-chrome-launcher"),
    ],
    files: [
      {
        pattern: "./dist/scripts/config.json",
        watched: false,
        served: true,
        included: false,
      },
      "./dist/scripts/app.bundle.js",
      "./dist/scripts/worker.bundle.js",
      testRecursivePath,
      ...styles,
    ],
    preprocessors: {
      "./src/tests/**/*.ts": ["karma-typescript"],
    },
    karmaTypescriptConfig: {
      ...tsconfig,
    },
    mime: {
      "text/x-typescript": ["ts", "tsx"],
    },
  } as ConfigOptions);
};
