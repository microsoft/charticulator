/*
Copyright (c) Microsoft Corporation. All rights reserved.
Licensed under the MIT license.
*/
import * as React from "react";
import { EventEmitter, EventSubscription, Graphics } from "../../../core";

import {
  Specification,
  Prototypes,
  zipArray,
  zip,
  Solver,
  Point,
  Geometry,
  ZoomInfo,
  indexOf
} from "../../../core";

import * as globals from "../../globals";
import {
  ChartStore,
  GlyphStore,
  Selection,
  MarkSelection,
  GlyphSelection
} from "../../stores";
import { DragData, Actions } from "../../actions";
import { Droppable, DragContext, DragModifiers } from "../../controllers";
import { ZoomableCanvas, ToolButton, SVGImageIcon } from "../../components";
import {
  CreatingComponent,
  CreatingComponentFromCreatingInteraction
} from "./creating_component";
import { DropZoneView } from "./dropzone";
import { HandlesView } from "./handles";
import { renderGraphicalElementSVG } from "../../renderer";
import { BoundingBoxView } from "./bounding_box";

import {
  MarkSnappingSession,
  MarkSnappableGuide,
  MoveSnappingSession
} from "./snapping";
import { ObjectButton } from "../tool_bar";
import { Button } from "../panels/widgets/controls";
import { classNames } from "../../utils";

export interface MarkEditorViewProps {
  store: ChartStore;
  height?: number;
}

export interface MarkEditorViewState {
  currentCreation?: string;
  currentCreationOptions?: string;
  currentSelection: Selection;
  width: number;
  height: number;
}

export class MarkEditorView extends React.Component<
  MarkEditorViewProps,
  MarkEditorViewState
> {
  protected refContainer: HTMLDivElement;
  protected refSingleMarkView: SingleMarkView;
  protected resizeListenerHandle: number;

  public subs: EventSubscription[] = [];

  constructor(props: MarkEditorViewProps) {
    super(props);
    this.state = {
      currentCreation: null,
      currentSelection: null,
      width: 300,
      height: 300
    };
  }

  public resize = () => {
    const bbox = this.refContainer.getBoundingClientRect();
    this.setState(
      {
        width: bbox.width,
        height: this.props.height != null ? this.props.height : bbox.height
      },
      () => {
        this.refSingleMarkView.doAutoFit();
      }
    );
  };

  public componentDidMount() {
    this.subs.push(
      this.props.store.addListener(ChartStore.EVENT_GRAPHICS, () =>
        this.forceUpdate()
      )
    );
    this.subs.push(
      this.props.store.addListener(ChartStore.EVENT_CURRENT_TOOL, () => {
        this.setState({
          currentCreation: this.props.store.currentTool,
          currentCreationOptions: this.props.store.currentToolOptions
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
  public render() {
    const markStores = this.props.store.markStores;
    const marks = [
      {
        name: "mark.rect",
        displayName: "Rectangle",
        icon: "mark/rect",
        draggable: true
      },
      {
        name: "mark.symbol",
        displayName: "Symbol",
        icon: "mark/symbol",
        draggable: true
      },
      {
        name: "mark.line",
        displayName: "Line",
        icon: "mark/line",
        draggable: true
      },
      {
        name: "mark.text",
        displayName: "Text",
        icon: "mark/text",
        draggable: true
      },
      {
        name: "guide-y",
        displayName: "Guide Y",
        icon: "guide/x",
        draggable: false
      },
      {
        name: "guide-x",
        displayName: "Guide X",
        icon: "guide/y",
        draggable: false
      },
      {
        name: "guide-coordinator-y",
        displayName: "Guide Y",
        icon: "guide/coordinator-x",
        draggable: false
      },
      {
        name: "guide-coordinator-x",
        displayName: "Guide X",
        icon: "guide/coordinator-y",
        draggable: false
      }
    ];
    return (
      <div className="mark-editor-view" ref={e => (this.refContainer = e)}>
        {markStores.map(markStore => {
          return (
            <SingleMarkView
              ref={e => {
                this.refSingleMarkView = e;
              }}
              key={`m${markStore._id}`}
              parent={this}
              width={this.state.width}
              height={this.state.height - 24}
              store={markStore}
            />
          );
        })}
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
  store: GlyphStore;
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
  autoFitNextUpdate: boolean;

  currentSelection: Selection;
}

export class SingleMarkView
  extends React.Component<SingleMarkViewProps, SingleMarkViewState>
  implements Droppable {
  public refs: {
    canvas: SVGElement;
    canvasInteraction: SVGRectElement;
    zoomable: ZoomableCanvas;
  };

  constructor(props: SingleMarkViewProps) {
    super(props);
    this.state = {
      showIndicator: false,
      showIndicatorActive: false,
      dataForDropZones: false,
      selectedElement: null,
      snappingCandidates: null,
      autoFitNextUpdate: false,
      zoom: {
        centerX: props.width / 2,
        centerY: props.height / 2,
        scale: 1
      },
      currentSelection: this.props.store.parent.currentSelection
    };
  }

  public getFitViewZoom(width: number, height: number) {
    const markState = this.props.store.markState;
    if (!markState) {
      return null;
    }
    let x1 = markState.attributes.ix1 as number;
    let y1 = markState.attributes.iy1 as number;
    let x2 = markState.attributes.ix2 as number;
    let y2 = markState.attributes.iy2 as number;
    const dx = Math.abs(x2 - x1);
    const dy = Math.abs(y2 - y1);
    x1 = -dx / 2;
    y1 = -dy / 2;
    x2 = dx / 2;
    y2 = dy / 2;
    // Get bounding box for each element
    for (const elementState of this.props.store.markState.marks) {
      const cls = this.props.store.parent.chartManager.getMarkClass(
        elementState
      );
      const bbox = cls.getBoundingBox();
      if (bbox) {
        let xBounds: number[] = [];
        let yBounds: number[] = [];
        switch (bbox.type) {
          case "anchored-rectangle":
            {
              const bboxRect = bbox as Prototypes.BoundingBox.AnchoredRectangle;
              const cos = Math.cos(bboxRect.rotation / 180 * Math.PI);
              const sin = Math.sin(bboxRect.rotation / 180 * Math.PI);
              xBounds = [
                bboxRect.anchorX +
                  bboxRect.cx +
                  bboxRect.width / 2 * cos +
                  bboxRect.height / 2 * sin,
                bboxRect.anchorX +
                  bboxRect.cx -
                  bboxRect.width / 2 * cos +
                  bboxRect.height / 2 * sin,
                bboxRect.anchorX +
                  bboxRect.cx +
                  bboxRect.width / 2 * cos -
                  bboxRect.height / 2 * sin,
                bboxRect.anchorX +
                  bboxRect.cx -
                  bboxRect.width / 2 * cos -
                  bboxRect.height / 2 * sin
              ];
              yBounds = [
                bboxRect.anchorY +
                  bboxRect.cy +
                  bboxRect.width / 2 * -sin +
                  bboxRect.height / 2 * cos,
                bboxRect.anchorY +
                  bboxRect.cy -
                  bboxRect.width / 2 * -sin +
                  bboxRect.height / 2 * cos,
                bboxRect.anchorY +
                  bboxRect.cy +
                  bboxRect.width / 2 * -sin -
                  bboxRect.height / 2 * cos,
                bboxRect.anchorY +
                  bboxRect.cy -
                  bboxRect.width / 2 * -sin -
                  bboxRect.height / 2 * cos
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
          case "circle": {
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
        }
        x1 = Math.min(x1, ...xBounds);
        x2 = Math.max(x2, ...xBounds);
        y1 = Math.min(y1, ...yBounds);
        y2 = Math.max(y2, ...yBounds);
      }
    }

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

  public doAutoFit() {
    const newZoom = this.getFitViewZoom(this.props.width, this.props.height);
    if (!newZoom) {
      return;
    }
    const isFocusing =
      this.props.store.parent.currentSelection instanceof MarkSelection;
    if (this.state.autoFitNextUpdate || !isFocusing) {
      this.setState({
        zoom: newZoom,
        autoFitNextUpdate: false
      });
    }
  }

  public getRelativePoint(point: Point): Point {
    const r = this.refs.canvas.getBoundingClientRect();
    return {
      x: point.x - r.left,
      y: point.y - r.top
    };
  }

  public onDragEnter(ctx: DragContext) {
    new Actions.SetCurrentTool(null).dispatch(this.props.store.dispatcher);
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
          this.setState({
            autoFitNextUpdate: true
          });
          const attributes: Specification.AttributeMap = {};
          const opt = JSON.parse(data.options);
          for (const key in opt) {
            if (opt.hasOwnProperty(key)) {
              attributes[key] = opt[key];
            }
          }
          new Actions.AddMarkToGlyph(
            this.props.store.mark,
            data.classID,
            Geometry.unapplyZoom(this.state.zoom, point),
            {},
            attributes
          ).dispatch(this.props.store.parent.dispatcher);
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
      new Actions.SelectGlyph(this.props.store.mark).dispatch(
        this.props.store.dispatcher
      );
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
      this.props.store.addListener(GlyphStore.EVENT_STATE, () => {
        this.doAutoFit();
        this.forceUpdate();
      })
    );
    this.tokens.push(
      this.props.store.parent.addListener(ChartStore.EVENT_SELECTION, () => {
        this.setState({
          currentSelection: this.props.store.parent.currentSelection
        });
      })
    );
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
    const elementClass = this.props.store.parent.chartManager.getMarkClass(
      elementState
    );
    const graphics = elementClass.getGraphics(
      new Graphics.CartesianCoordinates(),
      { x: 0, y: 0 },
      0,
      this.props.store.parent.chartManager
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
    guides = this.props.store.parent.chartManager
      .getGlyphClass(this.props.store.markState)
      .getAlignmentGuides()
      .map(g => {
        return { element: null, guide: g };
      });
    for (const [element, elementState] of zip(
      this.props.store.mark.marks,
      this.props.store.markState.marks
    )) {
      const elementClass = this.props.store.parent.chartManager.getMarkClass(
        elementState
      );
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
    const markClass = this.props.store.parent.chartManager.getGlyphClass(
      this.props.store.markState
    );
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
                new Actions.UpdateGlyphAttribute(
                  this.props.store.mark,
                  updates
                ).dispatch(this.props.store.dispatcher);
              }
            });
          }}
        />
      );
    });
  }

  public renderAnchorHandles() {
    return zipArray(
      this.props.store.mark.marks,
      this.props.store.markState.marks
    )
      .filter(x => x[0].classID == "mark.anchor")
      .map(([element, elementState], idx) => {
        const elementClass = this.props.store.parent.chartManager.getMarkClass(
          elementState
        );
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
                this.props.store.mark,
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
                  action.dispatch(this.props.store.dispatcher);
                }
              });
            }}
          />
        );
      });
  }

  public renderElementHandles() {
    return zipArray(
      this.props.store.mark.marks,
      this.props.store.markState.marks
    )
      .filter(x => x[0].classID != "mark.anchor")
      .sort((a, b) => {
        const aSelected =
          this.state.currentSelection instanceof MarkSelection &&
          this.state.currentSelection.mark == a[0];
        const bSelected =
          this.state.currentSelection instanceof MarkSelection &&
          this.state.currentSelection.mark == b[0];
        if (aSelected) {
          return +1;
        }
        if (bSelected) {
          return -1;
        }
        return (
          this.props.store.mark.marks.indexOf(a[0]) -
          this.props.store.mark.marks.indexOf(b[0])
        );
      })
      .map(([element, elementState]) => {
        const elementClass = this.props.store.parent.chartManager.getMarkClass(
          elementState
        );
        const shouldRenderHandles =
          this.state.currentSelection instanceof MarkSelection &&
          this.state.currentSelection.mark == element;
        if (!shouldRenderHandles) {
          const bbox = elementClass.getBoundingBox();
          if (bbox) {
            return (
              <BoundingBoxView
                key={`m${element._id}`}
                zoom={this.state.zoom}
                boundingBox={bbox}
                onClick={() => {
                  new Actions.SelectMark(
                    this.props.store.mark,
                    element
                  ).dispatch(this.props.store.dispatcher);
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
                for (const constraint of this.props.store.mark.constraints) {
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
                  this.props.store.mark,
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
                    action.dispatch(this.props.store.dispatcher);
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
    const cls = this.props.store.parent.chartManager.getMarkClass(state);
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
                    new Actions.MapDataToMarkAttribute(
                      this.props.store.mark,
                      element,
                      zone.dropAction.scaleInference.attribute,
                      zone.dropAction.scaleInference.attributeType,
                      data.expression,
                      data.valueType,
                      zone.dropAction.scaleInference.hints
                    ).dispatch(this.props.store.dispatcher);
                    return true;
                  };
                }
                if (zone.dropAction.axisInference) {
                  return (point: Point, modifiers: DragModifiers) => {
                    new Actions.BindDataToAxis(
                      element,
                      zone.dropAction.axisInference.property,
                      zone.dropAction.axisInference.appendToProperty,
                      data
                    ).dispatch(this.props.store.dispatcher);
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
      this.props.store.mark.marks,
      this.props.store.markState.marks
    )) {
      const elementClass = this.props.store.parent.chartManager.getMarkClass(
        elementState
      );
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
    const markClass = this.props.store.parent.chartManager.getGlyphClass(
      this.props.store.markState
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
    const { mark, markState } = this.props.store;
    const anchorIndex = indexOf(mark.marks, x => x.classID == "mark.anchor");
    let pt = {
      x: markState.marks[anchorIndex].attributes.x as number,
      y: -markState.marks[anchorIndex].attributes.y as number
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
            new Actions.SetCurrentTool(null).dispatch(
              this.props.store.dispatcher
            );
            const opt = JSON.parse(currentCreationOptions);
            for (const key in opt) {
              if (opt.hasOwnProperty(key)) {
                attributes[key] = opt[key];
              }
            }
            new Actions.AddMarkToGlyph(
              this.props.store.mark,
              classID,
              { x: 0, y: 0 },
              mappings,
              attributes
            ).dispatch(this.props.store.dispatcher);
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
        ...args: Array<[number, Specification.Mapping]>
      ) => void = null;
      let mode: string = "point";

      switch (currentCreation) {
        case "guide-x":
          {
            mode = "vline";
            onCreate = x => {
              new Actions.AddMarkToGlyph(
                this.props.store.mark,
                "guide.guide",
                { x: 0, y: 0 },
                { value: x },
                { axis: "x" }
              ).dispatch(this.props.store.dispatcher);
            };
          }
          break;
        case "guide-y":
          {
            mode = "hline";
            onCreate = y => {
              new Actions.AddMarkToGlyph(
                this.props.store.mark,
                "guide.guide",
                { x: 0, y: 0 },
                { value: y },
                { axis: "y" }
              ).dispatch(this.props.store.dispatcher);
            };
          }
          break;
        case "guide-coordinator-x":
          {
            mode = "line";
            onCreate = (x1, y1, x2, y2) => {
              new Actions.AddMarkToGlyph(
                this.props.store.mark,
                "guide.guide-coordinator",
                { x: 0, y: 0 },
                { x1, y1, x2, y2 },
                { axis: "x", count: 3 }
              ).dispatch(this.props.store.dispatcher);
            };
          }
          break;
        case "guide-coordinator-y":
          {
            mode = "line";
            onCreate = (x1, y1, x2, y2) => {
              new Actions.AddMarkToGlyph(
                this.props.store.mark,
                "guide.guide-coordinator",
                { x: 0, y: 0 },
                { x1, y1, x2, y2 },
                { axis: "y", count: 3 }
              ).dispatch(this.props.store.dispatcher);
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
            new Actions.SetCurrentTool(null).dispatch(
              this.props.store.dispatcher
            );
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

  public render() {
    const { mark, markState } = this.props.store;
    const transform = `translate(${this.state.zoom.centerX},${
      this.state.zoom.centerY
    }) scale(${this.state.zoom.scale})`;
    if (!markState) {
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
              {zipArray(mark.marks, markState.marks).map(
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
                ? zipArray(mark.marks, markState.marks).map(
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
          <div className="canvas-controls">
            <Button
              icon="general/zoom-in"
              onClick={() => {
                const { scale, centerX, centerY } = this.state.zoom;
                const fixPoint = Geometry.unapplyZoom(this.state.zoom, {
                  x: this.props.width / 2,
                  y: this.props.height / 2
                });
                let newScale = scale * 1.1;
                newScale = Math.min(20, Math.max(0.05, newScale));
                this.setState({
                  zoom: {
                    centerX: centerX + (scale - newScale) * fixPoint.x,
                    centerY: centerY + (scale - newScale) * fixPoint.y,
                    scale: newScale
                  }
                });
              }}
            />
            <Button
              icon="general/zoom-out"
              onClick={() => {
                const { scale, centerX, centerY } = this.state.zoom;
                const fixPoint = Geometry.unapplyZoom(this.state.zoom, {
                  x: this.props.width / 2,
                  y: this.props.height / 2
                });
                let newScale = scale / 1.1;
                newScale = Math.min(20, Math.max(0.05, newScale));
                this.setState({
                  zoom: {
                    centerX: centerX + (scale - newScale) * fixPoint.x,
                    centerY: centerY + (scale - newScale) * fixPoint.y,
                    scale: newScale
                  }
                });
              }}
            />
            <Button
              icon="general/zoom-auto"
              onClick={() => {
                const newZoom = this.getFitViewZoom(
                  this.props.width,
                  this.props.height
                );
                if (!newZoom) {
                  return;
                }
                this.setState({
                  zoom: newZoom,
                  autoFitNextUpdate: false
                });
              }}
            />
          </div>
        </div>
      </div>
    );
  }
}
