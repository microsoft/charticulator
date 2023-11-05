// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as React from "react";
import { ReorderListView } from "../../object_list_editor";
import { Button } from "./button";
import { ButtonRaised } from "../../../../components";
import { strings } from "../../../../../strings";

interface ReorderStringsValueProps {
  items: string[];
  onConfirm: (
    items: string[],
    customOrder: boolean,
    sortOrder: boolean
  ) => void;
  allowReset?: boolean;
  onReset?: () => string[];
}

interface ReorderStringsValueState {
  items: string[];
  customOrder: boolean;
  sortOrder: boolean;
}

export class ReorderStringsValue extends React.Component<
  React.PropsWithChildren<ReorderStringsValueProps>,
  ReorderStringsValueState
> {
  public state: ReorderStringsValueState = {
    items: this.props.items.slice(),
    customOrder: false,
    sortOrder: false,
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
          <Button
            icon={"Sort"}
            text={strings.reOrder.reverse}
            onClick={() => {
              this.setState({
                items: this.state.items.reverse(),
                customOrder: true,
              });
            }}
          />{" "}
          <Button
            icon={"general/sort"}
            text={strings.reOrder.sort}
            onClick={() => {
              this.setState({
                items: this.state.items.sort(),
                sortOrder: true,
                customOrder: false,
              });
            }}
          />
          {this.props.allowReset && (
            <>
              {" "}
              <Button
                icon={"general/clear"}
                text={strings.reOrder.reset}
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
