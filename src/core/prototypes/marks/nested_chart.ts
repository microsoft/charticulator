// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { deepClone, getByName, Point, uniqueID } from "../../common";
import * as Dataset from "../../dataset";
import { TableType } from "../../dataset";
import * as Graphics from "../../graphics";
import { ConstraintSolver, ConstraintStrength } from "../../solver";
import * as Specification from "../../specification";
import { MappingType } from "../../specification";
import {
  BoundingBox,
  Controls,
  DropZones,
  Handles,
  ObjectClassMetadata,
  SnappingGuides,
  TemplateParameters,
} from "../common";
import { ChartStateManager } from "../state";
import { EmphasizableMarkClass } from "./emphasis";
import {
  nestedChartAttributes,
  NestedChartElementAttributes,
  NestedChartElementProperties,
} from "./nested_chart.attrs";
import {
  GridDirection,
  GridStartPosition,
  Region2DSublayoutType,
  SublayoutAlignment,
} from "../plot_segments/region_2d/base";
import { strings } from "../../../strings";

export { NestedChartElementAttributes, NestedChartElementProperties };

export class NestedChartElementClass extends EmphasizableMarkClass<
  NestedChartElementProperties,
  NestedChartElementAttributes
> {
  public static classID = "mark.nested-chart";
  public static type = "mark";

  public static metadata: ObjectClassMetadata = {
    displayName: "NestedChart",
    iconPath: "BarChartVerticalFilter",
    creatingInteraction: {
      type: "rectangle",
      mapping: { xMin: "x1", yMin: "y1", xMax: "x2", yMax: "y2" },
    },
  };

  public static defaultProperties: Partial<NestedChartElementProperties> = {
    visible: true,
  };

  public static defaultMappingValues: Partial<NestedChartElementAttributes> = {
    visible: true,
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
    attrs.visible = true;
  }

  public getAttributePanelWidgets(
    manager: Controls.WidgetManager
  ): Controls.Widget[] {
    return [
      manager.verticalGroup(
        { header: strings.objects.nestedChart.sizeAndShape },
        [
          manager.mappingEditor(strings.objects.width, "width", {
            hints: { autoRange: true, startWithZero: "always" },
            acceptKinds: [Specification.DataKind.Numerical],
            defaultAuto: true,
            searchSection: strings.objects.nestedChart.sizeAndShape,
          }),
          manager.mappingEditor(strings.objects.height, "height", {
            hints: { autoRange: true, startWithZero: "always" },
            acceptKinds: [Specification.DataKind.Numerical],
            defaultAuto: true,
            searchSection: strings.objects.nestedChart.sizeAndShape,
          }),
          manager.mappingEditor(
            strings.objects.visibleOn.visibility,
            "visible",
            {
              defaultValue: true,
              searchSection: strings.objects.nestedChart.sizeAndShape,
            }
          ),
          manager.nestedChartEditor(
            { property: "specification" },
            {
              specification: this.object.properties.specification,
              dataset: this.getDataset(0),
              // filterCondition: this.getFilterCondition(),
              width: this.state.attributes.width,
              height: this.state.attributes.height,
              searchSection: strings.objects.nestedChart.sizeAndShape,
            }
          ),
        ]
      ),
    ];
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
      [
        [1, x2],
        [-1, x1],
      ],
      [[1, width]]
    );
    solver.addLinear(
      ConstraintStrength.HARD,
      0,
      [
        [1, y2],
        [-1, y1],
      ],
      [[1, height]]
    );
    solver.addLinear(
      ConstraintStrength.HARD,
      0,
      [[2, cx]],
      [
        [1, x1],
        [1, x2],
      ]
    );
    solver.addLinear(
      ConstraintStrength.HARD,
      0,
      [[2, cy]],
      [
        [1, y1],
        [1, y2],
      ]
    );
  }

  public getFilterCondition(): any {
    const glyphIndex: number = 0;
    const manager = this.getChartClass().manager;
    const plotSegmentClass = this.getPlotSegmentClass();
    const table = getByName(
      manager.dataset.tables,
      plotSegmentClass.object.table
    );
    const rowIndex = plotSegmentClass.state.dataRowIndices[glyphIndex][0];
    const data = table.rows[rowIndex];

    return plotSegmentClass.object.groupBy
      ? {
          column: plotSegmentClass.object.groupBy.expression,
          value: data[plotSegmentClass.object.groupBy.expression],
        }
      : null;
  }

  public getDataset(glyphIndex?: number): Dataset.Dataset {
    const manager = this.getChartClass().manager;
    const plotSegmentClass = this.getPlotSegmentClass();
    const table = getByName(
      manager.dataset.tables,
      plotSegmentClass.object.table
    );
    let columnNameMap = this.object.properties.columnNameMap;
    if (table.columns.length === Object.keys(columnNameMap).length) {
      if (columnNameMap == null) {
        columnNameMap = {};
        for (const c of table.columns) {
          columnNameMap[c.name] = c.name;
        }
        this.object.properties.columnNameMap = columnNameMap;
      }
    } else {
      //update columns
      columnNameMap = {};
      for (const c of table.columns) {
        columnNameMap[c.name] = c.name;
      }
      this.object.properties.columnNameMap = columnNameMap;
    }
    const dataRowIndices = plotSegmentClass.state.dataRowIndices[glyphIndex];

    const mapToRows = (dataRowIndices: number[]) =>
      dataRowIndices.map((i) => {
        const data = table.rows[i];
        const r: Dataset.Row = { _id: data._id };
        for (const col in columnNameMap) {
          r[columnNameMap[col]] = data[col];
        }
        return r;
      });

    return {
      name: "NestedData",
      tables: [
        {
          name: "MainTable",
          displayName: "MainTable",
          columns: table.columns.map((x) => {
            return {
              name: columnNameMap[x.name],
              displayName: columnNameMap[x.name],
              type: x.type,
              metadata: x.metadata,
            };
          }),
          rows: mapToRows(dataRowIndices),
          type: TableType.Main,
          localeNumberFormat: table.localeNumberFormat,
        },
        // {
        //   name: "MainParentTable",
        //   displayName: "MainParentTable",
        //   columns: table.columns.map(x => {
        //     return {
        //       name: columnNameMap[x.name],
        //       displayName: columnNameMap[x.name],
        //       type: x.type,
        //       metadata: x.metadata
        //     };
        //   }),
        //   rows: mapToRows(dataRowIndices),
        //   type: TableType.Main
        // }
      ],
    };
  }

  // Get the graphical element from the element
  public getGraphics(
    cs: Graphics.CoordinateSystem,
    offset: Point,
    glyphIndex = 0,
    // eslint-disable-next-line
    manager: ChartStateManager,
    // eslint-disable-next-line
    emphasized?: boolean
  ): Graphics.Element {
    const attrs = this.state.attributes;
    if (!attrs.visible || !this.object.properties.visible) {
      return null;
    }
    const g = Graphics.makeGroup([
      <Graphics.ChartContainerElement>{
        type: "chart-container",
        dataset: this.getDataset(glyphIndex),
        chart: deepClone(this.object.properties.specification),
        selectable: {
          plotSegment: this.getPlotSegmentClass().object,
          glyphIndex,
          rowIndices: this.getPlotSegmentClass().state.dataRowIndices[
            glyphIndex
          ],
        },
        width: attrs.width,
        height: attrs.height,
      },
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
      <DropZones.Line>{
        type: "line",
        p1: { x: x2, y: y1 },
        p2: { x: x1, y: y1 },
        title: "width",
        accept: { kind: Specification.DataKind.Numerical },
        dropAction: {
          scaleInference: {
            attribute: "width",
            attributeType: Specification.AttributeType.Number,
            hints: { autoRange: true, startWithZero: "always" },
          },
        },
      },
      <DropZones.Line>{
        type: "line",
        p1: { x: x1, y: y1 },
        p2: { x: x1, y: y2 },
        title: "height",
        accept: { kind: Specification.DataKind.Numerical },
        dropAction: {
          scaleInference: {
            attribute: "height",
            attributeType: Specification.AttributeType.Number,
            hints: { autoRange: true, startWithZero: "always" },
          },
        },
      },
    ];
  }
  // Get bounding rectangle given current state
  public getHandles(): Handles.Description[] {
    const attrs = this.state.attributes;
    const { x1, y1, x2, y2 } = attrs;
    return [
      <Handles.Line>{
        type: "line",
        axis: "x",
        actions: [{ type: "attribute", attribute: "x1" }],
        value: x1,
        span: [y1, y2],
      },
      <Handles.Line>{
        type: "line",
        axis: "x",
        actions: [{ type: "attribute", attribute: "x2" }],
        value: x2,
        span: [y1, y2],
      },
      <Handles.Line>{
        type: "line",
        axis: "y",
        actions: [{ type: "attribute", attribute: "y1" }],
        value: y1,
        span: [x1, x2],
      },
      <Handles.Line>{
        type: "line",
        axis: "y",
        actions: [{ type: "attribute", attribute: "y2" }],
        value: y2,
        span: [x1, x2],
      },
      <Handles.Point>{
        type: "point",
        x: x1,
        y: y1,
        actions: [
          { type: "attribute", source: "x", attribute: "x1" },
          { type: "attribute", source: "y", attribute: "y1" },
        ],
      },
      <Handles.Point>{
        type: "point",
        x: x1,
        y: y2,
        actions: [
          { type: "attribute", source: "x", attribute: "x1" },
          { type: "attribute", source: "y", attribute: "y2" },
        ],
      },
      <Handles.Point>{
        type: "point",
        x: x2,
        y: y1,
        actions: [
          { type: "attribute", source: "x", attribute: "x2" },
          { type: "attribute", source: "y", attribute: "y1" },
        ],
      },
      <Handles.Point>{
        type: "point",
        x: x2,
        y: y2,
        actions: [
          { type: "attribute", source: "x", attribute: "x2" },
          { type: "attribute", source: "y", attribute: "y2" },
        ],
      },
    ];
  }

  public getBoundingBox(): BoundingBox.Description {
    const attrs = this.state.attributes;
    const { x1, y1, x2, y2 } = attrs;
    return <BoundingBox.Rectangle>{
      type: "rectangle",
      cx: (x1 + x2) / 2,
      cy: (y1 + y2) / 2,
      width: Math.abs(x2 - x1),
      height: Math.abs(y2 - y1),
      rotation: 0,
    };
  }

  public getSnappingGuides(): SnappingGuides.Description[] {
    const attrs = this.state.attributes;
    const { x1, y1, x2, y2, cx, cy } = attrs;
    return [
      <SnappingGuides.Axis>{ type: "x", value: x1, attribute: "x1" },
      <SnappingGuides.Axis>{ type: "x", value: x2, attribute: "x2" },
      <SnappingGuides.Axis>{ type: "x", value: cx, attribute: "cx" },
      <SnappingGuides.Axis>{ type: "y", value: y1, attribute: "y1" },
      <SnappingGuides.Axis>{ type: "y", value: y2, attribute: "y2" },
      <SnappingGuides.Axis>{ type: "y", value: cy, attribute: "cy" },
    ];
  }

  // eslint-disable-next-line
  public static createDefault(...args: any[]): Specification.Object {
    const obj = <Specification.Element<NestedChartElementProperties>>(
      super.createDefault(...args)
    );
    const myGlyphID = uniqueID();
    const tableName = "MainTable";
    obj.properties.specification = {
      _id: uniqueID(),
      classID: "chart.rectangle",
      properties: {
        name: "Nested Chart",
        backgroundColor: null,
        backgroundOpacity: 1,
      },
      mappings: {
        marginTop: <Specification.ValueMapping>{
          type: MappingType.value,
          value: 25,
        },
        marginBottom: <Specification.ValueMapping>{
          type: MappingType.value,
          value: 10,
        },
        marginLeft: <Specification.ValueMapping>{
          type: MappingType.value,
          value: 10,
        },
        marginRight: <Specification.ValueMapping>{
          type: MappingType.value,
          value: 10,
        },
      },
      glyphs: [
        <Specification.Glyph>{
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
                x: <Specification.ParentMapping>{
                  type: MappingType.parent,
                  parentAttribute: "icx",
                },
                y: <Specification.ParentMapping>{
                  type: MappingType.parent,
                  parentAttribute: "icy",
                },
              },
            },
          ],
          mappings: {},
          constraints: [],
        },
      ],
      elements: [
        <Specification.PlotSegment>{
          _id: uniqueID(),
          classID: "plot-segment.cartesian",
          glyph: myGlyphID,
          table: tableName,
          filter: null,
          mappings: {
            x1: <Specification.ParentMapping>{
              type: MappingType.parent,
              parentAttribute: "x1",
            },
            y1: <Specification.ParentMapping>{
              type: MappingType.parent,
              parentAttribute: "y1",
            },
            x2: <Specification.ParentMapping>{
              type: MappingType.parent,
              parentAttribute: "x2",
            },
            y2: <Specification.ParentMapping>{
              type: MappingType.parent,
              parentAttribute: "y2",
            },
          },
          properties: {
            name: "PlotSegment1",
            visible: true,
            marginX1: 0,
            marginY1: 0,
            marginX2: 0,
            marginY2: 0,
            sublayout: {
              type: Region2DSublayoutType.DodgeX,
              order: null,
              ratioX: 0.1,
              ratioY: 0.1,
              align: {
                x: SublayoutAlignment.Start,
                y: SublayoutAlignment.Start,
              },
              grid: {
                direction: GridDirection.X,
                xCount: null,
                yCount: null,
                gridStartPosition: GridStartPosition.LeftTop,
              },
            },
          },
        },
        <Specification.ChartElement>{
          _id: uniqueID(),
          classID: "mark.text",
          properties: {
            name: "Title",
            visible: true,
            alignment: { x: "middle", y: "top", xMargin: 0, yMargin: 5 },
            rotation: 0,
          },
          mappings: {
            x: <Specification.ParentMapping>{
              type: MappingType.parent,
              parentAttribute: "cx",
            },
            y: <Specification.ParentMapping>{
              type: MappingType.parent,
              parentAttribute: "oy2",
            },
            text: <Specification.ValueMapping>{
              type: MappingType.value,
              value: "Nested Chart",
            },
            fontSize: <Specification.ValueMapping>{
              type: MappingType.value,
              value: 12,
            },
            color: <Specification.ValueMapping>{
              type: MappingType.value,
              value: { r: 0, g: 0, b: 0 },
            },
          },
        },
      ],
      scales: [],
      scaleMappings: [],
      constraints: [],
      resources: [],
    };
    return obj;
  }

  public getTemplateParameters(): TemplateParameters {
    return {
      inferences: [
        {
          objectID: this.object._id,
          dataSource: {
            table: this.getGlyphClass().object.table,
          },
          nestedChart: {
            columnNameMap: this.object.properties.columnNameMap,
          },
        },
      ],
    };
  }
}
