// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import * as React from "react";
import * as R from "../../../../resources";
import { SVGImageIcon } from "../../../../components";
import { classNames } from "../../../../utils";

export interface ButtonProps {
  icon?: string;
  text?: string;
  title?: string;
  active?: boolean;
  onClick?: () => void;
}

export class Button extends React.Component<ButtonProps, {}> {
  public render() {
    return (
      <span
        className={classNames(
          "charticulator__widget-control-button",
          ["is-active", this.props.active],
          ["has-text", this.props.text != null],
          ["has-icon", this.props.icon != null]
        )}
        title={this.props.title}
        onClick={e => {
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
      </span>
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
