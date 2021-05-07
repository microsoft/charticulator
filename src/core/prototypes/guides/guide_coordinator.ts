// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { strings } from "../../../strings";
import { ConstraintSolver, ConstraintStrength, Variable } from "../../solver";
import * as Specification from "../../specification";
import { ChartElementClass } from "../chart_element";
import {
  AttributeDescription,
  Handles,
  SnappingGuides,
  BoundingBox,
  Controls,
  SnappingGuidesVisualTypes,
} from "../common";
import { ObjectClassMetadata } from "../index";

export interface GuideCoordinatorAttributes extends Specification.AttributeMap {
  x1: number;
  y1: number;
  x2: number;
  y2: number;

  angle1: number;
  angle2: number;
  radial1: number;
  radial2: number;

  count: number;
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

  private static BaseGuidesCount = 0;

  public static metadata: ObjectClassMetadata = {
    displayName: "GuideCoordinator",
    iconPath: "guide/coordinator-x",
  };

  public static defaultAttributes: Partial<GuideCoordinatorAttributes> = {
    axis: "x",
    count: 2,
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
    const length =
      <number>this.object.properties.count -
      GuideCoordinatorClass.BaseGuidesCount;
    this.getValueNames().map((name, index) => {
      const t = (1 + index) / (length + 1);
      solver.addLinear(
        ConstraintStrength.HARD,
        0,
        [
          [1 - t, t1],
          [t, t2],
        ],
        [[1, solver.attr(attrs, name)]]
      );
    });
  }

  public getValueNames(): string[] {
    const attrs = [];
    for (
      let i = 0;
      i <
      <number>this.object.properties.count -
        GuideCoordinatorClass.BaseGuidesCount;
      i++
    ) {
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
        type: Specification.AttributeType.Number,
      },
      y1: {
        name: "y1",
        type: Specification.AttributeType.Number,
      },
      x2: {
        name: "x2",
        type: Specification.AttributeType.Number,
      },
      y2: {
        name: "y2",
        type: Specification.AttributeType.Number,
      },
    };
    for (
      let i = 0;
      i <
      <number>this.object.properties.count -
        GuideCoordinatorClass.BaseGuidesCount;
      i++
    ) {
      const name = `value${i}`;
      r[name] = {
        name,
        type: Specification.AttributeType.Number,
      };
    }
    return r;
  }

  public initializeState() {
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
    const attrs = <GuideCoordinatorAttributes>this.state.attributes;
    const { x1, y1, x2, y2 } = attrs;
    const axis = this.getAxis();
    return [
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
        x: axis == "y" ? x1 : x2,
        y: axis == "x" ? y1 : y2,
        actions: [
          {
            type: "attribute",
            source: "x",
            attribute: axis == "y" ? "x1" : "x2",
          },
          {
            type: "attribute",
            source: "y",
            attribute: axis == "x" ? "y1" : "y2",
          },
        ],
      },
    ];
  }

  public getBoundingBox(): BoundingBox.Description {
    const attrs = <GuideCoordinatorAttributes>this.state.attributes;
    const { x1, y1 } = attrs;
    let { x2, y2 } = attrs;
    if (this.getAxis() == "x") {
      y2 = y1;
    } else {
      x2 = x1;
    }
    return <BoundingBox.Line>{
      type: "line",
      visible: true,
      morphing: true,
      x1,
      y1,
      x2,
      y2,
    };
  }

  private getBasicValues(): string[] {
    return [];
    // uncomment to render main mark guides
    // if (this.getAxis() === "x") {
    //   return ["x1", "x2"];
    // }
    // if (this.getAxis() === "y") {
    //   return ["y1", "y2"];
    // }
  }

  public getSnappingGuides(): SnappingGuides.Description[] {
    return this.getValueNames()
      .concat(this.getBasicValues())
      .map((name) => {
        return <SnappingGuides.Axis>{
          type: this.getAxis(),
          value: this.state.attributes[name],
          attribute: name,
          visible: true,
          visualType: SnappingGuidesVisualTypes.Coordinator,
        };
      });
  }

  /** Get controls given current state */
  public getAttributePanelWidgets(
    manager: Controls.WidgetManager
  ): Controls.Widget[] {
    return [
      manager.sectionHeader(strings.objects.guides.guideCoordinator),
      manager.row(
        strings.objects.guides.count,
        manager.inputNumber(
          { property: "count" },
          {
            showUpdown: true,
            updownTick: 1,
            updownRange: [1, 100],
            minimum: 1,
            maximum: 100,
          }
        )
      ),
    ];
  }
}
