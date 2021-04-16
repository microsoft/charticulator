// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import * as React from "react";

// eslint-disable-next-line
export interface SplitPaneViewProps {}

// eslint-disable-next-line
export interface SplitPaneViewState {}

export class HorizontalSplitPaneView extends React.Component<
  SplitPaneViewProps,
  SplitPaneViewState
> {
  public render() {
    return (
      <div className="split-pane-view-horizontal">
        <div className="row">
          {React.Children.map(this.props.children, (child) => (
            <div className="pane">{child}</div>
          ))}
        </div>
      </div>
    );
  }
}
