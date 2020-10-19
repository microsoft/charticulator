// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import * as Expression from "../expression";
import * as Graphics from "../graphics";
import { ConstraintSolver } from "../solver";
import * as Specification from "../specification";
import { ChartClass } from "./charts";
import {
  BoundingBox,
  Controls,
  DropZones,
  Handles,
  SnappingGuides
} from "./common";
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

export abstract class ChartElementClass<
  PropertiesType extends Specification.AttributeMap = Specification.AttributeMap,
  AttributesType extends Specification.AttributeMap = Specification.AttributeMap
> extends ObjectClass<PropertiesType, AttributesType> {
  public readonly object: Specification.ChartElement<PropertiesType>;
  public readonly state: Specification.ChartElementState<AttributesType>;
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
