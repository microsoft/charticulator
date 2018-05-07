import { Specification, Prototypes, zipArray, zip, Solver, Point, Geometry, ZoomInfo } from "../../../core";
import { HandlesDragEvent } from "./handles";
import { Actions } from "../../actions";

export interface SnappableGuide<ElementType> {
    element: ElementType;
    guide: Prototypes.SnappingGuides.Description;
}

export interface SnappingAction<ElementType> {
    type: "snap" | "move" | "property" | "value-mapping";
    attribute?: string;
    property?: string;
    field?: string | string[];

    // move
    value?: Specification.AttributeValue;

    // snap
    snapElement?: ElementType;
    snapAttribute?: string;
}

export class SnappingSession<ElementType> {
    public candidates: SnappableGuide<ElementType>[];
    public handle: Prototypes.Handles.Description;
    public threshold: number;

    public currentCandidates: SnappableGuide<ElementType>[];

    constructor(guides: SnappableGuide<ElementType>[], handle: Prototypes.Handles.Description, threshold: number) {
        this.handle = handle;
        this.threshold = threshold;
        this.candidates = [];
        this.currentCandidates = null;

        switch (handle.type) {
            case "line": {
                let lineHandle = handle as Prototypes.Handles.Line;
                // Get all guides
                this.candidates = guides.filter(g => {
                    return g.guide.type == lineHandle.axis;
                });
            } break;
            case "point": {
                // Get all guides
                this.candidates = guides.filter(g => {
                    return (g.guide.type == "x" || g.guide.type == "y");
                });
            } break;
        }
    }

    public handleDrag(e: HandlesDragEvent) {
        let EPSILON = 1e-5;
        switch (this.handle.type) {
            case "line": {
                let minGuide: SnappableGuide<ElementType> = null;
                let minDistance: number = null;
                for (let g of this.candidates) {
                    let guide = g.guide as Prototypes.SnappingGuides.Axis;
                    let d = Math.abs(guide.value - (e.value as number));
                    if (d < this.threshold && (minDistance == null || d < minDistance - EPSILON)) {
                        minDistance = d;
                        minGuide = g;
                    }
                }
                if (minGuide) {
                    this.currentCandidates = [minGuide];
                } else {
                    this.currentCandidates = null;
                }
            } break;
            case "point": {
                let minXGuide: SnappableGuide<ElementType> = null;
                let minXDistance: number = null;
                let minYGuide: SnappableGuide<ElementType> = null;
                let minYDistance: number = null;
                for (let g of this.candidates) {
                    let guide = g.guide as Prototypes.SnappingGuides.Axis;
                    if (guide.type == "x") {
                        let d = Math.abs(guide.value - (e.x as number));
                        if (d < this.threshold && (minXDistance == null || d < minXDistance - EPSILON)) {
                            minXDistance = d;
                            minXGuide = g;
                        }
                    }
                    if (guide.type == "y") {
                        let d = Math.abs(guide.value - (e.y as number));
                        if (d < this.threshold && (minYDistance == null || d < minYDistance - EPSILON)) {
                            minYDistance = d;
                            minYGuide = g;
                        }
                    }
                }
                this.currentCandidates = [];
                if (minXGuide) this.currentCandidates.push(minXGuide);
                if (minYGuide) this.currentCandidates.push(minYGuide);
            } break;
        }
    }

    public handleEnd(e: HandlesDragEvent): SnappingAction<ElementType>[] {
        let result: SnappingAction<ElementType>[] = [];

        for (let action of this.handle.actions) {
            let source = action.source || "value";
            if (e[source] === undefined) {
                continue;
            }
            let value = e[source];
            if (action.minimum != null) {
                value = Math.max(action.minimum, value as number);
            }
            if (action.maximum != null) {
                value = Math.min(action.maximum, value as number);
            }
            switch (action.type) {
                case "attribute-value-mapping": {
                    result.push({
                        type: "value-mapping",
                        attribute: action.attribute,
                        value: value
                    });
                } break;
                case "property": {
                    result.push({
                        type: "property",
                        property: action.property,
                        field: action.field,
                        value: value
                    });
                } break;
                case "attribute": {
                    let didSnap = false;
                    if (source == "value") {
                        if (this.currentCandidates && this.currentCandidates.length == 1) {
                            let candidate = this.currentCandidates[0];
                            result.push({
                                type: "snap",
                                attribute: action.attribute,
                                snapElement: candidate.element,
                                snapAttribute: (candidate.guide as Prototypes.SnappingGuides.Axis).attribute
                            });
                            didSnap = true;
                        }
                    }
                    if (source == "x" || source == "y") {
                        for (let candidate of this.currentCandidates) {
                            if (source == (candidate.guide as Prototypes.SnappingGuides.Axis).type) {
                                result.push({
                                    type: "snap",
                                    attribute: action.attribute,
                                    snapElement: candidate.element,
                                    snapAttribute: (candidate.guide as Prototypes.SnappingGuides.Axis).attribute
                                });
                                didSnap = true;
                            }
                        }
                    }
                    if (!didSnap) {
                        result.push({
                            type: "move",
                            attribute: action.attribute,
                            value: value
                        });
                    }
                } break;
            }
        }

        // switch (this.handle.type) {
        //     case "line": {
        //         let lineBound = this.handle as Prototypes.Handles.Line;
        //         if (this.currentCandidates && this.currentCandidates.length == 1) {
        //             let candidate = this.currentCandidates[0];
        //             result.push({
        //                 type: "snap",
        //                 attribute: lineBound.attribute,
        //                 snapElement: candidate.element,
        //                 snapAttribute: (candidate.guide as Prototypes.SnappingGuides.Axis).attribute
        //             });
        //         } else {
        //             result.push({
        //                 type: "move",
        //                 attribute: lineBound.attribute,
        //                 value: e.newValue
        //             });
        //         }
        //     } break;
        //     case "relative-line": {
        //         let relativeLine = this.handle as Prototypes.Handles.RelativeLine;
        //         result.push({
        //             type: "move",
        //             attribute: relativeLine.attribute,
        //             value: e.newValue
        //         });
        //     } break;
        //     case "point": {
        //         let pointBound = this.handle as Prototypes.Handles.Point;
        //         let didX: boolean = false;
        //         let didY: boolean = false;
        //         if (this.currentCandidates) {
        //             for (let candidate of this.currentCandidates) {
        //                 let attr: string;
        //                 switch ((candidate.guide as Prototypes.SnappingGuides.Axis).type) {
        //                     case "x": {
        //                         didX = true;
        //                         attr = pointBound.xAttribute;
        //                     } break;
        //                     case "y": {
        //                         didY = true;
        //                         attr = pointBound.yAttribute;
        //                     } break;
        //                 }
        //                 result.push({
        //                     type: "snap",
        //                     attribute: attr,
        //                     snapElement: candidate.element,
        //                     snapAttribute: (candidate.guide as Prototypes.SnappingGuides.Axis).attribute
        //                 });
        //             }
        //             if (!didX) {
        //                 result.push({
        //                     type: "move",
        //                     attribute: pointBound.xAttribute,
        //                     value: e.newXValue
        //                 });
        //             }
        //             if (!didY) {
        //                 result.push({
        //                     type: "move",
        //                     attribute: pointBound.yAttribute,
        //                     value: e.newYValue
        //                 });
        //             }
        //         }
        //     } break;
        // }
        return result;
    }

    public getCurrentCandidates(): SnappableGuide<ElementType>[] {
        return this.currentCandidates;
    }
}

export class MoveSnappingSession extends SnappingSession<void> {
    constructor(handle: Prototypes.Handles.Description) {
        super([], handle, 10);
    }

    public getUpdates(actions: SnappingAction<void>[]) {
        let updates: { [name: string]: Specification.AttributeValue } = {};
        for (let action of actions) {
            updates[action.attribute] = action.value;
        }
        return updates;
    }
}

export type MarkSnappableGuide = SnappableGuide<Specification.Element>;

export class MarkSnappingSession extends SnappingSession<Specification.Element> {
    public mark: Specification.Glyph;
    public element: Specification.Element;

    constructor(guides: SnappableGuide<Specification.Element>[], mark: Specification.Glyph, element: Specification.Element, elementState: Specification.MarkState, bound: Prototypes.Handles.Description, threshold: number) {
        super(guides.filter(x => x.element != element), bound, threshold);

        this.mark = mark;
        this.element = element;
    }

    public getActions(actions: SnappingAction<Specification.Element>[]): Actions.Action {
        let g = new Actions.MarkActionGroup();
        let updates: { [name: string]: Specification.AttributeValue } = {};
        let hasUpdates = false;
        for (let action of actions) {
            switch (action.type) {
                case "snap": {
                    if (action.snapElement == null) {
                        g.add(new Actions.SetMarkAttribute(this.mark, this.element, action.attribute, {
                            type: "parent",
                            parentAttribute: action.snapAttribute
                        } as Specification.ParentMapping));
                    } else {
                        g.add(new Actions.SnapMarks(this.mark,
                            this.element, action.attribute,
                            action.snapElement, action.snapAttribute
                        ));
                    }
                } break;
                case "move": {
                    updates[action.attribute] = action.value;
                    hasUpdates = true;
                } break;
                case "property": {
                    g.add(new Actions.SetObjectProperty(this.element, action.property, action.field, action.value));
                } break;
                case "value-mapping": {
                    g.add(new Actions.SetMarkAttribute(this.mark, this.element, action.attribute, { type: "value", value: action.value } as Specification.ValueMapping));
                } break;
            }
        }
        if (hasUpdates) {
            g.add(new Actions.UpdateMarkAttribute(this.mark, this.element, updates));
        }
        // console.log(g);
        return g;
    }
}

export type ChartSnappableGuide = SnappableGuide<Specification.ChartElement>;

export class ChartSnappingSession extends SnappingSession<Specification.ChartElement> {
    public markLayout: Specification.ChartElement;

    constructor(guides: SnappableGuide<Specification.ChartElement>[], markLayout: Specification.ChartElement, bound: Prototypes.Handles.Description, threshold: number) {
        super(guides.filter(x => x.element != markLayout), bound, threshold);
        this.markLayout = markLayout;
    }

    public getActions(actions: SnappingAction<Specification.ChartElement>[]): Actions.Action[] {
        let result: Actions.Action[] = [];
        for (let action of actions) {
            switch (action.type) {
                case "snap": {
                    if (action.snapElement == null) {
                        result.push(new Actions.SetChartElementMapping(this.markLayout, action.attribute, {
                            type: "parent",
                            parentAttribute: action.snapAttribute
                        } as Specification.ParentMapping));
                    } else {
                        result.push(new Actions.SnapChartElements(
                            this.markLayout, action.attribute,
                            action.snapElement, action.snapAttribute
                        ));
                    }
                } break;
                case "move": {
                    let updates: { [name: string]: Specification.AttributeValue } = {};
                    updates[action.attribute] = action.value;
                    result.push(new Actions.UpdateChartElementAttribute(this.markLayout, updates));
                } break;
                case "property": {
                    result.push(new Actions.SetObjectProperty(this.markLayout, action.property, action.field, action.value));
                } break;
                case "value-mapping": {
                    result.push(new Actions.SetChartElementMapping(this.markLayout, action.attribute, { type: "value", value: action.value } as Specification.ValueMapping));
                } break;
            }
        }
        return result;
    }
}