// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { ConstraintSolver, ConstraintStrength, Variable } from "../../solver";
import * as Specification from "../../specification";
import { ChartElementClass } from "../chart_element";
import {
  AttributeDescription,
  Handles,
  SnappingGuides,
  BoundingBox,
  Controls,
  TemplateParameters,
  LinkAnchor
} from "../common";
import { ObjectClassMetadata } from "../index";
import { ObjectClasses } from "../object";

type GuideAxis = "x" | "y";
enum GuideAttributesNames {
  value = "value",
  value2 = "value2",
  marginPos = "marginPos"
}

export interface GuideAttributes extends Specification.AttributeMap {
  value: number;
  value2: number;
  marginPos: number;
}

interface GuideAttributeDescription extends AttributeDescription {
  name: GuideAttributesNames;
}

export interface GuideProperties extends Specification.AttributeMap {
  axis: GuideAxis;
  gap: number;
  baseline: Specification.baselineH | Specification.baselineV;
  baselineReadonly: boolean;
}

export class GuideClass extends ChartElementClass<
  GuideProperties,
  GuideAttributes
> {
  public static classID = "guide.guide";
  public static type = "guide";

  public static metadata: ObjectClassMetadata = {
    displayName: "Guide",
    iconPath: "guide/x"
  };

  public static defaultProperties: Partial<GuideProperties> = {
    gap: 0,
    baseline: null,
    baselineReadonly: true
  };

  public attributeNames: GuideAttributesNames[] = [
    GuideAttributesNames.value,
    GuideAttributesNames.value2,
    GuideAttributesNames.marginPos
  ];
  public attributes: {
    [name in GuideAttributesNames]: GuideAttributeDescription
  } = {
    value: {
      name: GuideAttributesNames.value,
      type: Specification.AttributeType.Number
    },
    value2: {
      name: GuideAttributesNames.value2,
      type: Specification.AttributeType.Number
    },
    marginPos: {
      name: GuideAttributesNames.marginPos,
      type: Specification.AttributeType.Number
    }
  };

  public initializeState() {
    this.state.attributes.value = 0;
    this.state.attributes.value2 = 0;
    this.state.attributes.marginPos = 0;
  }

  private getAxis() {
    return this.object.properties.axis;
  }

  public buildConstraints(solver: ConstraintSolver) {
    switch (this.object.properties.baseline) {
      case "center":
      case "middle": {
        const [value, value2, marginPos] = solver.attrs(this.state.attributes, [
          GuideAttributesNames.value,
          GuideAttributesNames.value2,
          GuideAttributesNames.marginPos
        ]);
        solver.addLinear(ConstraintStrength.HARD, this.object.properties.gap, [
          [1, value],
          [-1, value2]
        ]);

        solver.addLinear(ConstraintStrength.HARD, this.state.attributes.value, [
          [-1, marginPos]
        ]);
        break;
      }
      case "left": {
        const [width] = solver.attrs(this.parent.state.attributes, ["width"]);
        solver.makeConstant(this.parent.state.attributes, "width");

        const [value, marginPos] = solver.attrs(this.state.attributes, [
          GuideAttributesNames.value,
          GuideAttributesNames.marginPos
        ]);
        solver.makeConstant(this.state.attributes, GuideAttributesNames.value);

        solver.addLinear(
          ConstraintStrength.HARD,
          0,
          [[1, marginPos]],
          [[-0.5, width], [+1, value]]
        );

        break;
      }
    }
  }

  public getLinkAnchors(): LinkAnchor.Description[] {
    return [];
  }

  /** Get handles given current state */
  public getHandles(): Handles.Description[] {
    const inf = [-1000, 1000];
    const handleLine = (
      attribute: GuideAttributesNames,
      value: Specification.AttributeValue
    ) => {
      return {
        type: "line",
        axis,
        actions: [{ type: "attribute", attribute }],
        value,
        span: inf
      } as Handles.Line;
    };
    const handleRelativeLine = (
      attribute: GuideAttributesNames,
      value: Specification.AttributeValue,
      reference: number,
      sign: number
    ) => {
      return {
        type: "relative-line",
        axis,
        actions: [{ type: "attribute", attribute }],
        reference,
        sign,
        value,
        span: inf
      } as Handles.RelativeLine;
    };
    // const values = this.valuesByBaseline();
    const { axis, baseline, gap } = this.object.properties;
    const { value, value2 } = this.state.attributes;
    const r: Handles.Description[] = [];
    const w2 = (this.parent.state.attributes.width as number) / 2;
    switch (baseline) {
      case "center":
      case "middle": {
        r.push(handleLine(GuideAttributesNames.value, value));
        if (gap > 0) {
          r.push(handleLine(GuideAttributesNames.value2, value2));
        }
        break;
      }
      case "left": {
        r.push(handleRelativeLine(GuideAttributesNames.value, value, -w2, 1));
        if (gap > 0) {
          // r.push(handleLine("value2", value2));
        }
        break;
      }
    }
    return r;
  }

  public getSnappingGuides(): SnappingGuides.Description[] {
    const snappingGuideAxis = (
      attribute: string,
      value: Specification.AttributeValue
    ) => {
      return {
        type: this.getAxis(),
        value,
        attribute,
        visible: true
      } as SnappingGuides.Axis;
    };
    const r = [
      snappingGuideAxis(
        GuideAttributesNames.marginPos,
        this.state.attributes.marginPos
      )
    ];
    if (this.object.properties.gap > 0) {
      r.push(
        snappingGuideAxis(
          GuideAttributesNames.value2,
          this.state.attributes.value2
        )
      ); // TODO value2 for marginPos
    }
    return r;
  }

  public getAttributePanelWidgets(
    manager: Controls.WidgetManager
  ): Controls.Widget[] {
    const widgets: Controls.Widget[] = [manager.sectionHeader("Guide")];

    if (!this.object.properties.baselineReadonly) {
      let labels: string[];
      let options: string[];
      let icons: string[];
      if (this.object.properties.axis === "x") {
        labels = ["Left", "Center", "Right"];
        options = ["left", "center", "right"];
        icons = ["align/left", "align/x-middle", "align/right"];
      } else {
        labels = ["Top", "Middle", "Bottom"];
        options = ["top", "middle", "bottom"];
        icons = ["align/top", "align/y-middle", "align/bottom"];
      }
      widgets.push(
        manager.row(
          "Baseline",
          manager.inputSelect(
            { property: "baseline" },
            {
              type: "dropdown",
              showLabel: true,
              labels,
              options,
              icons
            }
          )
        )
      );
    }

    widgets.push(
      manager.mappingEditor("Value", GuideAttributesNames.value, {
        defaultValue: this.state.attributes.value
      }),
      manager.row("Split Gap", manager.inputNumber({ property: "gap" }, {}))
    );

    return widgets;
  }

  public getTemplateParameters(): TemplateParameters {
    return {
      properties: [
        {
          objectID: this.object._id,
          target: {
            attribute: "baseline"
          },
          type: Specification.AttributeType.Enum,
          default: this.object.properties.baseline
        },
        {
          objectID: this.object._id,
          target: {
            attribute: "baselineReadonly"
          },
          type: Specification.AttributeType.Boolean,
          default: this.object.properties.baselineReadonly
        },
        {
          objectID: this.object._id,
          target: {
            attribute: "gap"
          },
          type: Specification.AttributeType.Number,
          default: this.object.properties.gap as number
        },
        {
          objectID: this.object._id,
          target: {
            attribute: GuideAttributesNames.value
          },
          type: Specification.AttributeType.Number,
          default: this.state.attributes.value as number
        },
        {
          objectID: this.object._id,
          target: {
            attribute: GuideAttributesNames.value2
          },
          type: Specification.AttributeType.Number,
          default: this.state.attributes.value2 as number
        },
        {
          objectID: this.object._id,
          target: {
            attribute: GuideAttributesNames.marginPos
          },
          type: Specification.AttributeType.Number,
          default: this.state.attributes.marginPos
        }
      ]
    };
  }
}

export interface GuideCoordinatorAttributes extends Specification.AttributeMap {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface GuideCoordinatorProperties extends Specification.AttributeMap {
  axis: "x" | "y";
}

export class GuideCoordinatorClass extends ChartElementClass<
  GuideCoordinatorProperties,
  GuideCoordinatorAttributes
> {
  public static classID = "guide.guide-coordinator";
  public static type = "guide";

  public static metadata: ObjectClassMetadata = {
    displayName: "GuideCoordinator",
    iconPath: "guide/coordinator-x"
  };

  public static defaultAttributes: Partial<GuideCoordinatorAttributes> = {
    axis: "x",
    count: 4
  };

  public buildConstraints(solver: ConstraintSolver) {
    const attrs = this.state.attributes;
    let t1: Variable, t2: Variable;
    if (this.getAxis() == "x") {
      t1 = solver.attr(attrs, "x1");
      t2 = solver.attr(attrs, "x2");
    } else {
      t1 = solver.attr(attrs, "y1");
      t2 = solver.attr(attrs, "y2");
    }
    const length = this.object.properties.count as number;
    this.getValueNames().map((name, index) => {
      const t = (1 + index) / (length + 1);
      solver.addLinear(
        ConstraintStrength.HARD,
        0,
        [[1 - t, t1], [t, t2]],
        [[1, solver.attr(attrs, name)]]
      );
    });
  }

  public getValueNames(): string[] {
    const attrs = [];
    for (let i = 0; i < this.object.properties.count; i++) {
      const name = `value${i}`;
      attrs.push(name);
      if (this.state) {
        if (this.state.attributes[name] == null) {
          this.state.attributes[name] = 0;
        }
      }
    }
    return attrs;
  }

  public get attributeNames(): string[] {
    return ["x1", "y1", "x2", "y2"].concat(this.getValueNames());
  }

  public get attributes(): { [name: string]: AttributeDescription } {
    const r: { [name: string]: AttributeDescription } = {
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
    for (let i = 0; i < this.object.properties.count; i++) {
      const name = `value${i}`;
      r[name] = {
        name,
        type: Specification.AttributeType.Number
      };
    }
    return r;
  }

  public initializeState() {
    const v = this.attributeNames;
    this.state.attributes.x1 = -100;
    this.state.attributes.y1 = -100;
    this.state.attributes.x2 = 100;
    this.state.attributes.y2 = 100;
    for (const name of this.getValueNames()) {
      if (this.state.attributes[name] == null) {
        this.state.attributes[name] = 0;
      }
    }
  }

  private getAxis() {
    return this.object.properties.axis;
  }

  /** Get handles given current state */
  public getHandles(): Handles.Description[] {
    const attrs = this.state.attributes as GuideCoordinatorAttributes;
    const { x1, y1, x2, y2 } = attrs;
    const axis = this.getAxis();
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
        x: axis == "y" ? x1 : x2,
        y: axis == "x" ? y1 : y2,
        actions: [
          {
            type: "attribute",
            source: "x",
            attribute: axis == "y" ? "x1" : "x2"
          },
          {
            type: "attribute",
            source: "y",
            attribute: axis == "x" ? "y1" : "y2"
          }
        ]
      } as Handles.Point
    ];
  }

  public getBoundingBox(): BoundingBox.Description {
    const attrs = this.state.attributes as GuideCoordinatorAttributes;
    const { x1, y1 } = attrs;
    let { x2, y2 } = attrs;
    if (this.getAxis() == "x") {
      y2 = y1;
    } else {
      x2 = x1;
    }
    return {
      type: "line",
      visible: true,
      morphing: true,
      x1,
      y1,
      x2,
      y2
    } as BoundingBox.Line;
  }

  public getSnappingGuides(): SnappingGuides.Description[] {
    return this.getValueNames().map(name => {
      return {
        type: this.getAxis(),
        value: this.state.attributes[name],
        attribute: name,
        visible: true
      } as SnappingGuides.Axis;
    });
  }

  /** Get controls given current state */
  public getAttributePanelWidgets(
    manager: Controls.WidgetManager
  ): Controls.Widget[] {
    return [
      manager.sectionHeader("Guide Coordinator"),
      manager.row(
        "Count",
        manager.inputNumber(
          { property: "count" },
          {
            showUpdown: true,
            updownTick: 1,
            updownRange: [1, 100],
            minimum: 1,
            maximum: 100
          }
        )
      )
    ];
  }
}

export function registerClasses() {
  ObjectClasses.Register(GuideClass);
  ObjectClasses.Register(GuideCoordinatorClass);
}
