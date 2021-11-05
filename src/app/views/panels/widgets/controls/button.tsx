// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
/* eslint-disable @typescript-eslint/ban-types  */
/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/no-empty-interface */

import * as React from "react";
import * as R from "../../../../resources";
import { SVGImageIcon } from "../../../../components";
import { classNames } from "../../../../utils";

export interface ButtonProps {
  icon?: string;
  text?: string;
  title?: string;
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}

export class Button extends React.Component<ButtonProps, {}> {
  public render() {
    return (
      <button
        className={classNames(
          "charticulator__widget-control-button",
          ["is-active", this.props.active],
          ["has-text", this.props.text != null],
          ["has-icon", this.props.icon != null],
          ["is-disabled", this.props.disabled]
        )}
        title={this.props.title}
        onClick={(e) => {
          if (this.props.disabled === true) {
            return;
          }
          e.stopPropagation();
          if (this.props.onClick) {
            this.props.onClick();
          }
        }}
      >
        {this.props.icon ? (
          <SVGImageIcon url={R.getSVGIcon(this.props.icon)} />
        ) : null}
        {this.props.text ? (
          <span className="el-text">{this.props.text}</span>
        ) : null}
      </button>
    );
  }
}

export interface UpdownButtonProps {
  onClick: (part: "up" | "down") => void;
}

export function UpdownButton(props: UpdownButtonProps) {
  return (
    <span className="charticulator__widget-control-updown-button">
      <span className="el-part" onClick={() => props.onClick("up")}>
        <SVGImageIcon url={R.getSVGIcon("general/triangle-up")} />
      </span>
      <span className="el-part" onClick={() => props.onClick("down")}>
        <SVGImageIcon url={R.getSVGIcon("general/triangle-down")} />
      </span>
    </span>
  );
}

export interface CheckBoxProps {
  value: boolean;
  text?: string;
  title?: string;
  fillWidth?: boolean;
  onChange?: (newValue: boolean) => void;
}

export class CheckBox extends React.Component<CheckBoxProps, {}> {
  public render() {
    return (
      <span
        className={classNames(
          "charticulator__widget-control-checkbox",
          ["is-active", this.props.value],
          ["is-fill-width", this.props.fillWidth],
          ["has-text", this.props.text != null]
        )}
        title={this.props.title}
        onClick={(e) => {
          e.stopPropagation();
          if (this.props.onChange) {
            this.props.onChange(!this.props.value);
          }
        }}
      >
        <SVGImageIcon
          url={R.getSVGIcon(
            this.props.value ? "checkbox/checked" : "checkbox/empty"
          )}
        />
        {this.props.text ? (
          <span className="el-text">{this.props.text}</span>
        ) : null}
      </span>
    );
  }
}
