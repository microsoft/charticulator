// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
/* eslint-disable @typescript-eslint/ban-types  */
/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/no-empty-interface */

import * as React from "react";
import * as R from "../../resources";

import { SVGImageIcon } from "../../components";

import { classNames } from "../../utils";

export interface PanelRadioControlProps {
  options: string[];
  icons?: string[];
  labels?: string[];
  showText?: boolean;
  asList?: boolean;
  value?: string;
  onChange?: (newValue: string) => void;
}

export class PanelRadioControl extends React.Component<
  PanelRadioControlProps,
  {}
> {
  public render() {
    const mainClass = this.props.asList
      ? "charticulator-panel-list-view"
      : "charticulator-panel-list-view is-inline";
    return (
      <span className={mainClass}>
        {this.props.options.map((option, index) => {
          return (
            <span
              className={classNames("el-item", [
                "is-active",
                this.props.value == option,
              ])}
              key={option}
              onClick={() => {
                if (this.props) {
                  this.props.onChange(option);
                }
              }}
            >
              {this.props.icons ? (
                <SVGImageIcon url={R.getSVGIcon(this.props.icons[index])} />
              ) : null}
              {this.props.labels && this.props.showText ? (
                <span className="el-text">{this.props.labels[index]}</span>
              ) : null}
            </span>
          );
        })}
      </span>
    );
  }
}
