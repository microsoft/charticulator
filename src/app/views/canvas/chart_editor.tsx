import * as React from "react";
import { EventSubscription, stableSortBy } from "../../../core";

import * as globals from "../../globals";
import * as R from "../../resources";

import { Specification, Prototypes, Graphics, zip, zipArray, getById, ZoomInfo, indexOf, Geometry, Point, deepClone, setField } from "../../../core";
import { ChartStore, Selection, ChartElementSelection, MarkSelection } from "../../stores";
import { GraphicalElementDisplay } from "../../renderer";
import { CreatingComponent, CreatingComponentFromCreatingInteraction } from "./creating_component";
import { Droppable, DragContext } from "../../controllers";
import { ChartSnappingSession, ChartSnappableGuide, MoveSnappingSession } from "./snapping";
import { HandlesView, ResizeHandleView } from "./handles";
import { Actions, DragData } from "../../actions";
import { DropZoneView } from "./dropzone";
import { BoundingBoxView } from "./bounding_box";
import { WidgetManager } from "../panels/widgets/manager";
import { EditingLink } from "./editing_link";
import { Button } from "../panels/widgets/controls";

export interface ChartEditorViewProps {
    store: ChartStore;
}

export interface ChartEditorViewState {
    viewWidth: number;
    viewHeight: number;
    zoom: ZoomInfo;
    snappingCandidates: ChartSnappableGuide[] | null;
    graphics: Graphics.Element;
    currentCreation?: string;
    currentSelection: Selection;
    dropZoneData: {
        data?: DragData.DropZoneData,
        layout?: DragData.ScaffoldType,
    } | false;
    isSolving: boolean;
}

export class ChartEditorView extends React.Component<ChartEditorViewProps, ChartEditorViewState> implements Droppable {
    refs: {
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
                scale: 1
            },
            snappingCandidates: null,
            graphics: this.getGraphics(),
            currentCreation: null,
            currentSelection: this.props.store.currentSelection,
            dropZoneData: false,
            viewWidth: 100,
            viewHeight: 100,
            isSolving: false
        };

        this.tokens = [];
    }

    public getRelativePoint(point: Point): Point {
        let r = this.refs.canvas.getBoundingClientRect();
        return {
            x: point.x - r.left,
            y: point.y - r.top
        };
    }

    public getFitViewZoom(width: number, height: number) {
        let chartState = this.props.store.chartState;
        let x1 = chartState.attributes.x1 as number;
        let y1 = chartState.attributes.y1 as number;
        let x2 = chartState.attributes.x2 as number;
        let y2 = chartState.attributes.y2 as number;
        let cx = (x1 + x2) / 2;
        let cy = (y1 + y2) / 2;
        let overshoot = 0.4;
        let scale1 = width / (Math.abs(x2 - x1) * (1 + overshoot));
        let scale2 = height / (Math.abs(y2 - y1) * (1 + overshoot));
        let zoom = {
            centerX: width / 2, centerY: height / 2,
            scale: Math.min(scale1, scale2)
        } as ZoomInfo;
        return zoom;
    }

    public componentDidMount() {
        this.hammer = new Hammer(this.refs.canvasInteraction);
        this.hammer.add(new Hammer.Tap());
        let pan = new Hammer.Pan();
        let pinch = new Hammer.Pinch();
        pinch.recognizeWith(pan);
        this.hammer.add([pinch]);
        this.hammer.on("tap", () => {
            new Actions.ClearSelection().dispatch(this.props.store.dispatcher);
        });
        let cX: number = null, cY: number = 0, cScale: number = 0;
        let dX0: number, dY0: number;
        let fixPoint: Point = null;
        let lastDeltaX: number, lastDeltaY: number;
        let lastEventScale: number = 1;
        this.hammer.on("pinchstart panstart", (e) => {
            fixPoint = Geometry.unapplyZoom(this.state.zoom, this.getRelativePoint({ x: e.center.x, y: e.center.y }));
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
                    scale: newScale
                }
            });
            lastDeltaX = e.deltaX;
            lastDeltaY = e.deltaY;
        });
        this.refs.canvas.onwheel = (e) => {
            let fixPoint = Geometry.unapplyZoom(this.state.zoom, this.getRelativePoint({ x: e.pageX, y: e.pageY }));
            let { centerX, centerY, scale } = this.state.zoom;
            let delta = -e.deltaY;
            if (e.deltaMode == e.DOM_DELTA_LINE) delta *= 33.3;
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
        }

        globals.dragController.registerDroppable(this, this.refs.canvas);

        this.tokens.push(this.props.store.addListener(ChartStore.EVENT_GRAPHICS, this.updateGraphics.bind(this)));
        this.tokens.push(this.props.store.addListener(ChartStore.EVENT_SELECTION, this.updateSelection.bind(this)));
        this.tokens.push(this.props.store.addListener(ChartStore.EVENT_CURRENT_TOOL, () => {
            this.setState({ currentCreation: this.props.store.currentTool });
        }));

        // We display the working icon after 200ms.
        let newStateTimer: NodeJS.Timer = null;
        this.tokens.push(this.props.store.addListener(ChartStore.EVENT_SOLVER_STATUS, () => {
            let newState = this.props.store.solverStatus.solving;
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
        }));

        let doResize = () => {
            let rect = this.refs.canvasContainer.getBoundingClientRect();
            let width = rect.width;
            let height = rect.height;
            this.setState({
                viewWidth: width,
                viewHeight: height,
                zoom: this.getFitViewZoom(width, height)
            });
        };
        globals.resizeListeners.addListener(this.refs.canvasContainer, doResize);
        doResize();

        this.tokens.push(globals.dragController.addListener("sessionstart", () => {
            let session = globals.dragController.getSession();
            if (session && session.data instanceof DragData.DropZoneData) {
                this.setState({
                    dropZoneData: { data: session.data }
                });
            }
        }));
        this.tokens.push(globals.dragController.addListener("sessionend", () => {
            this.setState({
                dropZoneData: false
            });
        }));
    }

    public componentWillUnmount() {
        this.hammer.destroy();
        this.tokens.forEach(t => t.remove());
        globals.dragController.unregisterDroppable(this);
    }

    public onDragEnter(ctx: DragContext) {
        new Actions.SetCurrentTool(null).dispatch(this.props.store.dispatcher);
        let data = ctx.data;
        if (data instanceof DragData.ScaffoldType) {
            this.setState({
                dropZoneData: { layout: data }
            });
            console.log("drag enter");
            ctx.onLeave(() => {
                this.setState({
                    dropZoneData: false
                });
            });
            return true;
        }
        return false;
    }

    protected getGraphics(): Graphics.Element {
        let renderer = new Graphics.ChartRenderer(this.props.store.chartManager);
        return renderer.render();
    }

    protected updateSelection() {
        this.setState({ currentSelection: this.props.store.currentSelection });
    }

    protected updateGraphics() {
        this.setState({ graphics: this.getGraphics() });
    }

    public renderGraphics() {
        return (
            <GraphicalElementDisplay element={this.state.graphics} />
        );
    }

    public renderEditingLink() {
        let store = this.props.store;
        if (store.currentSelection instanceof ChartElementSelection) {
            let element = store.currentSelection.chartElement;
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

    public renderCreatingComponent() {
        if (this.state.currentCreation == null) return null;

        // if (this.state.currentCreation == "link") {
        //     let linkTable: string = null;
        //     if (this.props.store.currentToolOptions && this.props.store.currentToolOptions.by == "table") {
        //         if (this.props.store.datasetStore.dataset.tables.length >= 2) {
        //             linkTable = this.props.store.datasetStore.dataset.tables[1].name;
        //         }
        //     }
        //     return (
        //         <CreatingLink width={this.state.viewWidth} height={this.state.viewHeight} zoom={this.state.zoom}
        //             chart={this.props.store.chart}
        //             chartState={this.props.store.chartState}
        //             dataset={this.props.store.datasetStore.dataset}
        //             lineMode={this.props.store.currentToolOptions.mode}
        //             linkTable={linkTable}
        //             store={this.props.store}
        //             onCreate={(links) => {
        //                 new Actions.AddLinks(links).dispatch(this.props.store.dispatcher);
        //                 new Actions.SetCurrentTool(null).dispatch(this.props.store.dispatcher);
        //             }}
        //             onCancel={() => {
        //                 new Actions.SetCurrentTool(null).dispatch(this.props.store.dispatcher);
        //             }}
        //         />
        //     );
        // }

        let metadata = Prototypes.ObjectClasses.GetMetadata(this.state.currentCreation);
        if (metadata && metadata.creatingInteraction) {
            let classID = this.state.currentCreation;
            return (
                <CreatingComponentFromCreatingInteraction
                    width={this.state.viewWidth} height={this.state.viewHeight} zoom={this.state.zoom}
                    guides={this.getSnappingGuides()}
                    description={metadata.creatingInteraction}
                    onCreate={(mappings, attributes) => {
                        new Actions.SetCurrentTool(null).dispatch(this.props.store.dispatcher);
                        new Actions.AddPlotSegment(
                            classID, mappings, attributes
                        ).dispatch(this.props.store.dispatcher);
                    }}
                    onCancel={() => {
                        new Actions.SetCurrentTool(null).dispatch(this.props.store.dispatcher);
                    }}
                />
            );
        } else {

            let onCreate: (...args: [number, Specification.Mapping][]) => void = null;
            let mode: string = "point";

            // Make sure a < b:
            function autoSwap(a: [number, Specification.Mapping], b: [number, Specification.Mapping]) {
                if (a[0] < b[0]) {
                    return [a, b];
                } else {
                    return [b, a];
                }
            }

            switch (this.state.currentCreation) {
                case "guide-x": {
                    mode = "vline";
                    onCreate = (x) => {
                        new Actions.AddPlotSegment(
                            "guide.guide",
                            { value: x },
                            { axis: "x" }
                        ).dispatch(this.props.store.dispatcher);
                    };
                } break;
                case "guide-y": {
                    mode = "hline";
                    onCreate = (y) => {
                        new Actions.AddPlotSegment(
                            "guide.guide",
                            { value: y },
                            { axis: "y" }
                        ).dispatch(this.props.store.dispatcher);
                    };
                } break;
                case "guide-coordinator-x": {
                    mode = "line";
                    onCreate = (x1, y1, x2, y2) => {
                        new Actions.AddPlotSegment(
                            "guide.guide-coordinator",
                            { x1: x1, y1: y1, x2: x2, y2: y2 },
                            { axis: "x", count: 3 }
                        ).dispatch(this.props.store.dispatcher);
                    }
                } break;
                case "guide-coordinator-y": {
                    mode = "line";
                    onCreate = (x1, y1, x2, y2) => {
                        new Actions.AddPlotSegment(
                            "guide.guide-coordinator",
                            { x1: x1, y1: y1, x2: x2, y2: y2 },
                            { axis: "y", count: 3 }
                        ).dispatch(this.props.store.dispatcher);
                    };
                } break;
            }
            return (
                <CreatingComponent width={this.state.viewWidth} height={this.state.viewHeight} zoom={this.state.zoom}
                    mode={mode}
                    key={mode}
                    guides={this.getSnappingGuides()}
                    onCreate={(...args: [number, Specification.Mapping][]) => {
                        new Actions.SetCurrentTool(null).dispatch(this.props.store.dispatcher);
                        // let newArgs = args.map(([value, mapping]) => {
                        //     return [value, mapping || { type: "value", value: value } as Specification.ValueMapping]
                        // }) as [number, Specification.Mapping][];
                        if (onCreate) onCreate(...args);
                    }}
                    onCancel={() => {
                        new Actions.SetCurrentTool(null).dispatch(this.props.store.dispatcher);
                    }}
                />
            );
        }
    }

    public renderBoundsGuides() {
        // let chartClass = this.props.store.chartManager.getChartClass(this.props.store.chartState);
        // let boundsGuides = chartClass.getSnappingGuides();
        return this.getSnappingGuides().map((info, idx) => {
            let theGuide = info.guide;
            if (theGuide.visible) {
                if (theGuide.type == "x") {
                    let guide = theGuide as Prototypes.SnappingGuides.Axis;
                    return (
                        <line className="mark-guide" key={`k${idx}`}
                            x1={guide.value * this.state.zoom.scale + this.state.zoom.centerX}
                            x2={guide.value * this.state.zoom.scale + this.state.zoom.centerX}
                            y1={0}
                            y2={this.state.viewHeight}
                        />
                    );
                }
                if (theGuide.type == "y") {
                    let guide = theGuide as Prototypes.SnappingGuides.Axis;
                    return (
                        <line className="mark-guide" key={`k${idx}`}
                            x1={0}
                            x2={this.state.viewWidth}
                            y1={-guide.value * this.state.zoom.scale + this.state.zoom.centerY}
                            y2={-guide.value * this.state.zoom.scale + this.state.zoom.centerY}
                        />
                    );
                }
            }
        });
    }

    public getSnappingGuides(): ChartSnappableGuide[] {
        let chartClass = this.props.store.chartManager.getChartClass(this.props.store.chartState);
        let boundsGuides = chartClass.getSnappingGuides();
        let chartGuides = boundsGuides.map(bounds => {
            return {
                element: null,
                guide: bounds
            }
        });
        let elements = this.props.store.chart.elements;
        let elementStates = this.props.store.chartState.elements;
        zipArray(elements, elementStates).forEach(([layout, layoutState]: [Specification.ChartElement, Specification.ChartElementState], index) => {
            let layoutClass = this.props.store.chartManager.getChartElementClass(layoutState);
            chartGuides = chartGuides.concat(layoutClass.getSnappingGuides().map(bounds => {
                return {
                    element: layout,
                    guide: bounds
                };
            }));
        });
        return chartGuides
    }

    public renderChartHandles() {
        let chartClass = this.props.store.chartManager.getChartClass(this.props.store.chartState);
        let handles = chartClass.getHandles();
        return handles.map((handle, index) => {
            return (
                <HandlesView
                    key={`m${index}`}
                    handles={handles}
                    zoom={this.state.zoom}
                    active={false}
                    onDragStart={(bound, ctx) => {
                        let session = new MoveSnappingSession(bound);
                        ctx.onDrag((e) => {
                            session.handleDrag(e);
                        });
                        ctx.onEnd((e) => {
                            let updates = session.getUpdates(session.handleEnd(e));
                            if (updates) {
                                for (let name in updates) {
                                    if (!updates.hasOwnProperty(name)) continue;
                                    new Actions.SetChartAttribute(name, { type: "value", value: updates[name] } as Specification.ValueMapping).dispatch(this.props.store.dispatcher);
                                }
                            }
                        });
                    }}
                />
            );
        });
    }

    public renderMarkHandlesInPlotSegment(plotSegment: Specification.PlotSegment, plotSegmentState: Specification.PlotSegmentState) {
        let bboxViews: JSX.Element[] = [];
        let cs = this.props.store.chartManager.getPlotSegmentClass(plotSegmentState).getCoordinateSystem();
        let glyph = getById(this.props.store.chart.glyphs, plotSegment.glyph);
        let table = this.props.store.datasetStore.getTable(glyph.table);
        plotSegmentState.glyphs.forEach((glyphState, glyphIndex) => {
            let offsetX = glyphState.attributes["x"] as number;
            let offsetY = glyphState.attributes["y"] as number;
            glyphState.marks.forEach((markState, markIndex) => {
                let mark = glyph.marks[markIndex];
                let markClass = this.props.store.chartManager.getMarkClass(markState);
                let bbox = markClass.getBoundingBox();
                let isMarkSelected = false;
                if (this.props.store.currentSelection instanceof MarkSelection) {
                    if (this.props.store.currentSelection.glyph == glyph && this.props.store.currentSelection.mark == mark) {
                        if (plotSegmentState.dataRowIndices[glyphIndex] == this.props.store.datasetStore.getSelectedRowIndex(table)) {
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
                                new Actions.SelectMark(glyph, mark, plotSegmentState.dataRowIndices[glyphIndex]).dispatch(this.props.store.dispatcher);
                            }}
                        />
                    );
                }
            });
        });
        return (<g>{bboxViews}</g>);
    }

    public renderLayoutHandles() {
        let elements = this.props.store.chart.elements;
        let elementStates = this.props.store.chartState.elements;
        // if (this.props.store.currentSelection instanceof MarkSelection) {
        //     return (
        //         <g>
        //             {zipArray(elements, elementStates).map(([element, elementState]) => {
        //                 if (Prototypes.isType(element.classID, "plot-segment")) {
        //                     return <g key={element._id}>{this.renderMarkHandlesInPlotSegment(element as Specification.PlotSegment, elementState as Specification.PlotSegmentState)}</g>;
        //                 } else {
        //                     return null;
        //                 }
        //             })}
        //         </g>
        //     );
        // }
        let elementsSorted
        return stableSortBy(zipArray(elements, elementStates), (x) => {
            let [layout, layoutState] = x;
            let shouldRenderHandles = this.state.currentSelection instanceof ChartElementSelection && this.state.currentSelection.chartElement == layout;
            return shouldRenderHandles ? 1 : 0;
        }).map(([layout, layoutState]: [Specification.ChartElement, Specification.ChartElementState], index) => {
            let layoutClass = this.props.store.chartManager.getChartElementClass(layoutState);
            // Render handles if the chart element is selected
            let shouldRenderHandles = this.state.currentSelection instanceof ChartElementSelection && this.state.currentSelection.chartElement == layout;
            let bbox = layoutClass.getBoundingBox();
            if (!shouldRenderHandles) {
                if (bbox) {
                    let bboxView = (
                        <BoundingBoxView
                            key={layout._id}
                            boundingBox={bbox}
                            zoom={this.state.zoom}
                            onClick={() => {
                                new Actions.SelectChartElement(layout, null).dispatch(this.props.store.dispatcher);
                            }}
                        />
                    );
                    if (Prototypes.isType(layout.classID, "plot-segment")) {
                        return (
                            <g key={layout._id}>
                                {this.renderMarkHandlesInPlotSegment(layout as Specification.PlotSegment, layoutState as Specification.PlotSegmentState)}
                                {bboxView}
                            </g>
                        );
                    } else {
                        return bboxView;
                    }
                }
            }
            let handles = layoutClass.getHandles();
            return (
                <g key={`m${layout._id}`}>
                    {bbox ? <BoundingBoxView
                        zoom={this.state.zoom}
                        boundingBox={bbox}
                        active={true}
                    /> : null}
                    {Prototypes.isType(layout.classID, "plot-segment") ? this.renderMarkHandlesInPlotSegment(layout as Specification.PlotSegment, layoutState as Specification.PlotSegmentState) : null}
                    <HandlesView
                        handles={handles}
                        zoom={this.state.zoom}
                        active={false}
                        visible={shouldRenderHandles}
                        isAttributeSnapped={(attribute) => {
                            if (layout.mappings[attribute] != null) return true;
                            for (let constraint of this.props.store.chart.constraints) {
                                if (constraint.type == "snap") {
                                    if (constraint.attributes["element"] == layout._id && constraint.attributes["attribute"] == attribute) return true;
                                    if (constraint.attributes["targetElement"] == layout._id && constraint.attributes["targetAttribute"] == attribute) return true;
                                }
                            }
                            return false;
                        }}
                        onDragStart={(handle, ctx) => {
                            let guides = this.getSnappingGuides();
                            let session = new ChartSnappingSession(guides, layout, handle, 10 / this.state.zoom.scale);
                            ctx.onDrag((e) => {
                                session.handleDrag(e);
                                this.setState({
                                    snappingCandidates: session.getCurrentCandidates()
                                });
                            });
                            ctx.onEnd(e => {
                                this.setState({
                                    snappingCandidates: null
                                });
                                let action = session.getActions(session.handleEnd(e));
                                if (action) {
                                    action.forEach(a => a.dispatch(this.props.store.dispatcher));
                                }
                            });
                        }}
                    />
                </g>
            );
        });
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
        let elements = this.props.store.chart.elements;
        let elementStates = this.props.store.chartState.elements;
        return (
            <div className="canvas-popups">
                {
                    zipArray(elements, elementStates).filter(([element, elementState]) => Prototypes.isType(element.classID, "plot-segment")).map(([layout, layoutState]: [Specification.PlotSegment, Specification.PlotSegmentState], index) => {
                        if (this.state.currentSelection instanceof ChartElementSelection && this.state.currentSelection.chartElement == layout) {
                            let layoutClass = this.props.store.chartManager.getPlotSegmentClass(layoutState);
                            let manager = new WidgetManager(this.props.store, layoutClass);
                            let controls = layoutClass.getPopupEditor(manager);
                            if (!controls) return null;
                            let pt = Geometry.applyZoom(this.state.zoom, { x: controls.anchor.x, y: -controls.anchor.y });
                            return (
                                <div className="charticulator__canvas-popup" key={`m${index}`}
                                    style={{ left: pt.x.toFixed(0) + "px", bottom: (this.state.viewHeight - pt.y + 5).toFixed(0) + "px" }}
                                >
                                    {manager.horizontal(controls.widgets.map(x => 0), ...controls.widgets)}
                                </div>
                            );
                        }
                    })
                }
            </div>
        );
    }

    public renderSnappingGuides() {
        let guides = this.state.snappingCandidates;
        if (!guides || guides.length == 0) return null;
        return guides.map((guide, idx) => {
            let key = `m${idx}`;
            switch (guide.guide.type) {
                case "x": {
                    let axisGuide = guide.guide as Prototypes.SnappingGuides.Axis;
                    return <line key={key} className="snapping-guide"
                        x1={axisGuide.value * this.state.zoom.scale + this.state.zoom.centerX}
                        x2={axisGuide.value * this.state.zoom.scale + this.state.zoom.centerX}
                        y1={0}
                        y2={this.state.viewHeight}
                    />
                }
                case "y": {
                    let axisGuide = guide.guide as Prototypes.SnappingGuides.Axis;
                    return <line key={key} className="snapping-guide"
                        y1={-axisGuide.value * this.state.zoom.scale + this.state.zoom.centerY}
                        y2={-axisGuide.value * this.state.zoom.scale + this.state.zoom.centerY}
                        x1={0}
                        x2={this.state.viewWidth}
                    />
                }
            }
        });
    }

    public renderChartCanvas() {
        let chartState = this.props.store.chartState;
        let p1 = { x: -chartState.attributes["width"] / 2, y: -chartState.attributes["height"] / 2 };
        let p2 = { x: +chartState.attributes["width"] / 2, y: +chartState.attributes["height"] / 2 };
        let p1t = Geometry.applyZoom(this.state.zoom, p1);
        let p2t = Geometry.applyZoom(this.state.zoom, p2);
        return (
            <g>
                <rect
                    className="canvas-region-outer2"
                    x={Math.min(p1t.x, p2t.x) - 3} y={Math.min(p1t.y, p2t.y) - 3}
                    width={Math.abs(p2t.x - p1t.x) + 6}
                    height={Math.abs(p2t.y - p1t.y) + 6}
                />
                <rect
                    className="canvas-region-outer"
                    x={Math.min(p1t.x, p2t.x) - 1} y={Math.min(p1t.y, p2t.y) - 1}
                    width={Math.abs(p2t.x - p1t.x) + 2}
                    height={Math.abs(p2t.y - p1t.y) + 2}
                />
                <rect
                    className="canvas-region"
                    x={Math.min(p1t.x, p2t.x)} y={Math.min(p1t.y, p2t.y)}
                    width={Math.abs(p2t.x - p1t.x)}
                    height={Math.abs(p2t.y - p1t.y)}
                />
                <ResizeHandleView
                    zoom={this.state.zoom}
                    cx={(p1.x + p2.x) / 2}
                    cy={(p1.y + p2.y) / 2}
                    width={Math.abs(p2.x - p1.x)}
                    height={Math.abs(p2.y - p1.y)}
                    onResize={(newWidth, newHeight) => {
                        new Actions.SetChartSize(newWidth, newHeight).dispatch(this.props.store.dispatcher);
                    }}
                />
            </g>
        );
    }

    public renderDropZoneForMarkLayout(layout: Specification.PlotSegment, state: Specification.PlotSegmentState) {
        let cls = this.props.store.chartManager.getPlotSegmentClass(state);
        return cls.getDropZones()
            .filter(zone => {
                // We don't allow scale data mapping right now
                if (zone.dropAction.scaleInference) return false;

                if (this.state.dropZoneData) {
                    // Process dropzone filter
                    if (zone.accept) {
                        if (zone.accept.table != null) {
                            if (this.state.dropZoneData.data instanceof DragData.DataExpression) {
                                let data = this.state.dropZoneData.data as DragData.DataExpression;
                                if (data.table.name != zone.accept.table) return false;
                            } else {
                                return false;
                            }
                        }
                        if (zone.accept.kind != null) {
                        }
                        if (zone.accept.scaffolds) {
                            if (this.state.dropZoneData.layout) {
                                return zone.accept.scaffolds.indexOf(this.state.dropZoneData.layout.type) >= 0;
                            } else {
                                return false;
                            }
                        }
                        return true;
                    } else {
                        return this.state.dropZoneData.data instanceof DragData.DataExpression;
                    }
                } else {
                    return false;
                }
            })
            .map((zone, idx) => (
                <DropZoneView
                    key={`m${idx}`}
                    onDragEnter={(data: any) => {
                        let dropAction = zone.dropAction;
                        if (dropAction.axisInference) {
                            return (point: Point) => {
                                new Actions.BindDataToAxis(layout, dropAction.axisInference.property, dropAction.axisInference.appendToProperty, data).dispatch(this.props.store.dispatcher);
                                return true;
                            }
                        }
                        if (dropAction.extendPlotSegment) {
                            return (point: Point) => {
                                new Actions.ExtendPlotSegment(layout, data.type).dispatch(this.props.store.dispatcher);
                                return true;
                            }
                        }
                    }}
                    zone={zone}
                    zoom={this.state.zoom}
                />
            ));
    }

    public renderDropZones() {
        let { chart, chartState } = this.props.store;
        if (!this.state.dropZoneData) return null;
        return (
            <g>
                {zipArray(chart.elements, chartState.elements).filter(([e, eS]) => Prototypes.isType(e.classID, "plot-segment")).map(([layout, layoutState]: [Specification.PlotSegment, Specification.PlotSegmentState]) => {
                    return <g key={`m${layout._id}`}>{this.renderDropZoneForMarkLayout(layout, layoutState)}</g>;
                })}
            </g>
        );
    }

    public render() {
        let { store } = this.props;
        let width = this.state.viewWidth;
        let height = this.state.viewHeight;
        let transform = `translate(${this.state.zoom.centerX},${this.state.zoom.centerY}) scale(${this.state.zoom.scale})`;
        return (
            <div className="chart-editor-view">
                <div className="chart-editor-canvas-view" ref="canvasContainer">
                    <svg className="canvas-view" ref="canvas" x={0} y={0} width={width} height={height}>
                        <rect className="interaction-handler" ref="canvasInteraction" x={0} y={0} width={width} height={height} />
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
                    <Button icon="general/zoom-in" onClick={() => {
                        let { scale, centerX, centerY } = this.state.zoom;
                        let fixPoint = Geometry.unapplyZoom(this.state.zoom, { x: this.state.viewWidth / 2, y: this.state.viewHeight / 2 });
                        let newScale = scale * 1.1;
                        newScale = Math.min(20, Math.max(0.05, newScale));
                        this.setState({
                            zoom: {
                                centerX: centerX + (scale - newScale) * fixPoint.x,
                                centerY: centerY + (scale - newScale) * fixPoint.y,
                                scale: newScale
                            }
                        });
                    }} />
                    <Button icon="general/zoom-out" onClick={() => {
                        let { scale, centerX, centerY } = this.state.zoom;
                        let fixPoint = Geometry.unapplyZoom(this.state.zoom, { x: this.state.viewWidth / 2, y: this.state.viewHeight / 2 });
                        let newScale = scale / 1.1;
                        newScale = Math.min(20, Math.max(0.05, newScale));
                        this.setState({
                            zoom: {
                                centerX: centerX + (scale - newScale) * fixPoint.x,
                                centerY: centerY + (scale - newScale) * fixPoint.y,
                                scale: newScale
                            }
                        });
                    }} />
                    <Button icon="general/zoom-auto" onClick={() => {
                        let newZoom = this.getFitViewZoom(this.state.viewWidth, this.state.viewHeight);
                        if (!newZoom) return;
                        this.setState({
                            zoom: newZoom
                        });
                    }} />
                </div>
                {this.state.isSolving ? (
                    <div className="solving-hint" >
                        <div className="el-box"><img src={R.getSVGIcon("loading")} />Working...</div>
                    </div>
                ) : null}
            </div>
        );
    }
}