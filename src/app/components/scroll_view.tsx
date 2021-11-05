// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import * as React from "react";
import * as Hammer from "hammerjs";

// eslint-disable-next-line
export interface ScrollViewProps {}

export interface ScrollViewState {
  height: number;
  position: number;
}

export class ScrollView extends React.Component<
  ScrollViewProps,
  ScrollViewState
> {
  public refs: {
    container: HTMLDivElement;
  };

  public hammer: HammerManager;

  public componentDidMount() {
    this.hammer = new Hammer(this.refs.container);
    // eslint-disable-next-line
    this.hammer.on("panstart", () => {});
  }

  public componentWillUnmount() {
    this.hammer.destroy();
  }

  public render() {
    return (
      <div className="scroll-view" ref="container">
        <div className="scroll-view-content">{this.props.children}</div>
        <div className="scroll-bar">
          <div className="scroll-bar-handle" />
        </div>
      </div>
    );
  }
}
