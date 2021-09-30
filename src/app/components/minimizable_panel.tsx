// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
/* eslint-disable @typescript-eslint/ban-types  */
/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/no-empty-interface */

import * as React from "react";
import { getSVGIcon } from "../resources";
import { SVGImageIcon } from "./icons";
import { ButtonFlat } from "./buttons";
import * as Hammer from "hammerjs";
import { classNames } from "../utils";
import { DefaultButton } from "@fluentui/react";
import { PanelHeaderStyles } from "../views/panels/widgets/controls/fluentui_customized_components";

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
  onMaximize?: () => void;
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
      minimized: props.defaultMinimized || false,
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
        <DefaultButton
          onClick={() => this.setState({ minimized: !this.state.minimized })}
          iconProps={{
            iconName: this.state.minimized ? "ChevronRight" : "ChevronDown",
            styles: {
              root: {
                fontSize: "unset",
                height: 12,
              },
            },
          }}
          styles={PanelHeaderStyles}
        />
        <span className="title">{this.props.title}</span>
        {this.props.onMaximize ? (
          <span className="buttons" onClick={(e) => e.stopPropagation()}>
            <ButtonFlat
              title="Show as separate window"
              url={getSVGIcon("general/popout")}
              onClick={() => this.props.onMaximize()}
            />
          </span>
        ) : null}
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

export interface FloatingPanelProps {
  title: string;
  onClose?: () => void;
  width?: number;
  height?: number;
  peerGroup: string;
  scroll?: boolean;
  floatInCenter?: boolean;
  closeButtonIcon?: string;
}
export interface FloatingPanelState {
  x: number;
  y: number;
  width: number;
  height: number;
  focus: boolean;
  minimized: boolean;
}
export class FloatingPanel extends React.Component<
  FloatingPanelProps,
  FloatingPanelState
> {
  protected refContainer: HTMLDivElement;
  protected refHeader: HTMLElement;
  protected refResizer: HTMLElement;

  public state: FloatingPanelState = this.getInitialState();

  public getInitialState(): FloatingPanelState {
    // Figure out a position that doesn't overlap with existing windows
    let initialX = 100;
    let initialY = 100;
    const width = this.props.width || 324;
    const height = this.props.height || 324;
    if (this.props.floatInCenter) {
      initialX = window.innerWidth / 2 - width / 2;
      initialY = window.innerHeight / 2 - height / 2;
    } else {
      // eslint-disable-next-line
      while (true) {
        let found = false;
        if (FloatingPanel.peerGroups.has(this.props.peerGroup)) {
          for (const peer of FloatingPanel.peerGroups.get(
            this.props.peerGroup
          )) {
            if (peer.state.x == initialX && peer.state.y == initialY) {
              found = true;
              break;
            }
          }
        }
        if (found && initialX < 400 && initialY < 400) {
          initialX += 50;
          initialY += 50;
        } else {
          break;
        }
      }
    }
    return {
      x: initialX,
      y: initialY,
      width,
      height,
      focus: false,
      minimized: false,
    };
  }

  protected hammer: HammerManager;

  protected static peerGroups = new Map<string, Set<FloatingPanel>>();

  public componentDidMount() {
    this.hammer = new Hammer.Manager(this.refContainer);
    this.hammer.add(new Hammer.Pan({ threshold: 0 }));
    this.hammer.on("panstart", (e) => {
      if (e.target == this.refHeader) {
        const x0 = this.state.x - e.deltaX;
        const y0 = this.state.y - e.deltaY;
        const panListener: HammerListener = (e) => {
          this.setState({
            x: x0 + e.deltaX,
            y: Math.max(0, y0 + e.deltaY),
          });
        };
        const panEndListener = () => {
          this.hammer.off("pan", panListener);
          this.hammer.off("panend", panEndListener);
        };
        this.hammer.on("pan", panListener);
        this.hammer.on("panend", panEndListener);
      }
      if (e.target == this.refResizer) {
        const x0 = this.state.width - e.deltaX;
        const y0 = this.state.height - e.deltaY;
        const panListener: HammerListener = (e) => {
          this.setState({
            width: Math.max(324, x0 + e.deltaX),
            height: Math.max(100, y0 + e.deltaY),
          });
        };
        const panEndListener = () => {
          this.hammer.off("pan", panListener);
          this.hammer.off("panend", panEndListener);
        };
        this.hammer.on("pan", panListener);
        this.hammer.on("panend", panEndListener);
      }
    });

    if (FloatingPanel.peerGroups.has(this.props.peerGroup)) {
      FloatingPanel.peerGroups.get(this.props.peerGroup).add(this);
    } else {
      FloatingPanel.peerGroups.set(this.props.peerGroup, new Set([this]));
    }

    this.focus();
  }

  public focus() {
    if (FloatingPanel.peerGroups.has(this.props.peerGroup)) {
      for (const peer of FloatingPanel.peerGroups.get(this.props.peerGroup)) {
        if (peer != this) {
          peer.setState({ focus: false });
        }
      }
    }
    this.setState({ focus: true });
  }

  public componentWillUnmount() {
    this.hammer.destroy();
    if (FloatingPanel.peerGroups.has(this.props.peerGroup)) {
      FloatingPanel.peerGroups.get(this.props.peerGroup).delete(this);
    }
  }

  public render() {
    return (
      <div
        className={classNames(
          "charticulator__floating-panel",
          ["is-focus", this.state.focus],
          ["is-scroll", this.props.scroll]
        )}
        ref={(e) => (this.refContainer = e)}
        style={{
          left: this.state.x + "px",
          top: this.state.y + "px",
          width: this.state.width + "px",
          height: this.state.minimized ? undefined : this.state.height + "px",
        }}
        onMouseDown={() => {
          this.focus();
        }}
        onTouchStart={() => {
          this.focus();
        }}
      >
        <div
          className="charticulator__floating-panel-header"
          ref={(e) => (this.refHeader = e)}
        >
          <span className="title">{this.props.title}</span>
          <span className="buttons" onClick={(e) => e.stopPropagation()}>
            <ButtonFlat
              url={getSVGIcon("general/minus")}
              title="Minimize"
              onClick={() =>
                this.setState({ minimized: !this.state.minimized })
              }
            />
            {this.props.onClose ? (
              <ButtonFlat
                url={getSVGIcon(this.props.closeButtonIcon || "general/popout")}
                title="Restore to panel"
                onClick={() => this.props.onClose()}
              />
            ) : null}
          </span>
        </div>
        {!this.state.minimized ? (
          <div className="charticulator__floating-panel-content">
            {this.props.children}
          </div>
        ) : null}
        {!this.state.minimized ? (
          <div
            className="charticulator__floating-panel-resizer"
            ref={(e) => (this.refResizer = e)}
          />
        ) : null}
      </div>
    );
  }
}
