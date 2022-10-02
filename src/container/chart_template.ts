// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import {
  Dataset,
  deepClone,
  defineCategories,
  Expression,
  getById,
  makeRange,
  Prototypes,
  Scale,
  Specification,
} from "../core";
import {
  findObjectById,
  forEachMapping,
  forEachObject,
  getProperty,
  setProperty,
  DefaultAttributes,
} from "../core/prototypes";
import { CompiledGroupBy } from "../core/prototypes/group_by";
import { OrderMode } from "../core/specification/types";
import { DataAxisExpression } from "../core/prototypes/marks/data_axis.attrs";
import { MappingType, ScaleMapping, ValueMapping } from "../core/specification";
import { Region2DSublayoutOptions } from "../core/prototypes/plot_segments/region_2d/base";
import { GuideAttributeNames } from "../core/prototypes/guides";
import { scaleLinear } from "d3-scale";

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
    if (
      !Object.prototype.hasOwnProperty.call(this.columnAssignment, tableName)
    ) {
      this.columnAssignment[tableName] = {};
    }
    this.columnAssignment[tableName][columnName] = column;
  }

  /** Get variable map for a given table */
  public getVariableMap(table: string) {
    let variableMap = {};
    if (this.columnAssignment[table]) {
      variableMap = {
        ...this.columnAssignment[table],
      };
    }
    if (this.tableAssignment) {
      variableMap = {
        ...variableMap,
        ...this.tableAssignment,
      };
    }

    return variableMap;
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
        expression: this.transformExpression(groupBy.expression, table),
      };
    }
  }

  /**
   * Creates instance of chart object from template. Chart object can be loaded into container to display it in canvas
   * On editing this method ensure that you made correspond changes in template builder ({@link ChartTemplateBuilder}).
   * Any exposed into template objects should be initialized here
   */

  // eslint-disable-next-line
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
        // legend with column names
        if (Prototypes.isType(item.chartElement.classID, "legend.custom")) {
          const scaleMapping = item.chartElement.mappings
            .mappingOptions as ScaleMapping;
          scaleMapping.expression = this.transformExpression(
            scaleMapping.expression,
            scaleMapping.table
          );
        }

        // Guide
        if (Prototypes.isType(item.chartElement.classID, "guide.guide")) {
          const valueProp = this.template.properties.filter(
            (p) =>
              p.objectID === item.chartElement._id &&
              p.target.attribute === GuideAttributeNames.value
          )[0];
          if (valueProp) {
            const valueMapping: Specification.ValueMapping = {
              type: MappingType.value,
              value: valueProp.default as number,
            };
            item.chartElement.mappings.value = valueMapping;
          }
        }

        // PlotSegment
        if (Prototypes.isType(item.chartElement.classID, "plot-segment")) {
          const plotSegment = item.chartElement as Specification.PlotSegment;
          const originalTable = plotSegment.table;
          plotSegment.table = this.tableAssignment[originalTable];
          // Also fix filter and groupyBy expressions
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
          if (plotSegment.properties.xData) {
            if ((plotSegment.properties.xData as any).expression) {
              (plotSegment.properties
                .xData as any).expression = this.transformExpression(
                (plotSegment.properties.xData as any).expression,
                originalTable
              );
            }
            if ((plotSegment.properties.xData as any).rawExpression) {
              (plotSegment.properties
                .xData as any).rawExpression = this.transformExpression(
                (plotSegment.properties.xData as any).rawExpression,
                originalTable
              );
            }
          }
          if (plotSegment.properties.yData) {
            if ((plotSegment.properties.yData as any).expression) {
              (plotSegment.properties
                .yData as any).expression = this.transformExpression(
                (plotSegment.properties.yData as any).expression,
                originalTable
              );
            }
            if ((plotSegment.properties.yData as any).rawExpression) {
              (plotSegment.properties
                .yData as any).rawExpression = this.transformExpression(
                (plotSegment.properties.yData as any).rawExpression,
                originalTable
              );
            }
          }
          if (plotSegment.properties.axis) {
            if ((plotSegment.properties.axis as any).expression) {
              (plotSegment.properties
                .axis as any).expression = this.transformExpression(
                (plotSegment.properties.axis as any).expression,
                originalTable
              );
            }
            if ((plotSegment.properties.axis as any).rawExpression) {
              (plotSegment.properties
                .axis as any).rawExpression = this.transformExpression(
                (plotSegment.properties.axis as any).rawExpression,
                originalTable
              );
            }
          }
          if (plotSegment.properties.sublayout) {
            const expression = (plotSegment.properties
              .sublayout as Region2DSublayoutOptions).order?.expression;
            if (expression) {
              (plotSegment.properties
                .sublayout as Region2DSublayoutOptions).order.expression = this.transformExpression(
                expression,
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
                (x) =>
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

      if (item.kind == "mark") {
        if (Prototypes.isType(item.mark.classID, "mark.data-axis")) {
          try {
            const glyphId = item.glyph._id;

            const glyphPlotSegment = [...forEachObject(chart)].find(
              (item) =>
                item.kind == "chart-element" &&
                Prototypes.isType(item.chartElement.classID, "plot-segment") &&
                (item.chartElement as any).glyph === glyphId
            );

            const dataExpressions = item.mark.properties
              .dataExpressions as DataAxisExpression[];

            // table name in plotSegment can be replaced already
            const table =
              Object.keys(this.tableAssignment).find(
                (key) =>
                  this.tableAssignment[key] ===
                  (glyphPlotSegment.chartElement as any).table
              ) || (glyphPlotSegment.chartElement as any).table;

            dataExpressions.forEach((expression) => {
              expression.expression = this.transformExpression(
                expression.expression,
                table
              );
            });
          } catch (ex) {
            console.error(ex);
          }
        }
      }

      // Replace data-mapping expressions with assigned columns
      const mappings = item.object.mappings;
      for (const [, mapping] of forEachMapping(mappings)) {
        if (mapping.type == MappingType.scale) {
          const scaleMapping = mapping as Specification.ScaleMapping;
          scaleMapping.expression = this.transformExpression(
            scaleMapping.expression,
            scaleMapping.table
          );
          scaleMapping.table = this.tableAssignment[scaleMapping.table];
        }
        if (mapping.type == MappingType.text) {
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
        defaultAttributes: this.template.defaultAttributes,
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
        : makeRange(0, tableContext.rows.length).map((x) => [x]);
      return indices.map((is) =>
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
        if (inference.autoDomainMin || inference.autoDomainMax) {
          // disableAuto flag responsible for disabling/enabling configuration scale domains when new data is coming
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
            scale.inferParameters(
              vector,
              inference.axis.orderMode || OrderMode.order
            );
            axisDataBinding.categories = new Array<string>(scale.domain.size);
            const newData = new Array<string>(scale.domain.size);

            scale.domain.forEach((index, key) => {
              newData[index] = key;
            });
            // try to save given order from template
            if (
              axisDataBinding.order &&
              axisDataBinding.orderMode === OrderMode.order
            ) {
              axisDataBinding.order = axisDataBinding.order.filter((value) =>
                scale.domain.has(value)
              );
              const newItems = newData.filter(
                (category) =>
                  !axisDataBinding.order.find((order) => order === category)
              );
              axisDataBinding.categories = new Array<string>(
                axisDataBinding.order.length
              );
              axisDataBinding.order.forEach((value, index) => {
                axisDataBinding.categories[index] = value;
              });
              axisDataBinding.categories = axisDataBinding.categories.concat(
                newItems
              );
              axisDataBinding.order = axisDataBinding.order.concat(newItems);
            } else {
              axisDataBinding.categories = new Array<string>(scale.domain.size);
              scale.domain.forEach((index, key) => {
                axisDataBinding.categories[index] = key;
              });
            }
            axisDataBinding.allCategories = deepClone(
              axisDataBinding.categories
            );

            if (axisDataBinding.allowScrolling) {
              const start = Math.floor(
                ((axisDataBinding.categories.length -
                  axisDataBinding.windowSize) /
                  100) *
                  axisDataBinding.scrollPosition
              );
              axisDataBinding.categories = axisDataBinding.categories.slice(
                start,
                start + axisDataBinding.windowSize
              );
            }
          } else if (axis.type == "numerical") {
            const scale = new Scale.LinearScale();
            scale.inferParameters(vector);
            if (inference.autoDomainMin) {
              axisDataBinding.dataDomainMin = scale.domainMin;
              axisDataBinding.domainMin = scale.domainMin;
            }
            if (inference.autoDomainMax) {
              axisDataBinding.dataDomainMax = scale.domainMax;
              axisDataBinding.domainMax = scale.domainMax;
            }
            if (axisDataBinding.allowScrolling) {
              const scrollScale = scaleLinear()
                .domain([0, 100])
                .range([
                  axisDataBinding.dataDomainMin,
                  axisDataBinding.dataDomainMax,
                ]);
              const start = scrollScale(axisDataBinding.scrollPosition);
              axisDataBinding.domainMin = start;
              axisDataBinding.domainMax = start + axisDataBinding.windowSize;
            } else {
              if (inference.autoDomainMin) {
                axisDataBinding.dataDomainMin = scale.domainMin;
              }
              if (inference.autoDomainMax) {
                axisDataBinding.dataDomainMax = scale.domainMax;
              }
            }
            if (axis.defineCategories) {
              axisDataBinding.categories = defineCategories(vector);
            }
          }
        }
      }
      if (inference.scale) {
        // uses disableAutoMin disableAutoMax for handle old templates
        // copy old parameters to new
        if (
          inference.autoDomainMin == null &&
          inference.disableAutoMin != null
        ) {
          inference.autoDomainMin = !inference.disableAutoMin;
        }
        // copy old parameters to new
        if (
          inference.autoDomainMax == null &&
          inference.disableAutoMax != null
        ) {
          inference.autoDomainMax = !inference.disableAutoMax;
        }
        if (inference.autoDomainMin || inference.autoDomainMax) {
          const scale = inference.scale;
          const expressions = scale.expressions.map((x) =>
            this.transformExpression(x, inference.dataSource.table)
          );
          const vectors = expressions.map((x) =>
            getExpressionVector(
              x,
              this.tableAssignment[inference.dataSource.table],
              this.transformGroupBy(
                inference.dataSource.groupBy,
                inference.dataSource.table
              )
            )
          );

          const vector = vectors.reduce((a, b) => a.concat(b), []);
          const scaleClass = Prototypes.ObjectClasses.Create(null, object, {
            attributes: {},
          }) as Prototypes.Scales.ScaleClass;

          if (object.classID === "scale.categorical<string,color>") {
            scaleClass.inferParameters(vector, {
              reuseRange: true,
              extendScaleMin: true,
              extendScaleMax: true,
            });
          } else {
            scaleClass.inferParameters(vector, {
              extendScaleMax: inference.autoDomainMax,
              extendScaleMin: inference.autoDomainMin,
              reuseRange: true,
              rangeNumber: [
                (object.mappings.rangeMin as ValueMapping)?.value as number,
                (object.mappings.rangeMax as ValueMapping)?.value as number,
              ],
            });
          }
        }
      }
      if (inference.nestedChart) {
        const { nestedChart } = inference;
        const columnNameMap: { [name: string]: string } = {};
        Object.keys(nestedChart.columnNameMap).forEach((key) => {
          const newKey = this.columnAssignment[inference.dataSource.table][key];
          columnNameMap[newKey] = nestedChart.columnNameMap[key];
        });
        setProperty(object, "columnNameMap", columnNameMap);
      }
    }
    return {
      chart,
      defaultAttributes: this.template.defaultAttributes,
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
