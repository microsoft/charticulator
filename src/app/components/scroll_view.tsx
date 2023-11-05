// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import * as React from "react";
import { default as Hammer } from "hammerjs";
import { noop } from "../utils/noop";

export interface ScrollViewState {
  height: number;
  position: number;
}

export class ScrollView extends React.Component<
  React.PropsWithChildren<Record<string, unknown>>,
  ScrollViewState
> {
  public refs: {
    container: HTMLDivElement;
  };

  public hammer: HammerManager;

  public componentDidMount() {
    this.hammer = new Hammer(this.refs.container);
    this.hammer.on("panstart", noop);
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
