// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as React from "react";
import { ReorderListView } from "../../object_list_editor";
import { strings } from "../../../../../strings";
import { getRandomNumber } from "../../../../../core";
import { DataType } from "../../../../../core/specification";
import { Button, Label, Tooltip } from "@fluentui/react-components";
import {
  ArrowSort20Regular,
  Delete20Regular,
  TextSortDescending20Regular,
} from "@fluentui/react-icons";

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
  React.PropsWithChildren<ReorderStringsValueProps>,
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
                <Tooltip relationship="label" content={x}>
                  <Label>{x}</Label>
                </Tooltip>
              </div>
            ))}
          </ReorderListView>
        </div>
        <div className="el-row">
          <Button
            icon={<TextSortDescending20Regular />}
            onClick={() => {
              this.setState({
                items: this.state.items.sort(),
                sortOrder: true,
                customOrder: false,
              });
            }}
          >
            {strings.reOrder.sort}
          </Button>
          <Button
            icon={<ArrowSort20Regular />}
            title={strings.reOrder.reverse}
            onClick={() => {
              this.setState({
                items: this.state.items.reverse(),
                customOrder: true,
              });
              if (this.props.onButtonHandler) {
                this.props.onButtonHandler();
              }
            }}
          >
            {strings.reOrder.reverse}
          </Button>
          {this.props.allowReset && (
            <>
              <Button
                icon={<Delete20Regular />}
                onClick={() => {
                  if (this.props.onReset) {
                    const items = this.props.onReset();
                    this.setState({
                      items,
                      customOrder: false,
                      sortOrder: false,
                    });
                  }
                }}
              >
                {strings.reOrder.reset}
              </Button>
            </>
          )}
        </div>
        <div className="el-row">
          <Button
            onClick={() => {
              this.props.onConfirm(
                this.state.items,
                this.state.customOrder,
                this.state.sortOrder
              );
            }}
          >
            "OK"
          </Button>
        </div>
      </div>
    );
  }
}
