/*
Copyright (c) Microsoft Corporation. All rights reserved.
Licensed under the MIT license.
*/

import {
  Color,
  Dataset,
  deepClone,
  Expression,
  getByName,
  Prototypes,
  Scale,
  Specification,
  getById
} from "../core";
import { getDefaultColorPalette } from "../core/prototypes/scales/categorical";

import {
  findObjectById,
  forEachObject,
  forEachMapping,
  getProperty,
  setProperty
} from "../core/prototypes";

import { CompiledGroupBy } from "../core/prototypes/group_by";

/** Represents a chart template */
export class ChartTemplate {
  private template: Specification.Template.ChartTemplate;
  private tableAssignment: { [name: string]: string };
  private columnAssignment: { [name: string]: { [name: string]: string } };

  /** Create a chart template */
  constructor(template: Specification.Template.ChartTemplate) {
    this.template = template;
    this.columnAssignment = {};
    this.tableAssignment = {};
  }

  public getDatasetSchema() {
    return this.template.tables;
  }

  /** Reset slot assignments */
  public reset() {
    this.columnAssignment = {};
    this.tableAssignment = {};
  }

  /** Assign a table */
  public assignTable(tableName: string, table: string) {
    this.tableAssignment[tableName] = table;
  }

  /** Assign an expression to a data mapping slot */
  public assignColumn(tableName: string, columnName: string, column: string) {
    if (!this.columnAssignment.hasOwnProperty(tableName)) {
      this.columnAssignment[tableName] = {};
    }
    this.columnAssignment[tableName][columnName] = column;
  }

  /** Get variable map for a given table */
  public getVariableMap(table: string) {
    if (this.columnAssignment[table]) {
      return this.columnAssignment[table];
    } else {
      return {};
    }
  }

  public transformExpression(expr: string, table?: string) {
    return Expression.parse(expr)
      .replace(Expression.variableReplacer(this.getVariableMap(table)))
      .toString();
  }

  public transformTextExpression(expr: string, table?: string) {
    return Expression.parseTextExpression(expr)
      .replace(Expression.variableReplacer(this.getVariableMap(table)))
      .toString();
  }

  public instantiate(dataset: Dataset.Dataset) {
    // Make a copy of the chart spec so we won't touch the original template data
    const chart = deepClone(this.template.specification);

    // Transform table and expressions with current assignments
    for (const item of forEachObject(chart)) {
      // Replace table with assigned table
      if (item.kind == "chart-element") {
        // PlotSegment
        if (Prototypes.isType(item.chartElement.classID, "plot-segment")) {
          const plotSegment = item.chartElement as Specification.PlotSegment;
          const originalTable = plotSegment.table;
          plotSegment.table = this.tableAssignment[originalTable];
          // Also fix filter and gropyBy expressions
          if (plotSegment.filter) {
            if (plotSegment.filter.categories) {
              plotSegment.filter.categories.expression = this.transformExpression(
                plotSegment.filter.categories.expression,
                originalTable
              );
            }
            if (plotSegment.filter.expression) {
              plotSegment.filter.expression = this.transformExpression(
                plotSegment.filter.expression,
                originalTable
              );
            }
          }
          if (plotSegment.groupBy) {
            if (plotSegment.groupBy.expression) {
              plotSegment.groupBy.expression = this.transformExpression(
                plotSegment.groupBy.expression,
                originalTable
              );
            }
          }
        }
        // Links
        if (Prototypes.isType(item.chartElement.classID, "links")) {
          if (item.chartElement.classID == "links.through") {
            const props = item.chartElement
              .properties as Prototypes.Links.LinksProperties;
            if (props.linkThrough.facetExpressions) {
              props.linkThrough.facetExpressions = props.linkThrough.facetExpressions.map(
                x =>
                  this.transformExpression(
                    x,
                    (getById(
                      this.template.specification.elements,
                      props.linkThrough.plotSegment
                    ) as Specification.PlotSegment).table
                  )
              );
            }
          }
          if (item.chartElement.classID == "links.table") {
            const props = item.chartElement
              .properties as Prototypes.Links.LinksProperties;
            props.linkTable.table = this.tableAssignment[props.linkTable.table];
          }
        }
      }
      // Glyphs
      if (item.kind == "glyph") {
        item.glyph.table = this.tableAssignment[item.glyph.table];
      }

      // Replace data-mapping expressions with assigned columns
      const mappings = item.object.mappings;
      for (const [attr, mapping] of forEachMapping(mappings)) {
        if (mapping.type == "scale") {
          const scaleMapping = mapping as Specification.ScaleMapping;
          scaleMapping.expression = this.transformExpression(
            scaleMapping.expression,
            scaleMapping.table
          );
          scaleMapping.table = this.tableAssignment[scaleMapping.table];
        }
        if (mapping.type == "text") {
          const textMapping = mapping as Specification.TextMapping;
          textMapping.textExpression = this.transformTextExpression(
            textMapping.textExpression,
            textMapping.table
          );
          textMapping.table = this.tableAssignment[textMapping.table];
        }
      }
    }

    const df = new Prototypes.Dataflow.DataflowManager(dataset);
    const getExpressionVector = (
      expression: string,
      table: string,
      groupBy?: Specification.Types.GroupBy
    ): any[] => {
      const expr = Expression.parse(expression);
      const tableContext = df.getTable(table);
      const groupByCompiled = new CompiledGroupBy(groupBy, df.cache);
      const indices = groupByCompiled.groupBy(tableContext);
      return indices.map(is =>
        expr.getValue(tableContext.getGroupedContext(is))
      );
    };

    // Perform inferences
    for (const inference of this.template.inference) {
      const object = findObjectById(chart, inference.objectID);
      if (inference.axis) {
        const axis = inference.axis;
        if (axis.type == "default") {
          continue;
        }
        const expression = this.transformExpression(
          inference.axis.expression,
          inference.dataSource.table
        );
        const vector = getExpressionVector(
          expression,
          inference.dataSource.table,
          inference.dataSource.groupBy
        );
        if (axis.type == "categorical") {
        } else if (axis.type == "numerical") {
        }
      } else if (inference.scale) {
        const scale = inference.scale;
        switch (
          scale.classID
          // TODO: add scale inference
        ) {
        }
        //   const expression = this.transformExpression(
        //     inference.scale.expression,
        //     inference.dataSource.table
        //   );
        //   const vector = getExpressionVector(
        //     expression,
        //     inference.dataSource.table,
        //     inference.dataSource.groupBy
        //   );
      } else if (inference.expression) {
        const expr = this.transformExpression(
          inference.expression.expression,
          inference.dataSource.table
        );
        setProperty(object, inference.expression.property, expr);
      }
      //   const axis = inference as Specification.Template.Axis;
      //   const expression = this.slotAssignment[axis.slotName];
      //   const slot = getByName(
      //     this.template.dataSlots,
      //     axis.slotName
      //   );
      //   if (expression == null || slot == null) {
      //     continue;
      //   }
      //   const original = getProperty(
      //     object,
      //     axis.property,
      //     axis.fields
      //   ) as Specification.Types.AxisDataBinding;
      //   original.expression = expression;
      //   // Infer scale domain or mapping
      //   const columnVector = getExpressionVector(
      //     this.tableAssignment[slot.table],
      //     expression
      //   );
      //   switch (original.type) {
      //     case "categorical":
      //       {
      //         const scale = new Scale.CategoricalScale();
      //         scale.inferParameters(columnVector, "order");
      //         original.categories = new Array<string>(
      //           scale.domain.size
      //         );
      //         scale.domain.forEach((index, key) => {
      //           original.categories[index] = key;
      //         });
      //       }
      //       break;
      //     case "numerical":
      //       {
      //         const scale = new Scale.NumericalScale();
      //         scale.inferParameters(columnVector);
      //         original.domainMin = scale.domainMin;
      //         original.domainMax = scale.domainMax;
      //       }
      //       break;
      //   }

      //   setProperty(
      //     object,
      //     axis.property,
      //     axis.fields,
      //     original
      //   );
      // }
      // if (inference.scale) {
      //   const scale = inference as Specification.Template.Scale;
      //   const expression = this.slotAssignment[scale.slotName];
      //   const slot = getByName(
      //     this.template.dataSlots,
      //     scale.slotName
      //   );
      //   // TODO: infer scale domain or mapping
      //   const columnVector = getExpressionVector(
      //     this.tableAssignment[slot.table],
      //     expression
      //   );
      //   switch (scale.slotKind) {
      //     case "numerical":
      //       {
      //         const s = new Scale.NumericalScale();
      //         s.inferParameters(columnVector);
      //         object.properties[scale.properties.min] = s.domainMin;
      //         object.properties[scale.properties.max] = s.domainMax;
      //         // Zero domain min for now.
      //         object.properties[scale.properties.min] = 0;
      //       }
      //       break;
      //     case "categorical":
      //       {
      //         const s = new Scale.CategoricalScale();
      //         s.inferParameters(columnVector, "order");
      //         switch (scale.rangeType) {
      //           case "number":
      //             {
      //               const mapping: { [name: string]: number } = {};
      //               s.domain.forEach((index, key) => {
      //                 mapping[key] = index;
      //               });
      //               object.properties[
      //                 scale.properties.mapping
      //               ] = mapping;
      //             }
      //             break;
      //           case "color": {
      //             const mapping: { [name: string]: Color } = {};
      //             const palette = getDefaultColorPalette(
      //               s.domain.size
      //             );
      //             s.domain.forEach((index, key) => {
      //               mapping[key] = palette[index % palette.length];
      //             });
      //             object.properties[
      //               scale.properties.mapping
      //             ] = mapping;
      //           }
      //         }
      //       }
      //       break;
      //   }
      // }
      // if (inference.order) {
      //   const order = inference as Specification.Template.Order;
      //   const expression = this.slotAssignment[order.slotName];
      //   const slot = getByName(
      //     this.template.dataSlots,
      //     order.slotName
      //   );
      //   setProperty(
      //     object,
      //     order.property,
      //     order.field,
      //     "sortBy((x) => x." + expression + ")"
      //   );
      // }
      // if (inference.slotList) {
      //   const slotList = inference as Specification.Template.SlotList;
      //   const expressions = slotList.slots.map(slot => {
      //     return this.slotAssignment[slot.slotName];
      //   });
      //   setProperty(
      //     object,
      //     slotList.property,
      //     slotList.fields,
      //     expressions
      //   );
      // }
      // break;
    }

    return new ChartTemplateInstance(chart, dataset);
  }
}

export class ChartTemplateInstance {
  constructor(
    public readonly chart: Specification.Chart,
    public readonly dataset: Dataset.Dataset
  ) {}

  public getProperties() {}

  public getProperty(id: string) {}

  public setProperty(id: string, value: any) {}
}
