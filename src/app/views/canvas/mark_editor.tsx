// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as React from "react";
import * as globals from "../../globals";

import {
  EventSubscription,
  Geometry,
  Graphics,
  indexOf,
  Point,
  Prototypes,
  Specification,
  zip,
  zipArray,
  ZoomInfo
} from "../../../core";
import { Actions, DragData } from "../../actions";
import { ZoomableCanvas } from "../../components";
import { DragContext, DragModifiers, Droppable } from "../../controllers";
import { renderGraphicalElementSVG } from "../../renderer";
import { AppStore, MarkSelection, Selection } from "../../stores";
import { classNames } from "../../utils";
import { Button } from "../panels/widgets/controls";
import { BoundingBoxView } from "./bounding_box";
import {
  CreatingComponent,
  CreatingComponentFromCreatingInteraction
} from "./creating_component";
import { DropZoneView } from "./dropzone";
import { HandlesView } from "./handles";
import {
  MarkSnappableGuide,
  MarkSnappingSession,
  MoveSnappingSession
} from "./snapping";
import { ContextedComponent } from "../../context_component";

export interface MarkEditorViewProps {
  height?: number;
}

export interface MarkEditorViewState {
  currentCreation?: string;
  currentCreationOptions?: string;
  width: number;
  height: number;
}

export class MarkEditorView extends ContextedComponent<
  MarkEditorViewProps,
  MarkEditorViewState
> {
  protected refContainer: HTMLDivElement;
  protected refSingleMarkView: SingleMarkView;
  protected resizeListenerHandle: number;

  public subs: EventSubscription[] = [];

  public state: MarkEditorViewState = {
    currentCreation: null,
    width: 300,
    height: 300
  };

  public resize = () => {
    const bbox = this.refContainer.getBoundingClientRect();
    this.setState({
      width: bbox.width,
      height: this.props.height != null ? this.props.height : bbox.height
    });
  };

  public componentDidMount() {
    const chartStore = this.store;
    this.subs.push(
      chartStore.addListener(AppStore.EVENT_GRAPHICS, () => this.forceUpdate())
    );
    this.subs.push(
      chartStore.addListener(AppStore.EVENT_SELECTION, () => this.forceUpdate())
    );
    this.subs.push(
      chartStore.addListener(AppStore.EVENT_CURRENT_TOOL, () => {
        this.setState({
          currentCreation: chartStore.currentTool,
          currentCreationOptions: chartStore.currentToolOptions
        });
      })
    );
    this.resizeListenerHandle = globals.resizeListeners.addListener(
      this.refContainer,
      this.resize
    );
    this.resize();
  }
  public componentWillUnmount() {
    for (const sub of this.subs) {
      sub.remove();
    }
    this.subs = [];
    globals.resizeListeners.removeListener(
      this.refContainer,
      this.resizeListenerHandle
    );
  }

  public getGlyphState(glyph: Specification.Glyph) {
    const chartStore = this.store;
    // Find the plot segment's index
    const layoutIndex = indexOf(
      chartStore.chart.elements,
      e =>
        Prototypes.isType(e.classID, "plot-segment") &&
        (e as Specification.PlotSegment).glyph == glyph._id
    );

    if (layoutIndex == -1) {
      // Cannot find plot segment, return null
      return null;
    } else {
      // Find the selected glyph
      const plotSegmentState = chartStore.chartState.elements[
        layoutIndex
      ] as Specification.PlotSegmentState;

      const glyphIndex = chartStore.getSelectedGlyphIndex(
        chartStore.chart.elements[layoutIndex]._id
      );

      // If found, use the glyph, otherwise fallback to the first glyph
      if (glyphIndex < 0) {
        return plotSegmentState.glyphs[0];
      } else {
        return plotSegmentState.glyphs[glyphIndex];
      }
    }
  }

  public render() {
    let currentGlyph = this.store.currentGlyph;
    if (
      currentGlyph == null ||
      this.store.chart.glyphs.indexOf(currentGlyph) < 0
    ) {
      currentGlyph = this.store.chart.glyphs[0];
    }
    return (
      <div className="mark-editor-view" ref={e => (this.refContainer = e)}>
        {currentGlyph ? (
          <SingleMarkView
            ref={e => {
              this.refSingleMarkView = e;
            }}
            glyph={currentGlyph}
            glyphState={this.getGlyphState(currentGlyph)}
            parent={this}
            width={this.state.width}
            height={this.state.height - 24}
          />
        ) : (
          <div className="mark-editor-single-view">
            <div
              className="mark-view-container"
              style={{
                width: this.state.width + "px",
                height: this.state.height - 24 + "px"
              }}
            >
              <div className="mark-view-container-notice">No glyph to edit</div>
            </div>
          </div>
        )}
        <div className="canvas-controls">
          <div className="canvas-controls-left">
            <span className="glyph-tabs">
              {this.store.chart.glyphs.map(glyph => (
                <span
                  className={classNames("el-item", [
                    "is-active",
                    glyph == currentGlyph
                  ])}
                  key={glyph._id}
                  onClick={() => {
                    this.dispatch(new Actions.SelectGlyph(null, glyph));
                  }}
                >
                  {glyph.properties.name}
                </span>
              ))}
            </span>
            <Button
              icon="general/plus"
              title="New glyph"
              onClick={() => {
                this.dispatch(new Actions.AddGlyph("glyph.rectangle"));
              }}
            />
          </div>
          <div className="canvas-controls-right">
            <Button
              icon="general/zoom-in"
              onClick={() => {
                this.refSingleMarkView.doZoom(1.1);
              }}
            />
            <Button
              icon="general/zoom-out"
              onClick={() => {
                this.refSingleMarkView.doZoom(1 / 1.1);
              }}
            />
            <Button
              icon="general/zoom-auto"
              onClick={() => {
                this.refSingleMarkView.doZoomAuto();
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  public getCurrentCreation() {
    return this.state.currentCreation;
  }

  public getCurrentCreationOptions() {
    return this.state.currentCreationOptions;
  }
}

export interface SingleMarkViewProps {
  parent: MarkEditorView;
  glyph: Specification.Glyph;
  glyphState: Specification.GlyphState;
  width: number;
  height: number;
}

export interface SingleMarkViewState {
  dataForDropZones: DragData.DropZoneData | false;
  selectedElement: Specification.Element;
  showIndicator: boolean;
  showIndicatorActive: boolean;
  snappingCandidates: MarkSnappableGuide[] | null;
  zoom: ZoomInfo;
}

export class SingleMarkView
  extends ContextedComponent<SingleMarkViewProps, SingleMarkViewState>
  implements Droppable {
  public refs: {
    canvas: SVGElement;
    canvasInteraction: SVGRectElement;
    zoomable: ZoomableCanvas;
  };

  public state: SingleMarkViewState = this.getDefaultState();

  public getDefaultState(): SingleMarkViewState {
    return {
      showIndicator: false,
      showIndicatorActive: false,
      dataForDropZones: false,
      selectedElement: null,
      snappingCandidates: null,
      zoom: {
        centerX: this.props.width / 2,
        centerY: this.props.height / 2,
        scale: 1
      }
    };
  }

  public doZoom(factor: number) {
    const { scale, centerX, centerY } = this.state.zoom;
    const fixPoint = Geometry.unapplyZoom(this.state.zoom, {
      x: this.props.width / 2,
      y: this.props.height / 2
    });
    let newScale = scale * factor;
    newScale = Math.min(20, Math.max(0.05, newScale));
    this.setState({
      zoom: {
        centerX: centerX + (scale - newScale) * fixPoint.x,
        centerY: centerY + (scale - newScale) * fixPoint.y,
        scale: newScale
      }
    });
  }

  public doZoomAuto() {
    const newZoom = this.getFitViewZoom(this.props.width, this.props.height);
    if (!newZoom) {
      return;
    }
    this.setState({
      zoom: newZoom
    });
  }

  public getFitViewZoom(width: number, height: number) {
    const glyphState = this.props.glyphState;
    if (!glyphState) {
      return null;
    }
    const manager = this.store.chartManager;
    // First we compute the maximum bounding box for marks in the glyph
    const boundingRects: Array<[number, number, number, number]> = [];
    // Get bounding box for each element
    for (const markState of glyphState.marks) {
      const cls = manager.getMarkClass(markState);
      const bbox = cls.getBoundingBox();
      if (bbox) {
        let xBounds: number[] = [];
        let yBounds: number[] = [];
        switch (bbox.type) {
          case "anchored-rectangle":
            {
              const bboxRect = bbox as Prototypes.BoundingBox.AnchoredRectangle;
              const cos = Math.cos((bboxRect.rotation / 180) * Math.PI);
              const sin = Math.sin((bboxRect.rotation / 180) * Math.PI);
              xBounds = [
                bboxRect.anchorX +
                  bboxRect.cx +
                  (bboxRect.width / 2) * cos +
                  (bboxRect.height / 2) * sin,
                bboxRect.anchorX +
                  bboxRect.cx -
                  (bboxRect.width / 2) * cos +
                  (bboxRect.height / 2) * sin,
                bboxRect.anchorX +
                  bboxRect.cx +
                  (bboxRect.width / 2) * cos -
                  (bboxRect.height / 2) * sin,
                bboxRect.anchorX +
                  bboxRect.cx -
                  (bboxRect.width / 2) * cos -
                  (bboxRect.height / 2) * sin
              ];
              yBounds = [
                bboxRect.anchorY +
                  bboxRect.cy +
                  (bboxRect.width / 2) * -sin +
                  (bboxRect.height / 2) * cos,
                bboxRect.anchorY +
                  bboxRect.cy -
                  (bboxRect.width / 2) * -sin +
                  (bboxRect.height / 2) * cos,
                bboxRect.anchorY +
                  bboxRect.cy +
                  (bboxRect.width / 2) * -sin -
                  (bboxRect.height / 2) * cos,
                bboxRect.anchorY +
                  bboxRect.cy -
                  (bboxRect.width / 2) * -sin -
                  (bboxRect.height / 2) * cos
              ];
            }
            break;
          case "rectangle":
            {
              const bboxRect = bbox as Prototypes.BoundingBox.Rectangle;
              xBounds = [
                bboxRect.cx + bboxRect.width / 2,
                bboxRect.cx - bboxRect.width / 2
              ];
              yBounds = [
                bboxRect.cy + bboxRect.height / 2,
                bboxRect.cy - bboxRect.height / 2
              ];
            }
            break;
          case "circle":
            {
              const bboxCircle = bbox as Prototypes.BoundingBox.Circle;
              xBounds = [
                bboxCircle.cx - bboxCircle.radius,
                bboxCircle.cx + bboxCircle.radius
              ];
              yBounds = [
                bboxCircle.cy - bboxCircle.radius,
                bboxCircle.cy + bboxCircle.radius
              ];
            }
            break;
          case "line": {
            const bboxLine = bbox as Prototypes.BoundingBox.Line;
            xBounds = [bboxLine.x1, bboxLine.x2];
            yBounds = [bboxLine.y1, bboxLine.y2];
          }
        }
        if (xBounds.length > 0) {
          // y is the same size
          boundingRects.push([
            Math.min(...xBounds),
            Math.max(...xBounds),
            Math.min(...yBounds),
            Math.max(...yBounds)
          ]);
        }
      }
    }

    // If there's no bounding rect found
    if (boundingRects.length == 0) {
      const cx = 0;
      const cy = 0;
      const { x1, x2, y1, y2 } = glyphState.attributes as {
        x1: number;
        y1: number;
        x2: number;
        y2: number;
      };
      const overshoot = 0.4;
      const scale1 = width / (1 + Math.abs(x2 - x1) * (1 + overshoot));
      const scale2 = height / (1 + Math.abs(y2 - y1) * (1 + overshoot));
      const scale = Math.min(scale1, scale2);
      const zoom = {
        centerX: width / 2 - cx * scale,
        centerY: height / 2 + cy * scale,
        scale
      } as ZoomInfo;
      return zoom;
    } else {
      const x1 = Math.min(...boundingRects.map(b => b[0]));
      const x2 = Math.max(...boundingRects.map(b => b[1]));
      const y1 = Math.min(...boundingRects.map(b => b[2]));
      const y2 = Math.max(...boundingRects.map(b => b[3]));
      const cx = (x1 + x2) / 2;
      const cy = (y1 + y2) / 2;
      const overshoot = 0.4;
      const scale1 = width / (1 + Math.abs(x2 - x1) * (1 + overshoot));
      const scale2 = height / (1 + Math.abs(y2 - y1) * (1 + overshoot));
      const scale = Math.min(scale1, scale2);
      const zoom = {
        centerX: width / 2 - cx * scale,
        centerY: height / 2 + cy * scale,
        scale
      } as ZoomInfo;
      return zoom;
    }
  }

  public doAutoFit() {
    const newZoom = this.getFitViewZoom(this.props.width, this.props.height);
    if (!newZoom) {
      return;
    }
    this.setState({
      zoom: newZoom
    });
  }

  public scheduleAutoFit() {
    const token = this.store.addListener(AppStore.EVENT_GRAPHICS, () => {
      this.doAutoFit();
      token.remove();
    });
  }

  public getRelativePoint(point: Point): Point {
    const r = this.refs.canvas.getBoundingClientRect();
    return {
      x: point.x - r.left,
      y: point.y - r.top
    };
  }

  public onDragEnter(ctx: DragContext) {
    this.dispatch(new Actions.SetCurrentTool(null));
    const data = ctx.data;
    if (data instanceof DragData.ObjectType) {
      if (
        Prototypes.isType(data.classID, "mark") ||
        Prototypes.isType(data.classID, "guide")
      ) {
        this.setState({
          showIndicatorActive: true
        });
        ctx.onLeave(() => {
          this.setState({
            showIndicatorActive: false
          });
        });
        ctx.onDrop(point => {
          point = this.getRelativePoint(point);
          const attributes: Specification.AttributeMap = {};
          const opt = JSON.parse(data.options);
          this.scheduleAutoFit();
          for (const key in opt) {
            if (opt.hasOwnProperty(key)) {
              attributes[key] = opt[key];
            }
          }
          this.dispatch(
            new Actions.AddMarkToGlyph(
              this.props.glyph,
              data.classID,
              Geometry.unapplyZoom(this.state.zoom, point),
              {},
              attributes
            )
          );
        });
        return true;
      }
    }
    // if (data instanceof DragData.DropZoneData) {
    //     this.setState({
    //         dataForDropZones: data
    //     });
    //     ctx.onLeave(() => {
    //         this.setState({
    //             dataForDropZones: false
    //         });
    //     });
    //     return true;
    // }
    return false;
  }

  private tokens: EventSubscription[] = [];
  private hammer: HammerManager;

  public componentDidMount() {
    this.hammer = new Hammer(this.refs.canvasInteraction);
    this.hammer.add(new Hammer.Tap());
    const pan = new Hammer.Pan();
    const pinch = new Hammer.Pinch();
    pinch.recognizeWith(pan);
    this.hammer.add([pinch]);
    this.hammer.on("tap", () => {
      this.dispatch(new Actions.SelectGlyph(null, this.props.glyph));
    });
    let cX: number = null,
      cY: number = 0,
      cScale: number = 0;
    let dX0: number, dY0: number;
    let fixPoint: Point = null;
    let lastDeltaX: number, lastDeltaY: number;
    let lastEventScale: number = 1;
    this.hammer.on("pinchstart panstart", e => {
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
    this.hammer.on("pinch pan", e => {
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
          scale: newScale
        }
      });
      lastDeltaX = e.deltaX;
      lastDeltaY = e.deltaY;
    });
    this.refs.canvas.onwheel = e => {
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
          scale: newScale
        }
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
      globals.dragController.addListener("sessionstart", () => {
        const session = globals.dragController.getSession();
        if (session && session.data instanceof DragData.DropZoneData) {
          this.setState({
            dataForDropZones: session.data
          });
        }
        if (session && session.data instanceof DragData.ObjectType) {
          if (
            Prototypes.isType(session.data.classID, "mark") ||
            Prototypes.isType(session.data.classID, "guide")
          ) {
            this.setState({
              showIndicator: true
            });
          }
        }
      })
    );
    this.tokens.push(
      globals.dragController.addListener("sessionend", () => {
        this.setState({
          dataForDropZones: false,
          showIndicator: false
        });
      })
    );
  }

  public componentWillUnmount() {
    this.hammer.destroy();
    globals.dragController.unregisterDroppable(this);
    this.tokens.forEach(token => token.remove());
    this.tokens = [];
  }

  public renderElement(
    element: Specification.Element,
    elementState: Specification.MarkState
  ) {
    const chartStore = this.store;
    const elementClass = chartStore.chartManager.getMarkClass(elementState);
    const graphics = elementClass.getGraphics(
      new Graphics.CartesianCoordinates(),
      { x: 0, y: 0 },
      0,
      chartStore.chartManager
    );
    if (!graphics) {
      return null;
    }
    return renderGraphicalElementSVG(graphics);
  }

  public renderDropIndicator() {
    if (!this.state.showIndicator) {
      return null;
    }
    return (
      <rect
        x={0}
        y={0}
        width={this.props.width}
        height={this.props.height}
        className={classNames("drop-indicator", [
          "active",
          this.state.showIndicatorActive
        ])}
      />
    );
  }

  public getSnappingGuides(): MarkSnappableGuide[] {
    let guides: MarkSnappableGuide[];
    const chartStore = this.store;
    const glyphState = this.props.glyphState;
    if (!glyphState) {
      return [];
    }
    guides = chartStore.chartManager
      .getGlyphClass(glyphState)
      .getAlignmentGuides()
      .map(g => {
        return { element: null, guide: g };
      });
    for (const [element, elementState] of zip(
      this.props.glyph.marks,
      glyphState.marks
    )) {
      const elementClass = chartStore.chartManager.getMarkClass(elementState);
      guides = guides.concat(
        elementClass.getSnappingGuides().map(g => {
          return { element, guide: g };
        })
      );
    }
    return guides;
  }

  public renderHandles() {
    return (
      <g>
        {this.renderMarkHandles()}
        {this.renderElementHandles()}
        {/* {this.renderAnchorHandles()} */}
      </g>
    );
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
              className="mark-guide"
              key={`k${idx}`}
              x1={guide.value * this.state.zoom.scale + this.state.zoom.centerX}
              x2={guide.value * this.state.zoom.scale + this.state.zoom.centerX}
              y1={0}
              y2={this.props.height}
            />
          );
        }
        if (theGuide.type == "y") {
          const guide = theGuide as Prototypes.SnappingGuides.Axis;
          return (
            <line
              className="mark-guide"
              key={`k${idx}`}
              x1={0}
              x2={this.props.width}
              y1={
                -guide.value * this.state.zoom.scale + this.state.zoom.centerY
              }
              y2={
                -guide.value * this.state.zoom.scale + this.state.zoom.centerY
              }
            />
          );
        }
      }
    });
  }

  public renderMarkHandles() {
    const chartStore = this.store;
    const glyphState = this.props.glyphState;
    const markClass = chartStore.chartManager.getGlyphClass(glyphState);
    const handles = markClass.getHandles();
    return handles.map((handle, index) => {
      return (
        <HandlesView
          key={`m${index}`}
          handles={handles}
          zoom={this.state.zoom}
          active={false}
          onDragStart={(bound, ctx) => {
            const session = new MoveSnappingSession(bound);
            ctx.onDrag(e => {
              session.handleDrag(e);
            });
            ctx.onEnd(e => {
              const updates = session.getUpdates(session.handleEnd(e));
              if (updates) {
                this.dispatch(
                  new Actions.UpdateGlyphAttribute(this.props.glyph, updates)
                );
              }
            });
          }}
        />
      );
    });
  }

  public renderAnchorHandles() {
    return zipArray(this.props.glyph.marks, this.props.glyphState.marks)
      .filter(x => x[0].classID == "mark.anchor")
      .map(([element, elementState], idx) => {
        const elementClass = this.store.chartManager.getMarkClass(elementState);
        const bounds = elementClass.getHandles();
        return (
          <HandlesView
            key={`m${element._id}`}
            handles={bounds}
            zoom={this.state.zoom}
            active={this.state.selectedElement == element}
            onDragStart={(bound, ctx) => {
              const guides = this.getSnappingGuides();
              const session = new MarkSnappingSession(
                guides,
                this.props.glyph,
                element,
                elementState,
                bound,
                10 / this.state.zoom.scale
              );
              ctx.onDrag(e => {
                session.handleDrag(e);
                this.setState({
                  snappingCandidates: session.getCurrentCandidates()
                });
              });
              ctx.onEnd(e => {
                this.setState({
                  snappingCandidates: null
                });
                const action = session.getActions(session.handleEnd(e));
                if (action) {
                  this.dispatch(action);
                }
              });
            }}
          />
        );
      });
  }

  public renderElementHandles() {
    return zipArray(this.props.glyph.marks, this.props.glyphState.marks)
      .filter(x => x[0].classID != "mark.anchor")
      .sort((a, b) => {
        const aSelected =
          this.store.currentSelection instanceof MarkSelection &&
          this.store.currentSelection.mark == a[0];
        const bSelected =
          this.store.currentSelection instanceof MarkSelection &&
          this.store.currentSelection.mark == b[0];
        if (aSelected) {
          return +1;
        }
        if (bSelected) {
          return -1;
        }
        return (
          this.props.glyph.marks.indexOf(a[0]) -
          this.props.glyph.marks.indexOf(b[0])
        );
      })
      .map(([element, elementState]) => {
        const elementClass = this.store.chartManager.getMarkClass(elementState);
        const shouldRenderHandles =
          this.store.currentSelection instanceof MarkSelection &&
          this.store.currentSelection.mark == element;
        if (!shouldRenderHandles) {
          const bbox = elementClass.getBoundingBox();
          if (bbox) {
            return (
              <BoundingBoxView
                key={`m${element._id}`}
                zoom={this.state.zoom}
                boundingBox={bbox}
                onClick={() => {
                  this.dispatch(
                    new Actions.SelectMark(null, this.props.glyph, element)
                  );
                }}
              />
            );
          }
        }
        const handles = elementClass.getHandles();
        const bbox = elementClass.getBoundingBox();
        return (
          <g key={`m${element._id}`}>
            {bbox ? (
              <BoundingBoxView
                zoom={this.state.zoom}
                boundingBox={bbox}
                active={true}
              />
            ) : null}
            <HandlesView
              handles={handles}
              zoom={this.state.zoom}
              active={false}
              visible={shouldRenderHandles}
              isAttributeSnapped={attribute => {
                if (element.mappings[attribute] != null) {
                  return true;
                }
                for (const constraint of this.props.glyph.constraints) {
                  if (constraint.type == "snap") {
                    if (
                      constraint.attributes.element == element._id &&
                      constraint.attributes.attribute == attribute
                    ) {
                      return true;
                    }
                    if (
                      constraint.attributes.targetElement == element._id &&
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
                const session = new MarkSnappingSession(
                  guides,
                  this.props.glyph,
                  element,
                  elementState,
                  handle,
                  10 / this.state.zoom.scale
                );
                ctx.onDrag(e => {
                  session.handleDrag(e);
                  this.setState({
                    snappingCandidates: session.getCurrentCandidates()
                  });
                });
                ctx.onEnd(e => {
                  this.setState({
                    snappingCandidates: null
                  });
                  // if (handle.type == "text-input") {
                  //     let textInput = handle as Prototypes.Handles.TextInput;
                  //     ctx.onEnd(e => {
                  //         let updates: { [name: string]: Specification.Mapping }
                  //         new Actions.SetMarkAttribute(this.props.store.mark, element, textInput.attribute, { type: "value", value: e.newValue } as Specification.ValueMapping).dispatch(this.props.store.dispatcher);
                  //     })
                  // } else if (handle.type == "text-alignment") {
                  //     let textAlignment = handle as Prototypes.Handles.TextAlignment;
                  //     ctx.onEnd(e => {
                  //         new Actions.SetObjectProperty(element, textAlignment.propertyAlignment, null, e.newAlignment).dispatch(this.props.store.dispatcher);
                  //         new Actions.SetObjectProperty(element, textAlignment.propertyRotation, null, e.newRotation).dispatch(this.props.store.dispatcher);
                  //     })
                  // } else {
                  const action = session.getActions(session.handleEnd(e));
                  if (action) {
                    this.dispatch(action);
                  }
                  // }
                });
              }}
            />
          </g>
        );
        // } else {
        //     let bbox = elementClass.getBoundingBox();
        //     if (bbox) {
        //         return (
        //             <BoundingBoxView
        //                 key={`m${element._id}`}
        //                 zoom={this.state.zoom}
        //                 boundingBox={bbox}
        //                 onClick={() => {
        //                     new Actions.SelectElement(this.props.store.mark, element).dispatch(this.props.store.dispatcher);
        //                 }}
        //             />
        //         );
        //     } else {
        //         let handles = elementClass.getHandles();
        //         return (
        //             <HandlesView
        //                 key={`m${element._id}`}
        //                 handles={handles}
        //                 zoom={this.state.zoom}
        //                 active={true}
        //                 visible={false}
        //                 onDragStart={(handle, ctx) => {
        //                     let guides = this.getSnappingGuides();
        //                     let session = new MarkSnappingSession(guides, this.props.store.mark, element, elementState, handle, 10 / this.state.zoom.scale);
        //                     ctx.onDrag((e) => {
        //                         session.handleDrag(e);
        //                         this.setState({
        //                             snappingCandidates: session.getCurrentCandidates()
        //                         });
        //                     });
        //                     ctx.onEnd((e) => {
        //                         this.setState({
        //                             snappingCandidates: null
        //                         });
        //                         let action = session.getActions(session.handleEnd(e));
        //                         if (action) {
        //                             action.dispatch(this.props.store.dispatcher);
        //                         }
        //                     });
        //                 }}
        //             />
        //         );
        //     }
        // }
      });
  }

  public renderDropZoneForElement(
    data: any,
    element: Specification.Element,
    state: Specification.MarkState
  ) {
    const cls = this.store.chartManager.getMarkClass(state);
    return cls
      .getDropZones()
      .map((zone: Prototypes.DropZones.Description, idx) => {
        if (zone.accept) {
          if (zone.accept.table) {
            if (data.table.name != zone.accept.table) {
              return null;
            }
          }
          if (zone.accept.kind) {
            if (data.metadata.kind != zone.accept.kind) {
              return null;
            }
          }
        }
        return (
          <DropZoneView
            key={`m${idx}`}
            onDragEnter={(data: any) => {
              if (data instanceof DragData.DataExpression) {
                if (zone.accept) {
                  if (zone.accept.table) {
                    if (data.table.name != zone.accept.table) {
                      return null;
                    }
                  }
                  if (zone.accept.kind) {
                    if (data.metadata.kind != zone.accept.kind) {
                      return null;
                    }
                  }
                }
                if (zone.dropAction.scaleInference) {
                  return (point: Point, modifiers: DragModifiers) => {
                    if (!zone.dropAction.scaleInference.hints) {
                      zone.dropAction.scaleInference.hints = {};
                    }
                    zone.dropAction.scaleInference.hints.newScale =
                      modifiers.shiftKey;
                    this.dispatch(
                      new Actions.MapDataToMarkAttribute(
                        this.props.glyph,
                        element,
                        zone.dropAction.scaleInference.attribute,
                        zone.dropAction.scaleInference.attributeType,
                        data.expression,
                        data.valueType,
                        data.metadata,
                        zone.dropAction.scaleInference.hints
                      )
                    );
                    return true;
                  };
                }
                if (zone.dropAction.axisInference) {
                  return (point: Point, modifiers: DragModifiers) => {
                    this.dispatch(
                      new Actions.BindDataToAxis(
                        element,
                        zone.dropAction.axisInference.property,
                        zone.dropAction.axisInference.appendToProperty,
                        data
                      )
                    );
                    return true;
                  };
                }
              }
            }}
            zone={zone}
            zoom={this.state.zoom}
          />
        );
      });
  }

  public renderSnappingGuidesLabels() {
    const allLabels: Prototypes.SnappingGuides.Description[] = [];
    for (const [element, elementState] of zip(
      this.props.glyph.marks,
      this.props.glyphState.marks
    )) {
      const elementClass = this.store.chartManager.getMarkClass(elementState);
      const guides = elementClass.getSnappingGuides();
      for (const item of guides) {
        if (item.type == "label") {
          allLabels.push(item);
        }
      }
    }
    if (allLabels.length == 0) {
      return null;
    }
    return (
      <g>
        {allLabels.map((guide: Prototypes.SnappingGuides.Label, i: number) => {
          const x = guide.x * this.state.zoom.scale + this.state.zoom.centerX;
          const y = -guide.y * this.state.zoom.scale + this.state.zoom.centerY;
          return (
            <g
              transform={`translate(${x},${y})`}
              className="snapping-guide-label"
              key={i}
            >
              <circle cx={0} cy={0} r={2} />
              <text x={5} y={5} transform={`rotate(45)`}>
                {guide.text}
              </text>
            </g>
          );
        })}
      </g>
    );
  }

  public renderSnappingGuides() {
    const guides = this.state.snappingCandidates;
    if (!guides || guides.length == 0) {
      return null;
    }
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
              y2={this.props.height}
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
              x2={this.props.width}
            />
          );
        }
      }
    });
  }

  public renderMarkGuides() {
    const markClass = this.store.chartManager.getGlyphClass(
      this.props.glyphState
    );
    const markGuides = markClass.getAlignmentGuides();
    return markGuides.map((theGuide, idx) => {
      if (theGuide.type == "x") {
        const guide = theGuide as Prototypes.SnappingGuides.Axis;
        return (
          <line
            className="mark-guide"
            key={`k${idx}`}
            x1={guide.value * this.state.zoom.scale + this.state.zoom.centerX}
            x2={guide.value * this.state.zoom.scale + this.state.zoom.centerX}
            y1={0}
            y2={this.props.height}
          />
        );
      }
      if (theGuide.type == "y") {
        const guide = theGuide as Prototypes.SnappingGuides.Axis;
        return (
          <line
            className="mark-guide"
            key={`k${idx}`}
            y1={-guide.value * this.state.zoom.scale + this.state.zoom.centerY}
            y2={-guide.value * this.state.zoom.scale + this.state.zoom.centerY}
            x1={0}
            x2={this.props.width}
          />
        );
      }
    });
  }

  public renderAnchor() {
    const { glyph, glyphState } = this.props;

    const anchorIndex = indexOf(glyph.marks, x => x.classID == "mark.anchor");
    let pt = {
      x: glyphState.marks[anchorIndex].attributes.x as number,
      y: -glyphState.marks[anchorIndex].attributes.y as number
    };
    pt = Geometry.applyZoom(this.state.zoom, pt);
    return (
      <path
        d={`M${pt.x - 5},${pt.y}L${pt.x},${pt.y - 5}L${pt.x + 5},${pt.y}L${
          pt.x
        },${pt.y + 5}Z`}
        className="mark-anchor"
      />
    );
  }

  public renderCreatingComponent() {
    const currentCreation = this.props.parent.getCurrentCreation();
    const currentCreationOptions = this.props.parent.getCurrentCreationOptions();
    if (currentCreation == null) {
      return null;
    }

    const metadata = Prototypes.ObjectClasses.GetMetadata(currentCreation);
    if (metadata && metadata.creatingInteraction) {
      const classID = currentCreation;
      return (
        <CreatingComponentFromCreatingInteraction
          width={this.props.width}
          height={this.props.height}
          zoom={this.state.zoom}
          guides={this.getSnappingGuides()}
          description={metadata.creatingInteraction}
          onCreate={(mappings, attributes) => {
            this.dispatch(new Actions.SetCurrentTool(null));
            const opt = JSON.parse(currentCreationOptions);
            for (const key in opt) {
              if (opt.hasOwnProperty(key)) {
                attributes[key] = opt[key];
              }
            }
            this.dispatch(
              new Actions.AddMarkToGlyph(
                this.props.glyph,
                classID,
                { x: 0, y: 0 },
                mappings,
                attributes
              )
            );
          }}
          onCancel={() => {
            this.dispatch(new Actions.SetCurrentTool(null));
          }}
        />
      );
    } else {
      let onCreate: (
        ...args: Array<[number, Specification.Mapping]>
      ) => void = null;
      let mode: string = "point";

      switch (currentCreation) {
        case "guide-x":
          {
            mode = "vline";
            onCreate = x => {
              this.dispatch(
                new Actions.AddMarkToGlyph(
                  this.props.glyph,
                  "guide.guide",
                  { x: 0, y: 0 },
                  { value: x },
                  { axis: "x" }
                )
              );
            };
          }
          break;
        case "guide-y":
          {
            mode = "hline";
            onCreate = y => {
              this.dispatch(
                new Actions.AddMarkToGlyph(
                  this.props.glyph,
                  "guide.guide",
                  { x: 0, y: 0 },
                  { value: y },
                  { axis: "y" }
                )
              );
            };
          }
          break;
        case "guide-coordinator-x":
          {
            mode = "line";
            onCreate = (x1, y1, x2, y2) => {
              this.dispatch(
                new Actions.AddMarkToGlyph(
                  this.props.glyph,
                  "guide.guide-coordinator",
                  { x: 0, y: 0 },
                  { x1, y1, x2, y2 },
                  { axis: "x", count: 4 }
                )
              );
            };
          }
          break;
        case "guide-coordinator-y":
          {
            mode = "line";
            onCreate = (x1, y1, x2, y2) => {
              this.dispatch(
                new Actions.AddMarkToGlyph(
                  this.props.glyph,
                  "guide.guide-coordinator",
                  { x: 0, y: 0 },
                  { x1, y1, x2, y2 },
                  { axis: "y", count: 4 }
                )
              );
            };
          }
          break;
      }
      return (
        <CreatingComponent
          width={this.props.width}
          height={this.props.height}
          zoom={this.state.zoom}
          mode={mode}
          key={mode}
          guides={this.getSnappingGuides()}
          onCreate={(...args: Array<[number, Specification.Mapping]>) => {
            this.dispatch(new Actions.SetCurrentTool(null));
            if (onCreate) {
              onCreate(...args);
            }
          }}
          onCancel={() => {
            this.dispatch(new Actions.SetCurrentTool(null));
          }}
        />
      );
    }
  }

  public render() {
    const { glyph, glyphState } = this.props;
    const transform = `translate(${this.state.zoom.centerX},${
      this.state.zoom.centerY
    }) scale(${this.state.zoom.scale})`;
    if (!glyphState) {
      return (
        <div className="mark-editor-single-view">
          <div className="mark-view-container">
            <svg
              className="canvas-view canvas-view-mark"
              ref="canvas"
              x={0}
              y={0}
              width={this.props.width}
              height={this.props.height}
            >
              <rect
                ref="canvasInteraction"
                className="interaction-handler"
                x={0}
                y={0}
                width={this.props.width}
                height={this.props.height}
              />
            </svg>
            <div className="mark-view-container-notice">
              To edit this glyph, please create a plot segment with it.
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="mark-editor-single-view">
        <div className="mark-view-container">
          <svg
            className="canvas-view canvas-view-mark"
            ref="canvas"
            x={0}
            y={0}
            width={this.props.width}
            height={this.props.height}
          >
            <rect
              ref="canvasInteraction"
              className="interaction-handler"
              x={0}
              y={0}
              width={this.props.width}
              height={this.props.height}
            />
            {this.renderBoundsGuides()}
            <g ref="zoomable" transform={transform} className="graphics">
              {zipArray(glyph.marks, glyphState.marks).map(
                ([elements, elementState]) => {
                  return (
                    <g key={`m${elements._id}`}>
                      {this.renderElement(elements, elementState)}
                    </g>
                  );
                }
              )}
            </g>
            {/* {this.renderAnchor()} */}
            {this.renderSnappingGuides()}
            {this.renderSnappingGuidesLabels()}
            <g>{!this.state.dataForDropZones ? this.renderHandles() : null}</g>
            <g>
              {this.state.dataForDropZones
                ? zipArray(glyph.marks, glyphState.marks).map(
                    ([elements, elementState]) => {
                      return (
                        <g key={`m${elements._id}`}>
                          {this.renderDropZoneForElement(
                            this.state.dataForDropZones,
                            elements,
                            elementState
                          )}
                        </g>
                      );
                    }
                  )
                : null}
            </g>
            <g>{this.renderDropIndicator()}</g>
            {this.renderCreatingComponent()}
          </svg>
        </div>
      </div>
    );
  }
}
