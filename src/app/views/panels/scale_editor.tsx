// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import * as React from "react";
import * as R from "../../resources";

import { EventSubscription, Specification, uniqueID } from "../../../core";
import { Actions } from "../../actions";
import { ButtonRaised, EditableTextView } from "../../components";

import { AppStore } from "../../stores";
import { WidgetManager } from "./widgets/manager";
import { ReservedMappingKeyNamePrefix } from "../../../core/prototypes/legends/categorical_legend";
import { strings } from "../../../strings";
import { AttributeMap } from "../../../core/specification";

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
    if (scale.classID.startsWith("scale.format")) {
      canAddLegend = false;
    }
    let canExtendLegend = false;
    if (
      scale.classID === "scale.categorical<string,color>" ||
      scale.classID === "scale.categorical<date,color>"
    ) {
      canExtendLegend = true;
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
              {canExtendLegend ? (
                <>
                  <ButtonRaised
                    url={R.getSVGIcon("general/plus")}
                    text={strings.scaleEditor.add}
                    onClick={() => {
                      const mappingsKey = Object.keys(scale.properties.mapping);
                      const theLastMapping: string =
                        mappingsKey[mappingsKey.length - 1];
                      const value = (scale.properties.mapping as AttributeMap)[
                        theLastMapping
                      ];
                      new Actions.SetObjectProperty(
                        scale,
                        "mapping",
                        ReservedMappingKeyNamePrefix + uniqueID(),
                        value,
                        true,
                        true
                      ).dispatch(this.props.store.dispatcher);
                    }}
                  />
                  <ButtonRaised
                    url={R.getSVGIcon("general/minus")}
                    text={strings.scaleEditor.removeLast}
                    onClick={() => {
                      const mappingsKey = Object.keys(scale.properties.mapping);
                      const theLastMapping: string = mappingsKey[
                        mappingsKey.length - 1
                      ] as string;
                      if (
                        theLastMapping.startsWith(ReservedMappingKeyNamePrefix)
                      ) {
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
                </>
              ) : null}
              {canAddLegend ? (
                <ButtonRaised
                  url={R.getSVGIcon("legend/legend")}
                  text={
                    store.isLegendExistForScale(scale._id)
                      ? strings.scaleEditor.removeLegend
                      : strings.scaleEditor.addLegend
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
