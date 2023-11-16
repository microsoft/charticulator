// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import * as React from "react";

import { classNames } from "../utils";
import { DraggableElement } from "./draggable";
import { SVGImageIcon } from "./icons";

import * as R from "../resources";
import { strings } from "../../strings";
import { ToolbarButton } from "@fluentui/react-components";

// import { FluentButton } from "../views/panels/widgets/controls/fluentui_customized_components";

export interface ToolButtonProps {
  icon?: string | React.JSX.Element;
  text?: string;
  title?: string;
  onClick?: () => void;
  dragData?: () => any;
  active?: boolean;
  disabled?: boolean;
  compact?: boolean;
}

export class FluentToolButton extends React.Component<
  React.PropsWithChildren<ToolButtonProps>,
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
            if (typeof this.props.icon === "string") {
              return [
                <SVGImageIcon url={this.props.icon} width={20} height={20} />,
                { x: -16, y: -16 },
              ];
            } else {
              return [this.props.icon, { x: -16, y: -16 }];
            }
          }}
        >
          {/* <FluentButton marginTop={"0px"}> */}
          <ToolbarButton
            as="button"
            value={this.props.text}
            onClick={onClick}
            name={this.props.title}
            // value={this.props.active || this.state.dragging}
            disabled={this.props.disabled}
            title={this.props.title}
            icon={
              typeof this.props.icon === "string" ? (
                <SVGImageIcon
                  url={R.getSVGIcon(this.props.icon)}
                  width={20}
                  height={20}
                />
              ) : (
                this.props.icon
              )
            }
          ></ToolbarButton>
          {/* </FluentButton> */}
        </DraggableElement>
      );
    } else {
      return (
        // <FluentButton marginTop={"0px"}>
        <ToolbarButton
          name={this.props.title}
          as="button"
          value={this.props.text}
          // value={this.props.active}
          onClick={onClick}
          disabled={this.props.disabled}
          title={this.props.title}
          icon={
            typeof this.props.icon === "string" ? (
              <SVGImageIcon
                url={R.getSVGIcon(this.props.icon)}
                width={20}
                height={20}
              />
            ) : (
              this.props.icon
            )
          }
        ></ToolbarButton>
        // </FluentButton>
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
        tabIndex={0}
        className="charticulator__button-menu-app charticulator-title__button"
        title={this.props.title}
        onClick={this._doClick}
        onKeyPress={(e) => {
          if (e.key === "Enter") {
            this._doClick();
          }
        }}
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
          tabIndex={0}
          className={classNames("charticulator__button-menu-text", [
            "is-disabled",
            this.props.disabled,
          ])}
          title={props.title}
          onClick={this._doClick}
          onKeyPress={(e) => {
            if (e.key === "Enter") {
              this._doClick();
            }
          }}
        >
          <SVGImageIcon url={props.url} />
          <span className="el-text">{props.text}</span>
        </span>
      );
    } else {
      return (
        <span
          tabIndex={0}
          className="charticulator__button-menu"
          title={props.title}
          onClick={this._doClick}
          onKeyPress={(e) => {
            if (e.key === "Enter") {
              this._doClick();
            }
          }}
        >
          <SVGImageIcon url={props.url} />
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
