/*
Copyright (c) Microsoft Corporation. All rights reserved.
Licensed under the MIT license.
*/
import * as React from "react";
import * as R from "../../../../resources";
import * as globals from "../../../../globals";

import { DropdownListView, SVGImageIcon } from "../../../../components";
import { PopupView } from "../../../../controllers/popup_controller";
import { classNames } from "../../../../utils";

export interface SelectProps {
  icons?: string[];
  options: string[];
  labels?: string[];
  showText?: boolean;
  value: string;
  onChange: (active: string) => void;
}

export class Select extends React.Component<SelectProps, { active: boolean }> {
  constructor(props: SelectProps) {
    super(props);
    this.state = {
      active: false
    };
  }
  private startDropdown() {
    globals.popupController.popupAt(
      context => {
        context.addListener("close", () => {
          this.setState({
            active: false
          });
        });
        const list = this.props.options.map((x, i) => {
          return {
            url: this.props.icons ? R.getSVGIcon(this.props.icons[i]) : null,
            name: x,
            text: this.props.labels ? this.props.labels[i] : null
          };
        });
        return (
          <PopupView context={context}>
            <DropdownListView
              selected={this.props.value}
              list={list}
              context={context}
              onClick={value => {
                this.props.onChange(value);
              }}
            />
          </PopupView>
        );
      },
      { anchor: this.anchor }
    );
    this.setState({
      active: true
    });
  }
  private _startDropdown = this.startDropdown.bind(this);
  private anchor: HTMLSpanElement;

  public render() {
    const currentIndex = this.props.options.indexOf(this.props.value);
    const props = this.props;
    return (
      <span
        className={classNames("charticulator__widget-control-select", [
          "is-active",
          this.state.active
        ])}
        ref={e => (this.anchor = e)}
        onClick={this._startDropdown}
      >
        {props.icons != null ? (
          <SVGImageIcon url={R.getSVGIcon(props.icons[currentIndex])} />
        ) : null}
        {props.labels != null && props.showText ? (
          <span className="el-text">{props.labels[currentIndex]}</span>
        ) : null}
        <SVGImageIcon url={R.getSVGIcon("general/dropdown")} />
      </span>
    );
  }
}

export class Radio extends React.Component<SelectProps, {}> {
  public render() {
    const currentIndex = this.props.options.indexOf(this.props.value);
    return (
      <span className="charticulator__widget-control-radio">
        {this.props.options.map((value, index) => {
          return (
            <span
              key={value}
              className={classNames(
                "charticulator__widget-control-radio-item",
                ["is-active", value == this.props.value]
              )}
              title={this.props.labels ? this.props.labels[index] : null}
              onClick={() => {
                this.props.onChange(value);
              }}
            >
              {this.props.icons ? (
                <SVGImageIcon url={R.getSVGIcon(this.props.icons[index])} />
              ) : null}
              {this.props.showText ? (
                <span className="el-text">{this.props.labels[index]}</span>
              ) : null}
            </span>
          );
        })}
      </span>
    );
  }
}
