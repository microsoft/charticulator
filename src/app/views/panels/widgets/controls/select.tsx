// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import * as React from "react";
import { LabelPosition } from "../../../../../core/prototypes/controls";
import { SVGImageIcon } from "../../../../components";
import {
  PopupContext,
  PopupView,
} from "../../../../controllers/popup_controller";
import * as globals from "../../../../globals";
import * as R from "../../../../resources";
import { classNames } from "../../../../utils";

export function DropdownListView(props: {
  list: { name: string; url?: string; text?: string; font?: string }[];
  onClick?: (name: string) => void;
  onClose?: () => void;
  selected?: string;
  context: PopupContext;
}) {
  return (
    <ul className="dropdown-list">
      {props.list.map((item) => (
        <li
          tabIndex={0}
          key={item.name}
          className={props.selected == item.name ? "is-active" : null}
          onClick={() => {
            if (props.onClick) {
              props.onClick(item.name);
            }
            props.context.close();
            props.onClose?.();
          }}
          onKeyPress={(e) => {
            if (e.key === "Enter") {
              if (props.onClick) {
                props.onClick(item.name);
              }
              props.context.close();
              props.onClose?.();
            }
          }}
        >
          {item.url != null ? <SVGImageIcon url={item.url} /> : null}
          {item.text != null ? (
            <span className="text" style={{ fontFamily: item.font }}>
              {item.text}
            </span>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

export interface SelectProps {
  icons?: string[];
  options: string[];
  labels?: string[];
  showText?: boolean;
  labelPosition?: LabelPosition;
  tooltip?: string;
  value: string;
  onChange: (active: string) => void;
}

export class Select extends React.Component<
  React.PropsWithChildren<SelectProps>,
  { active: boolean }
> {
  constructor(props: SelectProps) {
    super(props);
    this.state = {
      active: false,
    };
  }
  private startDropdown() {
    globals.popupController.popupAt(
      (context) => {
        context.addListener("close", () => {
          this.setState({
            active: false,
          });
        });
        const list = this.props.options.map((x, i) => {
          return {
            url: this.props.icons ? R.getSVGIcon(this.props.icons[i]) : null,
            name: x,
            text: this.props.labels ? this.props.labels[i] : null,
          };
        });
        return (
          <PopupView context={context}>
            <DropdownListView
              selected={this.props.value}
              list={list}
              context={context}
              onClick={(value: string) => {
                this.props.onChange(value);
              }}
            />
          </PopupView>
        );
      },
      { anchor: this.anchor }
    );
    this.setState({
      active: true,
    });
  }
  private _startDropdown = (e: React.MouseEvent<HTMLSpanElement>) => {
    e.stopPropagation();
    this.startDropdown();
  };
  private anchor: HTMLSpanElement;

  public render() {
    const currentIndex = this.props.options.indexOf(this.props.value);
    const props = this.props;
    if (props.labelPosition === LabelPosition.Bottom) {
      return (
        <div
          className="charticulator__widget-control-select-container"
          title={props.tooltip}
        >
          <span
            className={classNames(
              "charticulator__widget-control-select",
              ["is-active", this.state.active],
              ["has-text", this.props.labels != null && props.showText],
              ["has-icon", this.props.icons != null]
            )}
            ref={(e) => (this.anchor = e)}
            onClick={this._startDropdown}
          >
            {props.icons != null ? (
              <SVGImageIcon url={R.getSVGIcon(props.icons[currentIndex])} />
            ) : null}
            <SVGImageIcon url={R.getSVGIcon("ChevronDown")} />
          </span>
          <span className="el-text">{props.labels[currentIndex]}</span>
        </div>
      );
    } else {
      return (
        <span
          className={classNames(
            "charticulator__widget-control-select",
            ["is-active", this.state.active],
            ["has-text", this.props.labels != null && props.showText],
            ["has-icon", this.props.icons != null]
          )}
          ref={(e) => (this.anchor = e)}
          onClick={this._startDropdown}
        >
          {props.icons != null ? (
            <SVGImageIcon url={R.getSVGIcon(props.icons[currentIndex])} />
          ) : null}
          {props.labels != null && props.showText ? (
            <span className="el-text">{props.labels[currentIndex]}</span>
          ) : null}
          <SVGImageIcon url={R.getSVGIcon("ChevronDown")} />
        </span>
      );
    }
  }
}

export class Radio extends React.Component<
  React.PropsWithChildren<SelectProps>,
  Record<string, unknown>
> {
  public render() {
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
