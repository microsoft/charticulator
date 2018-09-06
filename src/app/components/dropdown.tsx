/*
Copyright (c) Microsoft Corporation. All rights reserved.
Licensed under the MIT license.
*/
import * as React from "react";

import { SVGImageIcon } from "./icons";
import { getSVGIcon } from "../resources";
import { classNames } from "../utils";
import * as globals from "../globals";
import { PopupView, PopupContext } from "../controllers";

export interface DropdownButtonProps {
  url?: string;
  title?: string;
  text?: string;

  list: Array<{ name: string; url?: string; text?: string }>;

  className?: string;

  onSelect?: (name: string) => void;
}

export interface DropdownButtonState {
  active: boolean;
}

export class DropdownButton extends React.Component<
  DropdownButtonProps,
  DropdownButtonState
> {
  constructor(props: DropdownButtonProps) {
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
        return (
          <PopupView context={context}>
            <DropdownListView
              list={this.props.list}
              context={context}
              onClick={this.props.onSelect}
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
    const props = this.props;
    return (
      <span
        className={classNames(this.props.className, "dropdown-button", [
          "active",
          this.state.active
        ])}
        ref={e => (this.anchor = e)}
        onClick={this._startDropdown}
        title={props.title}
      >
        {props.url != null ? <SVGImageIcon url={props.url} /> : null}
        {props.text != null ? <span className="text">{props.text}</span> : null}
        <SVGImageIcon url={getSVGIcon("general/dropdown")} />
      </span>
    );
  }
}

export function DropdownListView<DataType>(props: {
  list: Array<{ name: string; url?: string; text?: string; font?: string }>;
  onClick?: (name: string) => void;
  selected?: string;
  context: PopupContext;
}) {
  return (
    <ul className="dropdown-list">
      {props.list.map(item => (
        <li
          key={item.name}
          className={props.selected == item.name ? "is-active" : null}
          onClick={() => {
            if (props.onClick) {
              props.onClick(item.name);
            }
            props.context.close();
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
