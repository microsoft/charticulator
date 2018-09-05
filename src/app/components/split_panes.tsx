/*
Copyright (c) Microsoft Corporation. All rights reserved.
Licensed under the MIT license.
*/
import * as React from "react";

export interface SplitPaneViewProps {}

export interface SplitPaneViewState {}

export class HorizontalSplitPaneView extends React.Component<
  SplitPaneViewProps,
  SplitPaneViewState
> {
  public render() {
    return (
      <div className="split-pane-view-horizontal">
        <div className="row">
          {React.Children.map(this.props.children, (child, index) => (
            <div className="pane">{child}</div>
          ))}
        </div>
      </div>
    );
  }
}
