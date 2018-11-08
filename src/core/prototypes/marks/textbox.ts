// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { Point } from "../../common";
import * as Graphics from "../../graphics";
import { ConstraintSolver, ConstraintStrength } from "../../solver";
import * as Specification from "../../specification";
import {
  BoundingBox,
  Controls,
  DropZones,
  Handles,
  LinkAnchor,
  ObjectClassMetadata,
  SnappingGuides
} from "../common";
import { ChartStateManager } from "../state";
import { EmphasizableMarkClass } from "./emphasis";
import {
  textboxAttributes,
  TextboxElementAttributes,
  TextboxElementProperties
} from "./textbox.attrs";

export { TextboxElementAttributes, TextboxElementProperties };

export class TextboxElementClass extends EmphasizableMarkClass<
  TextboxElementProperties,
  TextboxElementAttributes
> {
  public static classID = "mark.textbox";
  public static type = "mark";

  public static metadata: ObjectClassMetadata = {
    displayName: "Textbox",
    iconPath: "mark/textbox",
    creatingInteraction: {
      type: "rectangle",
      mapping: { xMin: "x1", yMin: "y1", xMax: "x2", yMax: "y2" }
    }
  };

  public static defaultProperties: Partial<TextboxElementProperties> = {
    visible: true,
    paddingX: 0,
    paddingY: 0,
    alignX: "middle",
    alignY: "middle"
  };

  public static defaultMappingValues: Partial<TextboxElementAttributes> = {
    text: "Text",
    fontFamily: "Arial",
    fontSize: 14,
    color: { r: 0, g: 0, b: 0 },
    opacity: 1,
    visible: true
  };

  public attributes = textboxAttributes;
  public attributeNames = Object.keys(textboxAttributes);

  // Initialize the state of an element so that everything has a valid value
  public initializeState(): void {
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
    attrs.color = {
      r: 0,
      g: 0,
      b: 0
    };
    attrs.visible = true;
    attrs.outline = null;
    attrs.opacity = 1;
    attrs.text = null;
    attrs.fontFamily = "Arial";
    attrs.fontSize = 14;
  }

  public getAttributePanelWidgets(
    manager: Controls.WidgetManager
  ): Controls.Widget[] {
    const props = this.object.properties;
    const widgets: Controls.Widget[] = [
      manager.sectionHeader("Size"),
      manager.mappingEditor("Width", "width", {
        hints: { autoRange: true },
        acceptKinds: [Specification.DataKind.Numerical],
        defaultAuto: true
      }),
      manager.mappingEditor("Height", "height", {
        hints: { autoRange: true },
        acceptKinds: [Specification.DataKind.Numerical],
        defaultAuto: true
      }),
      manager.sectionHeader("Text"),
      manager.mappingEditor("Text", "text", {}),
      manager.mappingEditor("Font", "fontFamily", {
        defaultValue: "Arial"
      }),
      manager.row(
        "Align X",
        manager.horizontal(
          [0, 1],
          manager.inputSelect(
            { property: "alignX" },
            {
              type: "radio",
              options: ["start", "middle", "end"],
              icons: ["align/left", "align/x-middle", "align/right"],
              labels: ["Left", "Middle", "Right"]
            }
          ),
          props.alignX != "middle"
            ? manager.horizontal(
                [0, 1],
                manager.label("Margin:"),
                manager.inputNumber(
                  { property: "paddingX" },
                  {
                    updownTick: 1,
                    showUpdown: true
                  }
                )
              )
            : null
        )
      ),
      manager.row(
        "Align Y",
        manager.horizontal(
          [0, 1],
          manager.inputSelect(
            { property: "alignY" },
            {
              type: "radio",
              options: ["start", "middle", "end"],
              icons: ["align/bottom", "align/y-middle", "align/top"],
              labels: ["Bottom", "Middle", "Top"]
            }
          ),
          props.alignY != "middle"
            ? manager.horizontal(
                [0, 1],
                manager.label("Margin:"),
                manager.inputNumber(
                  { property: "paddingY" },
                  {
                    updownTick: 1,
                    showUpdown: true
                  }
                )
              )
            : null
        )
      ),
      manager.sectionHeader("Style"),
      manager.mappingEditor("Color", "color", {}),
      manager.mappingEditor("Outline", "outline", {}),
      manager.mappingEditor("Opacity", "opacity", {
        hints: { rangeNumber: [0, 1] },
        defaultValue: 1,
        numberOptions: { showSlider: true, minimum: 0, maximum: 1 }
      }),
      manager.mappingEditor("Visibility", "visible", {
        defaultValue: true
      })
    ];
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

  // Get the graphical element from the element
  public getGraphics(
    cs: Graphics.CoordinateSystem,
    offset: Point,
    glyphIndex: number,
    manager: ChartStateManager
  ): Graphics.Element {
    const attrs = this.state.attributes;
    const props = this.object.properties;
    if (
      !attrs.text ||
      (!attrs.color && !attrs.outline) ||
      !attrs.visible ||
      attrs.opacity == 0
    ) {
      return Graphics.makeGroup([]);
    }
    const metrics = Graphics.TextMeasurer.Measure(
      attrs.text,
      attrs.fontFamily,
      attrs.fontSize
    );
    const helper = new Graphics.CoordinateSystemHelper(cs);
    const pathMaker = new Graphics.PathMaker();
    const cheight = (metrics.middle - metrics.ideographicBaseline) * 2;
    let y = 0;
    switch (props.alignY) {
      case "start":
        {
          y = attrs.y1 - metrics.ideographicBaseline + props.paddingY;
        }
        break;
      case "middle":
        {
          y = attrs.cy - cheight / 2 - metrics.ideographicBaseline;
        }
        break;
      case "end":
        {
          y = attrs.y2 - cheight - metrics.ideographicBaseline - props.paddingY;
        }
        break;
    }
    helper.lineTo(
      pathMaker,
      attrs.x1 + offset.x + props.paddingX,
      y + offset.y,
      attrs.x2 + offset.x - props.paddingX,
      y + offset.y,
      true
    );
    const cmds = pathMaker.path.cmds;
    const textElement: Graphics.TextOnPath = {
      type: "text-on-path",
      pathCmds: cmds,
      text: attrs.text,
      fontFamily: attrs.fontFamily,
      fontSize: attrs.fontSize,
      align: props.alignX
    };
    if (attrs.outline) {
      if (attrs.color) {
        const g = Graphics.makeGroup([
          {
            ...textElement,
            style: {
              strokeColor: attrs.outline
            }
          } as Graphics.TextOnPath,
          {
            ...textElement,
            style: {
              fillColor: attrs.color
            }
          } as Graphics.TextOnPath
        ]);
        g.style = { opacity: attrs.opacity };
        return g;
      } else {
        return {
          ...textElement,
          style: {
            strokeColor: attrs.outline,
            opacity: attrs.opacity
          }
        } as Graphics.TextOnPath;
      }
    } else {
      return {
        ...textElement,
        style: {
          fillColor: attrs.color,
          opacity: attrs.opacity
        }
      } as Graphics.TextOnPath;
    }
  }

  /** Get link anchors for this mark */
  public getLinkAnchors(): LinkAnchor.Description[] {
    const attrs = this.state.attributes;
    const element = this.object._id;
    return [
      {
        element,
        points: [
          {
            x: attrs.x1,
            y: attrs.y1,
            xAttribute: "x1",
            yAttribute: "y1",
            direction: { x: -1, y: 0 }
          },
          {
            x: attrs.x1,
            y: attrs.y2,
            xAttribute: "x1",
            yAttribute: "y2",
            direction: { x: -1, y: 0 }
          }
        ]
      },
      {
        element,
        points: [
          {
            x: attrs.x2,
            y: attrs.y1,
            xAttribute: "x2",
            yAttribute: "y1",
            direction: { x: 1, y: 0 }
          },
          {
            x: attrs.x2,
            y: attrs.y2,
            xAttribute: "x2",
            yAttribute: "y2",
            direction: { x: 1, y: 0 }
          }
        ]
      },
      {
        element,
        points: [
          {
            x: attrs.x1,
            y: attrs.y1,
            xAttribute: "x1",
            yAttribute: "y1",
            direction: { x: 0, y: -1 }
          },
          {
            x: attrs.x2,
            y: attrs.y1,
            xAttribute: "x2",
            yAttribute: "y1",
            direction: { x: 0, y: -1 }
          }
        ]
      },
      {
        element,
        points: [
          {
            x: attrs.x1,
            y: attrs.y2,
            xAttribute: "x1",
            yAttribute: "y2",
            direction: { x: 0, y: 1 }
          },
          {
            x: attrs.x2,
            y: attrs.y2,
            xAttribute: "x2",
            yAttribute: "y2",
            direction: { x: 0, y: 1 }
          }
        ]
      },
      {
        element,
        points: [
          {
            x: attrs.cx,
            y: attrs.y1,
            xAttribute: "cx",
            yAttribute: "y1",
            direction: { x: 0, y: -1 }
          }
        ]
      },
      {
        element,
        points: [
          {
            x: attrs.cx,
            y: attrs.y2,
            xAttribute: "cx",
            yAttribute: "y2",
            direction: { x: 0, y: 1 }
          }
        ]
      },
      {
        element,
        points: [
          {
            x: attrs.x1,
            y: attrs.cy,
            xAttribute: "x1",
            yAttribute: "cy",
            direction: { x: -1, y: 0 }
          }
        ]
      },
      {
        element,
        points: [
          {
            x: attrs.x2,
            y: attrs.cy,
            xAttribute: "x2",
            yAttribute: "cy",
            direction: { x: 1, y: 0 }
          }
        ]
      }
    ];
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
}
