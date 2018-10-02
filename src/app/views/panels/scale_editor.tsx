// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import * as React from "react";
import * as R from "../../resources";

import { EventSubscription, Specification } from "../../../core";
import { Actions } from "../../actions";
import { ButtonRaised, EditableTextView } from "../../components";

import { AppStore } from "../../stores";
import { WidgetManager } from "./widgets/manager";

export interface ScaleEditorProps {
  scale: Specification.Scale;
  scaleMapping: Specification.ScaleMapping;
  store: AppStore;
}

export interface ScaleEditorState {}

export class ScaleEditor extends React.Component<
  ScaleEditorProps,
  ScaleEditorState
> {
  public token: EventSubscription;

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
        style={{ width: "300px", padding: "10px" }}
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
            {manager.vertical(...scaleClass.getAttributePanelWidgets(manager))}
            {canAddLegend ? (
              <div className="action-buttons">
                <ButtonRaised
                  url={R.getSVGIcon("legend/legend")}
                  text={
                    store.isLegendExistForScale(scale._id)
                      ? "Remove Legend"
                      : "Add Legend"
                  }
                  onClick={() => {
                    new Actions.ToggleLegendForScale(scale._id).dispatch(
                      store.dispatcher
                    );
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
