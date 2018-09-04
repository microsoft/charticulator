import * as Dataset from "../dataset";
import * as Expression from "../expression";
import * as Graphics from "../graphics";
import { ConstraintSolver } from "../solver";
import * as Specification from "../specification";
import { ChartClass } from "./charts";
import { Handles } from "./common";
import { BoundingBox, DropZones, SnappingGuides } from "./common";
import { Controls } from "./common";
import { ObjectClass } from "./object";
import { ChartStateManager } from "./state";

export interface BuildConstraintsContext {
  rowContext?: Expression.Context;
  getExpressionValue?(
    expr: string,
    context: Expression.Context
  ): Specification.AttributeValue;
  getGlyphAttributes?(
    glyph: string,
    table: string,
    rowIndices: number[]
  ): { [name: string]: number };
}

export abstract class ChartElementClass extends ObjectClass {
  public readonly object: Specification.ChartElement;
  public readonly state: Specification.ChartElementState;
  public readonly parent: ChartClass;

  /** Get intrinsic constraints between attributes (e.g., x2 - x1 = width for rectangles) */
  public buildConstraints(
    solver: ConstraintSolver,
    context: BuildConstraintsContext
  ): void {}

  /** Get the graphics that represent this layout */
  public getGraphics(manager: ChartStateManager): Graphics.Element {
    return null;
  }

  /** Get handles given current state */
  public getHandles(): Handles.Description[] {
    return [];
  }

  public getBoundingBox(): BoundingBox.Description {
    return null;
  }

  public getSnappingGuides(): SnappingGuides.Description[] {
    return [];
  }

  public getDropZones(): DropZones.Description[] {
    return [];
  }

  /** Get controls given current state */
  public getPopupEditor(manager: Controls.WidgetManager): Controls.PopupEditor {
    return null;
  }

  public static createDefault(...args: any[]): Specification.ChartElement {
    const element = super.createDefault(...args) as Specification.ChartElement;
    return element;
  }
}
