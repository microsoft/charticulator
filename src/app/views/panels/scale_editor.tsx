// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import * as React from "react";
import * as R from "../../resources";

import { EventSubscription, Specification, uniqueID } from "../../../core";
import { Actions } from "../../actions";
import { ButtonRaised, EditableTextView } from "../../components";

import { AppStore } from "../../stores";
import { WidgetManager } from "./widgets/manager";
import { ReserverMappingKeyNamePrefix } from "../../../core/prototypes/legends/categorical_legend";

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
    const { scale, store, scaleMapping } = this.props;
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
    const canExtendLegend = true;
    if (scale.classID.startsWith("scale.format")) {
      canAddLegend = false;
    }
    return (
      <div
        className="scale-editor-view"
        style={{ width: "550px", padding: "10px" }}
      >
        <div className="attribute-editor">
          <section className="attribute-editor-element">
            <div className="header">
              <EditableTextView
                text={scale.properties.name}
                onEdit={(newText) => {
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
            <div className="action-buttons">
              <ButtonRaised
                url={R.getSVGIcon("general/plus")}
                text={"Add mapping"}
                onClick={() => {
                  const mappingsKey = Object.keys(scale.properties.mapping);
                  const theLastMapping: any = mappingsKey[
                    mappingsKey.length - 1
                  ] as any;
                  const value = (scale.properties.mapping as any)[
                    theLastMapping
                  ] as any;
                  new Actions.SetObjectProperty(
                    scale,
                    "mapping",
                    ReserverMappingKeyNamePrefix + uniqueID(),
                    value,
                    true,
                    true
                  ).dispatch(this.props.store.dispatcher);
                }}
              />
              <ButtonRaised
                url={R.getSVGIcon("general/minus")}
                text={"Remove the last mapping"}
                onClick={() => {
                  const mappingsKey = Object.keys(scale.properties.mapping);
                  const theLastMapping: string = mappingsKey[
                    mappingsKey.length - 1
                  ] as string;
                  if (theLastMapping.startsWith(ReserverMappingKeyNamePrefix)) {
                    new Actions.DeleteObjectProperty(
                      scale,
                      "mapping",
                      theLastMapping,
                      true,
                      true
                    ).dispatch(this.props.store.dispatcher);
                  }
                }}
              />
              {canAddLegend ? (
                <ButtonRaised
                  url={R.getSVGIcon("legend/legend")}
                  text={
                    store.isLegendExistForScale(scale._id)
                      ? "Remove Legend"
                      : "Add Legend"
                  }
                  onClick={() => {
                    new Actions.ToggleLegendForScale(
                      scale._id,
                      scaleMapping
                    ).dispatch(store.dispatcher);
                  }}
                />
              ) : null}
            </div>
          </section>
        </div>
      </div>
    );
  }
}
