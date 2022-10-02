// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as React from "react";
import { ReorderListView } from "../../object_list_editor";
import { ButtonRaised } from "../../../../components";
import { strings } from "../../../../../strings";
import { DefaultButton, TooltipHost } from "@fluentui/react";
import { defaultComponentsHeight } from "./fluentui_customized_components";
import { getRandomNumber } from "../../../../../core";
import { DataType } from "../../../../../core/specification";

interface ReorderStringsValueProps {
  items: string[];
  onConfirm: (
    items: string[],
    customOrder: boolean,
    sortOrder: boolean
  ) => void;
  sortedCategories?: string[];
  allowReset?: boolean;
  onReset?: () => string[];
  itemsDataType?: DataType.Number | DataType.String;
  allowDragItems?: boolean;
  onReorderHandler?: () => void;
  onButtonHandler?: () => void;
}

interface ReorderStringsValueState {
  items: string[];
  customOrder: boolean;
  sortOrder: boolean;
}

export class FluentUIReorderStringsValue extends React.Component<
  ReorderStringsValueProps,
  ReorderStringsValueState
> {
  public state: ReorderStringsValueState = {
    items: this.props.items.slice(),
    customOrder: false,
    sortOrder: false,
  };

  // eslint-disable-next-line max-lines-per-function
  public render() {
    const items = this.state.items;
    return (
      <div className="charticulator__widget-popup-reorder-widget">
        <div className="el-row el-list-view">
          <ReorderListView
            enabled={this.props.allowDragItems ?? true}
            onReorder={(a, b) => {
              ReorderListView.ReorderArray(items, a, b);
              this.setState({ items, customOrder: true, sortOrder: false });
              if (this.props.onReorderHandler) {
                this.props.onReorderHandler();
              }
            }}
          >
            {items.map((x) => (
              <div key={x + getRandomNumber()} className="el-item">
                <TooltipHost content={x}>{x}</TooltipHost>
              </div>
            ))}
          </ReorderListView>
        </div>
        <div className="el-row">
          <DefaultButton
            iconProps={{
              iconName: "SortLines",
            }}
            text={strings.reOrder.sort}
            onClick={() => {
              this.setState({
                items:
                  [...this.props.sortedCategories] ?? this.state.items.sort(),
                customOrder: false,
                sortOrder: true,
              });
              if (this.props.onButtonHandler) {
                this.props.onButtonHandler();
              }
            }}
            styles={{
              root: {
                minWidth: "unset",
                ...defaultComponentsHeight,
                padding: 0,
                marginRight: 5,
              },
            }}
          />
          <DefaultButton
            iconProps={{
              iconName: "Sort",
            }}
            styles={{
              root: {
                minWidth: "unset",
                ...defaultComponentsHeight,
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
              if (this.props.onButtonHandler) {
                this.props.onButtonHandler();
              }
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
                    ...defaultComponentsHeight,
                    padding: 0,
                  },
                }}
                text={strings.reOrder.reset}
                onClick={() => {
                  if (this.props.onReset) {
                    const items = this.props.onReset();
                    this.setState({
                      items,
                      customOrder: false,
                      sortOrder: false,
                    });
                    if (this.props.onButtonHandler) {
                      this.props.onButtonHandler();
                    }
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
              this.props.onConfirm(
                this.state.items,
                this.state.customOrder,
                this.state.sortOrder
              );
            }}
          />
        </div>
      </div>
    );
  }
}
