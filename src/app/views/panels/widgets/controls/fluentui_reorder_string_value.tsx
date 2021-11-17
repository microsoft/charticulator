// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as React from "react";
import { ReorderListView } from "../../object_list_editor";
import { Button } from "./button";
import { ButtonRaised } from "../../../../components";
import { strings } from "../../../../../strings";
import { DefaultButton } from "@fluentui/react";
import { defultComponentsHeight } from "./fluentui_customized_components";

interface ReorderStringsValueProps {
  items: string[];
  onConfirm: (items: string[], customOrder: boolean) => void;
  allowReset?: boolean;
  onReset?: () => string[];
}

interface ReorderStringsValueState {
  items: string[];
  customOrder: boolean;
}

export class FluentUIReorderStringsValue extends React.Component<
  ReorderStringsValueProps,
  ReorderStringsValueState
> {
  public state: ReorderStringsValueState = {
    items: this.props.items.slice(),
    customOrder: false,
  };

  public render() {
    const items = this.state.items.slice();
    return (
      <div className="charticulator__widget-popup-reorder-widget">
        <div className="el-row el-list-view">
          <ReorderListView
            enabled={true}
            onReorder={(a, b) => {
              ReorderListView.ReorderArray(items, a, b);
              this.setState({ items, customOrder: true });
            }}
          >
            {items.map((x) => (
              <div key={x} className="el-item">
                {x}
              </div>
            ))}
          </ReorderListView>
        </div>
        <div className="el-row">
          <DefaultButton
            iconProps={{
              iconName: "Sort",
            }}
            styles={{
              root: {
                minWidth: "unset",
                ...defultComponentsHeight,
                padding: 0,
                marginRight: 5,
              },
            }}
            text={strings.reOrder.reverse}
            onClick={() => {
              this.setState({
                items: this.state.items.reverse(),
                customOrder: true,
              });
            }}
          />
          <DefaultButton
            iconProps={{
              iconName: "SortLines",
            }}
            text={strings.reOrder.sort}
            onClick={() => {
              this.setState({
                items: this.state.items.sort(),
                customOrder: false,
              });
            }}
            styles={{
              root: {
                minWidth: "unset",
                ...defultComponentsHeight,
                padding: 0,
                marginRight: 5,
              },
            }}
          />
          {this.props.allowReset && (
            <>
              <DefaultButton
                iconProps={{
                  iconName: "Clear",
                }}
                styles={{
                  root: {
                    minWidth: "unset",
                    ...defultComponentsHeight,
                    padding: 0,
                  },
                }}
                text={strings.reOrder.reset}
                onClick={() => {
                  if (this.props.onReset) {
                    const items = this.props.onReset();
                    this.setState({ items, customOrder: false });
                  }
                }}
              />
            </>
          )}
        </div>
        <div className="el-row">
          <ButtonRaised
            text="OK"
            onClick={() => {
              this.props.onConfirm(this.state.items, this.state.customOrder);
            }}
          />
        </div>
      </div>
    );
  }
}
