"use strict";

import { Config, ConfigOptions } from "karma";

// const webpackConfig = require("./webpack.config.test.js");
const tsconfig = require("./tsconfig.test.json");

const testRecursivePath = "src/tests/unit/*.test.ts";
const srcOriginalRecursivePath = "src/**/*.ts";

const styles = [".dist\\styles\\app.css", ".\\dist\\styles\\page.css"];

process.env.CHROME_BIN = require("puppeteer").executablePath();

module.exports = (config: Config) => {
  config.set({
    mode: "development",
    browserNoActivityTimeout: 100000,
    browsers: ["Chrome"],
    colors: true,
    frameworks: ["mocha"],
    reporters: ["mocha"],
    singleRun: true,
    autoWatch: true,
    plugins: [
      require.resolve("karma-coverage"),
      require.resolve("karma-typescript"),
      require.resolve("karma-webpack"),
      require.resolve("karma-mocha"),
      require.resolve("karma-mocha-reporter"),
      require.resolve("karma-sourcemap-loader"),
      require.resolve("karma-chrome-launcher"),
    ],
    files: [
      {
        pattern: "./capabilities.json",
        watched: false,
        served: true,
        included: false,
      },
      testRecursivePath,
      ...styles,
      {
        pattern: srcOriginalRecursivePath,
        included: false,
        served: true,
      },
    ],
    preprocessors: {
      [testRecursivePath]: ["webpack"],
    },
    typescriptPreprocessor: {
      options: tsconfig.compilerOptions,
    },
    karmaTypescriptConfig: {
      compilerOptions: tsconfig.compilerOptions,
    },
    mime: {
      "text/x-typescript": ["ts", "tsx"],
    },
    // webpack: webpackConfig,
    // webpackMiddleware: {
    //   stats: "errors-only",
    // },
  } as ConfigOptions);
};
