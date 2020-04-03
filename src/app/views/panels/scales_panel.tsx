// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import * as React from "react";
import * as R from "../../resources";

import { EventSubscription, Prototypes } from "../../../core";
import { SVGImageIcon } from "../../components";

import { AppStore } from "../../stores";
import { ReorderListView } from "./object_list_editor";
import { ContextedComponent } from "../../context_component";
import {
  ScaleMapping,
  Glyph,
  ChartElement,
  ObjectProperties,
  Element,
  Scale
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
    this.tokens = [
      this.store.addListener(AppStore.EVENT_GRAPHICS, () => this.forceUpdate()),
      this.store.addListener(AppStore.EVENT_SELECTION, () => this.forceUpdate()),
      this.store.addListener(AppStore.EVENT_SAVECHART, () => this.forceUpdate())
   ]
  }

  public componentWillUnmount() {
    this.tokens.forEach(token => token.remove());
    this.tokens = [];
  }

  public renderUnexpectedState(message: string) {
    return (
      <div className="attribute-editor charticulator__widget-container">
        <div className="attribute-editor-unexpected">{message}</div>
      </div>
    );
  }

  private getPropertyDisplayName(name: string) {
    return name[0].toUpperCase() + name.slice(1);
  }

  public render(): any {
    const store = this.props.store;
    let scales = store.chart.scales;

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
        <div
          className="el-object-item"
          key={scaleID + "_" + element._id + "_" + key}
        >
          <SVGImageIcon
            url={R.getSVGIcon(
              Prototypes.ObjectClasses.GetMetadata(element.classID).iconPath
            )}
          />
          <span className="el-text">{`${
            element.properties.name
          }.${this.getPropertyDisplayName(key)}`}</span>
        </div>
      );
    };

    scales = scales.sort(
      (a: Scale<ObjectProperties>, b: Scale<ObjectProperties>) => {
        const lengthA =
          store.chart.elements.filter(elementFilterPredicate(a._id)).length +
          store.chart.glyphs
            .flatMap(
              (glyph: Glyph): Array<Element<ObjectProperties>> => glyph.marks
            )
            .filter(elementFilterPredicate(a._id)).length;

        const lengthB =
          store.chart.elements.filter(elementFilterPredicate(b._id)).length +
          store.chart.glyphs
            .flatMap(
              (glyph: any): Array<Element<ObjectProperties>> => glyph.marks
            )
            .filter(elementFilterPredicate(b._id)).length;

        return lengthA > lengthB ? -1 : lengthB > lengthA ? 1 : 0;
      }
    );

    return (
      <div className="charticulator__object-list-editor">
        {scales.map(scale => {
          return (
            <div key={scale._id}>
              <div key={scale._id} className="el-object-item">
                <SVGImageIcon
                  url={R.getSVGIcon(
                    Prototypes.ObjectClasses.GetMetadata(scale.classID).iconPath
                  )}
                />
                <span className="el-text">{scale.properties.name}</span>
              </div>
              <ReorderListView enabled={true} onReorder={(a, b) => {}}>
                {store.chart.elements
                  .filter(elementFilterPredicate(scale._id))
                  .flatMap((element: ChartElement<ObjectProperties>) => {
                    return elementFilterList(scale._id, element).map(
                      mapToUI(scale._id)(element)
                    );
                  })}
                {store.chart.glyphs
                  .flatMap(
                    (glyph: Glyph): Array<Element<ObjectProperties>> =>
                      glyph.marks
                  )
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
