import * as React from "react";
import { getSVGIcon } from "../resources";
import { SVGImageIcon } from "./icons";

export class MinimizablePanelView extends React.Component<{}, {}> {
  public render() {
    return <div className="minimizable-panel-view">{this.props.children}</div>;
  }
}

export interface MinimizablePaneProps {
  title: string;
  scroll?: boolean;
  height?: number;
  maxHeight?: number;
  hideHeader?: boolean;
  defaultMinimized?: boolean;
}

export interface MinimizablePaneState {
  minimized: boolean;
}

export class MinimizablePane extends React.Component<
  MinimizablePaneProps,
  MinimizablePaneState
> {
  constructor(props: MinimizablePaneProps) {
    super(props);
    this.state = {
      minimized: props.defaultMinimized || false
    };
  }
  public renderHeader() {
    if (this.props.hideHeader) {
      return null;
    }
    return (
      <div
        className="header"
        onClick={() => this.setState({ minimized: !this.state.minimized })}
      >
        <SVGImageIcon
          url={getSVGIcon(
            this.state.minimized ? "general/plus" : "general/minus"
          )}
        />
        <span className="title">{this.props.title}</span>
      </div>
    );
  }
  public render() {
    if (this.state.minimized) {
      return <div className="minimizable-pane">{this.renderHeader()}</div>;
    } else {
      if (this.props.scroll) {
        if (this.props.height != null) {
          return (
            <div className="minimizable-pane minimizable-pane-scrollable">
              {this.renderHeader()}
              <div
                className="content"
                style={{ height: this.props.height + "px" }}
              >
                {this.props.children}
              </div>
            </div>
          );
        } else if (this.props.maxHeight != null) {
          return (
            <div className="minimizable-pane minimizable-pane-scrollable">
              {this.renderHeader()}
              <div
                className="content"
                style={{ maxHeight: this.props.maxHeight + "px" }}
              >
                {this.props.children}
              </div>
            </div>
          );
        } else {
          return (
            <div className="minimizable-pane minimizable-pane-scrollable minimizable-pane-autosize">
              {this.renderHeader()}
              <div className="content" style={{ flex: "1 1" }}>
                {this.props.children}
              </div>
            </div>
          );
        }
      } else {
        return (
          <div className="minimizable-pane">
            {this.renderHeader()}
            <div className="content">{this.props.children}</div>
          </div>
        );
      }
    }
  }
}
