// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { Point } from "../../common";
import * as Graphics from "../../graphics";
import { ConstraintSolver } from "../../solver";
import * as Specification from "../../specification";
import { ChartClass } from "../charts";
import {
  BoundingBox,
  BuildConstraintsContext,
  DropZones,
  Handles,
  LinkAnchor,
  ObjectClass,
  SnappingGuides
} from "../common";
import { GlyphClass } from "../glyphs";
import { PlotSegmentClass } from "../plot_segments";
import { ChartStateManager } from "../state";

export interface CreationParameters {
  dropPoint: Point;
}

export abstract class MarkClass<
  PropertiesType extends Specification.AttributeMap = Specification.AttributeMap,
  AttributesType extends Specification.AttributeMap = Specification.AttributeMap
> extends ObjectClass<PropertiesType, AttributesType> {
  public readonly object: Specification.Element<PropertiesType>;
  public readonly state: Specification.MarkState<AttributesType>;

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
