import { deepClone, EventEmitter, Expression, setField } from "../../core";

import {
  Dataset,
  getById,
  getByName,
  indexOf,
  Prototypes,
  Specification,
  uniqueID,
  zipArray
} from "../../core";
import { Graphics, Scale, Solver } from "../../core";

import { Actions } from "../actions";

import { ChartTemplateBuilder } from "../template";
import { BaseStore } from "./base";
import { DatasetStore } from "./dataset";
import { MainStore } from "./main_store";
import { GlyphStore } from "./mark";

export abstract class Selection {}

export class ChartElementSelection extends Selection {
  /** Create a mark layout selection
   *
   * @param chartElement the selected mark layout
   * @param glyphIndex if specified, select the mark at the specified index
   */
  constructor(
    public chartElement: Specification.ChartElement,
    public glyphIndex: number = null
  ) {
    super();
  }
}

export class GlyphSelection extends Selection {
  constructor(
    public glyph: Specification.Glyph,
    public dataRowIndex: number = null
  ) {
    super();
  }
}

export class MarkSelection extends Selection {
  constructor(
    public glyph: Specification.Glyph,
    public mark: Specification.Element
  ) {
    super();
  }
}

export interface ChartStoreState {
  chart: Specification.Chart;
  chartState: Specification.ChartState;
}

export interface SelectionState {
  type: string;
  chartElementID?: string;
  glyphID?: string;
  markID?: string;
  glyphIndex?: number;
}

export interface ChartStoreStateSolverStatus {
  solving: boolean;
}

export class ChartStore extends BaseStore {
  /** Fires when the chart state changes */
  public static EVENT_GRAPHICS = "graphics";
  /** Fires when the selection changes */
  public static EVENT_SELECTION = "selection";
  /** Fires when the current tool changes */
  public static EVENT_CURRENT_TOOL = "current-tool";
  /** Fires when solver status changes */
  public static EVENT_SOLVER_STATUS = "solver-status";

  public readonly parent: MainStore;

  public chart: Specification.Chart;
  public chartState: Specification.ChartState;
  public datasetStore: DatasetStore;
  public markStores: GlyphStore[];

  public currentSelection: Selection;
  public currentTool: string;
  public currentToolOptions: string;

  public chartManager: Prototypes.ChartStateManager;

  public solverStatus: ChartStoreStateSolverStatus;

  constructor(parent: MainStore) {
    super(parent);

    this.datasetStore = parent.datasetStore;

    this.solverStatus = {
      solving: false
    };

    this.newChartEmpty();
    this.updateMarkStores();
    this.solveConstraintsAndUpdateGraphics();

    const token = this.datasetStore.addListener(
      DatasetStore.EVENT_CHANGED,
      () => {
        this.newChartEmpty();
        this.updateMarkStores();
        this.emit(ChartStore.EVENT_CURRENT_TOOL);
        this.emit(ChartStore.EVENT_SELECTION);
        this.solveConstraintsAndUpdateGraphics();
      }
    );
  }

  public saveState(): ChartStoreState {
    return {
      chart: this.chart,
      chartState: this.chartState
    };
  }

  public saveSelectionState(): SelectionState {
    let selection: SelectionState = null;
    if (this.currentSelection instanceof ChartElementSelection) {
      selection = {
        type: "chart-element",
        chartElementID: this.currentSelection.chartElement._id,
        glyphIndex: this.currentSelection.glyphIndex
      };
    }
    if (this.currentSelection instanceof GlyphSelection) {
      selection = {
        type: "glyph",
        glyphID: this.currentSelection.glyph._id
      };
    }
    if (this.currentSelection instanceof MarkSelection) {
      selection = {
        type: "mark",
        glyphID: this.currentSelection.glyph._id,
        markID: this.currentSelection.mark._id
      };
    }
    return selection;
  }

  public loadState(state: ChartStoreState) {
    this.currentSelection = null;
    this.emit(ChartStore.EVENT_SELECTION);

    this.chart = state.chart;
    this.chartState = state.chartState;

    this.chartManager = new Prototypes.ChartStateManager(
      this.chart,
      this.datasetStore.dataset
    );
    this.chartManager.setState(this.chartState);
    this.chartState = this.chartManager.chartState;

    this.updateMarkStores();

    this.emit(ChartStore.EVENT_GRAPHICS);
    this.emit(ChartStore.EVENT_SELECTION);
  }

  public loadSelectionState(selection: SelectionState) {
    if (selection != null) {
      if (selection.type == "chart-element") {
        const originalID = selection.chartElementID;
        const plotSegment = getById(
          this.chart.elements,
          originalID
        ) as Specification.PlotSegment;
        if (plotSegment) {
          this.currentSelection = new ChartElementSelection(plotSegment);
        }
      }
      if (selection.type == "glyph") {
        const glyphID = selection.glyphID;
        const glyph = getById(this.chart.glyphs, glyphID);
        if (glyph) {
          this.currentSelection = new GlyphSelection(glyph);
        }
      }
      if (selection.type == "mark") {
        const glyphID = selection.glyphID;
        const markID = selection.markID;
        const glyph = getById(this.chart.glyphs, glyphID);
        if (glyph) {
          const mark = getById(glyph.marks, markID);
          if (mark) {
            this.currentSelection = new MarkSelection(glyph, mark);
          }
        }
      }
    }
    this.emit(ChartStore.EVENT_SELECTION);
  }

  public getMarkIndex(mark: Specification.Glyph) {
    return this.chart.glyphs.indexOf(mark);
  }

  public forAllGlyph(
    glyph: Specification.Glyph,
    callback: (
      glyphState: Specification.GlyphState,
      plotSegment: Specification.PlotSegment,
      plotSegmentState: Specification.PlotSegmentState
    ) => void
  ) {
    for (const [element, elementState] of zipArray(
      this.chart.elements,
      this.chartState.elements
    )) {
      if (Prototypes.isType(element.classID, "plot-segment")) {
        const plotSegment = element as Specification.PlotSegment;
        const plotSegmentState = elementState as Specification.PlotSegmentState;
        if (plotSegment.glyph == glyph._id) {
          for (const glyphState of plotSegmentState.glyphs) {
            callback(glyphState, plotSegment, plotSegmentState);
          }
        }
      }
    }
  }

  public preSolveValues: Array<
    [Solver.ConstraintStrength, Specification.AttributeMap, string, number]
  > = [];
  public addPresolveValue(
    strength: Solver.ConstraintStrength,
    state: Specification.AttributeMap,
    attr: string,
    value: number
  ) {
    this.preSolveValues.push([strength, state, attr, value]);
  }

  public handleAction(action: Actions.Action) {
    if (action instanceof Actions.Reset) {
      this.parent.saveHistory();

      this.currentSelection = null;
      this.currentTool = null;
      this.emit(ChartStore.EVENT_SELECTION);
      this.emit(ChartStore.EVENT_CURRENT_TOOL);

      this.newChartEmpty();
      this.updateMarkStores();

      this.solveConstraintsAndUpdateGraphics();
    }
    // Inside glyph actions
    if (action instanceof Actions.AddMarkToGlyph) {
      this.parent.saveHistory();

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

      this.currentSelection = new MarkSelection(
        action.glyph,
        action.glyph.marks[action.glyph.marks.length - 1]
      );
      this.solveConstraintsAndUpdateGraphics();
      this.emit(ChartStore.EVENT_SELECTION);
    }

    if (action instanceof Actions.RemoveMarkFromGlyph) {
      this.parent.saveHistory();

      // We never delete the anchor
      if (action.mark.classID == "mark.anchor") {
        return;
      }

      this.chartManager.removeMarkFromGlyph(action.mark, action.glyph);

      this.currentSelection = null;
      this.emit(ChartStore.EVENT_SELECTION);

      this.solveConstraintsAndUpdateGraphics();
    }

    if (action instanceof Actions.MapDataToMarkAttribute) {
      this.parent.saveHistory();

      const attr = Prototypes.ObjectClasses.Create(null, action.mark, null)
        .attributes[action.attribute];
      const table = this.datasetStore.getTable(action.glyph.table);
      const inferred = this.scaleInference(
        table,
        action.expression,
        action.valueType,
        action.attributeType,
        action.hints
      );
      if (inferred != null) {
        action.mark.mappings[action.attribute] = {
          type: "scale",
          expression: action.expression,
          valueType: action.valueType,
          scale: inferred
        } as Specification.ScaleMapping;
      } else {
        if (action.valueType == "string" && action.attributeType == "string") {
          action.mark.mappings[action.attribute] = {
            type: "scale",
            expression: action.expression,
            valueType: action.valueType
          } as Specification.ScaleMapping;
        }
      }

      this.solveConstraintsAndUpdateGraphics();
    }

    if (action instanceof Actions.MapDataToChartElementAttribute) {
      const attr = Prototypes.ObjectClasses.Create(
        null,
        action.chartElement,
        null
      ).attributes[action.attribute];
      const table = this.datasetStore.getTable(action.table);
      const inferred = this.scaleInference(
        table,
        action.expression,
        action.valueType,
        action.attributeType,
        action.hints
      );
      if (inferred != null) {
        action.chartElement.mappings[action.attribute] = {
          type: "scale",
          expression: action.expression,
          valueType: action.valueType,
          scale: inferred
        } as Specification.ScaleMapping;
      } else {
        if (action.valueType == "string" && action.attributeType == "string") {
          action.chartElement.mappings[action.attribute] = {
            type: "scale",
            expression: action.expression,
            valueType: action.valueType
          } as Specification.ScaleMapping;
        }
      }

      this.solveConstraintsAndUpdateGraphics();
    }

    if (action instanceof Actions.SetGlyphAttribute) {
      this.parent.saveHistory();

      if (action.mapping == null) {
        delete action.glyph.mappings[action.attribute];
      } else {
        action.glyph.mappings[action.attribute] = action.mapping;
      }

      this.solveConstraintsAndUpdateGraphics();
    }

    if (action instanceof Actions.UpdateGlyphAttribute) {
      this.parent.saveHistory();

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
    }

    if (action instanceof Actions.MarkAction) {
      this.parent.saveHistory();

      this.handleMarkAction(action);

      this.solveConstraintsAndUpdateGraphics();
    }

    if (action instanceof Actions.UpdateGlyphAttribute) {
      this.parent.saveHistory();

      // Wait for stores to finish
      this.dispatcher.waitFor(this.markStores.map(s => s.dispatcherID));

      this.chart.elements.forEach((element, index) => {
        if (Prototypes.isType(element.classID, "plot-segment")) {
          const plotSegment = element as Specification.PlotSegment;
          const plotSegmentState = this.chartState.elements[
            index
          ] as Specification.PlotSegmentState;
          if (plotSegment.glyph == action.glyph._id) {
            for (const markState of plotSegmentState.glyphs) {
              for (const key in action.updates) {
                if (!action.updates.hasOwnProperty(key)) {
                  continue;
                }
                markState.attributes[key] = action.updates[key];
              }
            }
          }
        }
      });

      this.chart.elements.forEach((element, index) => {
        if (Prototypes.isType(element.classID, "plot-segment")) {
          const plotSegment = element as Specification.PlotSegment;
          const plotSegmentState = this.chartState.elements[
            index
          ] as Specification.PlotSegmentState;
          if (plotSegment.glyph == action.glyph._id) {
            for (const markState of plotSegmentState.glyphs) {
              for (const key in action.updates) {
                if (!action.updates.hasOwnProperty(key)) {
                  continue;
                }
                this.addPresolveValue(
                  Solver.ConstraintStrength.STRONG,
                  markState.attributes,
                  key,
                  action.updates[key] as number
                );
              }
            }
          }
        }
      });

      this.solveConstraintsAndUpdateGraphics();
    }

    if (action instanceof Actions.AddPlotSegment) {
      this.parent.saveHistory();

      const newPlotSegment = this.chartManager.createObject(
        action.classID,
        this.chart.glyphs[0]
      ) as Specification.PlotSegment;
      for (const key in action.properties) {
        newPlotSegment.properties[key] = action.properties[key];
      }
      // console.log(newPlotSegment);
      if (Prototypes.isType(action.classID, "plot-segment")) {
        newPlotSegment.filter = null;
        newPlotSegment.order = null;
      }

      this.chartManager.addChartElement(newPlotSegment);

      const idx = this.chart.elements.indexOf(newPlotSegment);
      const elementClass = this.chartManager.getChartElementClass(
        this.chartState.elements[idx]
      );

      for (const key in action.mappings) {
        if (action.mappings.hasOwnProperty(key)) {
          const [value, mapping] = action.mappings[key];
          if (mapping != null) {
            if (mapping.type == "_element") {
              this.chartManager.chart.constraints.push({
                type: "snap",
                attributes: {
                  element: newPlotSegment._id,
                  attribute: key,
                  targetElement: (mapping as any).element,
                  targetAttribute: (mapping as any).attribute,
                  gap: 0
                }
              });
            } else {
              newPlotSegment.mappings[key] = mapping;
            }
          }
          if (value != null) {
            const idx = this.chart.elements.indexOf(newPlotSegment);
            this.chartState.elements[idx].attributes[key] = value;
            if (!elementClass.attributes[key].solverExclude) {
              this.addPresolveValue(
                Solver.ConstraintStrength.HARD,
                this.chartState.elements[idx].attributes,
                key,
                value as number
              );
            }
          }
        }
      }

      this.solveConstraintsAndUpdateGraphics();
    }

    if (action instanceof Actions.UpdateChartElementAttribute) {
      this.parent.saveHistory();

      const idx = this.chart.elements.indexOf(action.chartElement);
      if (idx < 0) {
        return;
      }
      const layoutState = this.chartState.elements[idx];
      for (const key in action.updates) {
        if (!action.updates.hasOwnProperty(key)) {
          continue;
        }
        // Remove current mapping and any snapping constraint
        delete action.chartElement.mappings[key];
        this.chart.constraints = this.chart.constraints.filter(c => {
          if (c.type == "snap") {
            if (
              c.attributes.element == action.chartElement._id &&
              c.attributes.attribute == key
            ) {
              return false;
            }
          }
          return true;
        });
        layoutState.attributes[key] = action.updates[key];
        this.addPresolveValue(
          Solver.ConstraintStrength.STRONG,
          layoutState.attributes,
          key,
          action.updates[key] as number
        );
      }

      this.solveConstraintsAndUpdateGraphics();
    }

    if (action instanceof Actions.SetChartElementMapping) {
      this.parent.saveHistory();

      if (action.mapping == null) {
        delete action.chartElement.mappings[action.attribute];
      } else {
        action.chartElement.mappings[action.attribute] = action.mapping;
        this.chart.constraints = this.chart.constraints.filter(c => {
          if (c.type == "snap") {
            if (
              c.attributes.element == action.chartElement._id &&
              c.attributes.attribute == action.attribute
            ) {
              return false;
            }
          }
          return true;
        });
      }

      this.solveConstraintsAndUpdateGraphics();
    }

    if (action instanceof Actions.SnapChartElements) {
      this.parent.saveHistory();

      delete action.element.mappings[action.attribute];
      // Remove any existing snapping
      this.chart.constraints = this.chart.constraints.filter(c => {
        if (c.type == "snap") {
          if (
            c.attributes.element == action.element._id &&
            c.attributes.attribute == action.attribute
          ) {
            return false;
          }
        }
        return true;
      });
      this.chart.constraints.push({
        type: "snap",
        attributes: {
          element: action.element._id,
          attribute: action.attribute,
          targetElement: action.targetElement._id,
          targetAttribute: action.targetAttribute,
          gap: 0
        }
      });

      this.solveConstraintsAndUpdateGraphics();
    }

    if (action instanceof Actions.SetScaleAttribute) {
      this.parent.saveHistory();

      if (action.mapping == null) {
        delete action.scale.mappings[action.attribute];
      } else {
        action.scale.mappings[action.attribute] = action.mapping;
      }

      this.solveConstraintsAndUpdateGraphics();
    }

    if (action instanceof Actions.UpdateChartAttribute) {
      this.parent.saveHistory();

      for (const key in action.updates) {
        if (!action.updates.hasOwnProperty(key)) {
          continue;
        }
        this.chartState.attributes[key] = action.updates[key];
        this.addPresolveValue(
          Solver.ConstraintStrength.STRONG,
          this.chartState.attributes,
          key,
          action.updates[key] as number
        );
      }

      this.solveConstraintsAndUpdateGraphics();
    }

    if (action instanceof Actions.BindDataToAxis) {
      this.parent.saveHistory();

      const dataBinding: Specification.Types.AxisDataBinding = {
        type: "categorical",
        expression: action.dataExpression.expression,
        valueType: action.dataExpression.valueType,
        gapRatio: 0.1,
        visible: true,
        side: "default",
        style: deepClone(Prototypes.PlotSegments.defaultAxisStyle)
      };

      if (action.appendToProperty) {
        if (action.object.properties[action.appendToProperty] == null) {
          action.object.properties[action.appendToProperty] = [
            action.dataExpression.expression
          ];
        } else {
          (action.object.properties[action.appendToProperty] as string[]).push(
            action.dataExpression.expression
          );
        }
        if (action.object.properties[action.property] == null) {
          action.object.properties[action.property] = dataBinding;
        }
      } else {
        action.object.properties[action.property] = dataBinding;
      }

      const table = this.datasetStore.getTable(
        action.dataExpression.table.name
      );
      const values = this.datasetStore.getExpressionVector(
        table,
        action.dataExpression.expression
      );

      switch (action.dataExpression.metadata.kind) {
        case "categorical":
          {
            dataBinding.type = "categorical";
            dataBinding.valueType = "string";

            if (action.dataExpression.metadata.order) {
              dataBinding.categories = action.dataExpression.metadata.order.slice();
            } else {
              const scale = new Scale.CategoricalScale();
              let orderMode: "alphabetically" | "occurrence" | "order" =
                "alphabetically";
              if (action.dataExpression.metadata.orderMode) {
                orderMode = action.dataExpression.metadata.orderMode;
              }
              scale.inferParameters(values as string[], orderMode);
              dataBinding.categories = new Array<string>(scale.length);
              scale.domain.forEach(
                (index, x) => (dataBinding.categories[index] = x.toString())
              );
            }
          }
          break;
        case "numerical":
          {
            const scale = new Scale.NumericalScale();
            scale.inferParameters(values as number[]);
            dataBinding.domainMin = scale.domainMin;
            dataBinding.domainMax = scale.domainMax;
            dataBinding.type = "numerical";
          }
          break;
      }

      this.solveConstraintsAndUpdateGraphics();
    }

    if (action instanceof Actions.SetChartAttribute) {
      this.parent.saveHistory();

      if (action.mapping == null) {
        delete this.chart.mappings[action.attribute];
      } else {
        this.chart.mappings[action.attribute] = action.mapping;
      }

      this.solveConstraintsAndUpdateGraphics();
    }

    if (action instanceof Actions.SetChartSize) {
      this.parent.saveHistory();

      this.chartState.attributes.width = action.width;
      this.chartState.attributes.height = action.height;
      this.chart.mappings.width = {
        type: "value",
        value: action.width
      } as Specification.ValueMapping;
      this.chart.mappings.height = {
        type: "value",
        value: action.height
      } as Specification.ValueMapping;

      this.solveConstraintsAndUpdateGraphics();
    }

    if (action instanceof Actions.SetObjectProperty) {
      this.parent.saveHistory();

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

      if (action.noUpdateState) {
        this.emit(ChartStore.EVENT_GRAPHICS);
      } else {
        this.solveConstraintsAndUpdateGraphics(action.noComputeLayout);
      }
    }

    if (action instanceof Actions.ExtendPlotSegment) {
      this.parent.saveHistory();

      const plotSegment = action.plotSegment as Specification.PlotSegment;
      const plotSegmentState = this.chartState.elements[
        this.chart.elements.indexOf(plotSegment)
      ] as Specification.PlotSegmentState;

      let newClassID: string;
      switch (action.extension) {
        case "cartesian-x": {
          newClassID = "plot-segment.cartesian";
        }
        case "cartesian-y":
          {
            newClassID = plotSegment.classID;
          }
          break;
        case "polar":
          {
            newClassID = "plot-segment.polar";
          }
          break;
        case "curve":
          {
            newClassID = "plot-segment.curve";
          }
          break;
      }
      if (plotSegment.classID != newClassID) {
        const originalAttributes = plotSegment.mappings;
        plotSegment.classID = newClassID;
        plotSegment.mappings = {};

        if (originalAttributes.x1) {
          plotSegment.mappings.x1 = originalAttributes.x1;
        }
        if (originalAttributes.x2) {
          plotSegment.mappings.x2 = originalAttributes.x2;
        }
        if (originalAttributes.y1) {
          plotSegment.mappings.y1 = originalAttributes.y1;
        }
        if (originalAttributes.y2) {
          plotSegment.mappings.y2 = originalAttributes.y2;
        }

        plotSegment.properties = {
          name: plotSegment.properties.name,
          visible: plotSegment.properties.visible,
          sublayout: plotSegment.properties.sublayout,
          xData: plotSegment.properties.xData,
          yData: plotSegment.properties.yData,
          marginX1: plotSegment.properties.marginX1,
          marginY1: plotSegment.properties.marginY1,
          marginX2: plotSegment.properties.marginX2,
          marginY2: plotSegment.properties.marginY2
        };

        if (newClassID == "plot-segment.polar") {
          plotSegment.properties.startAngle =
            Prototypes.PlotSegments.PolarPlotSegment.defaultProperties.startAngle;
          plotSegment.properties.endAngle =
            Prototypes.PlotSegments.PolarPlotSegment.defaultProperties.endAngle;
          plotSegment.properties.innerRatio =
            Prototypes.PlotSegments.PolarPlotSegment.defaultProperties.innerRatio;
          plotSegment.properties.outerRatio =
            Prototypes.PlotSegments.PolarPlotSegment.defaultProperties.outerRatio;
        }
        if ((newClassID = "plot-segment.curve")) {
          plotSegment.properties.curve =
            Prototypes.PlotSegments.CurvePlotSegment.defaultProperties.curve;
          plotSegment.properties.normalStart =
            Prototypes.PlotSegments.CurvePlotSegment.defaultProperties.normalStart;
          plotSegment.properties.normalEnd =
            Prototypes.PlotSegments.CurvePlotSegment.defaultProperties.normalEnd;
        }

        this.chartManager.initializeCache();
        const layoutClass = this.chartManager.getPlotSegmentClass(
          plotSegmentState
        );
        plotSegmentState.attributes = {};
        layoutClass.initializeState();
      } else {
        if (
          action.extension == "cartesian-x" ||
          action.extension == "polar" ||
          action.extension == "curve"
        ) {
          // if (plotSegment.properties.xData == null) {
          plotSegment.properties.xData = { type: "default", gapRatio: 0.1 };
          // }
        }
        if (action.extension == "cartesian-y") {
          // if (plotSegment.properties.yData == null) {
          plotSegment.properties.yData = { type: "default", gapRatio: 0.1 };
          // }
        }
      }
      this.solveConstraintsAndUpdateGraphics();
    }

    if (action instanceof Actions.ReorderGlyphMark) {
      this.parent.saveHistory();

      this.chartManager.reorderGlyphElement(
        action.glyph,
        action.fromIndex,
        action.toIndex
      );

      this.solveConstraintsAndUpdateGraphics();
    }

    if (action instanceof Actions.ToggleLegendForScale) {
      this.parent.saveHistory();

      this.toggleLegendForScale(action.scale);

      this.solveConstraintsAndUpdateGraphics();
    }

    if (action instanceof Actions.ReorderChartElement) {
      this.parent.saveHistory();

      this.chartManager.reorderChartElement(action.fromIndex, action.toIndex);

      this.solveConstraintsAndUpdateGraphics();
    }

    if (action instanceof Actions.AddLinks) {
      this.parent.saveHistory();

      action.links.properties.name = this.chartManager.findUnusedName("Link");
      this.chartManager.addChartElement(action.links);
      const selection = new ChartElementSelection(action.links, null);
      this.currentSelection = selection;

      // Note: currently, links has no constraints to solve
      this.emit(ChartStore.EVENT_GRAPHICS);
      this.emit(ChartStore.EVENT_SELECTION);
    }

    if (action instanceof Actions.SelectChartElement) {
      const selection = new ChartElementSelection(
        action.chartElement,
        action.glyphIndex
      );
      this.currentSelection = selection;
      this.emit(ChartStore.EVENT_SELECTION);
    }

    if (action instanceof Actions.SelectMark) {
      if (action.dataRowIndex == null) {
        action.dataRowIndex = this.datasetStore.getSelectedRowIndex(
          this.datasetStore.getTable(action.glyph.table)
        );
      }
      const selection = new MarkSelection(action.glyph, action.mark);
      this.currentSelection = selection;
      this.datasetStore.setSelectedRowIndex(
        this.datasetStore.getTable(action.glyph.table),
        action.dataRowIndex
      );
      this.emit(ChartStore.EVENT_SELECTION);
    }

    if (action instanceof Actions.SelectGlyph) {
      const selection = new GlyphSelection(action.glyph);
      this.currentSelection = selection;
      this.emit(ChartStore.EVENT_SELECTION);
    }

    if (action instanceof Actions.ClearSelection) {
      this.currentSelection = null;
      this.emit(ChartStore.EVENT_SELECTION);
    }

    if (action instanceof Actions.SetCurrentTool) {
      this.currentTool = action.tool;
      this.currentToolOptions = action.options;
      this.emit(ChartStore.EVENT_CURRENT_TOOL);
    }

    if (action instanceof Actions.DeleteChartElement) {
      this.parent.saveHistory();

      if (
        this.currentSelection instanceof ChartElementSelection &&
        this.currentSelection.chartElement == action.chartElement
      ) {
        this.currentSelection = null;
        this.emit(ChartStore.EVENT_SELECTION);
      }
      this.chartManager.removeChartElement(action.chartElement);

      this.solveConstraintsAndUpdateGraphics();
    }
  }

  public handleMarkAction(action: Actions.MarkAction) {
    if (action instanceof Actions.UpdateMarkAttribute) {
      for (const key in action.updates) {
        if (!action.updates.hasOwnProperty(key)) {
          continue;
        }
        delete action.mark.mappings[key];

        action.glyph.constraints = action.glyph.constraints.filter(c => {
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

      this.forAllGlyph(action.glyph, glyphState => {
        for (const [mark, markState] of zipArray(
          action.glyph.marks,
          glyphState.marks
        )) {
          if (mark == action.mark) {
            for (const key in action.updates) {
              if (!action.updates.hasOwnProperty(key)) {
                continue;
              }
              markState.attributes[key] = action.updates[key];
              this.addPresolveValue(
                Solver.ConstraintStrength.STRONG,
                markState.attributes,
                key,
                action.updates[key] as number
              );
            }
          }
        }
      });
    }

    if (action instanceof Actions.SetObjectProperty) {
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
    }

    if (action instanceof Actions.SetMarkAttribute) {
      if (action.mapping == null) {
        delete action.mark.mappings[action.attribute];
      } else {
        action.mark.mappings[action.attribute] = action.mapping;
        action.glyph.constraints = action.glyph.constraints.filter(c => {
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
    }

    if (action instanceof Actions.UnmapMarkAttribute) {
      delete action.mark.mappings[action.attribute];
    }

    if (action instanceof Actions.SnapMarks) {
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
      action.glyph.constraints = action.glyph.constraints.filter(c => {
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
          gap: 0
        }
      });

      // Force the states to be equal
      this.forAllGlyph(action.glyph, glyphState => {
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
    }

    if (action instanceof Actions.MarkActionGroup) {
      for (const item of action.actions) {
        this.handleMarkAction(item);
      }
    }
  }

  public scaleInference(
    table: Dataset.Table,
    expression: string,
    valueType: string,
    outputType: string,
    hints: Prototypes.DataMappingHints = {}
  ): string {
    // console.log("Scale inference", table, column, outputType, range);
    // If there is an existing scale on the same column in the table, return that one
    if (!hints.newScale) {
      const getExpressionUnit = (expr: string) => {
        const parsed = Expression.parse(expr);
        if (parsed instanceof Expression.Variable) {
          const column = getByName(table.columns, parsed.name);
          if (column) {
            return column.metadata.unit;
          }
        }
        return null;
      };
      for (const element of this.chart.elements) {
        if (Prototypes.isType(element.classID, "plot-segment")) {
          const plotSegment = element as Specification.PlotSegment;
          if (plotSegment.table != table.name) {
            continue;
          }
          const mark = getById(this.chart.glyphs, plotSegment.glyph);
          if (!mark) {
            continue;
          }
          for (const element of mark.marks) {
            for (const name in element.mappings) {
              if (!element.mappings.hasOwnProperty(name)) {
                continue;
              }
              if (element.mappings[name].type == "scale") {
                const scaleMapping = element.mappings[
                  name
                ] as Specification.ScaleMapping;
                if (scaleMapping.scale != null) {
                  if (scaleMapping.expression == expression) {
                    const scaleObject = getById(
                      this.chart.scales,
                      scaleMapping.scale
                    );
                    if (scaleObject.outputType == outputType) {
                      return scaleMapping.scale;
                    }
                  }
                  // TODO: Fix this part
                  if (
                    getExpressionUnit(scaleMapping.expression) ==
                      getExpressionUnit(expression) &&
                    getExpressionUnit(scaleMapping.expression) != null
                  ) {
                    const scaleObject = getById(
                      this.chart.scales,
                      scaleMapping.scale
                    );
                    if (scaleObject.outputType == outputType) {
                      return scaleMapping.scale;
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
    // Infer a new scale for this item
    const newName = this.chartManager.findUnusedName("Scale");

    let inputType = valueType;

    let scaleClassID = null;
    // Number to number mapping: linear scale
    if (
      (valueType == "number" || valueType == "integer") &&
      outputType == "number"
    ) {
      scaleClassID = `scale.linear`;
      inputType = "number";
    }
    // String to number mapping: categorical stepwise scale
    if (
      valueType == "string" &&
      (outputType == "number" ||
        outputType == "color" ||
        outputType == "boolean")
    ) {
      scaleClassID = `scale.categorical`;
    }
    // Number to string: number formatting
    if (valueType == "number" && outputType == "string") {
      scaleClassID = `scale.format`;
    }
    if (
      (valueType == "number" || valueType == "integer") &&
      outputType == "color"
    ) {
      scaleClassID = `scale.linear`;
      inputType = "number";
    }
    if (
      valueType == "string" &&
      outputType == "string" &&
      hints.stringBehavior == "categorical"
    ) {
      scaleClassID = `scale.categorical`;
    }

    if (scaleClassID != null) {
      const newScale = this.chartManager.createObject(
        `${scaleClassID}<${inputType},${outputType}>`
      ) as Specification.Scale;
      newScale.properties.name = this.chartManager.findUnusedName("Scale");
      newScale.inputType = valueType;
      newScale.outputType = outputType;
      this.chartManager.addScale(newScale);
      const scaleClass = this.chartManager.getClassById(
        newScale._id
      ) as Prototypes.Scales.ScaleClass;
      scaleClass.inferParameters(
        this.datasetStore.getExpressionVector(table, expression),
        hints
      );
      // console.log(this.datasetStore.getExpressionVector(table, expression));

      return newScale._id;
    } else {
      return null;
    }
  }

  public isLegendExistForScale(scale: string) {
    // See if we already have a legend
    for (const element of this.chart.elements) {
      if (Prototypes.isType(element.classID, "legend")) {
        if (element.properties.scale == scale) {
          return true;
        }
      }
    }
    return false;
  }

  public toggleLegendForScale(scale: string) {
    const scaleObject = getById(this.chartManager.chart.scales, scale);
    // See if we already have a legend
    for (const element of this.chart.elements) {
      if (Prototypes.isType(element.classID, "legend")) {
        if (element.properties.scale == scale) {
          this.chartManager.removeChartElement(element);
          return;
        }
      }
    }
    // Categorical-color scale
    if (scaleObject.classID == "scale.categorical<string,color>") {
      const newLegend = this.chartManager.createObject(
        `legend.categorical`
      ) as Specification.ChartElement;
      newLegend.properties.scale = scale;
      newLegend.mappings.x = {
        type: "parent",
        parentAttribute: "x2"
      } as Specification.ParentMapping;
      newLegend.mappings.y = {
        type: "parent",
        parentAttribute: "y2"
      } as Specification.ParentMapping;
      this.chartManager.addChartElement(newLegend);
      this.chartManager.chart.mappings.marginRight = {
        type: "value",
        value: 100
      } as Specification.ValueMapping;
    }
    // Numerical-color scale
    if (
      scaleObject.classID == "scale.linear<number,color>" ||
      scaleObject.classID == "scale.linear<integer,color>"
    ) {
      const newLegend = this.chartManager.createObject(
        `legend.numerical-color`
      ) as Specification.ChartElement;
      newLegend.properties.scale = scale;
      newLegend.mappings.x = {
        type: "parent",
        parentAttribute: "x2"
      } as Specification.ParentMapping;
      newLegend.mappings.y = {
        type: "parent",
        parentAttribute: "y2"
      } as Specification.ParentMapping;
      this.chartManager.addChartElement(newLegend);
      this.chartManager.chart.mappings.marginRight = {
        type: "value",
        value: 100
      } as Specification.ValueMapping;
    }
    // Numerical-number scale
    if (
      scaleObject.classID == "scale.linear<number,number>" ||
      scaleObject.classID == "scale.linear<integer,number>"
    ) {
      const newLegend = this.chartManager.createObject(
        `legend.numerical-number`
      ) as Specification.ChartElement;
      newLegend.properties.scale = scale;
      newLegend.mappings.x1 = {
        type: "parent",
        parentAttribute: "x1"
      } as Specification.ParentMapping;
      newLegend.mappings.y1 = {
        type: "parent",
        parentAttribute: "y1"
      } as Specification.ParentMapping;
      newLegend.mappings.x2 = {
        type: "parent",
        parentAttribute: "x1"
      } as Specification.ParentMapping;
      newLegend.mappings.y2 = {
        type: "parent",
        parentAttribute: "y2"
      } as Specification.ParentMapping;
      this.chartManager.addChartElement(newLegend);
    }
  }

  public getRepresentativeGlyphState(glyph: Specification.Glyph) {
    // Is there a plot segment using this glyph?
    for (const element of this.chart.elements) {
      if (Prototypes.isType(element.classID, "plot-segment")) {
        const plotSegment = element as Specification.PlotSegment;
        if (plotSegment.glyph == glyph._id) {
          const state = this.chartManager.getClassById(plotSegment._id)
            .state as Specification.PlotSegmentState;
          return state.glyphs[0];
        }
      }
    }
    return null;
  }

  public updateMarkStores() {
    if (this.markStores != null) {
      this.markStores.forEach(m => m.destroy());
    }
    this.markStores = this.chart.glyphs.map(m => {
      const table = this.datasetStore.getTable(m.table);
      return new GlyphStore(this, this.datasetStore.getTable(m.table), m);
    });
  }

  public solveConstraintsAndUpdateGraphics(mappingOnly: boolean = false) {
    this.solveConstraintsInWorker(mappingOnly).then(() => {
      this.emit(ChartStore.EVENT_GRAPHICS);
    });
  }

  public async solveConstraintsInWorker(mappingOnly: boolean = false) {
    this.solverStatus = {
      solving: true
    };
    this.emit(ChartStore.EVENT_SOLVER_STATUS);

    await this.parent.worker.solveChartConstraints(
      this.chart,
      this.chartState,
      this.datasetStore.dataset,
      this.preSolveValues,
      mappingOnly
    );
    this.preSolveValues = [];

    this.solverStatus = {
      solving: false
    };
    this.emit(ChartStore.EVENT_SOLVER_STATUS);
  }

  // public solveConstraints_(additional?: (solver: Solver.ChartConstraintSolver) => void) {
  //     if (this.preSolveValues.length > 0) {
  //         let items = this.preSolveValues;
  //         this.preSolveValues = [];
  //         this.solveConstraints_((solver) => {
  //             for (let [strength, attrs, attr, value] of items) {
  //                 solver.solver.addEqualToConstant(strength, solver.solver.attr(attrs, attr), value);
  //             }
  //         });
  //     }

  //     let loss: { softLoss: number, hardLoss: number } = null;
  //     let iterations = additional != null ? 2 : 2;
  //     for (let i = 0; i < iterations; i++) {
  //         let solver = new Solver.ChartConstraintSolver();
  //         solver.setup(this.chartManager);
  //         if (additional) {
  //             additional(solver);
  //             additional = null;
  //         }
  //         loss = solver.solve();
  //         console.log("Loss", loss.hardLoss.toFixed(3), loss.softLoss.toFixed(3));
  //         solver.destroy();
  //     }
  // }

  public newChartEmpty() {
    this.currentSelection = null;
    this.currentTool = null;
    this.currentToolOptions = null;

    const tableName = this.datasetStore.dataset.tables[0].name;
    const rows = this.datasetStore.getTable(tableName).rows;
    const myGlyphID = uniqueID();
    this.chart = {
      _id: uniqueID(),
      classID: "chart.rectangle",
      properties: {
        name: "Chart",
        backgroundColor: null,
        backgroundOpacity: 1
      },
      mappings: {
        marginTop: { type: "value", value: 80 } as Specification.ValueMapping
      },
      glyphs: [
        {
          _id: myGlyphID,
          classID: "glyph.rectangle",
          properties: { name: "Glyph" },
          table: tableName,
          marks: [
            {
              _id: uniqueID(),
              classID: "mark.anchor",
              properties: { name: "Anchor" },
              mappings: {
                x: {
                  type: "parent",
                  parentAttribute: "icx"
                } as Specification.ParentMapping,
                y: {
                  type: "parent",
                  parentAttribute: "icy"
                } as Specification.ParentMapping
              }
            }
          ],
          mappings: {},
          constraints: []
        } as Specification.Glyph
      ],
      elements: [
        {
          _id: uniqueID(),
          classID: "plot-segment.cartesian",
          glyph: myGlyphID,
          table: tableName,
          filter: null,
          mappings: {
            x1: {
              type: "parent",
              parentAttribute: "x1"
            } as Specification.ParentMapping,
            y1: {
              type: "parent",
              parentAttribute: "y1"
            } as Specification.ParentMapping,
            x2: {
              type: "parent",
              parentAttribute: "x2"
            } as Specification.ParentMapping,
            y2: {
              type: "parent",
              parentAttribute: "y2"
            } as Specification.ParentMapping
          },
          properties: {
            name: "PlotSegment1",
            visible: true,
            marginX1: 0,
            marginY1: 0,
            marginX2: 0,
            marginY2: 0,
            sublayout: {
              type: rows.length >= 100 ? "grid" : "dodge-x",
              order: null,
              ratioX: 0.1,
              ratioY: 0.1,
              align: {
                x: "start",
                y: "start"
              },
              grid: {
                direction: "x",
                xCount: null,
                yCount: null
              }
            }
          }
        } as Specification.PlotSegment,
        {
          _id: uniqueID(),
          classID: "mark.text",
          properties: {
            name: "Title",
            visible: true,
            alignment: { x: "middle", y: "top", xMargin: 0, yMargin: 30 },
            rotation: 0
          },
          mappings: {
            x: {
              type: "parent",
              parentAttribute: "cx"
            } as Specification.ParentMapping,
            y: {
              type: "parent",
              parentAttribute: "oy2"
            } as Specification.ParentMapping,
            text: {
              type: "value",
              value: this.datasetStore.dataset.name
            } as Specification.ValueMapping,
            fontSize: {
              type: "value",
              value: 24
            } as Specification.ValueMapping,
            color: {
              type: "value",
              value: { r: 0, g: 0, b: 0 }
            } as Specification.ValueMapping
          }
        } as Specification.ChartElement
      ],
      scales: [],
      constraints: []
    } as Specification.Chart;
    this.chartManager = new Prototypes.ChartStateManager(
      this.chart,
      this.datasetStore.dataset
    );
    this.chartState = this.chartManager.chartState;
  }

  public deleteSelection() {
    const sel = this.currentSelection;
    this.currentSelection = null;
    this.emit(ChartStore.EVENT_SELECTION);
    if (sel instanceof ChartElementSelection) {
      new Actions.DeleteChartElement(sel.chartElement).dispatch(
        this.dispatcher
      );
    }
    if (sel instanceof MarkSelection) {
      new Actions.RemoveMarkFromGlyph(sel.glyph, sel.mark).dispatch(
        this.dispatcher
      );
    }
  }

  public handleEscapeKey() {
    if (this.currentTool) {
      this.currentTool = null;
      this.emit(ChartStore.EVENT_CURRENT_TOOL);
      return;
    }
    if (this.currentSelection) {
      new Actions.ClearSelection().dispatch(this.dispatcher);
    }
  }

  public buildChartTemplate(): Specification.Template.ChartTemplate {
    const builder = new ChartTemplateBuilder(
      this.chart,
      this.datasetStore.dataset,
      this.chartManager
    );
    const template = builder.build();
    return template;
  }
}
