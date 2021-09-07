// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import {
  setField,
  Solver,
  zipArray,
  Specification,
  Expression,
} from "../../../core";
import { DataKind } from "../../../core/dataset";
import { MappingType } from "../../../core/specification";
import { Actions } from "../../actions";
import { AppStore } from "../app_store";
import { ActionHandlerRegistry } from "./registry";

// eslint-disable-next-line
export default function (REG: ActionHandlerRegistry<AppStore, Actions.Action>) {
  // Internal registry of mark-level action handlers
  const MR = new ActionHandlerRegistry<AppStore, Actions.MarkAction>();

  MR.add(Actions.UpdateMarkAttribute, function (action) {
    for (const key in action.updates) {
      if (!Object.prototype.hasOwnProperty.call(action.updates, key)) {
        continue;
      }
      delete action.mark.mappings[key];

      action.glyph.constraints = action.glyph.constraints.filter((c) => {
        if (c.type == "snap") {
          if (
            c.attributes.element == action.mark._id &&
            c.attributes.attribute == key
          ) {
            return false;
          }
        }
        return true;
      });
    }

    this.forAllGlyph(action.glyph, (glyphState) => {
      for (const [mark, markState] of zipArray(
        action.glyph.marks,
        glyphState.marks
      )) {
        if (mark == action.mark) {
          for (const key in action.updates) {
            if (!Object.prototype.hasOwnProperty.call(action.updates, key)) {
              continue;
            }
            markState.attributes[key] = action.updates[key];
            this.addPresolveValue(
              Solver.ConstraintStrength.WEAK,
              markState.attributes,
              key,
              action.updates[key] as number
            );
          }
        }
      }
    });
  });

  MR.add(Actions.SetObjectProperty, function (this, action) {
    // check name property. Names of objects are unique
    if (
      action.property === "name" &&
      this.chartManager.isNameUsed(action.value as string)
    ) {
      return;
    }
    if (action.field == null) {
      action.object.properties[action.property] = action.value;
    } else {
      const obj = action.object.properties[action.property];
      action.object.properties[action.property] = setField(
        obj,
        action.field,
        action.value
      );
    }
  });

  MR.add(Actions.SetMarkAttribute, function (this, action) {
    if (action.mapping == null) {
      delete action.mark.mappings[action.attribute];
    } else {
      action.mark.mappings[action.attribute] = action.mapping;
      action.glyph.constraints = action.glyph.constraints.filter((c) => {
        if (c.type == "snap") {
          if (
            c.attributes.element == action.mark._id &&
            c.attributes.attribute == action.attribute
          ) {
            return false;
          }
        }
        return true;
      });
    }
  });

  MR.add(Actions.UnmapMarkAttribute, function (this, action) {
    delete action.mark.mappings[action.attribute];
  });

  MR.add(Actions.SnapMarks, function (action) {
    const idx1 = action.glyph.marks.indexOf(action.mark);
    if (idx1 < 0) {
      return;
    }
    // let elementState = this.markState.elements[idx1];
    const idx2 = action.glyph.marks.indexOf(action.targetMark);
    if (idx2 < 0) {
      return;
    }
    // let targetElementState = this.markState.elements[idx2];
    // elementState.attributes[action.attribute] = targetElementState.attributes[action.targetAttribute];
    // Remove any existing attribute mapping
    delete action.mark.mappings[action.attribute];
    // Remove any existing snapping
    action.glyph.constraints = action.glyph.constraints.filter((c) => {
      if (c.type == "snap") {
        if (
          c.attributes.element == action.mark._id &&
          c.attributes.attribute == action.attribute
        ) {
          return false;
        }
      }
      return true;
    });
    action.glyph.constraints.push({
      type: "snap",
      attributes: {
        element: action.mark._id,
        attribute: action.attribute,
        targetElement: action.targetMark._id,
        targetAttribute: action.targetAttribute,
        gap: 0,
      },
    });

    // Force the states to be equal
    this.forAllGlyph(action.glyph, (glyphState) => {
      const elementState = glyphState.marks[idx1];
      const targetElementState = glyphState.marks[idx2];
      elementState.attributes[action.attribute] =
        targetElementState.attributes[action.targetAttribute];
      this.addPresolveValue(
        Solver.ConstraintStrength.STRONG,
        elementState.attributes,
        action.attribute,
        targetElementState.attributes[action.targetAttribute] as number
      );
    });
  });

  MR.add(Actions.MarkActionGroup, function (action) {
    for (const item of action.actions) {
      // Recursively handle group actions
      MR.handleAction(this, item);
    }
  });

  // The entry point for mark actions
  REG.add(Actions.MarkAction, function (this, mainAction) {
    this.saveHistory();

    MR.handleAction(this, mainAction);

    // Solve constraints only after all actions are processed
    this.solveConstraintsAndUpdateGraphics();
  });

  REG.add(Actions.MapDataToMarkAttribute, function (action) {
    this.saveHistory();

    const inferred =
      (action.hints && action.hints.scaleID) ||
      this.scaleInference(
        { glyph: action.glyph },
        {
          expression: action.expression,
          valueType: action.valueType,
          valueKind: action.valueMetadata.kind,
          outputType: action.attributeType,
          hints: action.hints,
          markAttribute: action.attribute,
        }
      );
    if (inferred != null) {
      action.mark.mappings[action.attribute] = {
        type: MappingType.scale,
        table: action.glyph.table,
        expression: action.expression,
        valueType: action.valueType,
        scale: inferred,
        attribute: action.attribute,
        valueIndex:
          action.hints && action.hints.allowSelectValue != undefined ? 0 : null,
      } as Specification.ScaleMapping;
      if (
        !this.chart.scaleMappings.find(
          (scaleMapping) => scaleMapping.scale === inferred
        )
      ) {
        this.chart.scaleMappings.push({
          ...action.mark.mappings[action.attribute],
          attribute: action.attribute,
        } as Specification.ScaleMapping);
      }
    } else {
      if (
        (action.valueType == Specification.DataType.Boolean ||
          action.valueType == Specification.DataType.String ||
          action.valueType == Specification.DataType.Number) &&
        action.attributeType == Specification.AttributeType.Text
      ) {
        let format: string;
        // don't apply format to numbers if data kind is categorical to draw as are
        if (action.valueMetadata.kind === DataKind.Categorical) {
          format = undefined;
        } else {
          // If the valueType is a number and kind is not categorical, use a format
          format =
            action.valueType == Specification.DataType.Number
              ? ".1f"
              : undefined;
        }
        action.mark.mappings[action.attribute] = {
          type: MappingType.text,
          table: action.glyph.table,
          textExpression: new Expression.TextExpression([
            { expression: Expression.parse(action.expression), format },
          ]).toString(),
        } as Specification.TextMapping;
      }
    }

    this.solveConstraintsAndUpdateGraphics();
  });
}
