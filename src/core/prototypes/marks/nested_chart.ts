// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { deepClone, getByName, Point, uniqueID } from "../../common";
import * as Dataset from "../../dataset";
import * as Graphics from "../../graphics";
import { ConstraintSolver, ConstraintStrength } from "../../solver";
import * as Specification from "../../specification";
import {
  BoundingBox,
  Controls,
  DropZones,
  Handles,
  ObjectClassMetadata,
  SnappingGuides,
  TemplateParameters
} from "../common";
import { ChartStateManager } from "../state";
import { EmphasizableMarkClass } from "./emphasis";
import {
  nestedChartAttributes,
  NestedChartElementAttributes,
  NestedChartElementProperties
} from "./nested_chart.attrs";

export { NestedChartElementAttributes, NestedChartElementProperties };

export class NestedChartElementClass extends EmphasizableMarkClass<
  NestedChartElementProperties,
  NestedChartElementAttributes
> {
  public static classID = "mark.nested-chart";
  public static type = "mark";

  public static metadata: ObjectClassMetadata = {
    displayName: "NestedChart",
    iconPath: "mark/nested-chart",
    creatingInteraction: {
      type: "rectangle",
      mapping: { xMin: "x1", yMin: "y1", xMax: "x2", yMax: "y2" }
    }
  };

  public static defaultProperties: Partial<NestedChartElementProperties> = {
    visible: true
  };

  public static defaultMappingValues: Partial<NestedChartElementAttributes> = {
    opacity: 1,
    visible: true
  };

  public attributes = nestedChartAttributes;
  public attributeNames = Object.keys(nestedChartAttributes);

  // Initialize the state of an element so that everything has a valid value
  public initializeState(): void {
    super.initializeState();

    const defaultWidth = 30;
    const defaultHeight = 50;
    const attrs = this.state.attributes;
    attrs.x1 = -defaultWidth / 2;
    attrs.y1 = -defaultHeight / 2;
    attrs.x2 = +defaultWidth / 2;
    attrs.y2 = +defaultHeight / 2;
    attrs.cx = 0;
    attrs.cy = 0;
    attrs.width = defaultWidth;
    attrs.height = defaultHeight;
    attrs.opacity = 1;
    attrs.visible = true;
  }

  public getAttributePanelWidgets(
    manager: Controls.WidgetManager
  ): Controls.Widget[] {
    let widgets: Controls.Widget[] = [
      manager.sectionHeader("Size & Shape"),
      manager.mappingEditor("Width", "width", {
        hints: { autoRange: true },
        acceptKinds: [Specification.DataKind.Numerical],
        defaultAuto: true
      }),
      manager.mappingEditor("Height", "height", {
        hints: { autoRange: true },
        acceptKinds: [Specification.DataKind.Numerical],
        defaultAuto: true
      })
    ];
    widgets = widgets.concat([
      manager.mappingEditor("Opacity", "opacity", {
        hints: { rangeNumber: [0, 1] },
        defaultValue: 1,
        numberOptions: { showSlider: true, minimum: 0, maximum: 1 }
      }),
      manager.mappingEditor("Visibility", "visible", {
        defaultValue: true
      })
    ]);
    widgets = widgets.concat([
      manager.nestedChartEditor(
        { property: "specification" },
        {
          specification: this.object.properties.specification,
          dataset: this.getDataset(0),
          width: this.state.attributes.width,
          height: this.state.attributes.height
        }
      )
    ]);
    return widgets;
  }

  // Get intrinsic constraints between attributes (e.g., x2 - x1 = width for rectangles)
  public buildConstraints(solver: ConstraintSolver): void {
    const [x1, y1, x2, y2, cx, cy, width, height] = solver.attrs(
      this.state.attributes,
      ["x1", "y1", "x2", "y2", "cx", "cy", "width", "height"]
    );
    solver.addLinear(
      ConstraintStrength.HARD,
      0,
      [[1, x2], [-1, x1]],
      [[1, width]]
    );
    solver.addLinear(
      ConstraintStrength.HARD,
      0,
      [[1, y2], [-1, y1]],
      [[1, height]]
    );
    solver.addLinear(ConstraintStrength.HARD, 0, [[2, cx]], [[1, x1], [1, x2]]);
    solver.addLinear(ConstraintStrength.HARD, 0, [[2, cy]], [[1, y1], [1, y2]]);
  }

  public getDataset(glyphIndex: number): Dataset.Dataset {
    const manager = this.getChartClass().manager;
    const plotSegmentClass = this.getPlotSegmentClass();
    const table = getByName(
      manager.dataset.tables,
      plotSegmentClass.object.table
    );
    let columnNameMap = this.object.properties.columnNameMap;
    if (columnNameMap == null) {
      columnNameMap = {};
      for (const c of table.columns) {
        columnNameMap[c.name] = c.name;
      }
      this.object.properties.columnNameMap = columnNameMap;
    }
    const dataRows = plotSegmentClass.state.dataRowIndices[glyphIndex].map(
      i => {
        const data = table.rows[i];
        const r: Dataset.Row = { _id: data._id };
        for (const col in columnNameMap) {
          r[columnNameMap[col]] = data[col];
        }
        return r;
      }
    );
    return {
      name: "NestedData",
      tables: [
        {
          name: "MainTable",
          displayName: "MainTable",
          columns: table.columns.map(x => {
            return {
              name: columnNameMap[x.name],
              type: x.type,
              metadata: x.metadata
            };
          }),
          rows: dataRows
        }
      ]
    };
  }

  // Get the graphical element from the element
  public getGraphics(
    cs: Graphics.CoordinateSystem,
    offset: Point,
    glyphIndex = 0,
    manager: ChartStateManager,
    empasized?: boolean
  ): Graphics.Element {
    const attrs = this.state.attributes;
    if (!attrs.visible || !this.object.properties.visible) {
      return null;
    }
    const g = Graphics.makeGroup([
      {
        type: "chart-container",
        dataset: this.getDataset(glyphIndex),
        chart: deepClone(this.object.properties.specification),
        selectable: {
          plotSegment: this.getPlotSegmentClass().object,
          glyphIndex,
          rowIndices: this.getPlotSegmentClass().state.dataRowIndices[
            glyphIndex
          ]
        },
        width: attrs.width,
        height: attrs.height
      } as Graphics.ChartContainerElement
    ]);
    g.transform = { angle: 0, x: -attrs.width / 2, y: attrs.height / 2 };
    const gContainer = Graphics.makeGroup([g]);
    gContainer.transform = cs.getLocalTransform(
      attrs.cx + offset.x,
      attrs.cy + offset.y
    );
    return gContainer;
  }

  // Get DropZones given current state
  public getDropZones(): DropZones.Description[] {
    const attrs = this.state.attributes;
    const { x1, y1, x2, y2 } = attrs;
    return [
      {
        type: "line",
        p1: { x: x2, y: y1 },
        p2: { x: x1, y: y1 },
        title: "width",
        accept: { kind: Specification.DataKind.Numerical },
        dropAction: {
          scaleInference: {
            attribute: "width",
            attributeType: Specification.AttributeType.Number,
            hints: { autoRange: true }
          }
        }
      } as DropZones.Line,
      {
        type: "line",
        p1: { x: x1, y: y1 },
        p2: { x: x1, y: y2 },
        title: "height",
        accept: { kind: Specification.DataKind.Numerical },
        dropAction: {
          scaleInference: {
            attribute: "height",
            attributeType: Specification.AttributeType.Number,
            hints: { autoRange: true }
          }
        }
      } as DropZones.Line
    ];
  }
  // Get bounding rectangle given current state
  public getHandles(): Handles.Description[] {
    const attrs = this.state.attributes;
    const { x1, y1, x2, y2 } = attrs;
    return [
      {
        type: "line",
        axis: "x",
        actions: [{ type: "attribute", attribute: "x1" }],
        value: x1,
        span: [y1, y2]
      } as Handles.Line,
      {
        type: "line",
        axis: "x",
        actions: [{ type: "attribute", attribute: "x2" }],
        value: x2,
        span: [y1, y2]
      } as Handles.Line,
      {
        type: "line",
        axis: "y",
        actions: [{ type: "attribute", attribute: "y1" }],
        value: y1,
        span: [x1, x2]
      } as Handles.Line,
      {
        type: "line",
        axis: "y",
        actions: [{ type: "attribute", attribute: "y2" }],
        value: y2,
        span: [x1, x2]
      } as Handles.Line,
      {
        type: "point",
        x: x1,
        y: y1,
        actions: [
          { type: "attribute", source: "x", attribute: "x1" },
          { type: "attribute", source: "y", attribute: "y1" }
        ]
      } as Handles.Point,
      {
        type: "point",
        x: x1,
        y: y2,
        actions: [
          { type: "attribute", source: "x", attribute: "x1" },
          { type: "attribute", source: "y", attribute: "y2" }
        ]
      } as Handles.Point,
      {
        type: "point",
        x: x2,
        y: y1,
        actions: [
          { type: "attribute", source: "x", attribute: "x2" },
          { type: "attribute", source: "y", attribute: "y1" }
        ]
      } as Handles.Point,
      {
        type: "point",
        x: x2,
        y: y2,
        actions: [
          { type: "attribute", source: "x", attribute: "x2" },
          { type: "attribute", source: "y", attribute: "y2" }
        ]
      } as Handles.Point
    ];
  }

  public getBoundingBox(): BoundingBox.Description {
    const attrs = this.state.attributes;
    const { x1, y1, x2, y2 } = attrs;
    return {
      type: "rectangle",
      cx: (x1 + x2) / 2,
      cy: (y1 + y2) / 2,
      width: Math.abs(x2 - x1),
      height: Math.abs(y2 - y1),
      rotation: 0
    } as BoundingBox.Rectangle;
  }

  public getSnappingGuides(): SnappingGuides.Description[] {
    const attrs = this.state.attributes;
    const { x1, y1, x2, y2, cx, cy } = attrs;
    return [
      { type: "x", value: x1, attribute: "x1" } as SnappingGuides.Axis,
      { type: "x", value: x2, attribute: "x2" } as SnappingGuides.Axis,
      { type: "x", value: cx, attribute: "cx" } as SnappingGuides.Axis,
      { type: "y", value: y1, attribute: "y1" } as SnappingGuides.Axis,
      { type: "y", value: y2, attribute: "y2" } as SnappingGuides.Axis,
      { type: "y", value: cy, attribute: "cy" } as SnappingGuides.Axis
    ];
  }

  public static createDefault(...args: any[]): Specification.Object {
    const obj = super.createDefault(...args) as Specification.Element<
      NestedChartElementProperties
    >;
    const myGlyphID = uniqueID();
    const tableName = "MainTable";
    obj.properties.specification = {
      _id: uniqueID(),
      classID: "chart.rectangle",
      properties: {
        name: "Chart",
        backgroundColor: null,
        backgroundOpacity: 1
      },
      mappings: {
        marginTop: { type: "value", value: 25 } as Specification.ValueMapping,
        marginBottom: {
          type: "value",
          value: 10
        } as Specification.ValueMapping,
        marginLeft: { type: "value", value: 10 } as Specification.ValueMapping,
        marginRight: { type: "value", value: 10 } as Specification.ValueMapping
      },
      glyphs: [
        {
          _id: myGlyphID,
          classID: "glyph.rectangle",
          properties: { name: "Glyph" },
          table: tableName,
          marks: [
            {
              _id: uniqueID(),
              classID: "mark.anchor",
              properties: { name: "Anchor" },
              mappings: {
                x: {
                  type: "parent",
                  parentAttribute: "icx"
                } as Specification.ParentMapping,
                y: {
                  type: "parent",
                  parentAttribute: "icy"
                } as Specification.ParentMapping
              }
            }
          ],
          mappings: {},
          constraints: []
        } as Specification.Glyph
      ],
      elements: [
        {
          _id: uniqueID(),
          classID: "plot-segment.cartesian",
          glyph: myGlyphID,
          table: tableName,
          filter: null,
          mappings: {
            x1: {
              type: "parent",
              parentAttribute: "x1"
            } as Specification.ParentMapping,
            y1: {
              type: "parent",
              parentAttribute: "y1"
            } as Specification.ParentMapping,
            x2: {
              type: "parent",
              parentAttribute: "x2"
            } as Specification.ParentMapping,
            y2: {
              type: "parent",
              parentAttribute: "y2"
            } as Specification.ParentMapping
          },
          properties: {
            name: "PlotSegment1",
            visible: true,
            marginX1: 0,
            marginY1: 0,
            marginX2: 0,
            marginY2: 0,
            sublayout: {
              type: "dodge-x",
              order: null,
              ratioX: 0.1,
              ratioY: 0.1,
              align: {
                x: "start",
                y: "start"
              },
              grid: {
                direction: "x",
                xCount: null,
                yCount: null
              }
            }
          }
        } as Specification.PlotSegment,
        {
          _id: uniqueID(),
          classID: "mark.text",
          properties: {
            name: "Title",
            visible: true,
            alignment: { x: "middle", y: "top", xMargin: 0, yMargin: 5 },
            rotation: 0
          },
          mappings: {
            x: {
              type: "parent",
              parentAttribute: "cx"
            } as Specification.ParentMapping,
            y: {
              type: "parent",
              parentAttribute: "oy2"
            } as Specification.ParentMapping,
            text: {
              type: "value",
              value: "Nested Chart"
            } as Specification.ValueMapping,
            fontSize: {
              type: "value",
              value: 12
            } as Specification.ValueMapping,
            color: {
              type: "value",
              value: { r: 0, g: 0, b: 0 }
            } as Specification.ValueMapping
          }
        } as Specification.ChartElement
      ],
      scales: [],
      constraints: [],
      resources: []
    } as any;
    return obj;
  }

  public getTemplateParameters(): TemplateParameters {
    return {
      inferences: [
        {
          objectID: this.object._id,
          dataSource: {
            table: this.getGlyphClass().object.table
          },
          nestedChart: {
            columnNameMap: this.object.properties.columnNameMap
          }
        }
      ]
    };
  }
}
