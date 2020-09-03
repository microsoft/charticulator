// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import * as React from "react";
import * as R from "../../resources";

import { EventSubscription, Specification, Expression } from "../../../core";
import { Actions } from "../../actions";
import { ButtonRaised, EditableTextView } from "../../components";

import { AppStore } from "../../stores";
import { WidgetManager } from "./widgets/manager";
import { FunctionCall, Variable } from "../../../core/expression";

export interface ScaleValueSelectorProps {
  scale: Specification.Scale;
  scaleMapping: Specification.ScaleMapping;
  store: AppStore;
  onSelect: (index: number) => void;
}

export interface ScaleValueSelectorState {
  selectedIndex: number;
}

export class ScaleValueSelector extends React.Component<
  ScaleValueSelectorProps,
  ScaleValueSelectorState
> {
  public token: EventSubscription;

  constructor(props: ScaleValueSelectorProps) {
    super(props);

    const parsedExpression = Expression.parse(
      this.props.scaleMapping.expression
    ) as FunctionCall;
    const selectedIndex = +(parsedExpression.args[1] as any).value;

    this.state = {
      selectedIndex
    };
  }

  public componentDidMount() {
    this.token = this.props.store.addListener(AppStore.EVENT_GRAPHICS, () => {
      this.forceUpdate();
    });
  }

  public componentWillUnmount() {
    this.token.remove();
  }

  public render() {
    const { scale, store } = this.props;
    const scaleClass = store.chartManager.getClassById(scale._id);
    const manager = new WidgetManager(this.props.store, scaleClass);
    manager.onEditMappingHandler = (
      attribute: string,
      mapping: Specification.Mapping
    ) => {
      new Actions.SetScaleAttribute(scale, attribute, mapping).dispatch(
        store.dispatcher
      );
    };
    let canAddLegend = true;
    if (scale.classID.startsWith("scale.format")) {
      canAddLegend = false;
    }
    return (
      <div
        className="scale-editor-view"
        style={{ width: "400px", padding: "10px" }}
      >
        <div className="attribute-editor">
          <section className="attribute-editor-element">
            <div className="header">
              <EditableTextView
                text={scale.properties.name}
                onEdit={newText => {
                  new Actions.SetObjectProperty(
                    scale,
                    "name",
                    null,
                    newText,
                    true
                  ).dispatch(store.dispatcher);
                }}
              />
            </div>
            {manager.sectionHeader("Color Mapping")}
            {manager.vertical(
              manager.scrollList(
                Object.keys(scale.properties.mapping).map(
                  (key, selectedIndex) => {
                    return (
                      <div
                        className={
                          this.state.selectedIndex === selectedIndex
                            ? "is-active"
                            : ""
                        }
                        onClick={() => this.setState({ selectedIndex })}
                      >
                        {manager.horizontal(
                          [2, 3],
                          manager.text(key, "right"),
                          manager.inputColor({
                            property: "mapping",
                            field: key,
                            noComputeLayout: true
                          })
                        )}
                      </div>
                    );
                  }
                )
              )
            )}
            {canAddLegend ? (
              <div className="action-buttons">
                <ButtonRaised
                  url={R.getSVGIcon("general/confirm")}
                  text={"Select value"}
                  onClick={() => {
                    if (this.state.selectedIndex != null) {
                      this.props.onSelect(this.state.selectedIndex);
                    }
                  }}
                />
              </div>
            ) : null}
          </section>
        </div>
      </div>
    );
  }
}
