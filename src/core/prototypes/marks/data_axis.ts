// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
// This implements Data-Driven Guides (straight line guide)

import { MarkClass } from "./mark";
import { Point } from "../../common";
import * as Graphics from "../../graphics";
import { ConstraintSolver, ConstraintStrength } from "../../solver";
import * as Specification from "../../specification";
import { AttrBuilder } from "../attrs";
import {
  AttributeDescriptions,
  BoundingBox,
  BuildConstraintsContext,
  Controls,
  DropZones,
  Handles,
  ObjectClasses,
  ObjectClassMetadata,
  SnappingGuides,
  TemplateParameters
} from "../common";
import {
  AxisRenderer,
  buildAxisWidgets,
  getNumericalInterpolate
} from "../plot_segments/axis";
import { DataAxisAttributes, DataAxisProperties } from "./data_axis.attrs";

export { DataAxisAttributes, DataAxisProperties };

export class DataAxisClass extends MarkClass<
  DataAxisProperties,
  DataAxisAttributes
> {
  public static classID = "mark.data-axis";
  public static type = "mark";

  public static metadata: ObjectClassMetadata = {
    displayName: "DataAxis",
    iconPath: "mark/data-axis",
    creatingInteraction: {
      type: "line-segment",
      mapping: { x1: "x1", y1: "y1", x2: "x2", y2: "y2" }
    }
  };

  public static defaultProperties: Partial<DataAxisProperties> = {
    dataExpressions: [],
    axis: null,
    visible: true
  };

  public get attributeNames(): string[] {
    const r = ["x1", "y1", "x2", "y2"];
    for (let i = 0; i < this.object.properties.dataExpressions.length; i++) {
      r.push(`anchorX${i}`);
      r.push(`anchorY${i}`);
    }
    return r;
  }

  public get attributes(): AttributeDescriptions {
    const r: AttributeDescriptions = {
      ...AttrBuilder.line()
    };
    for (let i = 0; i < this.object.properties.dataExpressions.length; i++) {
      r[`anchorX${i}`] = {
        name: `anchorX${i}`,
        type: Specification.AttributeType.Number
      };
      r[`anchorY${i}`] = {
        name: `anchorY${i}`,
        type: Specification.AttributeType.Number
      };
    }
    return r;
  }

  public buildConstraints(
    solver: ConstraintSolver,
    context: BuildConstraintsContext
  ) {
    if (context == null) {
      return;
    }
    const attrs = this.state.attributes;
    const props = this.object.properties;
    const [x1, y1, x2, y2] = solver.attrs(attrs, ["x1", "y1", "x2", "y2"]);
    if (props.axis) {
      if (props.axis.type == "numerical") {
        for (let i = 0; i < props.dataExpressions.length; i++) {
          const expr = context.getExpressionValue(
            props.dataExpressions[i],
            context.rowContext
          ) as number;
          const interp = getNumericalInterpolate(props.axis);
          const t = interp(expr);
          if (attrs[`anchorX${i}`] == null) {
            attrs[`anchorX${i}`] = attrs.x1;
          }
          if (attrs[`anchorY${i}`] == null) {
            attrs[`anchorY${i}`] = attrs.y1;
          }
          solver.addLinear(
            ConstraintStrength.HARD,
            0,
            [[t, x2], [1 - t, x1]],
            [[1, solver.attr(attrs, `anchorX${i}`)]]
          );
          solver.addLinear(
            ConstraintStrength.HARD,
            0,
            [[t, y2], [1 - t, y1]],
            [[1, solver.attr(attrs, `anchorY${i}`)]]
          );
        }
      }
    }
  }

  // Initialize the state of an element so that everything has a valid value
  public initializeState(): void {
    const attrs = this.state.attributes;
    attrs.x1 = -10;
    attrs.y1 = -10;
    attrs.x2 = 10;
    attrs.y2 = 10;
  }

  // Get bounding rectangle given current state
  public getHandles(): Handles.Description[] {
    const attrs = this.state.attributes;
    return [
      {
        type: "point",
        x: attrs.x1,
        y: attrs.y1,
        actions: [
          { type: "attribute", source: "x", attribute: "x1" },
          { type: "attribute", source: "y", attribute: "y1" }
        ]
      } as Handles.Point,
      {
        type: "point",
        x: attrs.x2,
        y: attrs.y2,
        actions: [
          { type: "attribute", source: "x", attribute: "x2" },
          { type: "attribute", source: "y", attribute: "y2" }
        ]
      } as Handles.Point
    ];
  }

  public getGraphics(
    cs: Graphics.CoordinateSystem,
    offset: Point,
    glyphIndex: number = 0
  ): Graphics.Element {
    const attrs = this.state.attributes;
    const props = this.object.properties;
    if (glyphIndex != 0) {
      return null;
    }
    if (props.axis) {
      if (props.axis.visible) {
        const renderer = new AxisRenderer();
        renderer.setAxisDataBinding(
          props.axis,
          0,
          Math.sqrt(
            (attrs.x2 - attrs.x1) * (attrs.x2 - attrs.x1) +
              (attrs.y2 - attrs.y1) * (attrs.y2 - attrs.y1)
          ),
          false,
          false
        );
        const g = renderer.renderLine(
          0,
          0,
          (Math.atan2(attrs.y2 - attrs.y1, attrs.x2 - attrs.x1) / Math.PI) *
            180,
          -1
        );
        g.transform = cs.getLocalTransform(
          attrs.x1 + offset.x,
          attrs.y1 + offset.y
        );
        return g;
      } else {
        return null;
      }
    } else {
      const renderer = new AxisRenderer();
      renderer.setAxisDataBinding(
        null,
        0,
        Math.sqrt(
          (attrs.x2 - attrs.x1) * (attrs.x2 - attrs.x1) +
            (attrs.y2 - attrs.y1) * (attrs.y2 - attrs.y1)
        ),
        false,
        false
      );
      const g = renderer.renderLine(
        0,
        0,
        (Math.atan2(attrs.y2 - attrs.y1, attrs.x2 - attrs.x1) / Math.PI) * 180,
        -1
      );
      g.transform = cs.getLocalTransform(
        attrs.x1 + offset.x,
        attrs.y1 + offset.y
      );
      return g;
    }
  }

  public getSnappingGuides(): SnappingGuides.Description[] {
    const attrs = this.state.attributes;
    const guides: SnappingGuides.Description[] = [];
    if (attrs.x1 != attrs.x2) {
      for (let i = 0; i < this.object.properties.dataExpressions.length; i++) {
        const attr = `anchorX${i}`;
        guides.push({
          type: "x",
          value: attrs[attr] as number,
          attribute: attr
        } as SnappingGuides.Axis);
      }
    }
    if (attrs.y1 != attrs.y2) {
      for (let i = 0; i < this.object.properties.dataExpressions.length; i++) {
        const attr = `anchorY${i}`;
        guides.push({
          type: "y",
          value: attrs[attr] as number,
          attribute: attr
        } as SnappingGuides.Axis);
      }
    }
    for (let i = 0; i < this.object.properties.dataExpressions.length; i++) {
      const attrX = `anchorX${i}`;
      const attrY = `anchorY${i}`;
      guides.push({
        type: "label",
        x: attrs[attrX] as number,
        y: attrs[attrY] as number,
        text: this.object.properties.dataExpressions[i]
      } as SnappingGuides.Label);
    }
    return guides;
  }

  public getBoundingBox(): BoundingBox.Description {
    const attrs = this.state.attributes;
    return {
      type: "line",
      x1: attrs.x1,
      y1: attrs.y1,
      x2: attrs.x2,
      y2: attrs.y2
    } as BoundingBox.Line;
  }

  // Get DropZones given current state
  public getDropZones(): DropZones.Description[] {
    const attrs = this.state.attributes;
    const { x1, y1, x2, y2 } = attrs;
    return [
      {
        type: "line",
        p1: { x: x1, y: y1 },
        p2: { x: x2, y: y2 },
        title: "Data Axis",
        dropAction: {
          axisInference: {
            property: "axis",
            appendToProperty: "dataExpressions"
          }
        }
      } as DropZones.Line
    ];
  }

  // /** Get link anchors for this mark */
  // public getLinkAnchors(): LinkAnchor.Description[] {
  //     let attrs = this.state.attributes;
  //     return [
  //         {
  //             points: [
  //                 { x: attrs.x, y: attrs.y, xAttribute: "x", yAttribute: "y", direction: { x: 0, y: 1 } }
  //             ]
  //         }
  //     ];
  // }

  public getAttributePanelWidgets(
    manager: Controls.WidgetManager
  ): Controls.Widget[] {
    const props = this.object.properties;
    const axisWidgets = buildAxisWidgets(
      props.axis,
      "axis",
      manager,
      "Data Axis"
    );
    return [...axisWidgets];
  }

  public getTemplateParameters(): TemplateParameters {
    const props = this.object.properties;
    const dataSource: Specification.Template.Inference["dataSource"] = {
      table: this.getGlyphClass().object.table,
      groupBy: null // TODO: fixme
    };
    if (props.dataExpressions && props.dataExpressions.length > 0) {
      return {
        inferences: [
          {
            objectID: this.object._id,
            dataSource,
            axis: {
              expression: props.dataExpressions[0],
              type: props.axis.type,
              property: "axis"
            }
          },
          ...props.dataExpressions.map((x, i) => {
            return {
              objectID: this.object._id,
              dataSource,
              expression: {
                expression: x,
                property: { property: "dataExpressions", field: i }
              }
            };
          })
        ]
      };
    }
  }
}
