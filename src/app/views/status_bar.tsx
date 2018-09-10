// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import * as React from "react";
import { timeFormat } from "d3-time-format";
import { MainStore } from "../stores";
import { EventSubscription } from "../../core";

export interface StatusBarProps {
  store: MainStore;
}

export interface StatusBarState {
  [name: string]: string;
}

export class StatusBar extends React.Component<StatusBarProps, StatusBarState> {
  public token: EventSubscription;

  constructor(props: StatusBarProps) {
    super(props);
    this.state = this.props.store.statusBar;
  }

  public componentDidMount() {
    this.token = this.props.store.addListener(MainStore.EVENT_STATUSBAR, () => {
      this.setState(this.props.store.statusBar);
    });
  }

  public componentWillUnmount() {
    this.token.remove();
  }

  public render() {
    const keysvalues = [
      ["ChartSolver", "chartSolver"],
      ["MarkSolver", "markSolver"]
    ];
    const status = this.state;
    const components: string[] = [];
    for (const [k, v] of keysvalues) {
      if (status.hasOwnProperty(v) && status[v] != "") {
        components.push(`${k}: ${status[v]}`);
      }
    }
    components.unshift(
      `Build: ${timeFormat("%b %d, %Y %H:%M:%S")(
        new Date(CHARTICULATOR_PACKAGE.buildTimestamp)
      )}`
    );
    components.unshift(
      `Revision: ${CHARTICULATOR_PACKAGE.revision.substr(0, 8)}`
    );
    components.unshift(`Version: ${CHARTICULATOR_PACKAGE.version}`);
    return (
      <div className="statusbar">
        {components.map((x, i) => (
          <span className="item" key={`m${i}`}>
            {x}
          </span>
        ))}
      </div>
    );
  }
}
