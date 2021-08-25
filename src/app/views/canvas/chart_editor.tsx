// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as React from "react";
import * as R from "../../resources";
import * as globals from "../../globals";

import {
  EventSubscription,
  Geometry,
  getById,
  Graphics,
  Point,
  Prototypes,
  Specification,
  stableSortBy,
  zipArray,
  ZoomInfo,
} from "../../../core";
import { Actions, DragData } from "../../actions";
import { DragContext, Droppable } from "../../controllers";
import { GraphicalElementDisplay } from "../../renderer";
import {
  ChartElementSelection,
  AppStore,
  MarkSelection,
  Selection,
} from "../../stores";
import { Button } from "../panels/widgets/controls";
import { BoundingBoxView } from "./bounding_box";
import {
  CreatingComponent,
  CreatingComponentFromCreatingInteraction,
} from "./creating_component";
import { DropZoneView } from "./dropzone";
import { EditingLink } from "./editing_link";
import { HandlesView } from "./handles";
import { ResizeHandleView } from "./handles/resize";
import { ChartSnappableGuide, ChartSnappingSession } from "./snapping/chart";
import { MoveSnappingSession } from "./snapping/move";
import {
  GuideAxis,
  GuideCoordinatorClass,
  GuideProperties,
} from "../../../core/prototypes/guides";
import { strings } from "../../../strings";
import { MappingType, ValueMapping } from "../../../core/specification";
import { SnappingGuidesVisualTypes } from "../../../core/prototypes";
import { classNames } from "../../utils";
import { FluentUIWidgetManager } from "../panels/widgets/fluentui_manager";
import { Callout, DirectionalHint } from "@fluentui/react";

export interface ChartEditorViewProps {
  store: AppStore;
}

export interface ChartEditorViewState {
  viewWidth: number;
  viewHeight: number;
  zoom: ZoomInfo;
  snappingCandidates: ChartSnappableGuide[] | null;
  graphics: Graphics.Element;
  currentCreation?: string;
  currentCreationOptions?: string;
  currentSelection: Selection;
  dropZoneData:
    | {
        data?: DragData.DropZoneData;
        layout?: DragData.ScaffoldType;
      }
    | false;
  isSolving: boolean;
  canvasToolbar: boolean;
}

/**
 * Editor view for chart
 * ![Mark widgets](media://chart_editor.png)
 */
export class ChartEditorView
  extends React.Component<ChartEditorViewProps, ChartEditorViewState>
  implements Droppable {
  public refs: {
    canvasContainer: HTMLDivElement;
    canvas: SVGElement;
    canvasInteraction: SVGRectElement;
  };

  protected tokens: EventSubscription[];
  protected hammer: HammerManager;

  constructor(props: ChartEditorViewProps) {
    super(props);

    this.state = {
      zoom: {
        centerX: 50,
        centerY: 50,
        scale: 1,
      },
      snappingCandidates: null,
      graphics: this.getGraphics(),
      currentCreation: null,
      currentSelection: this.props.store.currentSelection,
      dropZoneData: false,
      viewWidth: 100,
      viewHeight: 100,
      isSolving: false,
      canvasToolbar: true,
    };

    this.tokens = [];
  }

  public getRelativePoint(point: Point): Point {
    const r = this.refs.canvas.getBoundingClientRect();
    return {
      x: point.x - r.left,
      y: point.y - r.top,
    };
  }

  public getFitViewZoom(width: number, height: number) {
    const chartState = this.props.store.chartState;
    const x1 = chartState.attributes.x1 as number;
    const y1 = chartState.attributes.y1 as number;
    const x2 = chartState.attributes.x2 as number;
    const y2 = chartState.attributes.y2 as number;
    const overshoot = 0.4;
    const scale1 = width / (Math.abs(x2 - x1) * (1 + overshoot));
    const scale2 = height / (Math.abs(y2 - y1) * (1 + overshoot));
    const zoom = {
      centerX: width / 2,
      centerY: height / 2,
      scale: Math.min(scale1, scale2),
    } as ZoomInfo;
    return zoom;
  }

  // eslint-disable-next-line
  public componentDidMount() {
    this.hammer = new Hammer(this.refs.canvasInteraction);
    this.hammer.add(new Hammer.Tap());
    const pan = new Hammer.Pan();
    const pinch = new Hammer.Pinch();
    pinch.recognizeWith(pan);
    this.hammer.add([pinch]);
    this.hammer.on("tap", () => {
      new Actions.ClearSelection().dispatch(this.props.store.dispatcher);
    });
    let cX: number = null,
      cY: number = 0,
      cScale: number = 0;
    let dX0: number, dY0: number;
    let fixPoint: Point = null;
    let lastDeltaX: number, lastDeltaY: number;
    let lastEventScale: number = 1;
    this.hammer.on("pinchstart panstart", (e) => {
      fixPoint = Geometry.unapplyZoom(
        this.state.zoom,
        this.getRelativePoint({ x: e.center.x, y: e.center.y })
      );
      cX = this.state.zoom.centerX;
      cY = this.state.zoom.centerY;
      cScale = this.state.zoom.scale;
      dX0 = 0;
      dY0 = 0;
      lastDeltaX = 0;
      lastDeltaY = 0;
      lastEventScale = 1;
    });
    this.hammer.on("pinch pan", (e) => {
      if (e.type == "pan") {
        e.scale = lastEventScale;
      }
      lastEventScale = e.scale;
      let newScale = cScale * e.scale;
      newScale = Math.min(20, Math.max(0.05, newScale));
      this.setState({
        zoom: {
          centerX: cX + e.deltaX - dX0 + (cScale - newScale) * fixPoint.x,
          centerY: cY + e.deltaY - dY0 + (cScale - newScale) * fixPoint.y,
          scale: newScale,
        },
      });
      lastDeltaX = e.deltaX;
      lastDeltaY = e.deltaY;
    });
    this.refs.canvas.onwheel = (e) => {
      const fixPoint = Geometry.unapplyZoom(
        this.state.zoom,
        this.getRelativePoint({ x: e.pageX, y: e.pageY })
      );
      const { centerX, centerY, scale } = this.state.zoom;
      let delta = -e.deltaY;
      if (e.deltaMode == e.DOM_DELTA_LINE) {
        delta *= 33.3;
      }
      let newScale = scale * Math.exp(delta / 1000);
      newScale = Math.min(20, Math.max(0.05, newScale));
      this.setState({
        zoom: {
          centerX: centerX + (scale - newScale) * fixPoint.x,
          centerY: centerY + (scale - newScale) * fixPoint.y,
          scale: newScale,
        },
      });
      cX = this.state.zoom.centerX;
      cY = this.state.zoom.centerY;
      dX0 = lastDeltaX;
      dY0 = lastDeltaY;
      cScale = this.state.zoom.scale;
      e.stopPropagation();
      e.preventDefault();
    };

    globals.dragController.registerDroppable(this, this.refs.canvas);

    this.tokens.push(
      this.props.store.addListener(
        AppStore.EVENT_GRAPHICS,
        this.updateGraphics.bind(this)
      )
    );
    this.tokens.push(
      this.props.store.addListener(
        AppStore.EVENT_SELECTION,
        this.updateSelection.bind(this)
      )
    );
    this.tokens.push(
      this.props.store.addListener(AppStore.EVENT_CURRENT_TOOL, () => {
        this.setState({
          currentCreation: this.props.store.currentTool,
          currentCreationOptions: this.props.store.currentToolOptions,
        });
      })
    );

    // We display the working icon after 200ms.
    let newStateTimer: any = null;
    this.tokens.push(
      this.props.store.addListener(AppStore.EVENT_SOLVER_STATUS, () => {
        const newState = this.props.store.solverStatus.solving;
        if (newState) {
          if (!newStateTimer) {
            newStateTimer = setTimeout(() => {
              this.setState({ isSolving: true });
            }, 500);
          }
        } else {
          if (newStateTimer) {
            clearTimeout(newStateTimer);
            newStateTimer = null;
          }
          this.setState({ isSolving: false });
        }
      })
    );

    const doResize = () => {
      if (!this.refs.canvasContainer) {
        return;
      }
      const rect = this.refs.canvasContainer.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;
      this.setState({
        viewWidth: width,
        viewHeight: height,
        zoom: this.getFitViewZoom(width, height),
      });
    };
    globals.resizeListeners.addListener(this.refs.canvasContainer, doResize);
    doResize();

    this.tokens.push(
      globals.dragController.addListener("sessionstart", () => {
        const session = globals.dragController.getSession();
        if (session && session.data instanceof DragData.DropZoneData) {
          this.setState({
            dropZoneData: { data: session.data },
          });
        }
      })
    );
    this.tokens.push(
      globals.dragController.addListener("sessionend", () => {
        this.setState({
          dropZoneData: false,
        });
      })
    );
  }

  public componentWillUnmount() {
    this.hammer.destroy();
    this.tokens.forEach((t) => t.remove());
    globals.dragController.unregisterDroppable(this);
  }

  public onDragEnter(ctx: DragContext) {
    new Actions.SetCurrentTool(null).dispatch(this.props.store.dispatcher);
    const data = ctx.data;
    if (data instanceof DragData.ScaffoldType) {
      this.setState({
        dropZoneData: { layout: data },
      });
      ctx.onLeave(() => {
        this.setState({
          dropZoneData: false,
        });
      });
      return true;
    }
    return false;
  }

  protected getGraphics(): Graphics.Element {
    const renderer = new Graphics.ChartRenderer(
      this.props.store.chartManager,
      this.props.store.renderEvents
    );
    return renderer.render();
  }

  protected updateSelection() {
    this.setState({ currentSelection: this.props.store.currentSelection });
    this.setState({
      canvasToolbar: true,
    });
  }

  protected updateGraphics() {
    this.setState({ graphics: this.getGraphics() });
  }

  public renderGraphics() {
    return <GraphicalElementDisplay element={this.state.graphics} />;
  }

  public renderEditingLink() {
    const store = this.props.store;
    if (store.currentSelection instanceof ChartElementSelection) {
      const element = store.currentSelection.chartElement;
      if (Prototypes.isType(element.classID, "links")) {
        return (
          <EditingLink
            width={this.state.viewWidth}
            height={this.state.viewHeight}
            zoom={this.state.zoom}
            store={store}
            link={element as Specification.Links}
          />
        );
      }
    }
    return null;
  }

  // eslint-disable-next-line
  public renderCreatingComponent() {
    if (this.state.currentCreation == null) {
      return null;
    }

    const metadata = Prototypes.ObjectClasses.GetMetadata(
      this.state.currentCreation
    );
    if (metadata && metadata.creatingInteraction) {
      const classID = this.state.currentCreation;
      const options = this.state.currentCreationOptions;
      return (
        <CreatingComponentFromCreatingInteraction
          width={this.state.viewWidth}
          height={this.state.viewHeight}
          zoom={this.state.zoom}
          guides={this.getSnappingGuides()}
          description={metadata.creatingInteraction}
          onCreate={(mappings, attributes) => {
            new Actions.SetCurrentTool(null).dispatch(
              this.props.store.dispatcher
            );
            const opt = JSON.parse(options);
            for (const key in opt) {
              // eslint-disable-next-line
              if (opt.hasOwnProperty(key)) {
                attributes[key] = opt[key];
              }
            }
            new Actions.AddChartElement(classID, mappings, attributes).dispatch(
              this.props.store.dispatcher
            );
          }}
          onCancel={() => {
            new Actions.SetCurrentTool(null).dispatch(
              this.props.store.dispatcher
            );
          }}
        />
      );
    } else {
      let onCreate: (
        // tslint:disable-next-line
        ...args: Array<[number, Specification.Mapping]>
      ) => void = null;
      let mode: string = "point";

      const addGuide = (
        arg: [number, Specification.Mapping],
        axis: GuideAxis,
        outerAttr: string,
        lowMarginAttr: string,
        highMarginAttr: string,
        baselineLow: Specification.baseline,
        baselineMid: Specification.baseline,
        baselineHigh: Specification.baseline
      ) => {
        const outer = +this.props.store.chartState.attributes[outerAttr];
        const lowMargin = +this.props.store.chartState.attributes[
          lowMarginAttr
        ];
        const highMargin = +this.props.store.chartState.attributes[
          highMarginAttr
        ];
        const fromCenter = arg[0];
        const abs = outer / 2 + fromCenter;
        const inner = outer - lowMargin - highMargin;
        const half = inner / 2;
        const quarter = half / 2;
        const lowAbs = lowMargin;
        const halfAbs = lowMargin + half;
        const highAbs = outer - highMargin;
        let rel: number;
        let baseline: Specification.baseline;
        if (abs < lowAbs + quarter) {
          // relative to low
          baseline = baselineLow;
          rel = abs - lowAbs;
        } else if (abs < halfAbs + quarter) {
          // relative to mid
          baseline = baselineMid;
          rel = abs - halfAbs;
        } else {
          // relative to high
          baseline = baselineHigh;
          rel = abs - highAbs;
        }
        const value: [number, Specification.Mapping] = [rel, arg[1]];
        const guideProperties: Partial<GuideProperties> = {
          axis,
          baseline,
        };
        new Actions.AddChartElement(
          "guide.guide",
          {
            value: [
              value[0],
              {
                type: MappingType.value,
                value: value[0],
              } as ValueMapping,
            ],
          },
          guideProperties
        ).dispatch(this.props.store.dispatcher);
      };

      switch (this.state.currentCreation) {
        case "guide-x":
          {
            mode = "vline";
            onCreate = (x) =>
              addGuide(
                x,
                "x",
                "width",
                "marginLeft",
                "marginRight",
                "left",
                "center",
                "right"
              );
          }
          break;
        case "guide-y":
          {
            mode = "hline";
            onCreate = (y) =>
              addGuide(
                y,
                "y",
                "height",
                "marginBottom",
                "marginTop",
                "bottom",
                "middle",
                "top"
              );
          }
          break;
        case "guide-coordinator-x":
          {
            mode = "line";
            onCreate = (x1, y1, x2, y2) => {
              new Actions.AddChartElement(
                "guide.guide-coordinator",
                { x1, y1, x2, y2 },
                {
                  axis: "x",
                  count: GuideCoordinatorClass.defaultAttributes.count,
                }
              ).dispatch(this.props.store.dispatcher);
            };
          }
          break;
        case "guide-coordinator-y":
          {
            mode = "line";
            onCreate = (x1, y1, x2, y2) => {
              new Actions.AddChartElement(
                "guide.guide-coordinator",
                { x1, y1, x2, y2 },
                {
                  axis: "y",
                  count: GuideCoordinatorClass.defaultAttributes.count,
                }
              ).dispatch(this.props.store.dispatcher);
            };
          }
          break;
        case "guide-coordinator-polar":
          {
            mode = "rectangle";
            onCreate = (x1, y1, x2, y2) => {
              new Actions.AddChartElement(
                "guide.guide-coordinator-polar",
                { x1, y1, x2, y2 },
                {
                  axis: "xy",
                  angularGuidesCount: 4,
                  radialGuidesCount: 1,
                  startAngle: 0,
                  endAngle: 360,
                  innerRatio: 0.0,
                  outerRatio: 1,
                }
              ).dispatch(this.props.store.dispatcher);
            };
          }
          break;
      }
      return (
        <CreatingComponent
          width={this.state.viewWidth}
          height={this.state.viewHeight}
          zoom={this.state.zoom}
          mode={mode}
          key={mode}
          guides={this.getSnappingGuides()}
          // tslint:disable-next-line
          onCreate={(...args: Array<[number, Specification.Mapping]>) => {
            new Actions.SetCurrentTool(null).dispatch(
              this.props.store.dispatcher
            );
            // let newArgs = args.map(([value, mapping]) => {
            //     return [value, mapping || { type: "value", value: value } as Specification.ValueMapping]
            // }) as [number, Specification.Mapping][];
            if (onCreate) {
              onCreate(...args);
            }
          }}
          onCancel={() => {
            new Actions.SetCurrentTool(null).dispatch(
              this.props.store.dispatcher
            );
          }}
        />
      );
    }
  }

  public renderBoundsGuides() {
    // let chartClass = this.props.store.chartManager.getChartClass(this.props.store.chartState);
    // let boundsGuides = chartClass.getSnappingGuides();
    return this.getSnappingGuides().map((info, idx) => {
      const theGuide = info.guide;
      if (theGuide.visible) {
        if (theGuide.type == "x") {
          const guide = theGuide as Prototypes.SnappingGuides.Axis;
          return (
            <line
              className={classNames(
                "mark-guide",
                [
                  "coordinator",
                  info.guide.visualType ===
                    SnappingGuidesVisualTypes.Coordinator,
                ],
                [
                  "single",
                  info.guide.visualType === SnappingGuidesVisualTypes.Guide,
                ]
              )}
              key={`k${idx}`}
              x1={guide.value * this.state.zoom.scale + this.state.zoom.centerX}
              x2={guide.value * this.state.zoom.scale + this.state.zoom.centerX}
              y1={0}
              y2={this.state.viewHeight}
            />
          );
        }
        if (theGuide.type == "y") {
          const guide = theGuide as Prototypes.SnappingGuides.Axis;
          return (
            <line
              className={classNames(
                "mark-guide",
                [
                  "coordinator",
                  info.guide.visualType ===
                    SnappingGuidesVisualTypes.Coordinator,
                ],
                [
                  "single",
                  info.guide.visualType === SnappingGuidesVisualTypes.Guide,
                ]
              )}
              key={`k${idx}`}
              x1={0}
              x2={this.state.viewWidth}
              y1={
                -guide.value * this.state.zoom.scale + this.state.zoom.centerY
              }
              y2={
                -guide.value * this.state.zoom.scale + this.state.zoom.centerY
              }
            />
          );
        }

        if (theGuide.type == "point") {
          const axisGuide = theGuide as Prototypes.SnappingGuides.PolarAxis;

          return (
            <React.Fragment key={`fk${idx}`}>
              <circle
                className="mark-guide"
                key={`ck${idx}display`}
                cx={
                  axisGuide.cx * this.state.zoom.scale + this.state.zoom.centerX
                }
                cy={
                  -axisGuide.cy * this.state.zoom.scale +
                  this.state.zoom.centerY
                }
                r={Math.abs(axisGuide.visibleRadius * this.state.zoom.scale)}
              />
              <line
                key={`lk${idx}display`}
                className="mark-guide"
                x1={
                  axisGuide.cx * this.state.zoom.scale + this.state.zoom.centerX
                }
                y1={
                  -axisGuide.cy * this.state.zoom.scale +
                  this.state.zoom.centerY
                }
                x2={
                  axisGuide.angle * this.state.zoom.scale +
                  this.state.zoom.centerX
                }
                y2={
                  -axisGuide.radius * this.state.zoom.scale +
                  this.state.zoom.centerY
                }
              />
            </React.Fragment>
          );
        }
      }
    });
  }

  public getSnappingGuides(): ChartSnappableGuide[] {
    const chartClass = this.props.store.chartManager.getChartClass(
      this.props.store.chartState
    );
    const boundsGuides = chartClass.getSnappingGuides();
    let chartGuides = boundsGuides.map((bounds) => {
      return {
        element: null,
        guide: bounds,
      };
    });
    const elements = this.props.store.chart.elements;
    const elementStates = this.props.store.chartState.elements;
    zipArray(elements, elementStates).forEach(
      ([layout, layoutState]: [
        Specification.ChartElement,
        Specification.ChartElementState
      ]) => {
        const layoutClass = this.props.store.chartManager.getChartElementClass(
          layoutState
        );
        chartGuides = chartGuides.concat(
          layoutClass.getSnappingGuides().map((bounds) => {
            return {
              element: layout,
              guide: bounds,
            };
          })
        );
      }
    );
    return chartGuides;
  }

  public renderChartHandles() {
    const chartClass = this.props.store.chartManager.getChartClass(
      this.props.store.chartState
    );
    const handles = chartClass.getHandles();
    return handles.map((handle, index) => {
      return (
        <HandlesView
          key={`m${index}`}
          handles={handles}
          zoom={this.state.zoom}
          active={false}
          onDragStart={(bound, ctx) => {
            const session = new MoveSnappingSession(bound);
            ctx.onDrag((e) => {
              session.handleDrag(e);
            });
            ctx.onEnd((e) => {
              const updates = session.getUpdates(session.handleEnd(e));
              if (updates) {
                for (const name in updates) {
                  // eslint-disable-next-line
                  if (!updates.hasOwnProperty(name)) {
                    continue;
                  }
                  new Actions.SetChartAttribute(name, {
                    type: MappingType.value,
                    value: updates[name],
                  } as Specification.ValueMapping).dispatch(
                    this.props.store.dispatcher
                  );
                }
              }
            });
          }}
        />
      );
    });
  }

  public renderMarkHandlesInPlotSegment(
    plotSegment: Specification.PlotSegment,
    plotSegmentState: Specification.PlotSegmentState
  ) {
    const bboxViews: JSX.Element[] = [];
    const cs = this.props.store.chartManager
      .getPlotSegmentClass(plotSegmentState)
      .getCoordinateSystem();
    const glyph = getById(this.props.store.chart.glyphs, plotSegment.glyph);
    plotSegmentState.glyphs.forEach((glyphState, glyphIndex) => {
      const offsetX = glyphState.attributes.x as number;
      const offsetY = glyphState.attributes.y as number;
      glyphState.marks.forEach((markState, markIndex) => {
        const mark = glyph.marks[markIndex];
        const markClass = this.props.store.chartManager.getMarkClass(markState);
        if (Prototypes.isType(mark.classID, GuideCoordinatorClass.classID)) {
          return;
        }
        const bbox = markClass.getBoundingBox();
        let isMarkSelected = false;
        if (this.props.store.currentSelection instanceof MarkSelection) {
          if (
            this.props.store.currentSelection.plotSegment == plotSegment &&
            this.props.store.currentSelection.glyph == glyph &&
            this.props.store.currentSelection.mark == mark
          ) {
            if (
              glyphIndex ==
              this.props.store.getSelectedGlyphIndex(plotSegment._id)
            ) {
              isMarkSelected = true;
            }
          }
        }
        if (bbox) {
          bboxViews.push(
            <BoundingBoxView
              key={glyphIndex + "/" + markIndex}
              boundingBox={bbox}
              coordinateSystem={cs}
              offset={{ x: offsetX, y: offsetY }}
              zoom={this.state.zoom}
              active={isMarkSelected}
              onClick={() => {
                new Actions.SelectMark(
                  plotSegment,
                  glyph,
                  mark,
                  glyphIndex
                ).dispatch(this.props.store.dispatcher);
              }}
            />
          );
        }
      });
    });
    return <g>{bboxViews}</g>;
  }

  // eslint-disable-next-line
  public renderLayoutHandles() {
    const elements = this.props.store.chart.elements;
    const elementStates = this.props.store.chartState.elements;
    return stableSortBy(zipArray(elements, elementStates), (x) => {
      const [layout] = x;
      const shouldRenderHandles =
        this.state.currentSelection instanceof ChartElementSelection &&
        this.state.currentSelection.chartElement == layout;
      return shouldRenderHandles ? 1 : 0;
    }).map(
      // eslint-disable-next-line
      ([layout, layoutState]: [
        Specification.ChartElement,
        Specification.ChartElementState
      ]) => {
        const layoutClass = this.props.store.chartManager.getChartElementClass(
          layoutState
        );
        // Render handles if the chart element is selected
        const shouldRenderHandles =
          this.state.currentSelection instanceof ChartElementSelection &&
          this.state.currentSelection.chartElement == layout;
        const bbox = layoutClass.getBoundingBox();
        if (!shouldRenderHandles) {
          if (bbox) {
            const bboxView = (
              <BoundingBoxView
                key={layout._id}
                boundingBox={bbox}
                zoom={this.state.zoom}
                onClick={() => {
                  new Actions.SelectChartElement(layout, null).dispatch(
                    this.props.store.dispatcher
                  );
                }}
              />
            );
            if (Prototypes.isType(layout.classID, "plot-segment")) {
              return (
                <g key={layout._id}>
                  {this.renderMarkHandlesInPlotSegment(
                    layout as Specification.PlotSegment,
                    layoutState as Specification.PlotSegmentState
                  )}
                  {bboxView}
                </g>
              );
            } else {
              return bboxView;
            }
          }
        }
        const handles = layoutClass.getHandles();
        return (
          <g key={`m${layout._id}`}>
            {bbox ? (
              <BoundingBoxView
                zoom={this.state.zoom}
                boundingBox={bbox}
                active={true}
              />
            ) : null}
            {Prototypes.isType(layout.classID, "plot-segment")
              ? this.renderMarkHandlesInPlotSegment(
                  layout as Specification.PlotSegment,
                  layoutState as Specification.PlotSegmentState
                )
              : null}
            <HandlesView
              handles={handles}
              zoom={this.state.zoom}
              active={false}
              visible={shouldRenderHandles}
              isAttributeSnapped={(attribute) => {
                if (layout.mappings[attribute] != null) {
                  return true;
                }
                for (const constraint of this.props.store.chart.constraints) {
                  if (constraint.type == "snap") {
                    if (
                      constraint.attributes.element == layout._id &&
                      constraint.attributes.attribute == attribute
                    ) {
                      return true;
                    }
                    if (
                      constraint.attributes.targetElement == layout._id &&
                      constraint.attributes.targetAttribute == attribute
                    ) {
                      return true;
                    }
                  }
                }
                return false;
              }}
              onDragStart={(handle, ctx) => {
                const guides = this.getSnappingGuides();
                const session = new ChartSnappingSession(
                  guides,
                  layout,
                  handle,
                  10 / this.state.zoom.scale,
                  handle.options && handle.options.snapToClosestPoint
                );
                ctx.onDrag((e) => {
                  session.handleDrag(e);
                  this.setState({
                    snappingCandidates: session.getCurrentCandidates(),
                  });
                });
                ctx.onEnd((e) => {
                  this.setState({
                    snappingCandidates: null,
                  });
                  const action = session.getActions(session.handleEnd(e));
                  if (action) {
                    action.forEach((a) =>
                      a.dispatch(this.props.store.dispatcher)
                    );
                  }
                });
              }}
            />
          </g>
        );
      }
    );
  }

  public renderHandles() {
    return (
      <g>
        {this.renderChartHandles()}
        {this.renderLayoutHandles()}
      </g>
    );
  }

  public renderControls() {
    const elements = this.props.store.chart.elements;
    const elementStates = this.props.store.chartState.elements;

    const renderer = new Graphics.ChartRenderer(
      this.props.store.chartManager,
      this.props.store.renderEvents
    );

    return (
      <div className="canvas-popups">
        {zipArray(elements, elementStates)
          .filter(([element]) =>
            Prototypes.isType(element.classID, "plot-segment")
          )
          .map(
            (
              [layout, layoutState]: [
                Specification.PlotSegment,
                Specification.PlotSegmentState
              ],
              index
            ) => {
              if (
                this.state.currentSelection instanceof ChartElementSelection &&
                this.state.currentSelection.chartElement == layout
              ) {
                const layoutClass = this.props.store.chartManager.getPlotSegmentClass(
                  layoutState
                );
                const manager = new FluentUIWidgetManager(
                  this.props.store,
                  layoutClass
                );
                const controls = layoutClass.getPopupEditor(manager);
                if (!controls) {
                  return null;
                }
                const pt = Geometry.applyZoom(this.state.zoom, {
                  x: controls.anchor.x,
                  y: -controls.anchor.y,
                });
                if (pt.x < 0 || pt.y < 0 || !this.state.canvasToolbar) {
                  return null;
                }
                return (
                  <>
                    <div
                      className="charticulator__canvas-popup"
                      key={`m${index}`}
                      id={`anchor${index}`}
                      style={{
                        left: pt.x.toFixed(0) + "px",
                        bottom:
                          (this.state.viewHeight - pt.y + 5).toFixed(0) + "px",
                      }}
                    ></div>
                    <Callout
                      target={`#anchor${index}`}
                      directionalHint={DirectionalHint.topLeftEdge}
                      styles={{
                        root: {
                          padding: 10,
                        },
                        calloutMain: {
                          overflow: "hidden",
                        },
                      }}
                      onDismiss={() =>
                        this.setState({
                          canvasToolbar: false,
                        })
                      }
                    >
                      {manager.horizontal(
                        controls.widgets.map(() => 0),
                        ...controls.widgets
                      )}
                    </Callout>
                  </>
                );
              }
            )}
        </div>
        <div className="canvas-chart-controls">
          {renderer.renderControls(
            this.props.store.chart,
            this.props.store.chartState
          )}
        </div>
      </>
    );
  }

  // eslint-disable-next-line
  public renderSnappingGuides() {
    const guides = this.state.snappingCandidates;
    if (!guides || guides.length == 0) {
      return null;
    }
    // eslint-disable-next-line
    return guides.map((guide, idx) => {
      const key = `m${idx}`;
      switch (guide.guide.type) {
        case "x": {
          const axisGuide = guide.guide as Prototypes.SnappingGuides.Axis;
          return (
            <line
              key={key}
              className="snapping-guide"
              x1={
                axisGuide.value * this.state.zoom.scale +
                this.state.zoom.centerX
              }
              x2={
                axisGuide.value * this.state.zoom.scale +
                this.state.zoom.centerX
              }
              y1={0}
              y2={this.state.viewHeight}
            />
          );
        }
        case "y": {
          const axisGuide = guide.guide as Prototypes.SnappingGuides.Axis;
          return (
            <line
              key={key}
              className="snapping-guide"
              y1={
                -axisGuide.value * this.state.zoom.scale +
                this.state.zoom.centerY
              }
              y2={
                -axisGuide.value * this.state.zoom.scale +
                this.state.zoom.centerY
              }
              x1={0}
              x2={this.state.viewWidth}
            />
          );
        }
        case "point": {
          const axisGuide = (guide.guide as unknown) as Prototypes.SnappingGuides.PolarAxis;
          return (
            <>
              {axisGuide.visibleRadius ? (
                <circle
                  className="snapping-guide"
                  key={`ck${idx}display`}
                  cx={
                    axisGuide.cx * this.state.zoom.scale +
                    this.state.zoom.centerX
                  }
                  cy={
                    -axisGuide.cy * this.state.zoom.scale +
                    this.state.zoom.centerY
                  }
                  r={Math.abs(axisGuide.visibleRadius * this.state.zoom.scale)}
                />
              ) : (
                <>
                  <line
                    key={`lk${idx}display1`}
                    className="snapping-guide"
                    x1={
                      axisGuide.cx * this.state.zoom.scale +
                      this.state.zoom.centerX
                    }
                    y1={
                      -(axisGuide.cy - 10) * this.state.zoom.scale +
                      this.state.zoom.centerY
                    }
                    x2={
                      axisGuide.cx * this.state.zoom.scale +
                      this.state.zoom.centerX
                    }
                    y2={
                      -(axisGuide.cy + 10) * this.state.zoom.scale +
                      this.state.zoom.centerY
                    }
                  />
                  <line
                    key={`lk${idx}display1`}
                    className="snapping-guide"
                    x1={
                      (axisGuide.cx - 10) * this.state.zoom.scale +
                      this.state.zoom.centerX
                    }
                    y1={
                      -axisGuide.cy * this.state.zoom.scale +
                      this.state.zoom.centerY
                    }
                    x2={
                      (axisGuide.cx + 10) * this.state.zoom.scale +
                      this.state.zoom.centerX
                    }
                    y2={
                      -axisGuide.cy * this.state.zoom.scale +
                      this.state.zoom.centerY
                    }
                  />
                </>
              )}
              <line
                key={`lk${idx}display`}
                className="snapping-guide"
                x1={
                  axisGuide.cx * this.state.zoom.scale + this.state.zoom.centerX
                }
                y1={
                  -axisGuide.cy * this.state.zoom.scale +
                  this.state.zoom.centerY
                }
                x2={
                  axisGuide.angle * this.state.zoom.scale +
                  this.state.zoom.centerX
                }
                y2={
                  -axisGuide.radius * this.state.zoom.scale +
                  this.state.zoom.centerY
                }
              />
            </>
          );
        }
      }
    });
  }

  public renderChartCanvas() {
    const chartState = this.props.store.chartState;
    const p1 = {
      x: -chartState.attributes.width / 2,
      y: -chartState.attributes.height / 2,
    };
    const p2 = {
      x: +chartState.attributes.width / 2,
      y: +chartState.attributes.height / 2,
    };
    const p1t = Geometry.applyZoom(this.state.zoom, p1);
    const p2t = Geometry.applyZoom(this.state.zoom, p2);
    const cornerInnerRadius = 8;
    const cornerOuterRadius = cornerInnerRadius + 1;
    const shadowSize = cornerOuterRadius - cornerInnerRadius;

    const getRoundedRectPath = (
      x1: number,
      y1: number,
      x2: number,
      y2: number,
      radius: number
    ) => {
      return `m${Math.min(x1, x2) + cornerInnerRadius},${Math.min(y1, y2)} 
      h${Math.abs(x2 - x1) - radius * 2} 
      a${radius},${radius} 0 0 1 ${radius},${radius} 
      v${Math.abs(y2 - y1) - radius * 2} 
      a${radius},${radius} 0 0 1 -${radius},${radius} 
      h-${Math.abs(x2 - x1) - radius * 2} 
      a${radius},${radius} 0 0 1 -${radius},-${radius} 
      v-${Math.abs(y2 - y1) - radius * 2} 
      a${radius},${radius} 0 0 1 ${radius},-${radius} 
      z`;
    };

    return (
      <g>
        <path
          className="canvas-region-outer"
          d={getRoundedRectPath(
            p1t.x - shadowSize,
            p1t.y - shadowSize,
            p2t.x + shadowSize,
            p2t.y + shadowSize,
            cornerInnerRadius
          )}
        />
        <path
          className="canvas-region"
          d={getRoundedRectPath(p1t.x, p1t.y, p2t.x, p2t.y, cornerInnerRadius)}
        />
        <ResizeHandleView
          zoom={this.state.zoom}
          cx={(p1.x + p2.x) / 2}
          cy={(p1.y + p2.y) / 2}
          width={Math.abs(p2.x - p1.x)}
          height={Math.abs(p2.y - p1.y)}
          onResize={(newWidth, newHeight) => {
            new Actions.SetChartSize(newWidth, newHeight).dispatch(
              this.props.store.dispatcher
            );
          }}
        />
      </g>
    );
  }

  public renderDropZoneForMarkLayout(
    layout: Specification.PlotSegment,
    state: Specification.PlotSegmentState
  ) {
    const cls = this.props.store.chartManager.getPlotSegmentClass(state);
    return cls
      .getDropZones()
      .filter((zone) => {
        // We don't allow scale data mapping right now
        if (zone.dropAction.scaleInference) {
          return false;
        }

        if (this.state.dropZoneData) {
          // Process dropzone filter
          if (zone.accept) {
            if (zone.accept.table != null) {
              if (
                this.state.dropZoneData.data instanceof DragData.DataExpression
              ) {
                const data = this.state.dropZoneData
                  .data as DragData.DataExpression;
                if (data.table.name != zone.accept.table) {
                  return false;
                }
              } else {
                return false;
              }
            }
            if (zone.accept.scaffolds) {
              if (this.state.dropZoneData.layout) {
                return (
                  zone.accept.scaffolds.indexOf(
                    this.state.dropZoneData.layout.type
                  ) >= 0
                );
              } else {
                return false;
              }
            }
            return true;
          } else {
            return (
              this.state.dropZoneData.data instanceof DragData.DataExpression
            );
          }
        } else {
          return false;
        }
      })
      .map((zone, idx) => (
        <DropZoneView
          key={`m${idx}`}
          onDragEnter={(data: any) => {
            const dropAction = zone.dropAction;
            if (dropAction.axisInference) {
              return () => {
                new Actions.BindDataToAxis(
                  layout,
                  dropAction.axisInference.property,
                  dropAction.axisInference.appendToProperty,
                  data,
                  true
                ).dispatch(this.props.store.dispatcher);
                return true;
              };
            }
            if (dropAction.extendPlotSegment) {
              return () => {
                new Actions.ExtendPlotSegment(layout, data.type).dispatch(
                  this.props.store.dispatcher
                );
                return true;
              };
            }
          }}
          zone={zone}
          zoom={this.state.zoom}
        />
      ));
  }

  public renderDropZones() {
    const { chart, chartState } = this.props.store;
    if (!this.state.dropZoneData) {
      return null;
    }
    return (
      <g>
        {zipArray(chart.elements, chartState.elements)
          .filter(([e]) => Prototypes.isType(e.classID, "plot-segment"))
          .map(
            ([layout, layoutState]: [
              Specification.PlotSegment,
              Specification.PlotSegmentState
            ]) => {
              return (
                <g key={`m${layout._id}`}>
                  {this.renderDropZoneForMarkLayout(layout, layoutState)}
                </g>
              );
            }
          )}
      </g>
    );
  }

  // eslint-disable-next-line
  public render() {
    const width = this.state.viewWidth;
    const height = this.state.viewHeight;
    const transform = `translate(${this.state.zoom.centerX},${this.state.zoom.centerY}) scale(${this.state.zoom.scale})`;
    return (
      <div className="chart-editor-view">
        <div className="chart-editor-canvas-view" ref="canvasContainer">
          <svg
            className="canvas-view"
            ref="canvas"
            x={0}
            y={0}
            width={width}
            height={height}
          >
            <rect
              className="interaction-handler"
              ref="canvasInteraction"
              x={0}
              y={0}
              width={width}
              height={height}
            />
            {this.renderChartCanvas()}
            {this.renderBoundsGuides()}
            <g className="graphics" transform={transform}>
              {this.renderGraphics()}
            </g>
            {this.renderSnappingGuides()}
            {this.renderHandles()}
            {this.renderDropZones()}
            {this.renderEditingLink()}
            {this.renderCreatingComponent()}
          </svg>
          {this.renderControls()}
        </div>
        <div className="canvas-controls">
          <div className="canvas-controls-left" />
          <div className="canvas-controls-right">
            <Button
              icon="ZoomIn"
              onClick={() => {
                const { scale, centerX, centerY } = this.state.zoom;
                const fixPoint = Geometry.unapplyZoom(this.state.zoom, {
                  x: this.state.viewWidth / 2,
                  y: this.state.viewHeight / 2,
                });
                let newScale = scale * 1.1;
                newScale = Math.min(20, Math.max(0.05, newScale));
                this.setState({
                  zoom: {
                    centerX: centerX + (scale - newScale) * fixPoint.x,
                    centerY: centerY + (scale - newScale) * fixPoint.y,
                    scale: newScale,
                  },
                });
              }}
            />
            <Button
              icon="ZoomOut"
              onClick={() => {
                const { scale, centerX, centerY } = this.state.zoom;
                const fixPoint = Geometry.unapplyZoom(this.state.zoom, {
                  x: this.state.viewWidth / 2,
                  y: this.state.viewHeight / 2,
                });
                let newScale = scale / 1.1;
                newScale = Math.min(20, Math.max(0.05, newScale));
                this.setState({
                  zoom: {
                    centerX: centerX + (scale - newScale) * fixPoint.x,
                    centerY: centerY + (scale - newScale) * fixPoint.y,
                    scale: newScale,
                  },
                });
              }}
            />
            <Button
              icon="ZoomToFit"
              onClick={() => {
                const newZoom = this.getFitViewZoom(
                  this.state.viewWidth,
                  this.state.viewHeight
                );
                if (!newZoom) {
                  return;
                }
                this.setState({
                  zoom: newZoom,
                });
              }}
            />
          </div>
        </div>
        {this.state.isSolving ? (
          <div className="solving-hint">
            <div className="el-box">
              <img src={R.getSVGIcon("loading")} />
              {strings.app.working}
            </div>
          </div>
        ) : null}
      </div>
    );
  }
}
