// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import * as React from "react";

export class HorizontalSplitPaneView extends React.Component<
  React.PropsWithChildren<Record<string, unknown>>,
  Record<string, unknown>
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
