/*
Copyright (c) Microsoft Corporation. All rights reserved.
Licensed under the MIT license.
*/
import * as Expression from "../../expression";
import * as Graphics from "../../graphics";
import * as Specification from "../../specification";

import { Point, uniqueID } from "../../common";
import { ConstraintSolver, ConstraintStrength } from "../../solver";
import {
  AttributeDescription,
  BoundingBox,
  BuildConstraintsContext,
  DropZones,
  Handles,
  LinkAnchor,
  ObjectClass,
  SnappingGuides
} from "../common";

import { ChartStateManager } from "../state";

export interface CreationParameters {
  dropPoint: Point;
}

export abstract class MarkClass extends ObjectClass {
  public readonly object: Specification.Element;
  public readonly state: Specification.MarkState;

  /** Fill the default state */
  public initializeState(): void {}

  /** Get intrinsic constraints between attributes (e.g., x2 - x1 = width for rectangles) */
  public buildConstraints(
    solver: ConstraintSolver,
    context: BuildConstraintsContext
  ): void {}

  /** Get the graphical element from the element */
  public getGraphics(
    coordinateSystem: Graphics.CoordinateSystem,
    offset: Point,
    glyphIndex: number,
    manager: ChartStateManager,
    emphasized?: boolean
  ): Graphics.Element {
    return null;
  }

  /** Get DropZones given current state */
  public getDropZones(): DropZones.Description[] {
    return [];
  }

  /** Get link anchors for this mark */
  public getLinkAnchors(mode: "begin" | "end"): LinkAnchor.Description[] {
    return [];
  }

  /** Get handles given current state */
  public getHandles(): Handles.Description[] {
    return [];
  }

  /** Get bounding box */
  public getBoundingBox(): BoundingBox.Description {
    return null;
  }

  /** Get alignment guides */
  public getSnappingGuides(): SnappingGuides.Description[] {
    return [];
  }

  public getGlyphClass() {
    return this.parent as GlyphClass;
  }

  public getPlotSegmentClass() {
    return this.parent.parent as PlotSegmentClass;
  }

  public getChartClass() {
    return this.parent.parent.parent as ChartClass;
  }
}

import "./anchor";
// import "./textbox";
import "./dataAxis";
import "./line";
import "./rect";
import "./symbol";
import "./text";
import "./image";
import "./nested_chart";
import { GlyphClass } from "../glyphs";
import { PlotSegmentClass } from "../plot_segments";
import { ChartClass } from "../charts";

export { AnchorElementAttributes, AnchorElement } from "./anchor";
export { SymbolElementAttributes, SymbolElement } from "./symbol";
export { RectElementAttributes, RectElement } from "./rect";
export { LineElementAttributes, LineElement } from "./line";
export { TextElementAttributes, TextElement } from "./text";
