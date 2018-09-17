// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import { Point } from "../../common";
import { ConstraintSolver, ConstraintStrength } from "../../solver";
import * as Specification from "../../specification";
import {
  lineAttributes,
  LineElementAttributes,
  LineElementProperties
} from "./line.attrs";

import {
  BoundingBox,
  Controls,
  DropZones,
  Handles,
  ObjectClasses,
  ObjectClassMetadata,
  SnappingGuides
} from "../common";

import * as Graphics from "../../graphics";
import { EmphasizableMarkClass } from "./emphasis";
import { ChartStateManager } from "../state";

export { LineElementAttributes, LineElementProperties };

export class LineElementClass extends EmphasizableMarkClass<
  LineElementProperties,
  LineElementAttributes
> {
  public static classID = "mark.line";
  public static type = "mark";

  public static metadata: ObjectClassMetadata = {
    displayName: "Line",
    iconPath: "mark/line",
    creatingInteraction: {
      type: "line-segment",
      mapping: { x1: "x1", y1: "y1", x2: "x2", y2: "y2" }
    }
  };

  public static defaultProperties: Partial<LineElementProperties> = {
    visible: true
  };

  public static defaultMappingValues: Partial<LineElementAttributes> = {
    stroke: { r: 0, g: 0, b: 0 },
    strokeWidth: 1,
    opacity: 1,
    visible: true
  };

  public attributes = lineAttributes;
  public attributeNames = Object.keys(lineAttributes);

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
    attrs.dx = 0;
    attrs.dy = 0;
    attrs.stroke = { r: 0, g: 0, b: 0 };
    attrs.strokeWidth = 1;
    attrs.opacity = 1;
    attrs.visible = true;
  }

  // Get intrinsic constraints between attributes (e.g., x2 - x1 = width for rectangles)
  public buildConstraints(solver: ConstraintSolver): void {
    const [x1, y1, x2, y2, cx, cy, dx, dy] = solver.attrs(
      this.state.attributes,
      ["x1", "y1", "x2", "y2", "cx", "cy", "dx", "dy"]
    );
    solver.addLinear(ConstraintStrength.HARD, 0, [[2, cx]], [[1, x1], [1, x2]]);
    solver.addLinear(ConstraintStrength.HARD, 0, [[2, cy]], [[1, y1], [1, y2]]);
    solver.addLinear(
      ConstraintStrength.HARD,
      0,
      [[1, dx]],
      [[1, x2], [-1, x1]]
    );
    solver.addLinear(
      ConstraintStrength.HARD,
      0,
      [[1, dy]],
      [[1, y2], [-1, y1]]
    );
  }

  // Get the graphical element from the element
  public getGraphics(
    cs: Graphics.CoordinateSystem,
    offset: Point,
    glyphIndex = 0,
    manager: ChartStateManager,
    emphasize?: boolean
  ): Graphics.Element {
    const attrs = this.state.attributes;
    if (!attrs.visible || !this.object.properties.visible) {
      return null;
    }
    const helper = new Graphics.CoordinateSystemHelper(cs);
    return helper.line(
      attrs.x1 + offset.x,
      attrs.y1 + offset.y,
      attrs.x2 + offset.x,
      attrs.y2 + offset.y,
      {
        strokeColor: attrs.stroke,
        strokeOpacity: attrs.opacity,
        strokeWidth: attrs.strokeWidth,
        ...this.generateEmphasisStyle(emphasize)
      }
    );
  }

  // Get DropZones given current state
  public getDropZones(): DropZones.Description[] {
    const attrs = this.state.attributes as LineElementAttributes;
    const { x1, y1, x2, y2 } = attrs;
    const cx = x1;
    const cy = y1;
    return [
      {
        type: "line",
        p1: { x: x2, y: cy },
        p2: { x: x1, y: cy },
        title: "dx",
        accept: { kind: "numerical" },
        dropAction: {
          scaleInference: {
            attribute: "dx",
            attributeType: "number",
            hints: { autoRange: true }
          }
        }
      } as DropZones.Line,
      {
        type: "line",
        p1: { x: cx, y: y1 },
        p2: { x: cx, y: y2 },
        title: "dy",
        accept: { kind: "numerical" },
        dropAction: {
          scaleInference: {
            attribute: "dy",
            attributeType: "number",
            hints: { autoRange: true }
          }
        }
      } as DropZones.Line
    ];
  }
  // Get bounding rectangle given current state
  public getHandles(): Handles.Description[] {
    const attrs = this.state.attributes as LineElementAttributes;
    const { x1, y1, x2, y2, cx, cy } = attrs;
    return [
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
        x: x2,
        y: y2,
        actions: [
          { type: "attribute", source: "x", attribute: "x2" },
          { type: "attribute", source: "y", attribute: "y2" }
        ]
      } as Handles.Point,
      {
        type: "point",
        x: cx,
        y: cy,
        actions: [
          { type: "attribute", source: "x", attribute: "cx" },
          { type: "attribute", source: "y", attribute: "cy" }
        ]
      } as Handles.Point
    ];
  }

  public getBoundingBox(): BoundingBox.Description {
    const attrs = this.state.attributes as LineElementAttributes;
    const { x1, y1, x2, y2 } = attrs;
    return {
      type: "line",
      morphing: true,
      x1,
      y1,
      x2,
      y2
    } as BoundingBox.Line;
  }

  public getSnappingGuides(): SnappingGuides.Description[] {
    const attrs = this.state.attributes as LineElementAttributes;
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

  public getAttributePanelWidgets(
    manager: Controls.WidgetManager
  ): Controls.Widget[] {
    return [
      manager.sectionHeader("Line"),
      manager.mappingEditor("X Span", "dx", {
        hints: { autoRange: true },
        acceptKinds: [Specification.DataKind.Numerical],
        defaultAuto: true
      }),
      manager.mappingEditor("Y Span", "dy", {
        hints: { autoRange: true },
        acceptKinds: [Specification.DataKind.Numerical],
        defaultAuto: true
      }),
      manager.sectionHeader("Style"),
      manager.mappingEditor("Stroke", "stroke", {}),
      manager.mappingEditor("Line Width", "strokeWidth", {
        hints: { rangeNumber: [0, 5] },
        defaultValue: 1,
        numberOptions: { showSlider: true, sliderRange: [0, 5], minimum: 0 }
      }),
      manager.mappingEditor("Opacity", "opacity", {
        hints: { rangeNumber: [0, 1] },
        defaultValue: 1,
        numberOptions: { showSlider: true, minimum: 0, maximum: 1 }
      }),
      manager.mappingEditor("Visibility", "visible", {
        defaultValue: true
      })
    ];
  }
}
