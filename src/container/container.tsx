/*
Copyright (c) Microsoft Corporation. All rights reserved.
Licensed under the MIT license.
*/
import { renderGraphicalElementSVG } from "../app/renderer";
import {
  Color,
  Dataset,
  deepClone,
  Expression,
  getById,
  getByName,
  getField,
  Graphics,
  Prototypes,
  Scale,
  setField,
  Solver,
  Specification,
  ClearSelection,
  SelectMark,
  Action,
  EventSubscription
} from "../core";
import { getDefaultColorPalette } from "../core/prototypes/scales/categorical";
import { ChartStore, ChartSelection } from "./chart_store";
import * as React from "react";
import * as ReactDOM from "react-dom";

export * from "../core";

export class ChartTemplate {
  private template: Specification.Template.ChartTemplate;
  private slotAssignment: { [name: string]: string };
  private tableAssignment: { [name: string]: string };

  constructor(template: Specification.Template.ChartTemplate) {
    this.template = template;
    this.slotAssignment = {};
    this.tableAssignment = {};
  }

  public getSlots(): Specification.Template.DataSlot[] {
    return this.template.dataSlots;
  }

  public reset() {
    this.slotAssignment = {};
    this.tableAssignment = {};
  }

  public assignTable(tableName: string, table: string) {
    this.tableAssignment[tableName] = table;
  }
  public assignSlot(slotName: string, expression: string) {
    this.slotAssignment[slotName] = expression;
  }

  public findObjectById(
    spec: Specification.Chart,
    id: string
  ): Specification.Object {
    if (spec._id == id) {
      return spec;
    }
    let obj =
      getById(spec.scales, id) ||
      getById(spec.elements, id) ||
      getById(spec.glyphs, id);
    if (obj != null) {
      return obj;
    }
    for (const glyph of spec.glyphs) {
      obj = getById(glyph.marks, id);
      if (obj != null) {
        return obj;
      }
    }
    return null;
  }

  public setProperty(
    object: Specification.Object,
    property: string,
    field: string | string[] = null,
    value: any
  ) {
    if (field != null) {
      setField(object.properties[property], field, value);
    } else {
      object.properties[property] = value;
    }
  }

  public getProperty(
    object: Specification.Object,
    property: string,
    field: string | string[] = null
  ) {
    if (field != null) {
      return getField(object.properties[property], field);
    } else {
      return object.properties[property];
    }
  }

  public instantiate(dataset: Dataset.Dataset) {
    const template = deepClone(this.template);

    const df = new Prototypes.Dataflow.DataflowManager(dataset);
    const getExpressionVector = (table: string, expression: string): any[] => {
      const expr = Expression.parse(expression);
      const tableContext = df.getTable(table);
      const r = [];
      for (let i = 0; i < tableContext.rows.length; i++) {
        const ctx = tableContext.getRowContext(i);
        const value = expr.getValue(ctx);
        r.push(value);
      }
      return r;
    };

    // Assign slots.
    for (const id in template.inference) {
      if (template.inference.hasOwnProperty(id)) {
        const object = this.findObjectById(template.specification, id);
        if (object) {
          for (const inference of template.inference[id]) {
            switch (inference.type) {
              case "axis":
                {
                  const axis = inference as Specification.Template.Axis;
                  const expression = this.slotAssignment[axis.slotName];
                  const slot = getByName(
                    this.template.dataSlots,
                    axis.slotName
                  );
                  if (expression == null || slot == null) {
                    continue;
                  }
                  const original = this.getProperty(
                    object,
                    axis.property,
                    axis.fields
                  ) as Specification.Types.AxisDataBinding;
                  original.expression = expression;
                  // Infer scale domain or mapping
                  const columnVector = getExpressionVector(
                    this.tableAssignment[slot.table],
                    expression
                  );
                  switch (original.type) {
                    case "categorical":
                      {
                        const scale = new Scale.CategoricalScale();
                        scale.inferParameters(columnVector, "order");
                        original.categories = new Array<string>(
                          scale.domain.size
                        );
                        scale.domain.forEach((index, key) => {
                          original.categories[index] = key;
                        });
                      }
                      break;
                    case "numerical":
                      {
                        const scale = new Scale.NumericalScale();
                        scale.inferParameters(columnVector);
                        original.domainMin = scale.domainMin;
                        original.domainMax = scale.domainMax;
                      }
                      break;
                  }

                  this.setProperty(
                    object,
                    axis.property,
                    axis.fields,
                    original
                  );
                }
                break;
              case "scale":
                {
                  const scale = inference as Specification.Template.Scale;
                  const expression = this.slotAssignment[scale.slotName];
                  const slot = getByName(
                    this.template.dataSlots,
                    scale.slotName
                  );
                  // TODO: infer scale domain or mapping
                  const columnVector = getExpressionVector(
                    this.tableAssignment[slot.table],
                    expression
                  );
                  switch (scale.slotKind) {
                    case "numerical":
                      {
                        const s = new Scale.NumericalScale();
                        s.inferParameters(columnVector);
                        object.properties[scale.properties.min] = s.domainMin;
                        object.properties[scale.properties.max] = s.domainMax;
                        // Zero domain min for now.
                        object.properties[scale.properties.min] = 0;
                      }
                      break;
                    case "categorical":
                      {
                        const s = new Scale.CategoricalScale();
                        s.inferParameters(columnVector, "order");
                        switch (scale.rangeType) {
                          case "number":
                            {
                              const mapping: { [name: string]: number } = {};
                              s.domain.forEach((index, key) => {
                                mapping[key] = index;
                              });
                              object.properties[
                                scale.properties.mapping
                              ] = mapping;
                            }
                            break;
                          case "color": {
                            const mapping: { [name: string]: Color } = {};
                            const palette = getDefaultColorPalette(
                              s.domain.size
                            );
                            s.domain.forEach((index, key) => {
                              mapping[key] = palette[index % palette.length];
                            });
                            object.properties[
                              scale.properties.mapping
                            ] = mapping;
                          }
                        }
                      }
                      break;
                  }
                }
                break;
              case "order":
                {
                  const order = inference as Specification.Template.Order;
                  const expression = this.slotAssignment[order.slotName];
                  const slot = getByName(
                    this.template.dataSlots,
                    order.slotName
                  );
                  this.setProperty(
                    object,
                    order.property,
                    order.field,
                    "sortBy((x) => x." + expression + ")"
                  );
                }
                break;
              case "slot-list":
                {
                  const slotList = inference as Specification.Template.SlotList;
                  const expressions = slotList.slots.map(slot => {
                    return this.slotAssignment[slot.slotName];
                  });
                  this.setProperty(
                    object,
                    slotList.property,
                    slotList.fields,
                    expressions
                  );
                }
                break;
            }
          }
        }
      }
    }
    for (const id in template.mappings) {
      if (template.mappings.hasOwnProperty(id)) {
        const object = this.findObjectById(template.specification, id);
        if (object) {
          for (const mapping of template.mappings[id]) {
            const mappingItem = object.mappings[mapping.attribute];
            if (mappingItem.type == "scale") {
              const scaleMapping = mappingItem as Specification.ScaleMapping;
              scaleMapping.expression = this.slotAssignment[mapping.slotName];
            }
          }
        }
      }
    }

    // Set table
    for (const element of template.specification.elements) {
      if (Prototypes.isType(element.classID, "plot-segment")) {
        const plotSegment = element as Specification.PlotSegment;
        plotSegment.table = this.tableAssignment[plotSegment.table];
      }
      if (Prototypes.isType(element.classID, "links")) {
        switch (element.classID) {
          case "links.through":
            {
              const props = element.properties as Prototypes.Links.LinksProperties;
              if (props.linkThrough.facetExpressions) {
                props.linkThrough.facetExpressions = props.linkThrough.facetExpressions.map(
                  x => this.slotAssignment[x]
                );
              }
            }
            break;
        }
      }
    }
    for (const glyph of template.specification.glyphs) {
      glyph.table = this.tableAssignment[glyph.table];
    }
    return new ChartContainer(template.specification, dataset);
  }
}

export class ChartContainer {
  // Needed for extensions
  public chart: Specification.Chart;

  private renderer: Graphics.ChartRenderer;
  private containerElement: HTMLElement;
  private store: ChartStore;

  // This cache should work for now
  private plotSegments: Array<{
    segment: Specification.PlotSegment;
    state: Specification.PlotSegmentState;
  }>;

  constructor(specification: Specification.Chart, dataset: Dataset.Dataset) {
    this.store = new ChartStore(specification, dataset);
    this.chart = specification;
    this.renderer = new Graphics.ChartRenderer(this.store.manager);
    this.plotSegments = this.chart.elements
      .map((e, layoutIndex) => {
        if (Prototypes.isType(e.classID, "plot-segment")) {
          return {
            segment: e as Specification.PlotSegment,
            state: this.store.state.elements[
              layoutIndex
            ] as Specification.PlotSegmentState
          };
        }
      })
      .filter(n => !!n);
    this.store.addListener(ChartStore.EVENT_SELECTION, this.onSelectionChanged);
  }

  /**
   * Listens for when the selection changed within the store
   */
  private onSelectionChanged = () => {
    // When the selection has changed, rerender
    this.render(this.containerElement);
  };

  /**
   * Listener for when an element is selected on the renderer
   */
  private onElementSelected = (element?: Graphics.MarkElement) => {
    // let action: Action;
    // // The user selected nothing, so clear the selection
    // if (!element || !element.mark) {
    //   action = new ClearSelection();
    //   // Otherwise, the user selected some useful mark
    // } else {
    //   const { mark, glyph, glyphIndex } = element;
    //   const pss = this.plotSegments.filter(
    //     n => n.segment.glyph === glyph._id
    //   )[0].state;
    //   const dataRowIndex = pss.dataRowIndices[glyphIndex];
    //   action = new SelectMark(glyph, mark, dataRowIndex);
    // }
    // if (action) {
    //   this.store.dispatcher.dispatch(action);
    // }
  };

  /**
   * Applies the current selection state to the glyphs
   */
  private applySelectionToGlyphs() {
    const selection = this.store.currentSelection;
    if (selection) {
      this.plotSegments.forEach(({ state, segment }) =>
        state.glyphs.forEach((gs, index) => {
          // Mark all glyphs that have the same dataRowIndex as the one that was selected
          gs.emphasized =
            state.dataRowIndices[index].indexOf(selection.dataIndex) >= 0 &&
            segment.table === selection.table;
        })
      );
    } else {
      // Reset the emphasized state on the glyphs, as nothing is emphasized anymore
      this.plotSegments.forEach(({ state }) =>
        state.glyphs.forEach(g => delete g.emphasized)
      );
    }
  }

  /**
   * Gets the current selection
   */
  public get currentSelection(): ChartSelection | undefined {
    return this.store.currentSelection;
  }

  /**
   * Sets the current selection
   * @param value The new selection
   */
  public set currentSelection(value: ChartSelection | undefined) {
    this.store.setSelection(value);
  }

  /**
   * Adds a listener to the chart container
   * @param event The event to listen to
   * @param listener The listener to add
   */
  public addListener(event: string, listener: Function) {
    return this.store.addListener(event, listener);
  }

  /**
   * Removes a subscribed listener
   * @param sub The subscription
   */
  public removeSubscription(sub: EventSubscription) {
    return this.store.removeSubscription(sub);
  }

  public update() {
    for (let i = 0; i < 2; i++) {
      const solver = new Solver.ChartConstraintSolver();
      solver.setup(this.store.manager);
      solver.solve();
      solver.destroy();
    }
  }

  public resize(width: number, height: number) {
    this.store.chart.mappings.width = {
      type: "value",
      value: width
    } as Specification.ValueMapping;
    this.store.chart.mappings.height = {
      type: "value",
      value: height
    } as Specification.ValueMapping;
  }

  public render(containerElement: HTMLElement) {
    if (!containerElement) {
      throw new Error("Container element required");
    }

    this.applySelectionToGlyphs();

    this.containerElement = containerElement;

    const { width, height } = this.store.chart.mappings as any;

    const graphics = this.renderer.render();
    const rendered = (
      <svg
        className="canvas-view"
        x={0}
        y={0}
        width={width.value}
        height={height.value}
        onClick={() => this.onElementSelected()}
      >
        <g transform={`translate(${width.value / 2}, ${height.value / 2})`}>
          {renderGraphicalElementSVG(graphics, {
            onSelected: this.onElementSelected
          })}
        </g>
      </svg>
    );

    ReactDOM.render(rendered, containerElement);
  }
}
