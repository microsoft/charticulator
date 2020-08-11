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

export type GuideAxis = "x" | "y";

enum GuideAttributeNames {
  value = "value",
  computedBaselineValue = "computedBaselineValue"
}

export interface GuideAttributes extends Specification.AttributeMap {
  value: number;
  computedBaselineValue: number;
}

interface GuideAttributeDescription extends AttributeDescription {
  name: GuideAttributeNames;
}

enum GuidePropertyNames {
  axis = "axis",
  baseline = "baseline"
}

export interface GuideProperties extends Specification.AttributeMap {
  axis: GuideAxis;
  baseline: Specification.baselineH | Specification.baselineV;
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
    baseline: null
  };

  public attributeNames: GuideAttributeNames[] = [
    GuideAttributeNames.value,
    GuideAttributeNames.computedBaselineValue
  ];
  public attributes: {
    [name in GuideAttributeNames]: GuideAttributeDescription
  } = {
    value: {
      name: GuideAttributeNames.value,
      type: Specification.AttributeType.Number
    },
    computedBaselineValue: {
      name: GuideAttributeNames.computedBaselineValue,
      type: Specification.AttributeType.Number
    }
  };

  public initializeState() {
    this.state.attributes.value = 0;
    this.state.attributes.computedBaselineValue = 0;
  }

  private getAxis() {
    return this.object.properties.axis;
  }

  public buildConstraints(solver: ConstraintSolver) {
    switch (this.object.properties.baseline) {
      case "center": {
        this.computeBaselineFromParentAttribute(
          solver,
          ["cx"],
          ([cx], value) => [[+1, cx], [+1, value]]
        );
        break;
      }
      case "middle": {
        this.computeBaselineFromParentAttribute(
          solver,
          ["cy"],
          ([cy], value) => [[+1, cy], [+1, value]]
        );
        break;
      }
      case "left": {
        this.computeBaselineFromParentAttribute(
          solver,
          ["width", "marginLeft"],
          ([width, marginLeft], value) => [
            [-0.5, width],
            [+1, marginLeft],
            [+1, value]
          ]
        );
        break;
      }
      case "right": {
        this.computeBaselineFromParentAttribute(
          solver,
          ["width", "marginRight"],
          ([width, marginRight], value) => [
            [+0.5, width],
            [-1, marginRight],
            [+1, value]
          ]
        );
        break;
      }
      case "top": {
        this.computeBaselineFromParentAttribute(
          solver,
          ["height", "marginTop"],
          ([height, marginTop], value) => [
            [+0.5, height],
            [-1, marginTop],
            [+1, value]
          ]
        );
        break;
      }
      case "bottom": {
        this.computeBaselineFromParentAttribute(
          solver,
          ["height", "marginBottom"],
          ([height, marginBottom], value) => [
            [-0.5, height],
            [+1, marginBottom],
            [+1, value]
          ]
        );
        break;
      }
    }
  }

  private computeBaselineFromParentAttribute(
    solver: ConstraintSolver,
    parentAttributeNames: string[],
    rhsFn: (
      parentAttributeVariables: Variable[],
      value: Variable
    ) => Array<[number, Variable]>
  ) {
    const parentAttrs = this.parent.state.attributes;
    const parentAttributeVariables = solver.attrs(
      parentAttrs,
      parentAttributeNames
    );
    // parentAttributeNames.forEach(parentAttributeName => solver.makeConstant(parentAttrs, parentAttributeName));

    const [value, computedBaselineValue] = solver.attrs(this.state.attributes, [
      GuideAttributeNames.value,
      GuideAttributeNames.computedBaselineValue
    ]);
    solver.makeConstant(this.state.attributes, GuideAttributeNames.value);

    solver.addLinear(
      ConstraintStrength.HARD,
      0,
      [[1, computedBaselineValue]],
      rhsFn(parentAttributeVariables, value)
    );
  }

  public getLinkAnchors(): LinkAnchor.Description[] {
    return [];
  }

  /** Get handles given current state */
  public getHandles(): Handles.Description[] {
    const inf = [-1000, 1000];
    const { value } = this.state.attributes;
    const { axis, baseline } = this.object.properties;
    const handleRelativeLine = (reference: number) => {
      return [
        {
          type: "relative-line",
          axis,
          actions: [
            { type: "attribute", attribute: GuideAttributeNames.value }
          ],
          reference,
          sign: 1,
          value,
          span: inf
        }
      ] as Handles.RelativeLine[];
    };
    switch (baseline) {
      case "center": {
        return handleRelativeLine(+this.parent.state.attributes.cx);
      }
      case "middle": {
        return handleRelativeLine(+this.parent.state.attributes.cy);
      }
      case "left": {
        return handleRelativeLine(+this.parent.state.attributes.x1);
      }
      case "right": {
        return handleRelativeLine(+this.parent.state.attributes.x2);
      }
      case "top": {
        return handleRelativeLine(+this.parent.state.attributes.y2);
      }
      case "bottom": {
        return handleRelativeLine(+this.parent.state.attributes.y1);
      }
    }
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
        GuideAttributeNames.computedBaselineValue,
        this.state.attributes.computedBaselineValue
      )
    ];
    return r;
  }

  public getAttributePanelWidgets(
    manager: Controls.WidgetManager
  ): Controls.Widget[] {
    const widgets: Controls.Widget[] = [manager.sectionHeader("Guide")];

    let labels: string[];
    let options: string[];
    let icons: string[];
    if (this.object.properties.axis === "x") {
      const hOptions: Specification.baselineH[] = ["left", "center", "right"];
      options = hOptions;
      labels = ["Left", "Center", "Right"];

      icons = ["align/left", "align/x-middle", "align/right"];
    } else {
      const vOptions: Specification.baselineV[] = ["top", "middle", "bottom"];
      options = vOptions;
      labels = ["Top", "Middle", "Bottom"];
      icons = ["align/top", "align/y-middle", "align/bottom"];
    }
    widgets.push(
      manager.row(
        "Baseline",
        manager.inputSelect(
          { property: GuidePropertyNames.baseline },
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

    widgets.push(
      manager.mappingEditor("Value", GuideAttributeNames.value, {
        defaultValue: this.state.attributes.value
      })
    );

    return widgets;
  }

  public getTemplateParameters(): TemplateParameters {
    return {
      properties: [
        {
          objectID: this.object._id,
          target: {
            attribute: GuidePropertyNames.baseline
          },
          type: Specification.AttributeType.Enum,
          default: this.object.properties.baseline
        },
        {
          objectID: this.object._id,
          target: {
            attribute: GuideAttributeNames.value
          },
          type: Specification.AttributeType.Number,
          default: this.state.attributes.value as number
        },
        {
          objectID: this.object._id,
          target: {
            attribute: GuideAttributeNames.computedBaselineValue
          },
          type: Specification.AttributeType.Number,
          default: this.state.attributes.computedBaselineValue
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
