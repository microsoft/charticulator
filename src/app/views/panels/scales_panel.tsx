// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import * as React from "react";
import * as R from "../../resources";

import { EventSubscription, Prototypes } from "../../../core";
import { SVGImageIcon } from "../../components";

import {
  AppStore,
} from "../../stores";
import { ReorderListView } from "./object_list_editor";
import { ContextedComponent } from "../../context_component";
import { classNames } from "../../utils";
import {
  ScaleMapping,
  Glyph,
  ChartElement,
  ObjectProperties
} from "../../../core/specification";

function getObjectIcon(classID: string) {
  return R.getSVGIcon(
    Prototypes.ObjectClasses.GetMetadata(classID).iconPath || "object"
  );
}

export class ScalesPanel extends ContextedComponent<
  {
    store: AppStore;
  },
  {}
> {
  public mappingButton: Element;
  private tokens: EventSubscription[];

  public componentDidMount() {
    this.tokens = [];
    this.tokens.push(
      this.store.addListener(AppStore.EVENT_GRAPHICS, () => this.forceUpdate())
    );
    this.tokens.push(
      this.store.addListener(AppStore.EVENT_SELECTION, () => this.forceUpdate())
    );
    this.tokens.push(
      this.store.addListener(AppStore.EVENT_SAVECHART, () => this.forceUpdate())
    );
  }

  public componentWillUnmount() {}

  public renderUnexpectedState(message: string) {
    return (
      <div className="attribute-editor charticulator__widget-container">
        <div className="attribute-editor-unexpected">{message}</div>
      </div>
    );
  }

  public render(): any {
    const store = this.props.store;
    const scales = store.chart.scales;
    const sel = this.store.currentSelection;

    const elementFilterPredicate = (scaleID: string) => (element: any) => {
      return (
        Object.keys(element.mappings).find(key => {
          const mapping = element.mappings[key];
          return (
            mapping.type === "scale" &&
            (mapping as ScaleMapping).scale === scaleID
          );
        }) != undefined
      );
    };

    const elementFilterList = (scaleID: string, element: any) => {
      return Object.keys(element.mappings).filter(key => {
        const mapping = element.mappings[key];
        return (
          mapping.type === "scale" &&
          (mapping as ScaleMapping).scale === scaleID
        );
      });
    };

    const mapToUI = (scaleID: string) => (element: any) => (key: string) => {
      return (
        <div className="el-object-item" key={scaleID + "_" + element._id + "_" + key}>
          <SVGImageIcon
            url={R.getSVGIcon(
              Prototypes.ObjectClasses.GetMetadata(element.classID).iconPath
            )}
          />
          <span className="el-text">{`${element.properties.name} / ${key}`}</span>
        </div>
      );
    };

    return (
      <div className="charticulator__object-list-editor">
          {scales.map(scale => {
            return (
              <div>
                <div
                  key={scale._id}
                  className="el-object-item"
                >
                  <SVGImageIcon
                    url={R.getSVGIcon(
                      Prototypes.ObjectClasses.GetMetadata(scale.classID)
                        .iconPath
                    )}
                  />
                  <span className="el-text">{scale.properties.name}</span>
                </div>
                <ReorderListView
                  enabled={true}
                  onReorder={(a, b) => {
                    // this.dispatch(new Actions.ReorderChartElement(a, b));
                  }}
                >
                  {store.chart.elements
                    .filter(elementFilterPredicate(scale._id))
                    .flatMap((element: ChartElement<ObjectProperties>) => {
                      return elementFilterList(scale._id, element).map(
                        mapToUI(scale._id)(element)
                      );
                    })}
                  {store.chart.glyphs
                    .flatMap((glyph: Glyph) => glyph.marks)
                    .filter(elementFilterPredicate(scale._id))
                    .flatMap((element: ChartElement<ObjectProperties>) => {
                      return elementFilterList(scale._id, element).map(
                        mapToUI(scale._id)(element)
                      );
                    })}
                </ReorderListView>
              </div>
            );
          })}
      </div>
    );
  }
}
