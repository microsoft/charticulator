/**
 * ![Chart levels](media://glyph-levels.png)
 *
 * The Chart-level specification includes chart elements, layout constraints between them, and scales. The most important chart element is
 * a plot segment, which lays out glyphs according to its scaffolds and/or
 * axes, and transforms them according to its coordinate system, scales specify how data is mapped to attributes
 * such as width, height, and color, and they can be shared among several
 * marks. Legends visualize the scales used in the chart.
 *
 * @packageDocumentation
 * @preferred
 */

// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as Specification from "../../specification";
import { ConstraintSolver, ConstraintStrength } from "../../solver";
import {
  AttributeDescription,
  Controls,
  Handles,
  ObjectClass,
  ObjectClasses,
  ObjectClassMetadata,
  SnappingGuides
} from "../common";

export abstract class GlyphClass extends ObjectClass {
  public readonly object: Specification.Glyph;
  public readonly state: Specification.GlyphState;

  public static metadata: ObjectClassMetadata = {
    iconPath: "glyph",
    displayName: "Glyph"
  };

  // Initialize the state of a mark so that everything has a valid value
  public abstract initializeState(): void;

  // Get intrinsic constraints between attributes (e.g., x2 - x1 = width for rectangles)
  public abstract buildIntrinsicConstraints(solver: ConstraintSolver): void;
  public abstract getAlignmentGuides(): SnappingGuides.Description[];
  public abstract getHandles(): Handles.Description[];

  public static createDefault(table: string): Specification.Glyph {
    const glyph = super.createDefault() as Specification.Glyph;
    glyph.table = table;
    glyph.constraints = [];
    glyph.marks = [];
    return glyph;
  }
}

export interface RectangleGlyphAttributes extends Specification.AttributeMap {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  x: number;
  y: number;
  width: number;
  height: number;
  ix1: number;
  iy1: number;
  ix2: number;
  iy2: number;
  icx: number;
  icy: number;
}

export interface RectangleGlyphState extends Specification.GlyphState {
  attributes: RectangleGlyphAttributes;
}

class RectangleGlyph extends GlyphClass {
  public static classID = "glyph.rectangle";
  public static type = "glyph";

  public readonly state: RectangleGlyphState;

  // Get a list of elemnt attributes
  public attributeNames: string[] = [
    "x1",
    "y1",
    "x2",
    "y2",
    "x",
    "y",
    "width",
    "height",
    "ix1",
    "iy1",
    "ix2",
    "iy2",
    "icx",
    "icy"
  ];
  public attributes: { [name: string]: AttributeDescription } = {
    x1: {
      name: "x1",
      type: Specification.AttributeType.Number
    },
    y1: {
      name: "y1",
      type: Specification.AttributeType.Number
    },
    x2: {
      name: "x2",
      type: Specification.AttributeType.Number
    },
    y2: {
      name: "y2",
      type: Specification.AttributeType.Number
    },
    x: {
      name: "x",
      type: Specification.AttributeType.Number
    },
    y: {
      name: "y",
      type: Specification.AttributeType.Number
    },
    width: {
      name: "width",
      type: Specification.AttributeType.Number,
      defaultRange: [30, 200]
    },
    height: {
      name: "height",
      type: Specification.AttributeType.Number,
      defaultRange: [30, 200]
    },
    ix1: {
      name: "ix1",
      type: Specification.AttributeType.Number
    },
    iy1: {
      name: "iy1",
      type: Specification.AttributeType.Number
    },
    ix2: {
      name: "ix2",
      type: Specification.AttributeType.Number
    },
    iy2: {
      name: "iy2",
      type: Specification.AttributeType.Number
    },
    icx: {
      name: "icx",
      type: Specification.AttributeType.Number
    },
    icy: {
      name: "icy",
      type: Specification.AttributeType.Number
    }
  };

  // Initialize the state of a mark so that everything has a valid value
  public initializeState(): void {
    const attrs = this.state.attributes;
    attrs.x = 0;
    attrs.y = 0;
    attrs.width = 60;
    attrs.height = 100;
    attrs.x1 = attrs.x - attrs.width / 2;
    attrs.y1 = attrs.y - attrs.height / 2;
    attrs.x2 = attrs.x + attrs.width / 2;
    attrs.y2 = attrs.y + attrs.height / 2;
    attrs.ix1 = -attrs.width / 2;
    attrs.iy1 = -attrs.height / 2;
    attrs.ix2 = +attrs.width / 2;
    attrs.iy2 = +attrs.height / 2;
    attrs.icx = 0;
    attrs.icy = 0;
  }

  // Get intrinsic constraints between attributes (e.g., x2 - x1 = width for rectangles)
  public buildIntrinsicConstraints(solver: ConstraintSolver): void {
    const [
      x1,
      y1,
      x2,
      y2,
      x,
      y,
      width,
      height,
      ix1,
      iy1,
      ix2,
      iy2,
      icx,
      icy
    ] = solver.attrs(this.state.attributes, [
      "x1",
      "y1",
      "x2",
      "y2",
      "x",
      "y",
      "width",
      "height",
      "ix1",
      "iy1",
      "ix2",
      "iy2",
      "icx",
      "icy"
    ]);
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
    solver.addLinear(
      ConstraintStrength.HARD,
      0,
      [[1, ix2], [-1, ix1]],
      [[1, width]]
    );
    solver.addLinear(
      ConstraintStrength.HARD,
      0,
      [[1, iy2], [-1, iy1]],
      [[1, height]]
    );
    // solver.addLinear(ConstraintStrength.HARD, 0, [[2, cx]], [[1, x1], [1, x2]]);
    // solver.addLinear(ConstraintStrength.HARD, 0, [[2, cy]], [[1, y1], [1, y2]]);
    solver.addLinear(ConstraintStrength.HARD, 0, [[1, ix1], [1, ix2]]);
    solver.addLinear(ConstraintStrength.HARD, 0, [[1, iy1], [1, iy2]]);
    solver.addLinear(ConstraintStrength.HARD, 0, [[1, icx]]);
    solver.addLinear(ConstraintStrength.HARD, 0, [[1, icy]]);
    solver.addLinear(
      ConstraintStrength.HARD,
      0,
      [[1, x]],
      [
        [0.5, x2],
        [0.5, x1],
        [1, solver.attr(this.state.marks[0].attributes, "x")]
      ]
    );
    solver.addLinear(
      ConstraintStrength.HARD,
      0,
      [[1, y]],
      [
        [0.5, y2],
        [0.5, y1],
        [1, solver.attr(this.state.marks[0].attributes, "y")]
      ]
    );
  }
  public getAlignmentGuides(): SnappingGuides.Description[] {
    const attrs = this.state.attributes;
    return [
      {
        type: "x",
        value: attrs.ix1,
        attribute: "ix1",
        visible: true
      } as SnappingGuides.Axis,
      {
        type: "x",
        value: attrs.ix2,
        attribute: "ix2",
        visible: true
      } as SnappingGuides.Axis,
      {
        type: "x",
        value: attrs.icx,
        attribute: "icx",
        visible: true
      } as SnappingGuides.Axis,
      {
        type: "y",
        value: attrs.iy1,
        attribute: "iy1",
        visible: true
      } as SnappingGuides.Axis,
      {
        type: "y",
        value: attrs.iy2,
        attribute: "iy2",
        visible: true
      } as SnappingGuides.Axis,
      {
        type: "y",
        value: attrs.icy,
        attribute: "icy",
        visible: true
      } as SnappingGuides.Axis
    ];
  }

  public getHandles(): Handles.Description[] {
    const attrs = this.state.attributes;
    const { ix1, iy1, ix2, iy2 } = attrs;
    const inf = [-10000, 10000];
    return [
      {
        type: "line",
        axis: "x",
        actions: [{ type: "attribute", attribute: "ix1" }],
        value: ix1,
        span: inf
      } as Handles.Line,
      {
        type: "line",
        axis: "x",
        actions: [{ type: "attribute", attribute: "ix2" }],
        value: ix2,
        span: inf
      } as Handles.Line,
      {
        type: "line",
        axis: "y",
        actions: [{ type: "attribute", attribute: "iy1" }],
        value: iy1,
        span: inf
      } as Handles.Line,
      {
        type: "line",
        axis: "y",
        actions: [{ type: "attribute", attribute: "iy2" }],
        value: iy2,
        span: inf
      } as Handles.Line
    ];
  }

  public getAttributePanelWidgets(
    manager: Controls.WidgetManager
  ): Controls.Widget[] {
    return [
      manager.sectionHeader("Dimensions"),
      manager.mappingEditor("Width", "width", {}),
      manager.mappingEditor("Height", "height", {})
    ];
  }
}

export function registerClasses() {
  ObjectClasses.Register(RectangleGlyph);
}
