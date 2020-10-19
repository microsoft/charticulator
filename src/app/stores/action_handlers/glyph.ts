// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { Solver, Specification } from "../../../core";
import { Actions } from "../../actions";
import { AppStore } from "../app_store";
import { GlyphSelection, MarkSelection } from "../selection";
import { ActionHandlerRegistry } from "./registry";

export default function(REG: ActionHandlerRegistry<AppStore, Actions.Action>) {
  REG.add(Actions.AddGlyph, function(action) {
    this.saveHistory();
    const glyph = this.chartManager.addGlyph(
      action.classID,
      this.dataset.tables[0].name
    );
    this.currentSelection = new GlyphSelection(null, glyph);
    this.currentGlyph = glyph;
    this.solveConstraintsAndUpdateGraphics();
  });

  REG.add(Actions.RemoveGlyph, function(action) {
    this.saveHistory();
    const glyph = this.chartManager.removeGlyph(action.glyph);
    this.currentSelection = null;
    this.currentGlyph = null;
    this.solveConstraintsAndUpdateGraphics();
  });

  REG.add(Actions.SetGlyphAttribute, function(action) {
    this.saveHistory();

    if (action.mapping == null) {
      delete action.glyph.mappings[action.attribute];
    } else {
      action.glyph.mappings[action.attribute] = action.mapping;
    }

    this.solveConstraintsAndUpdateGraphics();
  });

  REG.add(Actions.UpdateGlyphAttribute, function(action) {
    this.saveHistory();

    for (const key in action.updates) {
      if (!action.updates.hasOwnProperty(key)) {
        continue;
      }
      delete action.glyph.mappings[key];
    }
    this.forAllGlyph(action.glyph, glyphState => {
      for (const key in action.updates) {
        if (!action.updates.hasOwnProperty(key)) {
          continue;
        }
        glyphState.attributes[key] = action.updates[key];
        this.addPresolveValue(
          Solver.ConstraintStrength.STRONG,
          glyphState.attributes,
          key,
          action.updates[key] as number
        );
      }
    });

    this.solveConstraintsAndUpdateGraphics();
  });

  REG.add(Actions.AddMarkToGlyph, function(action) {
    this.saveHistory();

    const mark = this.chartManager.createObject(
      action.classID
    ) as Specification.Element;

    for (const key in action.properties) {
      mark.properties[key] = action.properties[key];
    }

    // Make sure name don't duplicate
    if (this.chartManager.isNameUsed(mark.properties.name)) {
      mark.properties.name = this.chartManager.findUnusedName(
        mark.properties.name
      );
    }

    const isFirstMark = action.glyph.marks.length == 1;

    this.chartManager.addMarkToGlyph(mark, action.glyph);

    let attributesSet = false;
    for (const attr in action.mappings) {
      if (action.mappings.hasOwnProperty(attr)) {
        const [value, mapping] = action.mappings[attr];
        if (mapping != null) {
          if (mapping.type == "_element") {
            action.glyph.constraints.push({
              type: "snap",
              attributes: {
                element: mark._id,
                attribute: attr,
                targetElement: (mapping as any).element,
                targetAttribute: (mapping as any).attribute,
                gap: 0
              }
            });
          } else {
            mark.mappings[attr] = mapping;
          }
        }
        if (value != null) {
          const idx = action.glyph.marks.indexOf(mark);
          this.forAllGlyph(action.glyph, glyphState => {
            glyphState.marks[idx].attributes[attr] = value;
            this.addPresolveValue(
              Solver.ConstraintStrength.STRONG,
              glyphState.marks[idx].attributes,
              attr,
              value
            );
          });
        }
        attributesSet = true;
      }
    }
    // Logic for first marks
    if (!attributesSet) {
      switch (action.classID) {
        case "mark.rect":
        case "mark.nested-chart":
        case "mark.textbox":
        case "mark.image":
          {
            mark.mappings.x1 = {
              type: "parent",
              parentAttribute: "ix1"
            } as Specification.ParentMapping;
            mark.mappings.y1 = {
              type: "parent",
              parentAttribute: "iy1"
            } as Specification.ParentMapping;
            mark.mappings.x2 = {
              type: "parent",
              parentAttribute: "ix2"
            } as Specification.ParentMapping;
            mark.mappings.y2 = {
              type: "parent",
              parentAttribute: "iy2"
            } as Specification.ParentMapping;
            // Move anchor to bottom
            // action.glyph.marks[0].mappings["y"] = <Specification.ParentMapping>{ type: "parent", parentAttribute: "iy1" };
          }
          break;
        case "mark.line":
          {
            mark.mappings.x1 = {
              type: "parent",
              parentAttribute: "ix1"
            } as Specification.ParentMapping;
            mark.mappings.y1 = {
              type: "parent",
              parentAttribute: "iy1"
            } as Specification.ParentMapping;
            mark.mappings.x2 = {
              type: "parent",
              parentAttribute: "ix2"
            } as Specification.ParentMapping;
            mark.mappings.y2 = {
              type: "parent",
              parentAttribute: "iy2"
            } as Specification.ParentMapping;
          }
          break;
        case "mark.symbol":
        case "mark.text":
        case "mark.icon":
          {
            mark.mappings.x = {
              type: "parent",
              parentAttribute: "icx"
            } as Specification.ParentMapping;
            mark.mappings.y = {
              type: "parent",
              parentAttribute: "icy"
            } as Specification.ParentMapping;
          }
          break;
        case "mark.data-axis":
          {
            mark.mappings.x1 = {
              type: "parent",
              parentAttribute: "ix1"
            } as Specification.ParentMapping;
            mark.mappings.y1 = {
              type: "parent",
              parentAttribute: "iy1"
            } as Specification.ParentMapping;
            mark.mappings.x2 = {
              type: "parent",
              parentAttribute: "ix1"
            } as Specification.ParentMapping;
            mark.mappings.y2 = {
              type: "parent",
              parentAttribute: "iy2"
            } as Specification.ParentMapping;
          }
          break;
      }
    }

    if (action.classID == "mark.nested-chart") {
      // Add column names to the mark
      const columnNameMap: { [name: string]: string } = {};
      for (const column of this.getTable(action.glyph.table).columns) {
        columnNameMap[column.name] = column.name;
      }
      mark.properties.columnNameMap = columnNameMap;
    }

    this.currentSelection = new MarkSelection(
      this.findPlotSegmentForGlyph(action.glyph),
      action.glyph,
      action.glyph.marks[action.glyph.marks.length - 1]
    );
    this.currentGlyph = action.glyph;
    this.solveConstraintsAndUpdateGraphics();
    this.emit(AppStore.EVENT_SELECTION);
  });

  REG.add(Actions.RemoveMarkFromGlyph, function(action) {
    this.saveHistory();

    // We never delete the anchor
    if (action.mark.classID == "mark.anchor") {
      return;
    }

    this.chartManager.removeMarkFromGlyph(action.mark, action.glyph);

    this.currentSelection = null;
    this.emit(AppStore.EVENT_SELECTION);

    this.solveConstraintsAndUpdateGraphics();
  });
}
