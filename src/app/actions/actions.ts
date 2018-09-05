import {
  Dataset,
  Point,
  Prototypes,
  Specification,
  Action,
  SelectMark,
  ClearSelection
} from "../../core";
import * as DragData from "./drag_data";

// Reexport these actions so consumers don't need to pull from both core/actions and app/actions
export { Action, SelectMark, ClearSelection };

export class UIAction extends Action {}

export class Undo extends Action {
  public digest() {
    return { name: "Undo" };
  }
}

export class Redo extends Action {
  public digest() {
    return { name: "Undo" };
  }
}

export class Reset extends Action {
  public digest() {
    return { name: "Reset" };
  }
}

export class Export extends Action {
  constructor(
    public type: string,
    public options: {
      scale?: number;
      quality?: number;
    } = {}
  ) {
    super();
  }

  public digest() {
    return { name: "Export", type: this.type, options: this.options };
  }
}
export class Save extends Action {
  public digest() {
    return { name: "Save" };
  }
}
export class Load extends Action {
  constructor(public projectData: any) {
    super();
  }

  public digest() {
    return { name: "Load" };
  }
}

// export class LoadDataFromCSV extends Action {
//     constructor(
//         public filename: string,
//         public contents: string,
//         public type: "csv" | "tsv"
//     ) { super(); }

// }

export class ImportDataset extends Action {
  constructor(public dataset: Dataset.Dataset) {
    super();
  }

  public digest() {
    return { name: "ImportDataset", datasetName: this.dataset.name };
  }
}

// Dataset actions

export class AddTable extends Action {
  constructor(public table: Dataset.Table) {
    super();
  }

  public digest() {
    return { name: "AddTable", tableName: this.table.name };
  }
}

export class SelectDataRow extends UIAction {
  constructor(public table: Dataset.Table, public rowIndex: number) {
    super();
  }

  public digest() {
    return {
      name: "SelectDataRow",
      rowIndex: this.rowIndex,
      tableName: this.table.name
    };
  }
}

// Mark editing actions

export class AddMarkToGlyph extends Action {
  constructor(
    public glyph: Specification.Glyph,
    public classID: string,
    public point: Point,
    public mappings: { [name: string]: [number, Specification.Mapping] } = {},
    public properties: Specification.AttributeMap = {}
  ) {
    super();
  }

  public digest() {
    return {
      name: "AddMarkToGlyph",
      classID: this.classID,
      glyph: [this.glyph.classID, this.glyph._id],
      mappings: this.mappings,
      properties: this.properties
    };
  }
}

export class RemoveMarkFromGlyph extends Action {
  constructor(
    public glyph: Specification.Glyph,
    public mark: Specification.Element
  ) {
    super();
  }

  public digest() {
    return {
      name: "RemoveMarkFromGlyph",
      glyph: [this.glyph.classID, this.glyph._id],
      mark: [this.mark.classID, this.mark._id]
    };
  }
}

export class MapDataToMarkAttribute extends Action {
  constructor(
    public glyph: Specification.Glyph,
    public mark: Specification.Element,
    public attribute: string,
    public attributeType: string,
    public expression: string,
    public valueType: string,
    public hints: Prototypes.DataMappingHints
  ) {
    super();
  }

  public digest() {
    return {
      name: "MapDataToMarkAttribute",
      glyph: [this.glyph.classID, this.glyph._id],
      mark: [this.mark.classID, this.mark._id],
      attribute: this.attribute,
      attributeType: this.attributeType,
      expression: this.expression,
      valueType: this.valueType,
      hints: this.hints as any
    };
  }
}

export class MarkAction extends Action {}

export class SetMarkAttribute extends MarkAction {
  constructor(
    public glyph: Specification.Glyph,
    public mark: Specification.Element,
    public attribute: string,
    public mapping: Specification.Mapping
  ) {
    super();
  }

  public digest() {
    return {
      name: "SetMarkAttribute",
      glyph: [this.glyph.classID, this.glyph._id],
      mark: [this.mark.classID, this.mark._id],
      attribute: this.attribute,
      mapping: this.mapping
    };
  }
}

export class UnmapMarkAttribute extends MarkAction {
  constructor(
    public glyph: Specification.Glyph,
    public mark: Specification.Element,
    public attribute: string
  ) {
    super();
  }

  public digest() {
    return {
      name: "UnmapMarkAttribute",
      glyph: [this.glyph.classID, this.glyph._id],
      mark: [this.mark.classID, this.mark._id],
      attribute: this.attribute
    };
  }
}

export class UpdateMarkAttribute extends MarkAction {
  constructor(
    public glyph: Specification.Glyph,
    public mark: Specification.Element,
    public updates: { [name: string]: Specification.AttributeValue }
  ) {
    super();
  }

  public digest() {
    return {
      name: "UpdateMarkAttribute",
      glyph: [this.glyph.classID, this.glyph._id],
      mark: [this.mark.classID, this.mark._id],
      updates: this.updates
    };
  }
}

export class SnapMarks extends MarkAction {
  constructor(
    public glyph: Specification.Glyph,
    public mark: Specification.Element,
    public attribute: string,
    public targetMark: Specification.Element,
    public targetAttribute: string
  ) {
    super();
  }

  public digest() {
    return {
      name: "SnapMarks",
      glyph: [this.glyph.classID, this.glyph._id],
      mark: [this.mark.classID, this.mark._id],
      attribute: this.attribute,
      targetMark: [this.targetMark.classID, this.targetMark._id],
      targetAttribute: this.targetAttribute
    };
  }
}

export class MarkActionGroup extends MarkAction {
  constructor(public actions: MarkAction[] = []) {
    super();
  }

  public add(action: MarkAction) {
    this.actions.push(action);
  }

  public digest() {
    return {
      name: "MarkActionGroup",
      actions: this.actions.map(x => x.digest())
    };
  }
}

export class SetGlyphAttribute extends Action {
  constructor(
    public glyph: Specification.Glyph,
    public attribute: string,
    public mapping: Specification.Mapping
  ) {
    super();
  }

  public digest() {
    return {
      name: "SetGlyphAttribute",
      glyph: [this.glyph.classID, this.glyph._id],
      attribute: this.attribute,
      mapping: this.mapping
    };
  }
}

export class UpdateGlyphAttribute extends Action {
  constructor(
    public glyph: Specification.Glyph,
    public updates: { [name: string]: Specification.AttributeValue }
  ) {
    super();
  }

  public digest() {
    return {
      name: "UpdateGlyphAttribute",
      glyph: [this.glyph.classID, this.glyph._id],
      updates: this.updates
    };
  }
}

export class AddPlotSegment extends Action {
  constructor(
    public classID: string,
    public mappings: {
      [name: string]: [Specification.AttributeValue, Specification.Mapping];
    },
    public properties: Specification.AttributeMap = {}
  ) {
    super();
  }

  public digest() {
    return {
      name: "AddPlotSegment",
      classID: this.classID,
      mappings: this.mappings,
      attribute: this.properties
    };
  }
}

export class DeleteChartElement extends Action {
  constructor(public chartElement: Specification.ChartElement) {
    super();
  }

  public digest() {
    return {
      name: "DeleteChartElement",
      chartElement: [this.chartElement.classID, this.chartElement._id]
    };
  }
}

export class DeleteSelection extends Action {
  public digest() {
    return {
      name: "DeleteSelection"
    };
  }
}

export class SetChartElementMapping extends Action {
  constructor(
    public chartElement: Specification.ChartElement,
    public attribute: string,
    public mapping: Specification.Mapping
  ) {
    super();
  }

  public digest() {
    return {
      name: "SetChartElementMapping",
      chartElement: [this.chartElement.classID, this.chartElement._id],
      attribute: this.attribute,
      mapping: this.mapping
    };
  }
}

export class MapDataToChartElementAttribute extends Action {
  constructor(
    public chartElement: Specification.ChartElement,
    public attribute: string,
    public attributeType: string,
    public table: string,
    public expression: string,
    public valueType: string,
    public hints: Prototypes.DataMappingHints
  ) {
    super();
  }

  public digest() {
    return {
      name: "MapChartElementkAttribute",
      chartElement: [this.chartElement.classID, this.chartElement._id],
      attribute: this.attribute,
      attributeType: this.attributeType,
      expression: this.expression,
      valueType: this.valueType,
      hints: this.hints as any
    };
  }
}

export class SetPlotSegmentFilter extends Action {
  constructor(
    public plotSegment: Specification.PlotSegment,
    public filter: Specification.Types.Filter
  ) {
    super();
  }
  public digest() {
    return {
      name: "SetPlotSegmentFilter",
      plotSegment: [this.plotSegment.classID, this.plotSegment._id],
      filter: this.filter
    };
  }
}

export class SetPlotSegmentGroupBy extends Action {
  constructor(
    public plotSegment: Specification.PlotSegment,
    public groupBy: Specification.Types.GroupBy
  ) {
    super();
  }
  public digest() {
    return {
      name: "SetPlotSegmentGroupBy",
      plotSegment: [this.plotSegment.classID, this.plotSegment._id],
      groupBy: this.groupBy
    };
  }
}

export class SetScaleAttribute extends Action {
  constructor(
    public scale: Specification.Scale,
    public attribute: string,
    public mapping: Specification.Mapping
  ) {
    super();
  }

  public digest() {
    return {
      name: "SetScaleAttribute",
      scale: [this.scale.classID, this.scale._id],
      attribute: this.attribute,
      mapping: this.mapping
    };
  }
}

export class ToggleLegendForScale extends Action {
  constructor(public scale: string) {
    super();
  }

  public digest() {
    return {
      name: "ToggleLegendForScale",
      scale: this.scale
    };
  }
}

export class UpdateChartElementAttribute extends Action {
  constructor(
    public chartElement: Specification.ChartElement,
    public updates: { [name: string]: Specification.AttributeValue }
  ) {
    super();
  }

  public digest() {
    return {
      name: "UpdateChartElementAttribute",
      chartElement: [this.chartElement.classID, this.chartElement._id],
      updates: this.updates
    };
  }
}

export class SnapChartElements extends Action {
  constructor(
    public element: Specification.ChartElement,
    public attribute: string,
    public targetElement: Specification.ChartElement,
    public targetAttribute: string
  ) {
    super();
  }

  public digest() {
    return {
      name: "SnapChartElements",
      element: [this.element.classID, this.element._id],
      attribute: this.attribute,
      targetElement: [this.targetElement.classID, this.targetElement._id],
      targetAttribute: this.targetAttribute
    };
  }
}

export class BindDataToAxis extends Action {
  constructor(
    public object: Specification.Object,
    public property: string,
    public appendToProperty: string,
    public dataExpression: DragData.DataExpression
  ) {
    super();
  }

  public digest() {
    return {
      name: "BindDataToAxis",
      object: [this.object.classID, this.object._id],
      property: this.property,
      appendToProperty: this.appendToProperty,
      dataExpression: {
        table: this.dataExpression.table.name,
        expression: this.dataExpression.expression,
        valueType: this.dataExpression.valueType,
        kind: this.dataExpression.metadata.kind
      }
    };
  }
}

export class AddLinks extends Action {
  constructor(public links: Specification.Links) {
    super();
  }

  public digest() {
    return {
      name: "AddLinks",
      links: this.links
    };
  }
}

export class UpdateChartAttribute extends Action {
  constructor(
    public chart: Specification.Chart,
    public updates: { [name: string]: Specification.AttributeValue }
  ) {
    super();
  }

  public digest() {
    return {
      name: "UpdateChartAttribute",
      updates: this.updates
    };
  }
}

export class SetChartSize extends Action {
  constructor(public width: number, public height: number) {
    super();
  }

  public digest() {
    return {
      name: "SetChartSize",
      width: this.width,
      height: this.height
    };
  }
}

export class SetChartAttribute extends Action {
  constructor(public attribute: string, public mapping: Specification.Mapping) {
    super();
  }

  public digest() {
    return {
      name: "SetChartAttribute",
      attribute: this.attribute,
      mapping: this.mapping
    };
  }
}

export class SetObjectProperty extends Action {
  constructor(
    public object: Specification.Object,
    public property: string,
    public field: string | string[],
    public value: Specification.AttributeValue,
    public noUpdateState: boolean = false,
    public noComputeLayout: boolean = false
  ) {
    super();
  }

  public digest() {
    return {
      name: "SetObjectProperty",
      object: [this.object.classID, this.object._id],
      property: this.property,
      field: this.field,
      value: this.value,
      noUpdateState: this.noUpdateState,
      noComputeLayout: this.noComputeLayout
    };
  }
}

export class ExtendPlotSegment extends Action {
  constructor(
    public plotSegment: Specification.PlotSegment,
    public extension: string
  ) {
    super();
  }

  public digest() {
    return {
      name: "ExtendPlotSegment",
      plotSegment: [this.plotSegment.classID, this.plotSegment._id],
      extension: this.extension
    };
  }
}

export class ReorderChartElement extends Action {
  constructor(public fromIndex: number, public toIndex: number) {
    super();
  }

  public digest() {
    return {
      name: "ReorderChartElement",
      fromIndex: this.fromIndex,
      toIndex: this.toIndex
    };
  }
}

export class ReorderGlyphMark extends Action {
  constructor(
    public glyph: Specification.Glyph,
    public fromIndex: number,
    public toIndex: number
  ) {
    super();
  }

  public digest() {
    return {
      name: "ReorderGlyphMark",
      glyph: [this.glyph.classID, this.glyph._id],
      fromIndex: this.fromIndex,
      toIndex: this.toIndex
    };
  }
}

export class SelectGlyph extends Action {
  constructor(public glyph: Specification.Glyph) {
    super();
  }

  public digest() {
    return {
      name: "SelectGlyph",
      glyph: [this.glyph.classID, this.glyph._id]
    };
  }
}

export class SelectChartElement extends Action {
  constructor(
    public chartElement: Specification.ChartElement,
    public glyphIndex: number = null
  ) {
    super();
  }

  public digest() {
    return {
      name: "SelectChartElement",
      glyph: [this.chartElement.classID, this.chartElement._id]
    };
  }
}

export class SetCurrentTool extends Action {
  constructor(public tool: string, public options: string = null) {
    super();
  }

  public digest() {
    return {
      name: "SetCurrentTool",
      tool: this.tool,
      options: this.options
    };
  }
}
