// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import {
  Dataset,
  Point,
  Prototypes,
  Specification,
  Action,
  SelectMark,
  ClearSelection,
  objectDigest
} from "../../core";
import * as DragData from "./drag_data";
import { ExportTemplateTarget } from "../template";
import { DataType } from "../../core/dataset";

// Reexport these actions so consumers don't need to pull from both core/actions and app/actions
export { Action, SelectMark, ClearSelection };

export class Undo extends Action {
  public digest() {
    return { name: "Undo" };
  }
}

export class Redo extends Action {
  public digest() {
    return { name: "Redo" };
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

export class ExportTemplate extends Action {
  constructor(
    public kind: string,
    public target: ExportTemplateTarget,
    public properties: { [name: string]: string }
  ) {
    super();
  }

  public digest() {
    return { name: "ExportTemplate" };
  }
}

export class SaveExportTemplatePropertyName extends Action {
  constructor(
    public objectId: string,
    public propertyName: string,
    public value: string
  ) {
    super();
  }

  public digest() {
    return { name: "SaveExportTemplatePropertyName" };
  }
}

export class Open extends Action {
  constructor(public id: string, public onFinish?: (error?: Error) => void) {
    super();
  }
  public digest() {
    return { name: "Open", id: this.id };
  }
}

/** Save the current chart */
export class Save extends Action {
  constructor(public onFinish?: (error?: Error) => void) {
    super();
  }
  public digest() {
    return { name: "Save" };
  }
}

export class SaveAs extends Action {
  constructor(
    public saveAs: string,
    public onFinish?: (error?: Error) => void
  ) {
    super();
  }
  public digest() {
    return { name: "SaveAs", saveAs: this.saveAs };
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

export class ImportDataset extends Action {
  constructor(public dataset: Dataset.Dataset) {
    super();
  }

  public digest() {
    return { name: "ImportDataset", datasetName: this.dataset.name };
  }
}

export class ImportChartAndDataset extends Action {
  constructor(
    public specification: Specification.Chart,
    public dataset: Dataset.Dataset,
    public options: {
      [key: string]: any;
    }
  ) {
    super();
  }

  public digest() {
    return { name: "ImportChartAndDataset" };
  }
}

export class ReplaceDataset extends Action {
  constructor(public dataset: Dataset.Dataset) {
    super();
  }

  public digest() {
    return { name: "ReplaceDataset", datasetName: this.dataset.name };
  }
}

/** Invokes updaes all plot segments on the chart,  */
export class UpdatePlotSegments extends Action {
  constructor() {
    super();
  }

  public digest() {
    return { name: "UpdatePlotSegments" };
  }
}

export class ConvertColumnDataType extends Action {
  constructor(
    public tableName: string,
    public column: string,
    public type: DataType
  ) {
    super();
  }

  public digest() {
    return { name: "ConvertColumnDataType" };
  }
}

// Glyph editing actions

/** Add an empty glyph to the chart */
export class AddGlyph extends Action {
  constructor(public classID: string) {
    super();
  }

  public digest() {
    return {
      name: "AddGlyph",
      classID: this.classID
    };
  }
}

/** Remove a glyph from the chart */
export class RemoveGlyph extends Action {
  constructor(public glyph: Specification.Glyph) {
    super();
  }

  public digest() {
    return {
      name: "RemoveGlyph",
      glyph: objectDigest(this.glyph)
    };
  }
}

// Mark editing actions

/** Add an mark to the glyph */
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
      glyph: objectDigest(this.glyph),
      mappings: this.mappings,
      properties: this.properties
    };
  }
}

/** Remove an mark from the glyph */
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
      glyph: objectDigest(this.glyph),
      mark: objectDigest(this.mark)
    };
  }
}

/**
 * Dispatches when user binds table coulmns to attributes
 */
export class MapDataToMarkAttribute extends Action {
  /**
   * @param glyph the glyph object where marks is
   * @param mark mark object for which the attribute is being changed
   * @param attribute name of the attribute that data is associated with
   * @param attributeType attribute data type
   * @param expression expression to fetch data from table. Usually contains name of column and aggregation function
   * @param valueType type of data in the column
   * @param valueMetadata additional data about column
   * @param hints contains configuration of data mapping to attribute
   */
  constructor(
    public glyph: Specification.Glyph,
    public mark: Specification.Element,
    public attribute: string,
    public attributeType: Specification.AttributeType,
    public expression: string,
    public valueType: Specification.DataType,
    public valueMetadata: Dataset.ColumnMetadata,
    public hints: Prototypes.DataMappingHints
  ) {
    super();
  }

  public digest() {
    return {
      name: "MapDataToMarkAttribute",
      glyph: objectDigest(this.glyph),
      mark: objectDigest(this.mark),
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
      glyph: objectDigest(this.glyph),
      mark: objectDigest(this.mark),
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
      glyph: objectDigest(this.glyph),
      mark: objectDigest(this.mark),
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
      glyph: objectDigest(this.glyph),
      mark: objectDigest(this.mark),
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
      glyph: objectDigest(this.glyph),
      mark: objectDigest(this.mark),
      attribute: this.attribute,
      targetMark: objectDigest(this.targetMark),
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
      glyph: objectDigest(this.glyph),
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
      glyph: objectDigest(this.glyph),
      updates: this.updates
    };
  }
}

export class AddChartElement extends Action {
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
      name: "AddChartElement",
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
      chartElement: objectDigest(this.chartElement)
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
      chartElement: objectDigest(this.chartElement),
      attribute: this.attribute,
      mapping: this.mapping
    };
  }
}

export class MapDataToChartElementAttribute extends Action {
  constructor(
    public chartElement: Specification.ChartElement,
    public attribute: string,
    public attributeType: Specification.AttributeType,
    public table: string,
    public expression: string,
    public valueType: Specification.DataType,
    public valueMetadata: Dataset.ColumnMetadata,
    public hints: Prototypes.DataMappingHints
  ) {
    super();
  }

  public digest() {
    return {
      name: "MapChartElementkAttribute",
      chartElement: objectDigest(this.chartElement),
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
      plotSegment: objectDigest(this.plotSegment),
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
      plotSegment: objectDigest(this.plotSegment),
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
      scale: objectDigest(this.scale),
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
      chartElement: objectDigest(this.chartElement),
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
      element: objectDigest(this.element),
      attribute: this.attribute,
      targetElement: objectDigest(this.targetElement),
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
      object: objectDigest(this.object),
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
    public field: number | string | Array<number | string>,
    public value: Specification.AttributeValue,
    public noUpdateState: boolean = false,
    public noComputeLayout: boolean = false
  ) {
    super();
  }

  public digest() {
    return {
      name: "SetObjectProperty",
      object: objectDigest(this.object),
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
      plotSegment: objectDigest(this.plotSegment),
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
      glyph: objectDigest(this.glyph),
      fromIndex: this.fromIndex,
      toIndex: this.toIndex
    };
  }
}

export class SelectGlyph extends Action {
  constructor(
    public plotSegment: Specification.PlotSegment,
    public glyph: Specification.Glyph,
    public glyphIndex: number = null
  ) {
    super();
  }

  public digest() {
    return {
      name: "SelectGlyph",
      plotSegment: objectDigest(this.plotSegment),
      glyph: objectDigest(this.glyph),
      glyphIndex: this.glyphIndex
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
      glyph: objectDigest(this.chartElement),
      glyphIndex: this.glyphIndex
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
