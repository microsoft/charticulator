// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import * as React from "react";
import * as ReactDOM from "react-dom";

import { CharticulatorCoreConfig, initialize } from "../../core";
import { popupController } from "../../app/globals";
import { PopupContainer } from "../../app/controllers";

const registeredTests: Array<{
  name: string;
  component: React.ComponentClass;
}> = [];
function registerTest(name: string, component: React.ComponentClass) {
  registeredTests.push({ name, component });
}

export interface TestApplicationViewState {
  currentTest: string;
}

export class TestApplicationView extends React.Component<
  {},
  TestApplicationViewState
> {
  public state: TestApplicationViewState = this.getDefaultState();

  public getDefaultState(): TestApplicationViewState {
    let currentTest = "";
    if (document.location.hash.startsWith("#!")) {
      currentTest = document.location.hash.slice(2);
    }
    return { currentTest };
  }

  public render() {
    let TestComponent = null;
    for (const c of registeredTests) {
      if (c.name == this.state.currentTest) {
        TestComponent = c.component;
      }
    }
    return (
      <div>
        <div
          style={{
            padding: "10px",
            borderBottom: "1px solid #CCC",
            marginBottom: "10px",
          }}
        >
          {"Select Test: "}
          <select
            value={this.state.currentTest || ""}
            onChange={(e) => {
              if (e.target.value == "") {
                document.location.hash = "";
              } else {
                document.location.hash = "#!" + e.target.value;
              }
              this.setState({ currentTest: e.target.value });
            }}
          >
            <option value="">(no test selected)</option>
            {registeredTests.map((test) => (
              <option key={test.name} value={test.name}>
                {test.name}
              </option>
            ))}
          </select>
        </div>
        <div style={{ padding: "10px" }}>
          {TestComponent ? <TestComponent /> : null}
          <PopupContainer controller={popupController} />
        </div>
      </div>
    );
  }
}

export class TestApplication {
  public initialize(config: CharticulatorCoreConfig, containerID: string) {
    return initialize(config).then(() => {
      ReactDOM.render(
        <TestApplicationView />,
        document.getElementById(containerID)
      );
    });
  }
}

require("./graphics").register(registerTest);
require("./color_picker").register(registerTest);
