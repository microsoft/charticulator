// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import { expect } from "chai";
import { Application } from "../../app";
import { initialize } from "./../../core";
import { createWorker } from "./mock";
import * as TestRenderer from "react-test-renderer";

// let workerBundleJs = require("raw-loader!);

describe("Plot segment", () => {
  // The directory containing test cases
  before(async () => {
    await initialize();
  });

  it("binding data to axis adds property", (done) => {
    let renderedRoot: TestRenderer.ReactTestRenderer = null;
    const create = TestRenderer.create;
    // TODO handle call of render

    (global as any).window = {};
    const worker = createWorker();
    const application = new Application();
    application.injectRender((el) => {
      renderedRoot = create(el);
    });
    application.initialize(CHARTICULATOR_CONFIG, "container", worker);

    done();
  }).timeout(10000);
});
