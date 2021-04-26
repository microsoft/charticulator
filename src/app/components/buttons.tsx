// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import * as React from "react";

import { classNames } from "../utils";
import { DraggableElement } from "./draggable";
import { SVGImageIcon } from "./icons";

import * as R from "../resources";
import { strings } from "../../strings";

export interface ToolButtonProps {
  icon?: string;
  text?: string;
  title?: string;
  onClick?: () => void;
  dragData?: () => any;
  active?: boolean;
  disabled?: boolean;
  compact?: boolean;
}

export class ToolButton extends React.Component<
  ToolButtonProps,
  { dragging: boolean }
> {
  constructor(props: ToolButtonProps) {
    super(props);
    this.state = {
      dragging: false,
    };
  }

  public render() {
    const onClick = () => {
      if (this.props.onClick) {
        this.props.onClick();
      }
    };

    if (this.props.dragData) {
      return (
        <DraggableElement
          dragData={this.props.dragData}
          onDragStart={() => this.setState({ dragging: true })}
          onDragEnd={() => this.setState({ dragging: false })}
          renderDragElement={() => {
            return [
              <SVGImageIcon url={this.props.icon} width={32} height={32} />,
              { x: -16, y: -16 },
            ];
          }}
        >
          <span
            className={classNames(
              "charticulator__button-tool",
              ["is-active", this.props.active || this.state.dragging],
              ["is-disabled", this.props.disabled]
            )}
            title={this.props.title}
            onClick={onClick}
          >
            {this.props.icon ? <SVGImageIcon url={this.props.icon} /> : null}
            {this.props.text ? (
              <span className="el-text">{this.props.text}</span>
            ) : null}
          </span>
          <span
            style={{
              position: "relative",
              bottom: "-7px",
              left: "-20px",
            }}
            onClick={onClick}
          >
            {this.props.compact ? (
              <SVGImageIcon
                url={R.getSVGIcon("general/triangle-right-bottom")}
              />
            ) : null}
          </span>
        </DraggableElement>
      );
    } else {
      return (
        <span
          className={classNames(
            "charticulator__button-tool",
            ["is-active", this.props.active],
            ["is-disabled", this.props.disabled]
          )}
          title={this.props.title}
          onClick={onClick}
        >
          {this.props.icon ? <SVGImageIcon url={this.props.icon} /> : null}
          {this.props.text ? (
            <span className="el-text">{this.props.text}</span>
          ) : null}
        </span>
      );
    }
  }
}

export interface ButtonProps {
  onClick?: () => void;
  stopPropagation?: boolean;
  disabled?: boolean;
}

export abstract class BaseButton<
  Props extends ButtonProps
> extends React.PureComponent<Props, Record<string, never>> {
  private doClick(e: React.MouseEvent<HTMLSpanElement>) {
    if (this.props.onClick) {
      this.props.onClick();
    }
    if (this.props.stopPropagation) {
      e.stopPropagation();
    }
  }
  protected _doClick = this.doClick.bind(this);
}

export interface AppButtonProps extends ButtonProps {
  name?: string;
  title: string;
}

export class AppButton extends BaseButton<AppButtonProps> {
  public render() {
    return (
      <span
        className="charticulator__button-menu-app charticulator-title__button"
        title={this.props.title}
        onClick={this._doClick}
      >
        <SVGImageIcon url={R.getSVGIcon("app-icon")} />
        <span className="el-text">{this.props.name || strings.app.name}</span>
      </span>
    );
  }
}

export interface IconButtonProps extends ButtonProps {
  url?: string;
  title?: string;
  text?: string;
}

export class MenuButton extends BaseButton<IconButtonProps> {
  public render() {
    const props = this.props;
    if (props.text) {
      return (
        <span
          className="charticulator__button-menu-text"
          title={props.title}
          onClick={this._doClick}
        >
          <SVGImageIcon url={props.url} />
          <span className="el-text">{props.text}</span>
        </span>
      );
    } else {
      return (
        <span
          className="charticulator__button-menu"
          title={props.title}
          onClick={this._doClick}
        >
          <SVGImageIcon url={props.url} />
        </span>
      );
    }
  }
}

export class ButtonFlat extends BaseButton<IconButtonProps> {
  public render() {
    const props = this.props;
    if (props.url) {
      if (props.text) {
        return (
          <span
            className="charticulator__button-flat"
            title={props.title}
            onClick={this._doClick}
          >
            <SVGImageIcon url={props.url} />
            <span className="el-text">{props.text}</span>
          </span>
        );
      } else {
        return (
          <span
            className="charticulator__button-flat"
            title={props.title}
            onClick={this._doClick}
          >
            <SVGImageIcon url={props.url} />
          </span>
        );
      }
    } else {
      return (
        <span
          className="charticulator__button-flat"
          title={props.title}
          onClick={this._doClick}
        >
          <span className="el-text">{props.text}</span>
        </span>
      );
    }
  }
}

export class ButtonFlatPanel extends BaseButton<IconButtonProps> {
  public render() {
    const props = this.props;
    if (props.url) {
      if (props.text) {
        return (
          <span
            className={classNames("charticulator__button-flat-panel", [
              "is-disabled",
              this.props.disabled,
            ])}
            title={props.title}
            onClick={this._doClick}
          >
            <SVGImageIcon url={props.url} />
            <span className="el-text">{props.text}</span>
          </span>
        );
      } else {
        return (
          <span
            className={classNames("charticulator__button-flat-panel", [
              "is-disabled",
              this.props.disabled,
            ])}
            title={props.title}
            onClick={this._doClick}
          >
            <SVGImageIcon url={props.url} />
          </span>
        );
      }
    } else {
      return (
        <span
          className={classNames("charticulator__button-flat-panel", [
            "is-disabled",
            this.props.disabled,
          ])}
          title={props.title}
          onClick={this._doClick}
        >
          <span className="el-text">{props.text}</span>
        </span>
      );
    }
  }
}

export class ButtonRaised extends BaseButton<IconButtonProps> {
  public render() {
    const props = this.props;
    if (props.url) {
      if (props.text) {
        return (
          <span
            className={classNames("charticulator__button-raised", [
              "is-disabled",
              this.props.disabled,
            ])}
            title={props.title}
            onClick={this._doClick}
          >
            <SVGImageIcon url={props.url} />
            <span className="el-text">{props.text}</span>
          </span>
        );
      } else {
        return (
          <span
            className={classNames("charticulator__button-raised", [
              "is-disabled",
              this.props.disabled,
            ])}
            title={props.title}
            onClick={this._doClick}
          >
            <SVGImageIcon url={props.url} />
          </span>
        );
      }
    } else {
      return (
        <span
          className={classNames("charticulator__button-raised", [
            "is-disabled",
            this.props.disabled,
          ])}
          title={props.title}
          onClick={this._doClick}
        >
          <span className="el-text">{props.text}</span>
        </span>
      );
    }
  }
}
