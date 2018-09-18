// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import * as Graphics from "../../graphics";
import { ConstraintSolver, ConstraintStrength } from "../../solver";
import * as Specification from "../../specification";
import {
  AttributeDescription,
  BoundingBox,
  Controls,
  DropZones,
  Handles,
  ObjectClasses,
  ObjectClassMetadata,
  TemplateParameters
} from "../common";
import {
  AxisRenderer,
  buildAxisWidgets,
  getCategoricalAxis,
  buildAxisInference
} from "./axis";
import { PlotSegmentClass } from "./plot_segment";

export interface LineGuideAttributes extends Specification.AttributeMap {
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
  x?: number;
  y?: number;
}

export interface LineGuideState extends Specification.PlotSegmentState {
  attributes: LineGuideAttributes;
}

export interface LineGuideProperties extends Specification.AttributeMap {
  axis?: Specification.Types.AxisDataBinding;
}

export interface LineGuideObject extends Specification.PlotSegment {
  properties: LineGuideProperties;
}

export class LineGuide extends PlotSegmentClass {
  public static classID = "plot-segment.line";
  public static type = "plot-segment";

  public static metadata: ObjectClassMetadata = {
    displayName: "PlotSegment",
    iconPath: "plot-segment/line",
    creatingInteraction: {
      type: "line-segment",
      mapping: { x1: "x1", y1: "y1", x2: "x2", y2: "y2" }
    }
  };

  public static defaultProperties: Specification.AttributeMap = {
    visible: true
  };

  public readonly state: LineGuideState;
  public readonly object: LineGuideObject;

  public attributeNames: string[] = ["x1", "x2", "y1", "y2"];
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
    }
  };

  public initializeState(): void {
    const attrs = this.state.attributes as LineGuideAttributes;
    attrs.x1 = -100;
    attrs.x2 = 100;
    attrs.y1 = -100;
    attrs.y2 = 100;
  }

  public buildGlyphConstraints(solver: ConstraintSolver): void {
    const chart = this.parent.object;
    const props = this.object.properties;
    const rows = this.parent.dataflow.getTable(this.object.table);
    const [x1, y1, x2, y2] = solver.attrs(this.state.attributes, [
      "x1",
      "y1",
      "x2",
      "y2"
    ]);
    const attrs = this.state.attributes;

    const count = this.state.dataRowIndices.length;
    const dataIndices = this.state.dataRowIndices;

    for (const [index, markState] of this.state.glyphs.entries()) {
      let t = (0.5 + index) / count;

      if (props.axis == null) {
        t = (0.5 + index) / count;
      } else {
        const data = props.axis;
        switch (data.type) {
          case "numerical":
            {
              const row = rows.getGroupedContext(dataIndices[index]);
              const expr = this.parent.dataflow.cache.parse(data.expression);
              const value = expr.getNumberValue(row);
              t = (value - data.domainMin) / (data.domainMax - data.domainMin);
            }
            break;
          case "categorical":
            {
              const axis = getCategoricalAxis(props.axis, false, false);
              const row = rows.getGroupedContext(dataIndices[index]);
              const expr = this.parent.dataflow.cache.parse(data.expression);
              const value = expr.getStringValue(row);
              const i = data.categories.indexOf(value);
              t = (axis.ranges[i][0] + axis.ranges[i][1]) / 2;
            }
            break;
          case "default":
            {
              t = (0.5 + index) / count;
            }
            break;
        }
      }

      solver.addLinear(
        ConstraintStrength.HARD,
        0,
        [[t, x2], [1 - t, x1]],
        [[1, solver.attr(markState.attributes, "x")]]
      );
      solver.addLinear(
        ConstraintStrength.HARD,
        0,
        [[t, y2], [1 - t, y1]],
        [[1, solver.attr(markState.attributes, "y")]]
      );
    }
  }

  public getDropZones(): DropZones.Description[] {
    const attrs = this.state.attributes;
    const { x1, y1, x2, y2 } = attrs;
    const zones: DropZones.Description[] = [];
    zones.push({
      type: "line",
      p1: { x: x1, y: y1 },
      p2: { x: x2, y: y2 },
      title: "Axis",
      dropAction: {
        axisInference: { property: "axis" }
      }
    } as DropZones.Line);
    return zones;
  }

  public getHandles(): Handles.Description[] {
    const attrs = this.state.attributes;
    const { x1, y1, x2, y2 } = attrs;
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
      } as Handles.Point
    ];
  }

  public getBoundingBox(): BoundingBox.Description {
    const attrs = this.state.attributes;
    const { x1, x2, y1, y2 } = attrs;
    return {
      type: "line",
      x1,
      y1,
      x2,
      y2
    } as BoundingBox.Line;
  }

  public getGraphics(): Graphics.Element {
    const attrs = this.state.attributes;
    const { x1, y1, x2, y2 } = attrs;
    const props = this.object.properties;
    const length = Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1));
    if (props.axis == null) {
      return Graphics.makeLine(x1, y1, x2, y2, {
        strokeColor: { r: 0, g: 0, b: 0 },
        fillColor: null
      });
    }
    if (props.axis && props.axis.visible) {
      const renderer = new AxisRenderer();
      renderer.setAxisDataBinding(props.axis, 0, length, false, false);
      const g = renderer.renderLine(
        x1,
        y1,
        (Math.atan2(y2 - y1, x2 - x1) / Math.PI) * 180,
        1
      );
      return g;
    }
  }

  public getAttributePanelWidgets(
    manager: Controls.WidgetManager
  ): Controls.Widget[] {
    const props = this.object.properties;
    return [
      ...super.getAttributePanelWidgets(manager),
      ...buildAxisWidgets(props.axis, "axis", manager, "Axis")
    ];
  }

  public getTemplateParameters(): TemplateParameters {
    const r: Specification.Template.Inference[] = [];
    if (this.object.properties.axis) {
      const axis = this.object.properties.axis;
      r.push(buildAxisInference(this.object, "axis"));
    }
    return { inferences: r };
  }
}
