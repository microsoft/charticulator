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
  Scale,
  Chart
} from "../../../core/specification";
import { Actions } from "../..";

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
      this.store.addListener(AppStore.EVENT_SELECTION, () =>
        this.forceUpdate()
      ),
      this.store.addListener(AppStore.EVENT_SAVECHART, () => this.forceUpdate())
    ];
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

    const filterElementByScalePredicate = (scaleID: string) => (
      element: any
    ) => {
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

    const filterElementProperties = (scaleID: string, element: any) => {
      return Object.keys(element.mappings).filter(key => {
        const mapping = element.mappings[key];
        return (
          mapping.type === "scale" &&
          (mapping as ScaleMapping).scale === scaleID
        );
      });
    };

    const scaleFilter = (scale: Scale<ObjectProperties>) => {
      let found = false;
      const scaleID: string = scale._id;
      store.chart.glyphs.forEach(glyph => {
        glyph.marks.forEach(mark => {
          const mappingFound = filterElementByScalePredicate(scaleID)(mark);
          if (mappingFound) {
            found = true;
          }
        });
      });
      store.chart.elements.forEach(mark => {
        const mappingFound = filterElementByScalePredicate(scaleID)(mark);
        if (mappingFound) {
          found = true;
        }
      });

      return found;
    };

    const mapToUI = (scale: Scale<ObjectProperties>) => (
      glyph: Glyph,
      element: any
    ) => (key: string) => {
      if (!element) {
        return (
          <div key={scale._id} className="el-object-item">
            <SVGImageIcon
              url={R.getSVGIcon(
                Prototypes.ObjectClasses.GetMetadata(scale.classID).iconPath
              )}
            />
            <span className="el-text">{scale.properties.name}</span>
          </div>
        );
      } else {
        return (
          <div
            className="el-object-item el-object-scale-attribute"
            key={scale._id + "_" + element._id + "_" + key}
            onClick={() => {
              if (glyph) {
                this.dispatch(new Actions.SelectMark(null, glyph, element));
              } else {
                this.dispatch(new Actions.SelectChartElement(element));
              }
              this.dispatch(new Actions.FocusToMarkAttribute(key));
            }}
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
      }
    };

    scales = scales
      .sort((a: Scale<ObjectProperties>, b: Scale<ObjectProperties>) => {
        const lengthA =
          store.chart.elements.filter(filterElementByScalePredicate(a._id))
            .length +
          store.chart.glyphs
            .flatMap(
              (glyph: Glyph): Array<Element<ObjectProperties>> => glyph.marks
            )
            .filter(filterElementByScalePredicate(a._id)).length;

        const lengthB =
          store.chart.elements.filter(filterElementByScalePredicate(b._id))
            .length +
          store.chart.glyphs
            .flatMap(
              (glyph: any): Array<Element<ObjectProperties>> => glyph.marks
            )
            .filter(filterElementByScalePredicate(b._id)).length;

        return lengthA > lengthB ? -1 : lengthB > lengthA ? 1 : 0;
      })
      .filter(scale => scaleFilter(scale));

    // Collect all used scales and object with properties into one list
    const propertyList = scales.filter(scaleFilter).flatMap(scale => {
      return [0]
        .map(() => {
          return {
            scale,
            mark: null,
            property: null
          };
        })
        .concat(
          // take all chart elements
          store.chart.elements
            // filter elements by scale
            .filter(filterElementByScalePredicate(scale._id))
            .flatMap((mark: ChartElement<ObjectProperties>) => {
              // Take all properties of object/element where scale was used and map them into {property, element, scale} object/element
              return filterElementProperties(scale._id, mark).map(property => {
                return {
                  property,
                  mark,
                  scale
                };
              });
            })
        )
        .concat(
          store.chart.glyphs
            // map all glyphs into {glyph & marks} group
            .flatMap(
              (
                glyph: Glyph
              ): Array<{ glyph: Glyph; mark: Element<ObjectProperties> }> =>
                glyph.marks.map(mark => {
                  return {
                    glyph,
                    mark
                  };
                })
            )
            // filter elements by scale
            .filter(
              ({ mark }: { glyph: Glyph; mark: Element<ObjectProperties> }) =>
                filterElementByScalePredicate(scale._id)(mark)
            )
            // Take all properties of object/element where scale was used and map them into {property, element, scale} object/element
            .flatMap(
              ({ mark }: { glyph: Glyph; mark: Element<ObjectProperties> }) => {
                return filterElementProperties(scale._id, mark).map(
                  property => {
                    return {
                      property,
                      mark,
                      scale
                    };
                  }
                );
              }
            )
        );
    });

    return (
      <div className="charticulator__object-list-editor charticulator__object-scales">
        <ReorderListView enabled={true} onReorder={(a, b) => {}}>
          {propertyList.map(el => {
            return mapToUI(el.scale)(null, el.mark)(el.property);
          })}
        </ReorderListView>
      </div>
    );
  }
}
