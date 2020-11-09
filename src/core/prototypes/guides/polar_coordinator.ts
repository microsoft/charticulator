// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { Prototypes, zipArray } from "../../../container";
import {
  ConstraintPlugins,
  ConstraintSolver,
  ConstraintStrength,
  Variable,
} from "../../solver";
import * as Specification from "../../specification";
import { ChartElementClass } from "../chart_element";
import {
  AttributeDescription,
  Handles,
  SnappingGuides,
  BoundingBox,
  Controls,
} from "../common";
import { ObjectClassMetadata } from "../index";
import { PolarState } from "../plot_segments/region_2d/polar";
import { ChartStateManager } from "../state";

export interface PolarGuideCoordinatorAttributes
  extends Specification.AttributeMap {
  x1: number;
  y1: number;
  x2: number;
  y2: number;

  angle1: number;
  angle2: number;
  radial1: number;
  radial2: number;
}

export interface PolarGuideState extends Specification.PlotSegmentState {
  attributes: PolarGuideCoordinatorAttributes;
}

export interface PolarGuideCoordinatorProperties
  extends Specification.AttributeMap {
  startAngle: number;
  endAngle: number;
  innerRatio: number;
  outerRatio: number;
  equalizeArea: boolean;
  angularGuidesCount: number;
  radialGuidesCount: number;
}

export interface GuidePolarCoordinatorProperties
  extends Specification.AttributeMap {
  axis: "x" | "y";
  properties: PolarGuideCoordinatorProperties;
}

export interface PolarGuideObject
  extends Specification.Object<PolarGuideCoordinatorProperties> {
  properties: PolarGuideCoordinatorProperties;
}

export class GuidePolarCoordinatorClass extends ChartElementClass<
  PolarGuideCoordinatorProperties,
  PolarGuideCoordinatorAttributes
> {
  public static classID = "guide.guide-coordinator-polar";
  public static type = "guide";

  public static metadata: ObjectClassMetadata = {
    displayName: "GuidePolarCoordinator",
    iconPath: "plot-segment/polar", // TODO change
    creatingInteraction: {
      type: "rectangle",
      mapping: { xMin: "x1", yMin: "y1", xMax: "x2", yMax: "y2" },
    },
  };

  public readonly state: PolarState;

  public static defaultAttributes: Partial<PolarGuideCoordinatorAttributes> = {
    axis: "xy",
    angularGuidesCount: 4,
    radialGuidesCount: 4,
  };

  public buildConstraints(
    solver: ConstraintSolver,
    constr: any,
    manager: ChartStateManager
  ) {
    console.log("buildConstraints");
    const attrs = this.state.attributes;
    const props = this.object.properties;

    const radialY = this.getValueNamesForRadial();
    const chunkSizeY = (1 - 0) / radialY.length;
    const chunkRangesY = radialY.map((c, i) => {
      return [
        0 + (0 + chunkSizeY) * i,
        0 + (0 + chunkSizeY) * i + chunkSizeY,
      ] as [number, number];
    });

    const angularX = this.getValueNamesForAngular();
    const chunkSizeX = (1 - 0) / angularX.length;
    const chunkRangesX = angularX.map((c, i) => {
      return [
        0 + (0 + chunkSizeX) * i,
        0 + (0 + chunkSizeX) * i + chunkSizeX,
      ] as [number, number];
    });

    const [x, y, x1, x2, y1, y2, innerRadius, outerRadius] = solver.attrs(
      attrs,
      ["x", "y", "x1", "x2", "y1", "y2", "radial1", "radial2"]
    );

    attrs.angle1 = props.startAngle;
    attrs.angle2 = props.endAngle;
    solver.makeConstant(attrs, "angle1");
    solver.makeConstant(attrs, "angle2");

    if (Math.abs(attrs.x2 - attrs.x1) < Math.abs(attrs.y2 - attrs.y1)) {
      attrs.radial1 = (props.innerRatio * (attrs.x2 - attrs.x1)) / 2;
      attrs.radial2 = (props.outerRatio * (attrs.x2 - attrs.x1)) / 2;
      // innerRatio * x2 - innerRatio * x1 = 2 * innerRadius
      solver.addLinear(
        ConstraintStrength.HARD,
        0,
        [
          [props.innerRatio, x2],
          [-props.innerRatio, x1],
        ],
        [[2, innerRadius]]
      );
      // outerRatio * x2 - outerRatio * x1 = 2 * outerRadius
      solver.addLinear(
        ConstraintStrength.HARD,
        0,
        [
          [props.outerRatio, x2],
          [-props.outerRatio, x1],
        ],
        [[2, outerRadius]]
      );
    } else {
      attrs.radial1 = (props.innerRatio * (attrs.y2 - attrs.y1)) / 2;
      attrs.radial2 = (props.outerRatio * (attrs.y2 - attrs.y1)) / 2;
      // innerRatio * y2 - innerRatio * y1 = 2 * innerRadius
      solver.addLinear(
        ConstraintStrength.HARD,
        0,
        [
          [props.innerRatio, y2],
          [-props.innerRatio, y1],
        ],
        [[2, innerRadius]]
      );
      // outerRatio * y2 - outerRatio * y1 = 2 * outerRadius
      solver.addLinear(
        ConstraintStrength.HARD,
        0,
        [
          [props.outerRatio, y2],
          [-props.outerRatio, y1],
        ],
        [[2, outerRadius]]
      );
    }

    // add constraint 2 * xc = x1 + x2
    solver.addLinear(
      ConstraintStrength.HARD,
      0,
      [[2, x]],
      [
        [1, x1],
        [1, x2],
      ]
    );
    // add constraint 2 * yc = y1 + y2
    solver.addLinear(
      ConstraintStrength.HARD,
      0,
      [[2, y]],
      [
        [1, y1],
        [1, y2],
      ]
    );

    // xy
    {
      const [x1, x2, y1, y2] = solver.attrs(attrs, [
        "angle1",
        "angle2",
        "radial1",
        "radial2",
      ]);

      const angleVarable: Array<Variable> = [];
      for (let xindex = 0; xindex < angularX.length; xindex++) {
        angleVarable.push(solver.attr(attrs, angularX[xindex]));
      }
      const radialVarable: Array<Variable> = [];
      for (let yindex = 0; yindex < radialY.length; yindex++) {
        radialVarable.push(solver.attr(attrs, radialY[yindex]));
      }

      for (let yindex = 0; yindex < radialY.length; yindex++) {
        const [ty1, ty2] = chunkRangesY[yindex];

        for (let xindex = 0; xindex < angularX.length; xindex++) {
          const [tx1, tx2] = chunkRangesX[xindex];

          const vx1Expr = [
            [tx1, x2],
            [1 - tx1, x1],
          ] as Array<[number, Variable]>;
          const vx2Expr = [
            [tx2, x2],
            [1 - tx2, x1],
          ] as Array<[number, Variable]>;

          const vy1Expr = [
            [ty1, y2],
            [1 - ty1, y1],
          ] as Array<[number, Variable]>;
          const vy2Expr = [
            [ty2, y2],
            [1 - ty2, y1],
          ] as Array<[number, Variable]>;

          const vx1 = solver.attr(
            { value: solver.getLinear(...vx1Expr) },
            "value",
            { edit: true }
          );
          const vx2 = solver.attr(
            { value: solver.getLinear(...vx2Expr) },
            "value",
            { edit: true }
          );
          const vy1 = solver.attr(
            { value: solver.getLinear(...vy1Expr) },
            "value",
            { edit: true }
          );
          const vy2 = solver.attr(
            { value: solver.getLinear(...vy2Expr) },
            "value",
            { edit: true }
          );

          solver.addLinear(ConstraintStrength.HARD, 0, vx1Expr, [[1, vx1]]);
          solver.addLinear(ConstraintStrength.HARD, 0, vx2Expr, [[1, vx2]]);
          solver.addLinear(ConstraintStrength.HARD, 0, vy1Expr, [[1, vy1]]);
          solver.addLinear(ConstraintStrength.HARD, 0, vy2Expr, [[1, vy2]]);

          solver.addEquals(
            ConstraintStrength.HARD,
            solver.attr(attrs, angularX[xindex], {
              edit: true,
            }),
            vx1
          );

          solver.addEquals(
            ConstraintStrength.HARD,
            solver.attr(attrs, radialY[yindex], {
              edit: true,
            }),
            vy2
          );
        }
      }

      const chartConstraints = this.parent.object.constraints;

      solver.addPlugin(
        new ConstraintPlugins.PolarCoordinatorPlugin(
          solver,
          x,
          y,
          radialVarable,
          angleVarable,
          attrs,
          chartConstraints,
          this.object._id,
          (elementID: string, attribute: string, value: any) => {
            const object = Prototypes.findObjectById(manager.chart, elementID);
            const [element, elementState] = zipArray(
              manager.chart.elements,
              manager.chartState.elements
            ).find(([element, elementState]) => {
              return element._id === elementID;
            });
            elementState.attributes[attribute] = value;
          },
          manager
        )
      );
    }
  }

  public getValueNamesForAngular(): string[] {
    const attrs = [];
    for (let i = 0; i < this.object.properties.angularGuidesCount; i++) {
      const name = `angularValue${i}`;
      attrs.push(name);
      if (this.state) {
        if (this.state.attributes[name] == null) {
          this.state.attributes[name] = 0;
        }
      }
    }
    return attrs;
  }

  public getValueNamesForRadial(): string[] {
    const attrs = [];
    for (let i = 0; i < this.object.properties.radialGuidesCount; i++) {
      const name = `radialValue${i}`;
      attrs.push(name);
      if (this.state) {
        if (this.state.attributes[name] == null) {
          this.state.attributes[name] = 0;
        }
      }
    }
    return attrs;
  }

  public getValueNamesForPoints(): string[] {
    const attrs = [];
    for (let i = 0; i < this.object.properties.angularGuidesCount; i++) {
      for (let j = 0; j < this.object.properties.radialGuidesCount; j++) {
        const nameX = `point${i}${j}X`;
        attrs.push(nameX);
        if (this.state) {
          if (this.state.attributes[nameX] == null) {
            this.state.attributes[nameX] = 0;
          }
        }
        const nameY = `point${i}${j}Y`;
        attrs.push(nameY);
        if (this.state) {
          if (this.state.attributes[nameX] == null) {
            this.state.attributes[nameX] = 0;
          }
        }
      }
    }
    return attrs;
  }

  public get attributeNames(): string[] {
    return ["x", "y", "x1", "y1", "x2", "y2"]
      .concat(this.getValueNamesForAngular())
      .concat(this.getValueNamesForRadial());
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
      angle1: {
        name: "angle1",
        type: Specification.AttributeType.Number,
        defaultValue: -90,
      },
      angle2: {
        name: "angle2",
        type: Specification.AttributeType.Number,
        defaultValue: 90,
      },
      radial1: {
        name: "radial1",
        type: Specification.AttributeType.Number,
      },
      radial2: {
        name: "radial2",
        type: Specification.AttributeType.Number,
      },
      x: {
        name: "x",
        type: Specification.AttributeType.Number,
      },
      y: {
        name: "y",
        type: Specification.AttributeType.Number,
      },
    };
    for (let i = 0; i < this.object.properties.angularGuidesCount; i++) {
      const name = `angularValue${i}`;
      r[name] = {
        name,
        type: Specification.AttributeType.Number,
      };
    }
    for (let i = 0; i < this.object.properties.radialGuidesCount; i++) {
      const name = `radialValue${i}`;
      r[name] = {
        name,
        type: Specification.AttributeType.Number,
      };
    }
    for (let i = 0; i < this.object.properties.angularGuidesCount; i++) {
      for (let j = 0; j < this.object.properties.radialGuidesCount; j++) {
        const nameX = `point${i}${j}X`;
        r[nameX] = {
          name,
          type: Specification.AttributeType.Number,
        };
        const nameY = `point${i}${j}Y`;
        r[nameY] = {
          name,
          type: Specification.AttributeType.Number,
        };
      }
    }
    return r;
  }

  public initializeState() {
    const v = this.attributeNames;
    const attrs = this.state.attributes;
    attrs.angle1 = 0;
    attrs.angle2 = 360;
    attrs.radial1 = 10;
    attrs.radial2 = 100;
    attrs.x1 = -100;
    attrs.x2 = 100;
    attrs.y1 = -100;
    attrs.y2 = 100;
    attrs.x = attrs.x1;
    attrs.y = attrs.y2;
    attrs.gapX = 4;
    attrs.gapY = 4;
    for (const name of this.getValueNamesForAngular()) {
      if (this.state.attributes[name] == null) {
        this.state.attributes[name] = 0;
      }
    }
    for (const name of this.getValueNamesForRadial()) {
      if (this.state.attributes[name] == null) {
        this.state.attributes[name] = 0;
      }
    }
    for (const name of this.getValueNamesForPoints()) {
      if (this.state.attributes[name] == null) {
        this.state.attributes[name] = 0;
      }
    }
  }

  /** Get handles given current state */
  public getHandles(): Handles.Description[] {
    const attrs = this.state.attributes;
    const { x1, y1, x2, y2 } = attrs;

    return [
      {
        type: "line",
        axis: "x",
        actions: [{ type: "attribute", attribute: "x1" }],
        value: x1,
        span: [y1, y2],
      } as Handles.Line,
      {
        type: "line",
        axis: "x",
        actions: [{ type: "attribute", attribute: "x2" }],
        value: x2,
        span: [y1, y2],
      } as Handles.Line,
      {
        type: "line",
        axis: "y",
        actions: [{ type: "attribute", attribute: "y1" }],
        value: y1,
        span: [x1, x2],
      } as Handles.Line,
      {
        type: "line",
        axis: "y",
        actions: [{ type: "attribute", attribute: "y2" }],
        value: y2,
        span: [x1, x2],
      } as Handles.Line,
      {
        type: "point",
        x: x1,
        y: y1,
        actions: [
          { type: "attribute", source: "x", attribute: "x1" },
          { type: "attribute", source: "y", attribute: "y1" },
        ],
      } as Handles.Point,
      {
        type: "point",
        x: x1,
        y: y2,
        actions: [
          { type: "attribute", source: "x", attribute: "x1" },
          { type: "attribute", source: "y", attribute: "y2" },
        ],
      } as Handles.Point,
      {
        type: "point",
        x: x2,
        y: y1,
        actions: [
          { type: "attribute", source: "x", attribute: "x2" },
          { type: "attribute", source: "y", attribute: "y1" },
        ],
      } as Handles.Point,
      {
        type: "point",
        x: x2,
        y: y2,
        actions: [
          { type: "attribute", source: "x", attribute: "x2" },
          { type: "attribute", source: "y", attribute: "y2" },
        ],
      } as Handles.Point,
    ];
  }

  public getBoundingBox(): BoundingBox.Description {
    const attrs = this.state.attributes;
    const { x, y, x2, y2, x1, y1 } = attrs;

    let radial2 = 0;
    if (Math.abs(x2 - x1) < Math.abs(y2 - y1)) {
      radial2 = (this.object.properties.outerRatio * (x2 - x1)) / 2;
    } else {
      radial2 = (this.object.properties.outerRatio * (y2 - y1)) / 2;
    }

    return {
      type: "circle",
      cx: x,
      cy: y,
      radius: Math.abs(radial2),
    } as BoundingBox.Circle;
  }

  public getSnappingGuides(): SnappingGuides.Description[] {
    const result: SnappingGuides.PolarAxis[] = [];
    for (let i = 0; i < this.object.properties.angularGuidesCount; i++) {
      for (let j = 0; j < this.object.properties.radialGuidesCount; j++) {
        const nameX = `point${i}${j}X`;
        const nameY = `point${i}${j}Y`;

        result.push({
          type: "point",
          angle: this.state.attributes[nameX],
          radius: this.state.attributes[nameY],
          startAngle: this.object.properties.startAngle,
          endAngle: this.object.properties.endAngle,
          angleAttribute: nameX,
          radiusAttribute: nameY,
          visible: true,
          cx: this.state.attributes.x,
          cy: this.state.attributes.y,
          visibleAngle: this.state.attributes[`angularValue${i}`],
          visibleRadius: this.state.attributes[`radialValue${i}`],
        } as SnappingGuides.PolarAxis);
      }
    }

    // add center for coordinates
    result.push({
      type: "point",
      angle: this.state.attributes.x,
      radius: this.state.attributes.y,
      startAngle: this.object.properties.startAngle,
      endAngle: this.object.properties.endAngle,
      angleAttribute: "x",
      radiusAttribute: "y",
      visible: true,
      cx: this.state.attributes.x,
      cy: this.state.attributes.y,
      visibleAngle: 0,
      visibleRadius: 0,
    } as SnappingGuides.PolarAxis);

    return result;
  }

  /** Get controls given current state */
  public getAttributePanelWidgets(
    manager: Controls.WidgetManager
  ): Controls.Widget[] {
    return [
      manager.sectionHeader("Guide Coordinator"),
      manager.row(
        "Angular",
        manager.inputNumber(
          { property: "angularGuidesCount" },
          {
            showUpdown: true,
            updownTick: 1,
            updownRange: [1, 100],
            minimum: 2,
            maximum: 100,
          }
        )
      ),
      manager.row(
        "Radial",
        manager.inputNumber(
          { property: "radialGuidesCount" },
          {
            showUpdown: true,
            updownTick: 1,
            updownRange: [1, 100],
            minimum: 1,
            maximum: 100,
          }
        )
      ),
      manager.row(
        "Angle",
        manager.horizontal(
          [1, 0, 1],
          manager.inputNumber({ property: "startAngle" }),
          manager.label("-"),
          manager.inputNumber({ property: "endAngle" })
        )
      ),
      manager.row(
        "Radius",
        manager.horizontal(
          [0, 1, 0, 1],
          manager.label("Inner:"),
          manager.inputNumber({ property: "innerRatio" }),
          manager.label("Outer:"),
          manager.inputNumber({ property: "outerRatio" })
        )
      ),
    ];
  }
}
