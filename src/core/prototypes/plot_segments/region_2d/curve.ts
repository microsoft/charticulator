// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import { Point } from "../../../common";
import * as Graphics from "../../../graphics";
import { ConstraintSolver, ConstraintStrength } from "../../../solver";
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
  GridFlipDirection,
  PlotSegmentAxisPropertyNames,
  Region2DAttributes,
  Region2DConfiguration,
  Region2DConfigurationIcons,
  Region2DConstraintBuilder,
  Region2DProperties,
  Region2DSublayoutType,
} from "./base";
import { PlotSegmentClass } from "../plot_segment";
import { ChartStateManager } from "../..";
import { strings } from "../../../../strings";

export type CurveAxisMode = "null" | "default" | "numerical" | "categorical";

export interface CurveAttributes extends Region2DAttributes {
  /** Cartesian plot segment region */
  x1: number;
  y1: number;
  x2: number;
  y2: number;

  /**
   * The region in the curve coordinate system
   * tangent1, tangent2: the axis along the curve direction
   * normal1, normal2: the axis perpendicular to the curve direction (these won't be parallel to each other!)
   */
  tangent1: number;
  tangent2: number;
  normal1: number;
  normal2: number;
}

export interface CurveState extends Specification.PlotSegmentState {
  attributes: CurveAttributes;
}

export interface CurveProperties extends Region2DProperties {
  /** The bezier curve specification in relative proportions (-1, +1) => (x1, x2) */
  curve: [Point, Point, Point, Point][];
  normalStart: number;
  normalEnd: number;
}

export interface CurveObject extends Specification.PlotSegment {
  properties: CurveProperties;
}

export const icons: Region2DConfigurationIcons = {
  xMinIcon: "AlignHorizontalLeft",
  xMiddleIcon: "AlignHorizontalCenter",
  xMaxIcon: "AlignHorizontalRight",
  yMiddleIcon: "align/y-middle",
  yMinIcon: "Bottom",
  yMaxIcon: "Top",
  dodgeXIcon: "HorizontalDistributeCenter",
  dodgeYIcon: "VerticalDistributeCenter",
  gridIcon: "GridViewSmall",
  packingIcon: "sublayout/packing",
  jitterIcon: "sublayout/jitter",
  overlapIcon: "Stack",
};

export class CurvePlotSegment extends PlotSegmentClass<
  CurveProperties,
  CurveAttributes
> {
  public static classID = "plot-segment.curve";
  public static type = "plot-segment";

  public static metadata: ObjectClassMetadata = {
    displayName: "PlotSegment",
    iconPath: "plot-segment/curve",
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
        flipDirection: GridFlipDirection.Direct,
        reverseGlyphsOrder: false,
      },
    },
    curve: [
      [
        { x: -1, y: 0 },
        { x: -0.25, y: -0.5 },
        { x: 0.25, y: 0.5 },
        { x: 1, y: 0 },
      ],
    ],
    normalStart: -0.2,
    normalEnd: 0.2,
  };

  public readonly state: CurveState;
  public readonly object: CurveObject;

  public attributeNames: string[] = [
    "x1",
    "x2",
    "y1",
    "y2",
    "tangent1",
    "tangent2",
    "normal1",
    "normal2",
    "gapX",
    "gapY",
    "x",
    "y",
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
    tangent1: {
      name: "tangent1",
      type: Specification.AttributeType.Number,
    },
    tangent2: {
      name: "tangent2",
      type: Specification.AttributeType.Number,
    },
    normal1: {
      name: "normal1",
      type: Specification.AttributeType.Number,
    },
    normal2: {
      name: "normal2",
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
  };

  public initializeState(): void {
    const attrs = this.state.attributes;
    attrs.tangent1 = 0;
    attrs.tangent2 = 360;
    attrs.normal1 = 10;
    attrs.normal2 = 100;
    attrs.x1 = -100;
    attrs.x2 = 100;
    attrs.y1 = -100;
    attrs.y2 = 100;
    attrs.x = attrs.x1;
    attrs.y = attrs.y2;
    attrs.gapX = 4;
    attrs.gapY = 4;
  }

  public createBuilder(
    solver?: ConstraintSolver,
    context?: BuildConstraintsContext
  ) {
    const config: Region2DConfiguration = {
      terminology: strings.curveTerminology,
      icons,
      xAxisPrePostGap: false,
      yAxisPrePostGap: false,
    };
    const builder = new Region2DConstraintBuilder(
      this,
      config,
      "tangent1",
      "tangent2",
      "normal1",
      "normal2",
      solver,
      context
    );
    return builder;
  }

  public getCurveArcLength() {
    return new Graphics.MultiCurveParametrization(
      this.object.properties.curve.map(
        (c) => new Graphics.BezierCurveParameterization(c[0], c[1], c[2], c[3])
      )
    ).getLength();
  }

  public buildConstraints(
    solver: ConstraintSolver,
    // eslint-disable-next-line
    context: BuildConstraintsContext
  ): void {
    const attrs = this.state.attributes;
    const props = this.object.properties;

    const [
      x1,
      // eslint-disable-next-line
      y1,
      x2,
      // eslint-disable-next-line
      y2,
      // eslint-disable-next-line
      tangent1,
      tangent2,
      normal1,
      normal2,
    ] = solver.attrs(attrs, [
      "x1",
      "y1",
      "x2",
      "y2",
      "tangent1",
      "tangent2",
      "normal1",
      "normal2",
    ]);
    const arcLength = this.getCurveArcLength();

    attrs.tangent1 = 0;
    solver.makeConstant(attrs, "tangent1");

    // tangent2 = arcLength * (x2 - x1) / 2
    solver.addLinear(
      ConstraintStrength.HARD,
      0,
      [[1, tangent2]],
      [
        [arcLength / 2, x2],
        [-arcLength / 2, x1],
      ]
    );
    // normal1 = normalStart * (x2 - x1) / 2
    // normal2 = normalEnd * (x2 - x1) / 2
    solver.addLinear(
      ConstraintStrength.HARD,
      0,
      [[1, normal1]],
      [
        [props.normalStart / 2, x2],
        [-props.normalStart / 2, x1],
      ]
    );
    solver.addLinear(
      ConstraintStrength.HARD,
      0,
      [[1, normal2]],
      [
        [props.normalEnd / 2, x2],
        [-props.normalEnd / 2, x1],
      ]
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
    const { x1, x2, y1, y2 } = attrs;
    return <BoundingBox.Rectangle>{
      type: "rectangle",
      cx: (x1 + x2) / 2,
      cy: (y1 + y2) / 2,
      width: Math.abs(x2 - x1),
      height: Math.abs(y2 - y1),
      rotation: 0,
    };
  }

  public getSnappingGuides(): SnappingGuides.Description[] {
    const attrs = this.state.attributes;
    const { x1, y1, x2, y2 } = attrs;
    return [
      <SnappingGuides.Axis>{ type: "x", value: x1, attribute: "x1" },
      <SnappingGuides.Axis>{ type: "x", value: x2, attribute: "x2" },
      <SnappingGuides.Axis>{ type: "y", value: y1, attribute: "y1" },
      <SnappingGuides.Axis>{ type: "y", value: y2, attribute: "y2" },
    ];
  }

  public getGraphics(manager: ChartStateManager): Graphics.Group {
    const { tangent1, tangent2, normal1, normal2 } = this.state.attributes;

    const g = Graphics.makeGroup([]);
    const props = this.object.properties;
    const cs = this.getCoordinateSystem();

    if (props.xData && props.xData.visible) {
      g.elements.push(
        new AxisRenderer()
          .setAxisDataBinding(
            props.xData,
            tangent1,
            tangent2,
            false,
            false,
            this.getDisplayFormat(props.xData, props.xData.tickFormat, manager)
          )
          .renderCurve(
            cs,
            props.xData.side == "opposite" ? normal2 : normal1,
            props.xData.side == "opposite" ? -1 : 1
          )
      );
    }
    if (props.yData && props.yData.visible) {
      let tr = cs.getLocalTransform(
        props.yData.side == "opposite" ? tangent2 : tangent1,
        0
      );
      tr = Graphics.concatTransform(cs.getBaseTransform(), tr);
      g.elements.push(
        new AxisRenderer()
          .setAxisDataBinding(
            props.yData,
            normal1,
            normal2,
            false,
            true,
            this.getDisplayFormat(props.yData, props.yData.tickFormat, manager)
          )
          .renderLine(
            tr.x,
            tr.y,
            tr.angle + 90,
            props.yData.side == "opposite" ? 1 : -1
          )
      );
    }
    return g;
  }

  public getCoordinateSystem(): Graphics.CoordinateSystem {
    const attrs = this.state.attributes;
    const { x1, y1, x2, y2 } = attrs;
    const cx = (x1 + x2) / 2,
      cy = (y1 + y2) / 2;
    const scaler = (x2 - x1) / 2;
    return new Graphics.BezierCurveCoordinates(
      { x: cx, y: cy },
      new Graphics.MultiCurveParametrization(
        this.object.properties.curve.map((ps) => {
          const p = ps.map((p) => ({ x: p.x * scaler, y: p.y * scaler }));
          return new Graphics.BezierCurveParameterization(
            p[0],
            p[1],
            p[2],
            p[3]
          );
        })
      )
    );
  }

  public getDropZones(): DropZones.Description[] {
    const attrs = <CurveAttributes>this.state.attributes;
    const { x1, y1, x2, y2 } = attrs;
    const zones: DropZones.Description[] = [];
    zones.push(<DropZones.Region>{
      type: "region",
      accept: { scaffolds: ["polar"] },
      dropAction: { extendPlotSegment: {} },
      p1: { x: x1, y: y1 },
      p2: { x: x2, y: y2 },
      title: "Convert to Polar Coordinates",
    });
    zones.push(<DropZones.Region>{
      type: "region",
      accept: { scaffolds: ["cartesian-x", "cartesian-y"] },
      dropAction: { extendPlotSegment: {} },
      p1: { x: x1, y: y1 },
      p2: { x: x2, y: y2 },
      title: "Convert to Cartesian Coordinates",
    });
    // zones.push(
    //     <DropZones.Line>{
    //         type: "line",
    //         p1: { x: cx + radial1, y: cy }, p2: { x: cx + radial2, y: cy },
    //         title: "Radial Axis",
    //         dropAction: {
    //             axisInference: { property: AxisPropertiesNames.yData }
    //         }
    //     }
    // );
    // zones.push(
    //     <DropZones.Arc>{
    //         type: "arc",
    //         center: { x: cx, y: cy },
    //         radius: radial2,
    //         angleStart: attrs.angle1, angleEnd: attrs.angle2,
    //         title: "Angular Axis",
    //         dropAction: {
    //             axisInference: { property: AxisPropertiesNames.xData }
    //         }
    //     }
    // );
    return zones;
  }

  public getAxisModes(): [CurveAxisMode, CurveAxisMode] {
    const props = this.object.properties;
    return [
      props.xData ? props.xData.type : "null",
      props.yData ? props.yData.type : "null",
    ];
  }

  public getHandles(): Handles.Description[] {
    const attrs = this.state.attributes;
    const { x1, x2, y1, y2 } = attrs;
    const h: Handles.Description[] = [
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
      <Handles.InputCurve>{
        type: "input-curve",
        x1,
        y1,
        x2,
        y2,
        actions: [{ type: "property", property: "curve" }],
      },
    ];
    return h;
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

  /**
   * Renders gridlines for axis. Returns empty array to diable widgets for curve plot segment.
   * Not implemented yet
   * @param data axis data binding
   * @param manager widgets manager
   * @param axisProperty property name of plotsegment with axis properties (xData, yData, axis)
   */
  public buildGridLineWidgets(): Controls.Widget[] {
    return [];
  }

  public getAttributePanelWidgets(
    manager: Controls.WidgetManager
  ): Controls.Widget[] {
    const builder = this.createBuilder();
    return [
      ...super.getAttributePanelWidgets(manager),
      manager.verticalGroup(
        {
          header: strings.objects.plotSegment.curveCoordinates,
        },
        [
          manager.vertical(
            manager.label(strings.objects.plotSegment.normal),
            manager.horizontal(
              [1, 0, 1],
              manager.inputNumber({ property: "normalStart" }),
              manager.label("-"),
              manager.inputNumber({ property: "normalEnd" })
            )
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
      p.push({
        objectID: this.object._id,
        target: {
          property: {
            property: PlotSegmentAxisPropertyNames.xData,
            field: "categories",
          },
        },
        type: Specification.AttributeType.Enum,
        default: "ascending",
      });
    }
    if (
      this.object.properties.yData &&
      (this.object.properties.yData.autoDomainMin ||
        this.object.properties.yData.autoDomainMax)
    ) {
      p.push({
        objectID: this.object._id,
        target: {
          property: {
            property: PlotSegmentAxisPropertyNames.yData,
            field: "categories",
          },
        },
        type: Specification.AttributeType.Enum,
        default: "ascending",
      });
    }
    return { inferences: r, properties: p };
  }
}
