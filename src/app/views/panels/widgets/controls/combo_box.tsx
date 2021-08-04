// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
/* eslint-disable @typescript-eslint/ban-types  */
/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/no-empty-interface */

import * as React from "react";
import * as R from "../../../../resources";
import * as globals from "../../../../globals";
import { SVGImageIcon } from "../../../../components";
import { PopupView } from "../../../../controllers";
import { classNames } from "../../../../utils";
import { fontList } from "../../../../../core";

export interface ComboBoxOptionProps {
  onClick: () => void;
  selected: boolean;
}
export interface ComboBoxProps {
  defaultValue: string;
  options?: string[];
  renderOptionItem?: (
    option: string,
    props: ComboBoxOptionProps
  ) => JSX.Element;
  optionsOnly?: boolean;
  onEnter?: (value: string) => boolean;
  onCancel?: () => void;
}
export interface ComboBoxState {
  value: string;
}
export class ComboBox extends React.Component<ComboBoxProps, ComboBoxState> {
  protected refContainer: HTMLSpanElement;
  protected refInput: HTMLInputElement;
  public state: ComboBoxState = {
    value: this.props.defaultValue,
  };

  public componentWillReceiveProps(newProps: ComboBoxProps) {
    this.setState({
      value: newProps.defaultValue,
    });
  }

  protected tryEmitValue(val: string) {
    if (!this.props.onEnter) {
      return;
    }
    const ok = this.props.onEnter(val);
    if (ok) {
      this.setState({
        value: val,
      });
    }
  }

  protected reset() {
    this.setState({
      value: this.props.defaultValue,
    });
  }

  protected handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    this.setState({
      value: e.target.value,
    });
  };
  protected handleFocus = () => {
    this.refInput.select();
  };
  protected handleBlur = () => {
    this.tryEmitValue(this.refInput.value);
  };
  protected handleKeydown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key == "Enter") {
      this.tryEmitValue(this.refInput.value);
    } else if (e.key == "Escape") {
      this.reset();
    }
  };

  protected renderOptions(onSelect: () => void) {
    const renderOptionItem =
      this.props.renderOptionItem ||
      ((x: string, props: ComboBoxOptionProps) => (
        <span
          className={classNames("el-default-option-item", [
            "is-active",
            props.selected,
          ])}
          onClick={props.onClick}
        >
          {x}
        </span>
      ));
    return (
      <span className="charticulator__widget-control-combo-box-suggestions">
        {this.props.options.map((x) => (
          <span
            className="charticulator__widget-control-combo-box-suggestions-option"
            key={x}
          >
            {renderOptionItem(x, {
              onClick: () => {
                if (onSelect) {
                  onSelect();
                }
                this.tryEmitValue(x);
              },
              selected: this.state.value == x,
            })}
          </span>
        ))}
      </span>
    );
  }

  public render() {
    return (
      <span
        className="charticulator__widget-control-combo-box"
        ref={(e) => (this.refContainer = e)}
      >
        {this.props.optionsOnly ? (
          <span className="el-value">{this.state.value}</span>
        ) : (
          <input
            ref={(e) => (this.refInput = e)}
            className="el-input"
            value={this.state.value}
            onChange={this.handleChange}
            onKeyDown={this.handleKeydown}
            onFocus={this.handleFocus}
            onBlur={this.handleBlur}
          />
        )}
        <span
          className="el-dropdown"
          onClick={() => {
            globals.popupController.popupAt(
              (context) => {
                return (
                  <PopupView
                    className="charticulator__widget-control-combo-box-popup"
                    context={context}
                    width={this.refContainer.getBoundingClientRect().width}
                  >
                    {this.renderOptions(() => context.close())}
                  </PopupView>
                );
              },
              { anchor: this.refContainer }
            );
          }}
        >
          <SVGImageIcon url={R.getSVGIcon("general/dropdown")} />
        </span>
      </span>
    );
  }
}

export interface ComboBoxFontFamilyProps {
  defaultValue: string;
  onEnter?: (value: string) => boolean;
  onCancel?: () => void;
}
export class ComboBoxFontFamily extends React.Component<
  ComboBoxFontFamilyProps,
  {}
> {
  public render() {
    return (
      <ComboBox
        defaultValue={this.props.defaultValue}
        options={fontList}
        renderOptionItem={(x, props) => (
          <span
            className={classNames("el-default-option-item", [
              "is-active",
              props.selected,
            ])}
            style={{ fontFamily: x }}
            {...props}
          >
            {x}
          </span>
        )}
        onEnter={this.props.onEnter}
        onCancel={this.props.onCancel}
      />
    );
  }
}
