// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import {
  Dataset,
  deepClone,
  Expression,
  getById,
  makeRange,
  Prototypes,
  Scale,
  Specification
} from "../core";
import {
  findObjectById,
  forEachMapping,
  forEachObject,
  getProperty,
  setProperty,
  DefaultAttributes
} from "../core/prototypes";
import { CompiledGroupBy } from "../core/prototypes/group_by";

export interface TemplateInstance {
  chart: Specification.Chart;
  defaultAttributes: DefaultAttributes;
}

/** Represents a chart template */
export class ChartTemplate {
  private template: Specification.Template.ChartTemplate;
  /**
   * Mapping of tables. Chart contains table and column names used in the designer app.
   * But data set can have column or table names with different names. It needs for expressions
   */
  private tableAssignment: { [name: string]: string };
  /**
   * Mapping of columns. Chart contains table and column names used in the designer app.
   * But data set can have column or table names with different names It needs for expressions
   */
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

  public transformGroupBy(
    groupBy: Specification.Types.GroupBy,
    table: string
  ): Specification.Types.GroupBy {
    if (!groupBy) {
      return null;
    }
    if (groupBy.expression) {
      return {
        expression: this.transformExpression(groupBy.expression, table)
      };
    }
  }

  /** Creates instance of chart object from template. Chart objecty can be loaded into container to display it in canvas */
  public instantiate(
    dataset: Dataset.Dataset,
    inference: boolean = true
  ): TemplateInstance {
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
    if (!inference) {
      return {
        chart,
        defaultAttributes: this.template.defaultAttributes
      };
    }

    const df = new Prototypes.Dataflow.DataflowManager(dataset);
    const getExpressionVector = (
      expression: string,
      table: string,
      groupBy?: Specification.Types.GroupBy
    ): any[] => {
      const expr = Expression.parse(expression);
      const tableContext = df.getTable(table);
      const indices = groupBy
        ? new CompiledGroupBy(groupBy, df.cache).groupBy(tableContext)
        : makeRange(0, tableContext.rows.length).map(x => [x]);
      return indices.map(is =>
        expr.getValue(tableContext.getGroupedContext(is))
      );
    };

    // Perform inferences
    for (const inference of this.template.inference) {
      const object = findObjectById(chart, inference.objectID);
      if (inference.expression) {
        const expr = this.transformExpression(
          inference.expression.expression,
          inference.dataSource.table
        );
        setProperty(object, inference.expression.property, expr);
      }
      if (inference.axis) {
        const axis = inference.axis;
        if (axis.type == "default") {
          continue;
        }
        const expression = this.transformExpression(
          inference.axis.expression,
          inference.dataSource.table
        );
        const axisDataBinding = getProperty(
          object,
          axis.property
        ) as Specification.Types.AxisDataBinding;
        axisDataBinding.expression = expression;
        if (axisDataBinding.tickDataExpression) {
          axisDataBinding.tickDataExpression = null; // TODO: fixme
        }
        if (!inference.disableAutoMin || !inference.disableAutoMax) {
          // disableAuto flag responsible for disabling/enabling configulration scale domains when new data is coming
          // If disableAuto is true, the same scales will be used for data
          // Example: If disableAuto is true, axis values will be same for all new data sets.
          let vector = getExpressionVector(
            expression,
            this.tableAssignment[inference.dataSource.table],
            this.transformGroupBy(
              inference.dataSource.groupBy,
              inference.dataSource.table
            )
          );
          if (inference.axis.additionalExpressions) {
            for (const item of inference.axis.additionalExpressions) {
              const expr = this.transformExpression(
                item,
                inference.dataSource.table
              );
              vector = vector.concat(
                getExpressionVector(
                  expr,
                  this.tableAssignment[inference.dataSource.table],
                  this.transformGroupBy(
                    inference.dataSource.groupBy,
                    inference.dataSource.table
                  )
                )
              );
            }
          }
          if (axis.type == "categorical") {
            const scale = new Scale.CategoricalScale();
            scale.inferParameters(vector, "order");
            axisDataBinding.categories = new Array<string>(scale.domain.size);
            scale.domain.forEach((index, key) => {
              axisDataBinding.categories[index] = key;
            });
          } else if (axis.type == "numerical") {
            const scale = new Scale.LinearScale();
            scale.inferParameters(vector);
            if (!inference.disableAutoMin) {
              axisDataBinding.domainMin = scale.domainMin;
            }
            if (!inference.disableAutoMax) {
              axisDataBinding.domainMax = scale.domainMax;
            }
          }
        }
      }
      if (inference.scale) {
        if (!inference.disableAutoMin || !inference.disableAutoMax) {
          const scale = inference.scale;
          const expressions = scale.expressions.map(x =>
            this.transformExpression(x, inference.dataSource.table)
          );
          const vectors = expressions.map(x =>
            getExpressionVector(
              x,
              this.tableAssignment[inference.dataSource.table],
              this.transformGroupBy(
                inference.dataSource.groupBy,
                inference.dataSource.table
              )
            )
          );

          if (!inference.disableAutoMin) {
            vectors.push([object.properties.domainMin]);
          }
          if (!inference.disableAutoMax) {
            vectors.push([object.properties.domainMax]);
          }
          const vector = vectors.reduce((a, b) => a.concat(b), []);
          const scaleClass = Prototypes.ObjectClasses.Create(null, object, {
            attributes: {}
          }) as Prototypes.Scales.ScaleClass;
          scaleClass.inferParameters(vector, {
            reuseRange: true
          });
        }
      }
      if (inference.nestedChart) {
        const { nestedChart } = inference;
        const columnNameMap: { [name: string]: string } = {};
        Object.keys(nestedChart.columnNameMap).forEach(key => {
          const newKey = this.columnAssignment[inference.dataSource.table][key];
          columnNameMap[newKey] = nestedChart.columnNameMap[key];
        });
        setProperty(object, "columnNameMap", columnNameMap);
      }
    }
    return {
      chart,
      defaultAttributes: this.template.defaultAttributes
    };
  }

  public static SetChartProperty(
    chart: Specification.Chart,
    objectID: string,
    property: Specification.Template.PropertyField,
    value: Specification.AttributeValue
  ) {
    const obj = Prototypes.findObjectById(chart, objectID);
    if (!obj) {
      return;
    }
    Prototypes.setProperty(obj, property, value);
  }
  public static GetChartProperty(
    chart: Specification.Chart,
    objectID: string,
    property: Specification.Template.PropertyField
  ): Specification.AttributeValue {
    const obj = Prototypes.findObjectById(chart, objectID);
    if (!obj) {
      return null;
    }
    return Prototypes.getProperty(obj, property);
  }
  public static SetChartAttributeMapping(
    chart: Specification.Chart,
    objectID: string,
    attribute: string,
    value: Specification.Mapping
  ) {
    const obj = Prototypes.findObjectById(chart, objectID);
    if (!obj) {
      return;
    }
    obj.mappings[attribute] = value;
  }
  public static GetChartAttributeMapping(
    chart: Specification.Chart,
    objectID: string,
    attribute: string
  ): any {
    const obj = Prototypes.findObjectById(chart, objectID);
    if (!obj) {
      return null;
    }
    return obj.mappings[attribute];
  }
}
