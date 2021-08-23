// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import * as Graphics from "../../../graphics";
import {
  ConstraintPlugins,
  ConstraintSolver,
  ConstraintStrength,
} from "../../../solver";
import * as Specification from "../../../specification";
import {
  AttributeDescription,
  BoundingBox,
  BuildConstraintsContext,
  Controls,
  DropZones,
  Handles,
  ObjectClassMetadata,
  SnappingGuides,
  TemplateParameters,
} from "../../common";
import { AxisRenderer, buildAxisInference, buildAxisProperties } from "../axis";
import {
  GridDirection,
  GridStartPosition,
  PlotSegmentAxisPropertyNames,
  Region2DAttributes,
  Region2DConfiguration,
  Region2DConfigurationIcons,
  Region2DConstraintBuilder,
  Region2DProperties,
  Region2DSublayoutType,
} from "./base";
import { PlotSegmentClass } from "../plot_segment";
import { getSortDirection } from "../../..";
import { ChartStateManager } from "../..";
import { strings } from "../../../../strings";
import { AxisDataBinding } from "../../../specification/types";

export type PolarAxisMode = "null" | "default" | "numerical" | "categorical";

export interface PolarAttributes extends Region2DAttributes {
  /** Cartesian plot segment region */
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  cx: number;
  cy: number;

  angle1: number;
  angle2: number;
  radial1: number;
  radial2: number;

  a1r1x: number;
  a1r1y: number;
  a1r2x: number;
  a1r2y: number;

  a2r1x: number;
  a2r1y: number;
  a2r2x: number;
  a2r2y: number;
}

export interface PolarState extends Specification.PlotSegmentState {
  attributes: PolarAttributes;
}

export interface PolarProperties extends Region2DProperties {
  startAngle: number;
  endAngle: number;
  innerRatio: number;
  outerRatio: number;
  equalizeArea: boolean;
}

export interface PolarObject extends Specification.PlotSegment {
  properties: PolarProperties;
}

export const icons: Region2DConfigurationIcons = {
  xMinIcon: "AlignHorizontalLeft",
  xMiddleIcon: "AlignHorizontalCenter",
  xMaxIcon: "align/right",
  yMiddleIcon: "AlignHorizontalRight",
  yMinIcon: "AlignVerticalBottom",
  yMaxIcon: "AlignVerticalTop",
  dodgeXIcon: "CharticulatorArrangePolar",
  dodgeYIcon: "CharticulatorStackRadial",
  gridIcon: "sublayout/polar-grid",
  packingIcon: "sublayout/packing",
  overlapIcon: "Stack",
  jitterIcon: "sublayout/jitter",
};

export class PolarPlotSegment extends PlotSegmentClass<
  PolarProperties,
  PolarAttributes
> {
  public static classID = "plot-segment.polar";
  public static type = "plot-segment";

  public static metadata: ObjectClassMetadata = {
    displayName: "PlotSegment",
    iconPath: "plot-segment/polar",
    creatingInteraction: {
      type: "rectangle",
      mapping: { xMin: "x1", yMin: "y1", xMax: "x2", yMax: "y2" },
    },
  };

  public static defaultProperties: Specification.AttributeMap = {
    marginX1: 0,
    marginY1: 0,
    marginX2: 0,
    marginY2: 0,
    visible: true,
    sublayout: {
      type: Region2DSublayoutType.DodgeX,
      order: null,
      ratioX: 0.1,
      ratioY: 0.1,
      align: {
        x: "start",
        y: "start",
      },
      grid: {
        direction: GridDirection.X,
        xCount: null,
        yCount: null,
        gridStartPosition: GridStartPosition.LeftTop,
      },
    },
    startAngle: 0,
    endAngle: 360,
    innerRatio: 0.5,
    outerRatio: 0.9,
  };

  public readonly state: PolarState;
  public readonly object: PolarObject;

  public attributeNames: string[] = [
    "x1",
    "x2",
    "y1",
    "y2",
    "angle1",
    "angle2",
    "radial1",
    "radial2",
    "gapX",
    "gapY",
    "x",
    "y",
    "cx",
    "cy",
    "a1r1x",
    "a1r1y",
    "a1r2x",
    "a1r2y",
    "a2r1x",
    "a2r1y",
    "a2r2x",
    "a2r2y",
  ];
  public attributes: { [name: string]: AttributeDescription } = {
    x1: {
      name: "x1",
      type: Specification.AttributeType.Number,
    },
    x2: {
      name: "x2",
      type: Specification.AttributeType.Number,
    },
    y1: {
      name: "y1",
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
    gapX: {
      name: "gapX",
      type: Specification.AttributeType.Number,
      editableInGlyphStage: true,
    },
    gapY: {
      name: "gapY",
      type: Specification.AttributeType.Number,
      editableInGlyphStage: true,
    },
    cx: {
      name: "cx",
      type: Specification.AttributeType.Number,
    },
    cy: {
      name: "cy",
      type: Specification.AttributeType.Number,
    },
    a1r1x: {
      name: "a1r1x",
      type: Specification.AttributeType.Number,
    },
    a1r1y: {
      name: "a1r1y",
      type: Specification.AttributeType.Number,
    },
    a1r2x: {
      name: "a1r2x",
      type: Specification.AttributeType.Number,
    },
    a1r2y: {
      name: "a1r2y",
      type: Specification.AttributeType.Number,
    },
    a2r1x: {
      name: "a2r1x",
      type: Specification.AttributeType.Number,
    },
    a2r1y: {
      name: "a2r1y",
      type: Specification.AttributeType.Number,
    },
    a2r2x: {
      name: "a2r2x",
      type: Specification.AttributeType.Number,
    },
    a2r2y: {
      name: "a2r2y",
      type: Specification.AttributeType.Number,
    },
  };

  public initializeState(): void {
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
    attrs.cx = 0;
    attrs.cy = 0;
    attrs.a1r1x = 0;
    attrs.a1r1y = 0;
    attrs.a1r2x = 0;
    attrs.a1r2y = 0;
    attrs.a2r1x = 0;
    attrs.a2r1y = 0;
    attrs.a2r2x = 0;
    attrs.a2r2y = 0;
  }

  public createBuilder(
    solver?: ConstraintSolver,
    context?: BuildConstraintsContext
  ) {
    const props = this.object.properties;
    const config: Region2DConfiguration = {
      terminology: strings.polarTerminology,
      icons,
      xAxisPrePostGap: (props.endAngle - props.startAngle) % 360 == 0,
      yAxisPrePostGap: false,
      getXYScale: () => {
        const radiusMiddle =
          (this.state.attributes.radial1 + this.state.attributes.radial2) / 2;
        return { x: 57.29577951308232 / radiusMiddle, y: 1 };
      },
    };
    const builder = new Region2DConstraintBuilder(
      this,
      config,
      "angle1",
      "angle2",
      "radial1",
      "radial2",
      solver,
      context
    );
    return builder;
  }

  public buildConstraints(
    solver: ConstraintSolver,
    context: BuildConstraintsContext,
    manager: ChartStateManager
  ): void {
    const attrs = this.state.attributes;
    const props = this.object.properties;

    const [x1, y1, x2, y2, innerRadius, outerRadius] = solver.attrs(attrs, [
      "x1",
      "y1",
      "x2",
      "y2",
      "radial1",
      "radial2",
    ]);

    attrs.angle1 = props.startAngle;
    attrs.angle2 = props.endAngle;
    solver.makeConstant(attrs, "angle1");
    solver.makeConstant(attrs, "angle2");

    if (attrs.x2 - attrs.x1 < attrs.y2 - attrs.y1) {
      attrs.radial1 = (props.innerRatio * (attrs.x2 - attrs.x1)) / 2;
      attrs.radial2 = (props.outerRatio * (attrs.x2 - attrs.x1)) / 2;
      solver.addLinear(
        ConstraintStrength.HARD,
        0,
        [
          [props.innerRatio, x2],
          [-props.innerRatio, x1],
        ],
        [[2, innerRadius]]
      );
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
      solver.addLinear(
        ConstraintStrength.HARD,
        0,
        [
          [props.innerRatio, y2],
          [-props.innerRatio, y1],
        ],
        [[2, innerRadius]]
      );
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

    solver.makeConstant(attrs, "cx");
    solver.makeConstant(attrs, "cy");
    solver.makeConstant(attrs, "a1r1x");
    solver.makeConstant(attrs, "a1r1y");
    solver.makeConstant(attrs, "a1r2x");
    solver.makeConstant(attrs, "a1r2y");
    solver.makeConstant(attrs, "a2r1x");
    solver.makeConstant(attrs, "a2r1y");
    solver.makeConstant(attrs, "a2r2x");
    solver.makeConstant(attrs, "a2r2y");

    solver.addPlugin(
      new ConstraintPlugins.PolarPlotSegmentPlugin(
        attrs,
        this.parent.object.constraints,
        this.object._id,
        manager
      )
    );
  }

  public buildGlyphConstraints(
    solver: ConstraintSolver,
    context: BuildConstraintsContext
  ): void {
    const builder = this.createBuilder(solver, context);
    builder.build();
  }

  public getBoundingBox(): BoundingBox.Description {
    const attrs = this.state.attributes;
    const { x1, x2, y1, y2, cx, cy } = attrs;
    return <BoundingBox.Rectangle>{
      type: "rectangle",
      cx,
      cy,
      width: Math.abs(x2 - x1),
      height: Math.abs(y2 - y1),
      rotation: 0,
    };
  }

  public getSnappingGuides(): SnappingGuides.Description[] {
    const attrs = this.state.attributes;
    const { x1, y1, x2, y2, cx, cy } = attrs;
    return [
      <SnappingGuides.Axis>{ type: "x", value: x1, attribute: "x1" },
      <SnappingGuides.Axis>{ type: "x", value: x2, attribute: "x2" },
      <SnappingGuides.Axis>{ type: "y", value: y1, attribute: "y1" },
      <SnappingGuides.Axis>{ type: "y", value: y2, attribute: "y2" },
      <SnappingGuides.Axis>{ type: "x", value: cx, attribute: "cx" },
      <SnappingGuides.Axis>{ type: "y", value: cy, attribute: "cy" },
    ];
  }

  public getGraphics(manager: ChartStateManager): Graphics.Group {
    const builder = this.createBuilder();
    const g = Graphics.makeGroup([]);
    const attrs = this.state.attributes;
    const props = this.object.properties;
    const { cx } = attrs;
    const { cy } = attrs;
    const radialData = props.yData;
    const angularData = props.xData;
    const angleStart = props.startAngle;
    const angleEnd = props.endAngle;
    const innerRadius = attrs.radial1;
    const outerRadius = attrs.radial2;
    if (radialData && radialData.visible) {
      const axisRenderer = new AxisRenderer();
      axisRenderer.setAxisDataBinding(
        radialData,
        innerRadius,
        outerRadius,
        false,
        true,
        this.getDisplayFormat(props.yData, props.yData.tickFormat, manager)
      );
      g.elements.push(
        axisRenderer.renderLine(
          cx,
          cy,
          90 - (radialData.side == "opposite" ? angleEnd : angleStart),
          -1
        )
      );
    }
    if (angularData && angularData.visible) {
      const axisRenderer = new AxisRenderer().setAxisDataBinding(
        angularData,
        angleStart,
        angleEnd,
        builder.config.xAxisPrePostGap,
        false,
        this.getDisplayFormat(props.xData, props.xData.tickFormat, manager)
      );
      g.elements.push(
        axisRenderer.renderPolar(
          cx,
          cy,
          angularData.side == "opposite" ? innerRadius : outerRadius,
          angularData.side == "opposite" ? -1 : 1
        )
      );
    }
    return g;
  }

  public getPlotSegmentBackgroundGraphics(
    manager: ChartStateManager
  ): Graphics.Group {
    const g = Graphics.makeGroup([]);

    const builder = this.createBuilder();
    const attrs = this.state.attributes;
    const props = this.object.properties;
    const { cx } = attrs;
    const { cy } = attrs;
    const radialData = props.yData;
    const angularData = props.xData;
    const angleStart = props.startAngle;
    const angleEnd = props.endAngle;
    const innerRadius = attrs.radial1;
    const outerRadius = attrs.radial2;

    if (radialData && radialData.visible) {
      const axisRenderer = new AxisRenderer();
      axisRenderer.setAxisDataBinding(
        radialData,
        innerRadius,
        outerRadius,
        false,
        true,
        this.getDisplayFormat(props.yData, props.yData.tickFormat, manager)
      );
      g.elements.push(
        axisRenderer.renderPolarArcGridLine(
          cx,
          cy,
          innerRadius,
          outerRadius,
          angleStart,
          angleEnd
        )
      );
    }

    if (angularData && angularData.visible) {
      const axisRenderer = new AxisRenderer().setAxisDataBinding(
        angularData,
        angleStart,
        angleEnd,
        builder.config.xAxisPrePostGap,
        false,
        this.getDisplayFormat(props.xData, props.xData.tickFormat, manager)
      );
      g.elements.push(
        axisRenderer.renderPolarRadialGridLine(cx, cy, innerRadius, outerRadius)
      );
    }

    return g;
  }

  public getCoordinateSystem(): Graphics.CoordinateSystem {
    const attrs = this.state.attributes;
    const { x1, y1, x2, y2 } = attrs;
    return new Graphics.PolarCoordinates(
      {
        x: (x1 + x2) / 2,
        y: (y1 + y2) / 2,
      },
      attrs.radial1,
      attrs.radial2,
      this.object.properties.equalizeArea
    );
  }

  public getDropZones(): DropZones.Description[] {
    const attrs = <PolarAttributes>this.state.attributes;
    const { x1, y1, x2, y2, radial1, radial2, cx, cy } = attrs;
    const zones: DropZones.Description[] = [];
    zones.push(<DropZones.Region>{
      type: "region",
      accept: { scaffolds: ["polar"] },
      dropAction: { extendPlotSegment: {} },
      p1: { x: x1, y: y1 },
      p2: { x: x2, y: y2 },
      title: "Add Angular Scaffold",
    });
    zones.push(<DropZones.Region>{
      type: "region",
      accept: { scaffolds: ["curve"] },
      dropAction: { extendPlotSegment: {} },
      p1: { x: x1, y: y1 },
      p2: { x: x2, y: y2 },
      title: "Convert to Curve Coordinates",
    });
    zones.push(<DropZones.Region>{
      type: "region",
      accept: { scaffolds: ["cartesian-x", "cartesian-y"] },
      dropAction: { extendPlotSegment: {} },
      p1: { x: x1, y: y1 },
      p2: { x: x2, y: y2 },
      title: "Convert to Cartesian Coordinates",
    });
    zones.push(<DropZones.Line>{
      type: "line",
      p1: { x: cx + radial1, y: cy },
      p2: { x: cx + radial2, y: cy },
      title: "Radial Axis",
      dropAction: {
        axisInference: { property: PlotSegmentAxisPropertyNames.yData },
      },
    });
    zones.push(<DropZones.Arc>{
      type: "arc",
      center: { x: cx, y: cy },
      radius: radial2,
      angleStart: attrs.angle1,
      angleEnd: attrs.angle2,
      title: "Angular Axis",
      dropAction: {
        axisInference: { property: PlotSegmentAxisPropertyNames.xData },
      },
    });
    return zones;
  }

  public getAxisModes(): [PolarAxisMode, PolarAxisMode] {
    const props = this.object.properties;
    return [
      props.xData ? props.xData.type : "null",
      props.yData ? props.yData.type : "null",
    ];
  }

  // eslint-disable-next-line
  public getHandles(): Handles.Description[] {
    const attrs = this.state.attributes;
    const props = this.object.properties;
    const { x1, x2, y1, y2, cx, cy } = attrs;
    const radius = Math.min(Math.abs(x2 - x1), Math.abs(y2 - y1)) / 2;
    const builder = this.createBuilder();
    return [
      <Handles.Line>{
        type: "line",
        axis: "y",
        value: y1,
        span: [x1, x2],
        actions: [{ type: "attribute", attribute: "y1" }],
      },
      <Handles.Line>{
        type: "line",
        axis: "y",
        value: y2,
        span: [x1, x2],
        actions: [{ type: "attribute", attribute: "y2" }],
      },
      <Handles.Line>{
        type: "line",
        axis: "x",
        value: x1,
        span: [y1, y2],
        actions: [{ type: "attribute", attribute: "x1" }],
      },
      <Handles.Line>{
        type: "line",
        axis: "x",
        value: x2,
        span: [y1, y2],
        actions: [{ type: "attribute", attribute: "x2" }],
      },
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
        x: x2,
        y: y1,
        actions: [
          { type: "attribute", source: "x", attribute: "x2" },
          { type: "attribute", source: "y", attribute: "y1" },
        ],
      },
      <Handles.Point>{
        type: "point",
        x: x1,
        y: y2,
        actions: [
          { type: "attribute", source: "x", attribute: "x1" },
          { type: "attribute", source: "y", attribute: "y2" },
        ],
      },
      <Handles.Point>{
        type: "point",
        x: x2,
        y: y2,
        actions: [
          { type: "attribute", source: "x", attribute: "x2" },
          { type: "attribute", source: "y", attribute: "y2" },
        ],
      },
      ...builder.getHandles().map((handle) => {
        return <Handles.GapRatio>{
          type: "gap-ratio",
          axis: handle.gap.axis,
          reference: handle.gap.reference,
          value: handle.gap.value,
          scale: handle.gap.scale,
          span: handle.gap.span,
          range: [0, 1],
          coordinateSystem: this.getCoordinateSystem(),
          actions: [
            {
              type: "property",
              property: handle.gap.property.property,
              field: handle.gap.property.field,
            },
          ],
        };
      }),
      <Handles.Angle>{
        type: "angle",
        actions: [{ type: "property", property: "endAngle" }],
        cx,
        cy,
        radius: radius * Math.max(props.innerRatio, props.outerRatio),
        value: props.endAngle,
        clipAngles: [props.startAngle, null],
        icon: "<",
      },
      <Handles.Angle>{
        type: "angle",
        actions: [{ type: "property", property: "startAngle" }],
        cx,
        cy,
        radius: radius * Math.max(props.innerRatio, props.outerRatio),
        value: props.startAngle,
        clipAngles: [null, props.endAngle],
        icon: ">",
      },
      <Handles.DistanceRatio>{
        type: "distance-ratio",
        actions: [{ type: "property", property: "outerRatio" }],
        cx,
        cy,
        value: props.outerRatio,
        startDistance: 0,
        endDistance: radius,
        startAngle: props.startAngle,
        endAngle: props.endAngle,
        clipRange: [props.innerRatio + 0.01, 1],
      },
      <Handles.DistanceRatio>{
        type: "distance-ratio",
        actions: [{ type: "property", property: "innerRatio" }],
        cx,
        cy,
        value: props.innerRatio,
        startDistance: 0,
        endDistance: radius,
        startAngle: props.startAngle,
        endAngle: props.endAngle,
        clipRange: [0, props.outerRatio - 0.01],
      },
    ];
  }

  public getPopupEditor(manager: Controls.WidgetManager): Controls.PopupEditor {
    const builder = this.createBuilder();
    const widgets = builder.buildPopupWidgets(manager);
    if (widgets.length == 0) {
      return null;
    }
    const attrs = this.state.attributes;
    const anchor = { x: attrs.x1, y: attrs.y2 };
    return {
      anchor,
      widgets: [...widgets],
    };
  }

  public getAttributePanelWidgets(
    manager: Controls.WidgetManager
  ): Controls.Widget[] {
    const builder = this.createBuilder();
    return [
      ...super.getAttributePanelWidgets(manager),
      manager.verticalGroup(
        {
          header: strings.objects.plotSegment.polarCoordinates,
        },
        [
          manager.vertical(
            manager.label(strings.objects.plotSegment.angle),
            manager.horizontal(
              [1, 0, 1],
              manager.inputNumber({ property: "startAngle" }),
              manager.label("-"),
              manager.inputNumber({ property: "endAngle" })
            )
          ),
          manager.vertical(
            manager.label(strings.objects.plotSegment.radius),
            manager.horizontal(
              [0, 1, 0, 1],
              manager.label(strings.objects.plotSegment.inner),
              manager.inputNumber({ property: "innerRatio" }),
              manager.label(strings.objects.plotSegment.outer),
              manager.inputNumber({ property: "outerRatio" })
            )
          ),
          manager.inputBoolean(
            { property: "equalizeArea" },
            {
              type: "checkbox",
              label: strings.objects.plotSegment.heightToArea,
              headerLabel: strings.objects.plotSegment.equalizeArea,
            }
          ),
        ]
      ),
      ...builder.buildPanelWidgets(manager),
    ];
  }

  public getTemplateParameters(): TemplateParameters {
    const r: Specification.Template.Inference[] = [];
    let p: Specification.Template.Property[] = [];
    if (this.object.properties.xData) {
      r.push(
        buildAxisInference(this.object, PlotSegmentAxisPropertyNames.xData)
      );
      p = p.concat(
        buildAxisProperties(this.object, PlotSegmentAxisPropertyNames.xData)
      );
    }
    if (this.object.properties.yData) {
      r.push(
        buildAxisInference(this.object, PlotSegmentAxisPropertyNames.yData)
      );
      p = p.concat(
        buildAxisProperties(this.object, PlotSegmentAxisPropertyNames.yData)
      );
    }
    if (
      this.object.properties.sublayout.order &&
      this.object.properties.sublayout.order.expression
    ) {
      r.push({
        objectID: this.object._id,
        dataSource: {
          table: this.object.table,
          groupBy: this.object.groupBy,
        },
        expression: {
          expression: this.object.properties.sublayout.order.expression,
          property: { property: "sublayout", field: ["order", "expression"] },
        },
      });
    }
    if (
      this.object.properties.xData &&
      (this.object.properties.xData.autoDomainMin ||
        this.object.properties.xData.autoDomainMax)
    ) {
      const values = (<AxisDataBinding>this.object.properties.xData).categories;
      const defaultValue = getSortDirection(values);
      p.push({
        objectID: this.object._id,
        target: {
          property: {
            property: PlotSegmentAxisPropertyNames.xData,
            field: "categories",
          },
        },
        type: Specification.AttributeType.Enum,
        default: defaultValue,
      });
    }
    if (
      this.object.properties.yData &&
      (this.object.properties.yData.autoDomainMin ||
        this.object.properties.yData.autoDomainMax)
    ) {
      const values = (<AxisDataBinding>this.object.properties.yData).categories;
      const defaultValue = getSortDirection(values);
      p.push({
        objectID: this.object._id,
        target: {
          property: {
            property: PlotSegmentAxisPropertyNames.yData,
            field: "categories",
          },
        },
        type: Specification.AttributeType.Enum,
        default: defaultValue,
      });
    }
    return { inferences: r, properties: p };
  }
}
