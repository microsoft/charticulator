// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import * as React from "react";
import * as R from "../../resources";

import { EventSubscription, Prototypes, Expression } from "../../../core";
import { SVGImageIcon, DraggableElement } from "../../components";

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
} from "../../../core/specification";
import { Actions, DragData } from "../..";
import { classNames } from "../../utils";
import { FunctionCall, Variable } from "../../../core/expression";
import { ColumnMetadata } from "../../../core/dataset";

// eslint-disable-next-line
function getObjectIcon(classID: string) {
  return R.getSVGIcon(
    Prototypes.ObjectClasses.GetMetadata(classID).iconPath || "object"
  );
}

export class ScalesPanel extends ContextedComponent<
  {
    store: AppStore;
  },
  {
    isSelected: string;
  }
> {
  public mappingButton: Element;
  private tokens: EventSubscription[];

  constructor(props: { store: AppStore }) {
    super(props, null);
    this.state = {
      isSelected: "",
    };
  }

  public componentDidMount() {
    this.tokens = [
      this.store.addListener(AppStore.EVENT_GRAPHICS, () => this.forceUpdate()),
      this.store.addListener(AppStore.EVENT_SELECTION, () =>
        this.forceUpdate()
      ),
      this.store.addListener(AppStore.EVENT_SAVECHART, () =>
        this.forceUpdate()
      ),
    ];
  }

  public componentWillUnmount() {
    this.tokens.forEach((token) => token.remove());
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

  // eslint-disable-next-line
  public render(): any {
    const store = this.props.store;
    let scales = store.chart.scales;

    const filterElementByScalePredicate = (scaleID: string) => (
      element: any
    ) => {
      return (
        Object.keys(element.mappings).find((key) => {
          const mapping = element.mappings[key];
          return (
            mapping.type === "scale" &&
            (mapping as ScaleMapping).scale === scaleID
          );
        }) != undefined
      );
    };

    const filterElementProperties = (scaleID: string, element: any) => {
      return Object.keys(element.mappings).filter((key) => {
        const mapping = element.mappings[key];
        return (
          mapping.type === "scale" &&
          (mapping as ScaleMapping).scale === scaleID
        );
      });
    };

    // eslint-disable-next-line
    const mapToUI = (scale: Scale<ObjectProperties>) => (
      glyph: Glyph,
      element: ChartElement<ObjectProperties>
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
        const expr = (element.mappings[key] as any).expression;
        let rawColumnExpr: string = null; // TODO handle
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
            <DraggableElement
              key={key}
              className={classNames("charticulator__scale-panel-property", [
                "is-active",
                this.state.isSelected === expr,
              ])}
              onDragStart={() => this.setState({ isSelected: expr })}
              onDragEnd={() => this.setState({ isSelected: null })}
              dragData={() => {
                const type = (element.mappings[key] as any).valueType;
                const scaleID = (element.mappings[key] as any).scale;
                const allowSelectValue = (element.mappings[key] as any)
                  .allowSelectValue;
                const aggregation = Expression.getDefaultAggregationFunction(
                  type
                );

                const applyAggregation = (expr: string) => {
                  return Expression.functionCall(
                    aggregation,
                    Expression.parse(expr)
                  ).toString();
                };

                const table = this.store.dataset.tables.find(
                  (table) => table.name === (element.mappings[key] as any).table
                );

                const parsedExpression = Expression.parse(expr);
                let metadata: ColumnMetadata = {};
                if (
                  parsedExpression instanceof FunctionCall &&
                  parsedExpression.args[0] instanceof Variable
                ) {
                  const firstArgument = parsedExpression.args[0] as Variable;

                  const column = table.columns.find(
                    (col) => col.name === firstArgument.name
                  );
                  metadata = column.metadata;

                  rawColumnExpr =
                    metadata.rawColumnName &&
                    applyAggregation(metadata.rawColumnName);
                }

                this.setState({ isSelected: expr });
                const r = new DragData.DataExpression(
                  table,
                  expr,
                  type,
                  metadata,
                  rawColumnExpr,
                  scaleID,
                  allowSelectValue
                );
                return r;
              }}
              renderDragElement={() => [
                <span className="dragging-table-cell">
                  {(element.mappings[key] as any).expression}
                </span>,
                { x: -10, y: -8 },
              ]}
            >
              <SVGImageIcon
                url={R.getSVGIcon(
                  Prototypes.ObjectClasses.GetMetadata(element.classID).iconPath
                )}
              />
              <span className="el-text">{`${
                element.properties.name
              }.${this.getPropertyDisplayName(key)}`}</span>
            </DraggableElement>
          </div>
        );
      }
    };

    scales = scales.sort(
      (a: Scale<ObjectProperties>, b: Scale<ObjectProperties>) => {
        if (a.properties.name < b.properties.name) {
          return -1;
        }
        if (a.properties.name > b.properties.name) {
          return 1;
        }
        return 0;
      }
    );

    // Collect all used scales and object with properties into one list
    const propertyList = scales.flatMap((scale) => {
      return [0]
        .map(() => {
          return {
            scale,
            mark: null as ChartElement<ObjectProperties>,
            property: null as string,
            glyph: null as Glyph,
          };
        })
        .concat(
          // take all chart elements
          store.chart.elements
            // filter elements by scale
            .filter(filterElementByScalePredicate(scale._id))
            .flatMap((mark: ChartElement<ObjectProperties>) => {
              // Take all properties of object/element where scale was used and map them into {property, element, scale} object/element
              return filterElementProperties(scale._id, mark).map(
                (property) => {
                  return {
                    property,
                    mark,
                    scale,
                    glyph: null,
                  };
                }
              );
            })
        )
        .concat(
          store.chart.glyphs
            // map all glyphs into {glyph & marks} group
            .flatMap((glyph: Glyph): {
              glyph: Glyph;
              mark: Element<ObjectProperties>;
            }[] =>
              glyph.marks.map((mark) => {
                return {
                  glyph,
                  mark,
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
              ({
                mark,
                glyph,
              }: {
                glyph: Glyph;
                mark: Element<ObjectProperties>;
              }) => {
                return filterElementProperties(scale._id, mark).map(
                  (property) => {
                    return {
                      property,
                      mark,
                      scale,
                      glyph,
                    };
                  }
                );
              }
            )
        );
    });

    return (
      <div className="charticulator__object-list-editor charticulator__object-scales">
        <ReorderListView
          restrict={true}
          enabled={true}
          onReorder={(IndexA, IndexB) => {
            console.log(propertyList[IndexA]);
            console.log(propertyList[IndexB]);

            // Drag properties item only
            if (!propertyList[IndexA].property || IndexA === IndexB) {
              return;
            }

            // Find next scale in the list
            if (IndexB > 0) {
              IndexB--;
            }
            while (
              IndexB > 0 &&
              !propertyList[IndexB] &&
              propertyList[IndexB].property != null
            ) {
              IndexB--;
            }

            store.dispatcher.dispatch(
              new Actions.SetObjectMappingScale(
                propertyList[IndexA].mark,
                propertyList[IndexA].property,
                propertyList[IndexB].scale._id
              )
            );
          }}
        >
          {propertyList.map((el) => {
            return mapToUI(el.scale)(el.glyph, el.mark)(el.property);
          })}
        </ReorderListView>
      </div>
    );
  }
}
