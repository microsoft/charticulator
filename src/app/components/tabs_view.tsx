// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as React from "react";
import { SVGImageIcon } from "./icons";
import { classNames } from "../utils";

export interface TabsViewProps {
  tabs: { name: string; label: string; icon?: string }[];
  currentTab: string;
  onSelect: (tabName: string) => void;
}

export class TabsView extends React.Component<
  TabsViewProps,
  Record<string, unknown>
> {
  public render() {
    return (
      <div className="charticulator__tabs-view">
        <div className="charticulator__tabs-view-tabs">
          {this.props.tabs.map((tab) => (
            <span
              key={tab.name}
              className={classNames("charticulator__tabs-view-tab", [
                "is-active",
                this.props.currentTab == tab.name,
              ])}
              onClick={() => this.props.onSelect(tab.name)}
            >
              {tab.icon ? <SVGImageIcon url={tab.icon} /> : null}
              <span className="el-label">{tab.label}</span>
            </span>
          ))}
        </div>
      </div>
    );
  }
}
