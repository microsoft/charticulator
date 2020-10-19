// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import { Prototypes } from "../../../../core";
import { HandlesDragEvent } from "../handles/common";
import { SnappableGuide, SnappingAction } from "./common";

export class SnappingSession<ElementType> {
  public candidates: Array<SnappableGuide<ElementType>>;
  public handle: Prototypes.Handles.Description;
  public threshold: number;
  public findClosestSnappingGuide: boolean;

  public currentCandidates: Array<SnappableGuide<ElementType>>;

  constructor(
    guides: Array<SnappableGuide<ElementType>>,
    handle: Prototypes.Handles.Description,
    threshold: number,
    findClosest: boolean
  ) {
    this.handle = handle;
    this.threshold = threshold;
    this.candidates = [];
    this.currentCandidates = null;
    this.findClosestSnappingGuide = findClosest;

    switch (handle.type) {
      case "line":
        {
          const lineHandle = handle as Prototypes.Handles.Line;
          // Get all guides
          this.candidates = guides.filter(g => {
            return g.guide.type == lineHandle.axis;
          });
        }
        break;
      case "point":
        {
          // Get all guides
          this.candidates = guides.filter(g => {
            return g.guide.type == "x" || g.guide.type == "y";
          });
        }
        break;
    }
  }

  public handleDrag(e: HandlesDragEvent) {
    const EPSILON = 1e-5;
    switch (this.handle.type) {
      case "line":
        {
          let minGuide: SnappableGuide<ElementType> = null;
          let minDistance: number = null;
          for (const g of this.candidates) {
            const guide = g.guide as Prototypes.SnappingGuides.Axis;
            const d = Math.abs(guide.value - (e.value as number));
            if (
              d < this.threshold &&
              (minDistance == null || d < minDistance - EPSILON)
            ) {
              minDistance = d;
              minGuide = g;
            }
          }
          if (minGuide) {
            this.currentCandidates = [minGuide];
          } else {
            this.currentCandidates = null;
          }
        }
        break;
      case "point":
        {
          let minXGuide: SnappableGuide<ElementType> = null;
          let minXDistance: number = null;
          let minYGuide: SnappableGuide<ElementType> = null;
          let minYDistance: number = null;
          for (const g of this.candidates) {
            const guide = g.guide as Prototypes.SnappingGuides.Axis;
            if (this.findClosestSnappingGuide) {
              // Find closest point
              if (guide.type == "y") {
                const dY = Math.abs(guide.value - (e.y as number));
                if (dY < minYDistance || minYDistance == null) {
                  minYDistance = dY;
                  minYGuide = g;
                }
              } else if (guide.type == "x") {
                const dX = Math.abs(guide.value - (e.x as number));
                if (dX < minXDistance || minXDistance == null) {
                  minXDistance = dX;
                  minXGuide = g;
                }
              }
            } else {
              // Filter guides by threshold
              if (guide.type == "x") {
                const d = Math.abs(guide.value - (e.x as number));
                if (
                  d < this.threshold &&
                  (minXDistance == null || d < minXDistance - EPSILON)
                ) {
                  minXDistance = d;
                  minXGuide = g;
                }
              } else if (guide.type == "y") {
                const d = Math.abs(guide.value - (e.y as number));
                if (
                  d < this.threshold &&
                  (minYDistance == null || d < minYDistance - EPSILON)
                ) {
                  minYDistance = d;
                  minYGuide = g;
                }
              }
            }
          }
          this.currentCandidates = [];
          if (minXGuide) {
            this.currentCandidates.push(minXGuide);
          }
          if (minYGuide) {
            this.currentCandidates.push(minYGuide);
          }
        }
        break;
    }
  }

  public handleEnd(e: HandlesDragEvent): Array<SnappingAction<ElementType>> {
    const result: Array<SnappingAction<ElementType>> = [];

    for (const action of this.handle.actions) {
      const source = action.source || "value";
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
        case "attribute-value-mapping":
          {
            result.push({
              type: "value-mapping",
              attribute: action.attribute,
              value
            });
          }
          break;
        case "property":
          {
            result.push({
              type: "property",
              property: action.property,
              field: action.field,
              value
            });
          }
          break;
        case "attribute":
          {
            let didSnap = false;
            if (source == "value") {
              if (
                this.currentCandidates &&
                this.currentCandidates.length == 1
              ) {
                const candidate = this.currentCandidates[0];
                result.push({
                  type: "snap",
                  attribute: action.attribute,
                  snapElement: candidate.element,
                  snapAttribute: (candidate.guide as Prototypes.SnappingGuides.Axis)
                    .attribute
                });
                didSnap = true;
              }
            }
            if (source == "x" || source == "y") {
              for (const candidate of this.currentCandidates) {
                if (
                  source ==
                  (candidate.guide as Prototypes.SnappingGuides.Axis).type
                ) {
                  result.push({
                    type: "snap",
                    attribute: action.attribute,
                    snapElement: candidate.element,
                    snapAttribute: (candidate.guide as Prototypes.SnappingGuides.Axis)
                      .attribute
                  });
                  didSnap = true;
                }
              }
            }
            if (!didSnap) {
              result.push({
                type: "move",
                attribute: action.attribute,
                value
              });
            }
          }
          break;
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

  public getCurrentCandidates(): Array<SnappableGuide<ElementType>> {
    return this.currentCandidates;
  }
}
