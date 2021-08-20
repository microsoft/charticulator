// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { Dataset, Specification, uniqueID } from "../../core";
import {
  GridDirection,
  GridFlipDirection,
  Region2DSublayoutType,
  SublayoutAlignment,
} from "../../core/prototypes/plot_segments/region_2d/base";
import { MappingType } from "../../core/specification";

/** Create a default glyph */
export function createDefaultGlyph(tableName: string) {
  return {
    _id: uniqueID(),
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
            type: MappingType.parent,
            parentAttribute: "icx",
          } as Specification.ParentMapping,
          y: {
            type: MappingType.parent,
            parentAttribute: "icy",
          } as Specification.ParentMapping,
        },
      },
    ],
    mappings: {},
    constraints: [],
  } as Specification.Glyph;
}

/** Create a default plot segment */
export function createDefaultPlotSegment(
  table: Dataset.Table,
  glyph: Specification.Glyph
) {
  return {
    _id: uniqueID(),
    classID: "plot-segment.cartesian",
    glyph: glyph._id,
    table: table.name,
    filter: null,
    mappings: {
      x1: {
        type: MappingType.parent,
        parentAttribute: "x1",
      } as Specification.ParentMapping,
      y1: {
        type: MappingType.parent,
        parentAttribute: "y1",
      } as Specification.ParentMapping,
      x2: {
        type: MappingType.parent,
        parentAttribute: "x2",
      } as Specification.ParentMapping,
      y2: {
        type: MappingType.parent,
        parentAttribute: "y2",
      } as Specification.ParentMapping,
    },
    properties: {
      name: "PlotSegment1",
      visible: true,
      marginX1: 0,
      marginY1: 0,
      marginX2: 0,
      marginY2: 0,
      sublayout: {
        type: table.rows.length >= 100 ? "grid" : Region2DSublayoutType.DodgeX,
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
          flipDirection: GridFlipDirection.Direct,
          reverseGlyphsOrder: false,
        },
        packing: {
          gravityX: 0.1,
          gravityY: 0.1,
        },
        jitter: {
          vertical: true,
          horizontal: true,
        },
      },
    },
  } as Specification.PlotSegment;
}

/** Create a default chart title */
export function createDefaultTitle(dataset: Dataset.Dataset) {
  return {
    _id: uniqueID(),
    classID: "mark.text",
    properties: {
      name: "Title",
      visible: true,
      alignment: { x: "middle", y: "top", xMargin: 0, yMargin: 30 },
      rotation: 0,
    },
    mappings: {
      x: {
        type: MappingType.parent,
        parentAttribute: "cx",
      } as Specification.ParentMapping,
      y: {
        type: MappingType.parent,
        parentAttribute: "oy2",
      } as Specification.ParentMapping,
      text: {
        type: MappingType.value,
        value: dataset.name,
      } as Specification.ValueMapping,
      fontSize: {
        type: MappingType.value,
        value: 24,
      } as Specification.ValueMapping,
      color: {
        type: MappingType.value,
        value: { r: 0, g: 0, b: 0 },
      } as Specification.ValueMapping,
    },
  } as Specification.ChartElement;
}

/** Create a default chart */
export function createDefaultChart(
  dataset: Dataset.Dataset,
  createTitle: boolean
) {
  const table = dataset.tables[0];
  const glyph = createDefaultGlyph(table.name);
  return {
    _id: uniqueID(),
    classID: "chart.rectangle",
    properties: {
      name: "Chart",
      backgroundColor: null,
      backgroundOpacity: 1,
      enableContextMenu: true,
      exposed: true,
    },
    mappings: {
      marginTop: {
        type: MappingType.value,
        value: 80,
      } as Specification.ValueMapping,
    },
    glyphs: [glyph],
    elements: [
      createDefaultPlotSegment(table, glyph),
      createTitle ? createDefaultTitle(dataset) : null,
    ].filter((elem) => elem != null),
    scales: [],
    scaleMappings: [],
    constraints: [],
    resources: [],
  } as Specification.Chart;
}

export const defaultFont = "Segoe UI";
export const defaultFontSize = 12;
export const defaultFontSizeLegend = 10;

export const defaultVersionOfTemplate = "2.0.3";
