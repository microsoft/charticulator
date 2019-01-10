// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import {
  Dataset,
  deepClone,
  Expression,
  getById,
  getByName,
  Prototypes,
  setField,
  Solver,
  Specification,
  zipArray
} from "../../core";
import { BaseStore } from "../../core/store/base";
import { CharticulatorWorker } from "../../worker";
import { Actions } from "../actions";
import { AbstractBackend } from "../backend/abstract";
import { IndexedDBBackend } from "../backend/indexed_db";
import { ChartTemplateBuilder, ExportTemplateTarget } from "../template";
import {
  renderDataURLToPNG,
  b64EncodeUnicode,
  stringToDataURL
} from "../utils";
import {
  renderChartToLocalString,
  renderChartToString
} from "../views/canvas/chart_display";
import {
  ActionHandlerRegistry,
  registerActionHandlers
} from "./action_handlers";
import { createDefaultChart } from "./defaults";
import { HistoryManager } from "./history_manager";
import { Migrator } from "./migrator";
import {
  ChartElementSelection,
  GlyphSelection,
  MarkSelection,
  Selection
} from "./selection";

export interface ChartStoreStateSolverStatus {
  solving: boolean;
}

export interface SelectionState {
  selection?: {
    type: string;
    chartElementID?: string;
    glyphID?: string;
    markID?: string;
    glyphIndex?: number;
  };
  currentGlyphID?: string;
}

export interface AppStoreState {
  version: string;
  dataset: Dataset.Dataset;
  chart: Specification.Chart;
  chartState: Specification.ChartState;
}

export class AppStore extends BaseStore {
  public static EVENT_IS_NESTED_EDITOR = "is-nested-editor";
  public static EVENT_NESTED_EDITOR_EDIT = "nested-editor-edit";

  /** Fires when the dataset changes */
  public static EVENT_DATASET = "dataset";
  /** Fires when the chart state changes */
  public static EVENT_GRAPHICS = "graphics";
  /** Fires when the selection changes */
  public static EVENT_SELECTION = "selection";
  /** Fires when the current tool changes */
  public static EVENT_CURRENT_TOOL = "current-tool";
  /** Fires when solver status changes */
  public static EVENT_SOLVER_STATUS = "solver-status";

  /** The WebWorker for solving constraints */
  public readonly worker: CharticulatorWorker;

  /** Is this app a nested chart editor? */
  public isNestedEditor: boolean = false;
  /** Should we disable the FileView */
  public disableFileView: boolean = false;

  /** The current dataset */
  public dataset: Dataset.Dataset;
  /** The current chart */
  public chart: Specification.Chart;
  /** The current chart state */
  public chartState: Specification.ChartState;

  public currentSelection: Selection;
  public currentGlyph: Specification.Glyph;
  protected selectedGlyphIndex: { [id: string]: number } = {};
  public currentTool: string;
  public currentToolOptions: string;

  public chartManager: Prototypes.ChartStateManager;

  public solverStatus: ChartStoreStateSolverStatus;

  /** Manages the history of states */
  public historyManager: HistoryManager<AppStoreState>;

  /** The backend that manages data */
  public backend: AbstractBackend;
  /** The id of the currently editing chart */
  public currentChartID: string;

  public actionHandlers = new ActionHandlerRegistry<AppStore, Actions.Action>();

  constructor(worker: CharticulatorWorker, dataset: Dataset.Dataset) {
    super(null);

    /** Register action handlers */
    registerActionHandlers(this.actionHandlers);

    this.worker = worker;

    this.backend = new IndexedDBBackend();

    this.historyManager = new HistoryManager<AppStoreState>();

    this.dataset = dataset;

    this.newChartEmpty();
    this.solveConstraintsAndUpdateGraphics();

    this.registerExportTemplateTarget(
      "Charticulator Template",
      (template: Specification.Template.ChartTemplate) => {
        return {
          getProperties: () => [
            {
              displayName: "Name",
              name: "name",
              type: "string",
              default: "template"
            }
          ],
          getFileName: (props: { name: string }) => `${props.name}.tmplt`,
          generate: () => {
            return new Promise<string>((resolve, reject) => {
              const r = b64EncodeUnicode(JSON.stringify(template, null, 2));
              resolve(r);
            });
          }
        };
      }
    );
  }

  public saveState(): AppStoreState {
    return {
      version: CHARTICULATOR_PACKAGE.version,
      dataset: this.dataset,
      chart: this.chart,
      chartState: this.chartState
    };
  }

  public saveDecoupledState(): AppStoreState {
    const state = this.saveState();
    return deepClone(state);
  }

  public loadState(state: AppStoreState) {
    this.currentSelection = null;
    this.selectedGlyphIndex = {};

    this.dataset = state.dataset;
    this.chart = state.chart;
    this.chartState = state.chartState;

    this.chartManager = new Prototypes.ChartStateManager(
      this.chart,
      this.dataset,
      this.chartState
    );

    this.emit(AppStore.EVENT_DATASET);
    this.emit(AppStore.EVENT_GRAPHICS);
    this.emit(AppStore.EVENT_SELECTION);
  }

  public saveHistory() {
    this.historyManager.addState(this.saveDecoupledState());
  }

  public renderSVG() {
    const svg =
      '<?xml version="1.0" standalone="no"?>' +
      renderChartToString(this.dataset, this.chart, this.chartState);
    return svg;
  }

  public async renderLocalSVG() {
    const svg = await renderChartToLocalString(
      this.dataset,
      this.chart,
      this.chartState
    );
    return '<?xml version="1.0" standalone="no"?>' + svg;
  }

  public handleAction(action: Actions.Action) {
    this.actionHandlers.handleAction(this, action);
  }

  public async backendOpenChart(id: string) {
    const chart = await this.backend.get(id);
    this.currentChartID = id;
    this.historyManager.clear();
    const state = new Migrator().migrate(
      chart.data.state,
      CHARTICULATOR_PACKAGE.version
    );
    this.loadState(state);
  }

  public async backendSaveChart() {
    if (this.currentChartID != null) {
      const chart = await this.backend.get(this.currentChartID);
      chart.data.state = this.saveState();
      const svg = stringToDataURL("image/svg+xml", await this.renderLocalSVG());
      const png = await renderDataURLToPNG(svg, {
        mode: "thumbnail",
        thumbnail: [200, 150]
      });
      chart.metadata.thumbnail = png.toDataURL();
      await this.backend.put(chart.id, chart.data, chart.metadata);
    }
  }

  public async backendSaveChartAs(name: string) {
    const state = this.saveState();
    const svg = stringToDataURL("image/svg+xml", await this.renderLocalSVG());
    const png = await renderDataURLToPNG(svg, {
      mode: "thumbnail",
      thumbnail: [200, 150]
    });
    const id = await this.backend.create(
      "chart",
      {
        state,
        name
      },
      {
        name,
        dataset: this.dataset.name,
        thumbnail: png.toDataURL()
      }
    );
    this.currentChartID = id;
    return id;
  }

  public setupNestedEditor(
    callback: (newSpecification: Specification.Chart) => void
  ) {
    this.isNestedEditor = true;
    this.disableFileView = true;
    this.emit(AppStore.EVENT_IS_NESTED_EDITOR);
    this.addListener(AppStore.EVENT_NESTED_EDITOR_EDIT, () => {
      callback(this.chart);
    });
  }

  private registeredExportTemplateTargets = new Map<
    string,
    (template: Specification.Template.ChartTemplate) => ExportTemplateTarget
  >();

  public registerExportTemplateTarget(
    name: string,
    ctor: (
      template: Specification.Template.ChartTemplate
    ) => ExportTemplateTarget
  ) {
    this.registeredExportTemplateTargets.set(name, ctor);
  }

  public unregisterExportTemplateTarget(name: string) {
    this.registeredExportTemplateTargets.delete(name);
  }

  public listExportTemplateTargets(): string[] {
    const r: string[] = [];
    this.registeredExportTemplateTargets.forEach((x, i) => {
      r.push(i);
    });
    return r;
  }

  public createExportTemplateTarget(
    name: string,
    template: Specification.Template.ChartTemplate
  ): ExportTemplateTarget {
    return this.registeredExportTemplateTargets.get(name)(template);
  }

  public getTable(name: string): Dataset.Table {
    if (this.dataset != null) {
      return this.dataset.tables.filter(d => d.name == name)[0];
    } else {
      return null;
    }
  }

  public getTables(): Dataset.Table[] {
    return this.dataset.tables;
  }

  public getColumnVector(
    table: Dataset.Table,
    columnName: string
  ): Dataset.DataValue[] {
    return table.rows.map(d => d[columnName]);
  }

  public saveSelectionState(): SelectionState {
    const selection: SelectionState = {};
    if (this.currentSelection instanceof ChartElementSelection) {
      selection.selection = {
        type: "chart-element",
        chartElementID: this.currentSelection.chartElement._id
      };
    }
    if (this.currentSelection instanceof GlyphSelection) {
      selection.selection = {
        type: "glyph",
        glyphID: this.currentSelection.glyph._id
      };
    }
    if (this.currentSelection instanceof MarkSelection) {
      selection.selection = {
        type: "mark",
        glyphID: this.currentSelection.glyph._id,
        markID: this.currentSelection.mark._id
      };
    }
    if (this.currentGlyph) {
      selection.currentGlyphID = this.currentGlyph._id;
    }
    return selection;
  }

  public loadSelectionState(selectionState: SelectionState) {
    if (selectionState == null) {
      return;
    }
    const selection = selectionState.selection;
    if (selection != null) {
      if (selection.type == "chart-element") {
        const chartElement = getById(
          this.chart.elements,
          selection.chartElementID
        );
        if (chartElement) {
          this.currentSelection = new ChartElementSelection(chartElement);
        }
      }
      if (selection.type == "glyph") {
        const glyphID = selection.glyphID;
        const glyph = getById(this.chart.glyphs, glyphID);
        const plotSegment = getById(
          this.chart.elements,
          selection.chartElementID
        ) as Specification.PlotSegment;
        if (plotSegment && glyph) {
          this.currentSelection = new GlyphSelection(plotSegment, glyph);
          this.currentGlyph = glyph;
        }
      }
      if (selection.type == "mark") {
        const glyphID = selection.glyphID;
        const markID = selection.markID;
        const glyph = getById(this.chart.glyphs, glyphID);
        const plotSegment = getById(
          this.chart.elements,
          selection.chartElementID
        ) as Specification.PlotSegment;
        if (plotSegment && glyph) {
          const mark = getById(glyph.marks, markID);
          if (mark) {
            this.currentSelection = new MarkSelection(plotSegment, glyph, mark);
            this.currentGlyph = glyph;
          }
        }
      }
    }
    if (selectionState.currentGlyphID) {
      const glyph = getById(this.chart.glyphs, selectionState.currentGlyphID);
      if (glyph) {
        this.currentGlyph = glyph;
      }
    }
    this.emit(AppStore.EVENT_SELECTION);
  }

  public setSelectedGlyphIndex(plotSegmentID: string, glyphIndex: number) {
    this.selectedGlyphIndex[plotSegmentID] = glyphIndex;
  }

  public getSelectedGlyphIndex(plotSegmentID: string) {
    const plotSegment = this.chartManager.getClassById(
      plotSegmentID
    ) as Prototypes.PlotSegments.PlotSegmentClass;
    if (!plotSegment) {
      return 0;
    }
    if (this.selectedGlyphIndex.hasOwnProperty(plotSegmentID)) {
      const idx = this.selectedGlyphIndex[plotSegmentID];
      if (idx >= plotSegment.state.dataRowIndices.length) {
        this.selectedGlyphIndex[plotSegmentID] = 0;
        return 0;
      } else {
        return idx;
      }
    } else {
      this.selectedGlyphIndex[plotSegmentID] = 0;
      return 0;
    }
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

  /** Given the current selection, find a reasonable plot segment for a glyph */
  public findPlotSegmentForGlyph(glyph: Specification.Glyph) {
    if (
      this.currentSelection instanceof MarkSelection ||
      this.currentSelection instanceof GlyphSelection
    ) {
      if (this.currentSelection.glyph == glyph) {
        return this.currentSelection.plotSegment;
      }
    }
    if (this.currentSelection instanceof ChartElementSelection) {
      if (
        Prototypes.isType(
          this.currentSelection.chartElement.classID,
          "plot-segment"
        )
      ) {
        const plotSegment = this.currentSelection
          .chartElement as Specification.PlotSegment;
        if (plotSegment.glyph == glyph._id) {
          return plotSegment;
        }
      }
    }
    for (const elem of this.chart.elements) {
      if (Prototypes.isType(elem.classID, "plot-segment")) {
        const plotSegment = elem as Specification.PlotSegment;
        if (plotSegment.glyph == glyph._id) {
          return plotSegment;
        }
      }
    }
  }

  public scaleInference(
    context: { glyph?: Specification.Glyph; chart?: { table: string } },
    expression: string,
    valueType: Specification.DataType,
    valueKind: Specification.DataKind,
    outputType: Specification.AttributeType,
    hints: Prototypes.DataMappingHints = {}
  ): string {
    // Figure out the source table
    let tableName: string = null;
    if (context.glyph) {
      tableName = context.glyph.table;
    }
    if (context.chart) {
      tableName = context.chart.table;
    }
    // Figure out the groupBy
    let groupBy: Specification.Types.GroupBy = null;
    if (context.glyph) {
      // Find plot segments that use the glyph.
      this.chartManager.enumeratePlotSegments(cls => {
        if (cls.object.glyph == context.glyph._id) {
          groupBy = cls.object.groupBy;
        }
      });
    }
    const table = this.getTable(tableName);

    // If there is an existing scale on the same column in the table, return that one
    if (!hints.newScale) {
      const getExpressionUnit = (expr: string) => {
        const parsed = Expression.parse(expr);
        // In the case of an aggregation function
        if (parsed instanceof Expression.FunctionCall) {
          const args0 = parsed.args[0];
          if (args0 instanceof Expression.Variable) {
            const column = getByName(table.columns, args0.name);
            if (column) {
              return column.metadata.unit;
            }
          }
        }
        return null; // unit is unknown
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
    const scaleClassID = Prototypes.Scales.inferScaleType(
      valueType,
      valueKind,
      outputType
    );

    if (scaleClassID != null) {
      const newScale = this.chartManager.createObject(
        scaleClassID
      ) as Specification.Scale;
      newScale.properties.name = this.chartManager.findUnusedName("Scale");
      newScale.inputType = valueType;
      newScale.outputType = outputType;
      this.chartManager.addScale(newScale);
      const scaleClass = this.chartManager.getClassById(
        newScale._id
      ) as Prototypes.Scales.ScaleClass;
      scaleClass.inferParameters(
        this.chartManager.getGroupedExpressionVector(
          table.name,
          groupBy,
          expression
        ) as Specification.DataValue[],
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

  public solveConstraintsAndUpdateGraphics(mappingOnly: boolean = false) {
    this.solveConstraintsInWorker(mappingOnly).then(() => {
      this.emit(AppStore.EVENT_GRAPHICS);
    });
  }

  public async solveConstraintsInWorker(mappingOnly: boolean = false) {
    this.solverStatus = {
      solving: true
    };
    this.emit(AppStore.EVENT_SOLVER_STATUS);

    await this.worker.solveChartConstraints(
      this.chart,
      this.chartState,
      this.dataset,
      this.preSolveValues,
      mappingOnly
    );
    this.preSolveValues = [];

    this.solverStatus = {
      solving: false
    };
    this.emit(AppStore.EVENT_SOLVER_STATUS);
  }

  public newChartEmpty() {
    this.currentSelection = null;
    this.selectedGlyphIndex = {};
    this.currentTool = null;
    this.currentToolOptions = null;

    this.chart = createDefaultChart(this.dataset);
    this.chartManager = new Prototypes.ChartStateManager(
      this.chart,
      this.dataset
    );
    this.chartState = this.chartManager.chartState;
  }

  public deleteSelection() {
    const sel = this.currentSelection;
    this.currentSelection = null;
    this.emit(AppStore.EVENT_SELECTION);
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
    if (sel instanceof GlyphSelection) {
      new Actions.RemoveGlyph(sel.glyph).dispatch(this.dispatcher);
    }
  }

  public handleEscapeKey() {
    if (this.currentTool) {
      this.currentTool = null;
      this.emit(AppStore.EVENT_CURRENT_TOOL);
      return;
    }
    if (this.currentSelection) {
      new Actions.ClearSelection().dispatch(this.dispatcher);
    }
  }

  public buildChartTemplate(): Specification.Template.ChartTemplate {
    const builder = new ChartTemplateBuilder(
      this.chart,
      this.dataset,
      this.chartManager
    );
    const template = builder.build();
    return template;
  }

  public verifyUserExpressionWithTable(
    inputString: string,
    table: string,
    options: Expression.VerifyUserExpressionOptions = {}
  ) {
    if (table != null) {
      const dfTable = this.chartManager.dataflow.getTable(table);
      const rowIterator = function*() {
        for (let i = 0; i < dfTable.rows.length; i++) {
          yield dfTable.getRowContext(i);
        }
      };
      return Expression.verifyUserExpression(inputString, {
        data: rowIterator(),
        ...options
      });
    } else {
      return Expression.verifyUserExpression(inputString, {
        ...options
      });
    }
  }
}
