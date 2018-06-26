import { getById, Point, uniqueID } from "../../common";
import * as Graphics from "../../graphics";
import { ConstraintSolver, ConstraintStrength } from "../../solver";
import * as Specification from "../../specification";
import { BuildConstraintsContext, ChartElementClass } from "../chart_element";

import {
  AttributeDescription,
  BoundingBox,
  Controls,
  DropZones,
  Handles,
  ObjectClass,
  SnappingGuides
} from "../common";

export abstract class PlotSegmentClass extends ChartElementClass {
  public readonly object: Specification.PlotSegment;
  public readonly state: Specification.PlotSegmentState;

  /** Fill the layout's default state */
  public initializeState(): void {}

  /** Get intrinsic constraints between attributes (e.g., x2 - x1 = width for rectangles) */
  public buildConstraints(
    solver: ConstraintSolver,
    context: BuildConstraintsContext
  ): void {}

  /** Get the graphics that represent this layout */
  public getPlotSegmentGraphics(
    glyphGraphics: Graphics.Element,
    manager: ChartStateManager
  ): Graphics.Element {
    return Graphics.makeGroup([glyphGraphics, this.getGraphics(manager)]);
  }

  public getCoordinateSystem(): Graphics.CoordinateSystem {
    return new Graphics.CartesianCoordinates();
  }

  /** Get DropZones given current state */
  public getDropZones(): DropZones.Description[] {
    return [];
  }

  /** Get handles given current state */
  public getHandles(): Handles.Description[] {
    return null;
  }

  public getBoundingBox(): BoundingBox.Description {
    return null;
  }

  public static createDefault(
    glyph: Specification.Glyph
  ): Specification.PlotSegment {
    const plotSegment = super.createDefault() as Specification.PlotSegment;
    plotSegment.glyph = glyph._id;
    plotSegment.table = glyph.table;
    return plotSegment;
  }
}

import { ChartStateManager } from "..";
import "./line";
import "./map";
import "./region_2d";

export {
  Region2DAttributes,
  CartesianPlotSegment,
  CurvePlotSegment,
  PolarPlotSegment
} from "./region_2d";
export { LineGuideAttributes } from "./line";
export { defaultAxisStyle } from "./axis";
