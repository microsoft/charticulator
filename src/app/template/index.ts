/**
 * The {@link ChartTemplateBuilder} creates template ({@link ChartTemplate}) from the current chart.
 * {@link ChartTemplate} contains simplified version of {@link Chart} object in {@link ChartTemplate.specification} property.
 * Template can be exported as *.tmplt file (JSON format). It also uses on export to HTML file or on export as Power BI visual.
 *
 * Template can be loaded into container outside of Charticulator app to visualize with custom dataset.
 *
 * @packageDocumentation
 * @preferred
 */

// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import {
  Dataset,
  deepClone,
  Expression,
  getById,
  getByName,
  isReservedColumnName,
  Prototypes,
  Specification,
} from "../../core";
import { TableType } from "../../core/dataset";
import {
  forEachMapping,
  forEachObject,
  ObjectItemKind,
} from "../../core/prototypes";
import { DataAxisExpression } from "../../core/prototypes/marks/data_axis.attrs";
import { Region2DSublayoutOptions } from "../../core/prototypes/plot_segments/region_2d/base";
import { MappingType, ScaleMapping } from "../../core/specification";

export interface ExportTemplateTargetProperty {
  displayName: string;
  name: string;
  type: string;
  default: any;
}

/** Represents target chart template export format */
export interface ExportTemplateTarget {
  /** Get export format properties, such as template name, author */
  getProperties(): ExportTemplateTargetProperty[];
  /** Get the file name of the exported artifact */
  getFileName?(properties: { [name: string]: any }): string;
  /** Deprecated: get the file extension of the exported artifact */
  getFileExtension?(properties: { [name: string]: any }): string;
  /** Generate the exported template, return a base64 string encoding the file */
  generate(properties: { [name: string]: any }): Promise<string>;
}

/** Class builds the template from given {@link Specification.Chart} object  */
export class ChartTemplateBuilder {
  protected template: Specification.Template.ChartTemplate;
  protected tableColumns: { [name: string]: Set<string> };
  private objectVisited: { [id: string]: boolean };

  constructor(
    public readonly chart: Specification.Chart,
    public readonly dataset: Dataset.Dataset,
    public readonly manager: Prototypes.ChartStateManager,
    public readonly version: string
  ) {}

  public reset() {
    this.template = {
      specification: deepClone(this.chart),
      defaultAttributes: {},
      tables: [],
      inference: [],
      properties: [],
      version: this.version,
    };
    this.tableColumns = {};
    this.objectVisited = {};
  }

  public addTable(table: string) {
    if (!Object.prototype.hasOwnProperty.call(this.tableColumns, table)) {
      this.tableColumns[table] = new Set();
    }
  }

  public addColumn(table: string, columnName: string) {
    if (table == null) {
      table = this.dataset.tables[0].name;
    }
    const tableObject = getByName(this.dataset.tables, table);
    if (tableObject) {
      const column = getByName(tableObject.columns, columnName);
      if (column) {
        if (column.metadata.isRaw) {
          const notRawColumn = tableObject.columns.find(
            (col) => col.metadata.rawColumnName === column.name
          );
          if (Object.prototype.hasOwnProperty.call(this.tableColumns, table)) {
            this.tableColumns[table].add(notRawColumn.name);
          } else {
            this.tableColumns[table] = new Set([notRawColumn.name]);
          }
        }
        // eslint-disable-next-line
        if (Object.prototype.hasOwnProperty.call(this.tableColumns, table)) {
          this.tableColumns[table].add(columnName);
        } else {
          this.tableColumns[table] = new Set([columnName]);
        }
      }
    }
  }

  public addColumnsFromExpression(
    table: string,
    expr: string,
    textExpression?: boolean
  ) {
    if (expr) {
      let ex: Expression.Expression | Expression.TextExpression;
      if (textExpression) {
        ex = Expression.parseTextExpression(expr);
      } else {
        ex = Expression.parse(expr);
      }
      ex.replace((e: Expression.Expression) => {
        if (e instanceof Expression.Variable) {
          this.addColumn(table, e.name);
        }
      });
    }
  }

  public propertyToString(property: Specification.Template.PropertyField) {
    let pn: string;
    if (typeof property == "string" || typeof property == "number") {
      pn = property.toString();
    } else {
      pn = property.property;
      if (property.field) {
        if (
          typeof property.field == "string" ||
          typeof property.field == "number"
        ) {
          pn += "." + property.field.toString();
        } else {
          pn += "." + property.field.join(".");
        }
      }
      if (property.subfield) {
        if (
          typeof property.subfield == "string" ||
          typeof property.subfield == "number"
        ) {
          pn += "." + property.subfield.toString();
        } else {
          pn += "." + property.subfield.join(".");
        }
      }
    }
    return pn;
  }

  // eslint-disable-next-line
  public addObject(table: string, objectClass: Prototypes.ObjectClass) {
    // Visit a object only once
    if (this.objectVisited[objectClass.object._id]) {
      return;
    }
    this.objectVisited[objectClass.object._id] = true;

    const template = this.template;

    // Get template inference data
    const params = objectClass.getTemplateParameters();
    if (params && params.inferences) {
      for (const inference of params.inferences) {
        if (inference.axis) {
          this.addColumnsFromExpression(
            inference.dataSource.table,
            inference.axis.expression
          );
        }
        if (inference.scale) {
          // Find all objects that use the scale
          const expressions = new Set<string>();
          let table: string = null;
          let groupBy: Specification.Types.GroupBy = null;
          for (const item of Prototypes.forEachObject(
            this.template.specification
          )) {
            for (const [, mapping] of Prototypes.forEachMapping(
              item.object.mappings
            )) {
              if (mapping.type == MappingType.scale) {
                const scaleMapping = mapping as Specification.ScaleMapping;
                if (scaleMapping.scale == inference.objectID) {
                  expressions.add(scaleMapping.expression);
                  if (item.kind == "glyph" || item.kind == "mark") {
                    table = item.glyph.table;
                    // Find the plot segment
                    for (const ps of Prototypes.forEachObject(
                      this.template.specification
                    )) {
                      if (
                        ps.kind == "chart-element" &&
                        Prototypes.isType(ps.object.classID, "plot-segment") &&
                        item.glyph._id === (ps.chartElement as any).glyph
                      ) {
                        groupBy = (ps.chartElement as Specification.PlotSegment)
                          .groupBy;
                        break; // TODO: for now, we assume it's the first one
                      }
                    }
                  } else if (
                    item.kind == "chart-element" &&
                    Prototypes.isType(
                      item.chartElement.classID,
                      "legend.custom"
                    )
                  ) {
                    // don't add column names legend expression into inferences
                    expressions.delete(scaleMapping.expression);
                  } else if (
                    item.kind == "chart-element" &&
                    Prototypes.isType(item.chartElement.classID, "links")
                  ) {
                    const linkTable = item.object.properties.linkTable as any;
                    const defaultTable = this.dataset.tables[0];
                    table = (linkTable && linkTable.table) || defaultTable.name;
                  } else {
                    table = this.dataset.tables.find(
                      (table) => table.type === TableType.Main
                    ).name;
                  }
                }
              }
            }
          }
          if (expressions.size == 0) {
            // Scale not used
            continue;
          }
          inference.scale.expressions = Array.from(expressions);
          if (!inference.dataSource) {
            inference.dataSource = {
              table,
              groupBy,
            };
          }
        }
        if (inference.expression) {
          this.addColumnsFromExpression(
            inference.dataSource.table,
            inference.expression.expression
          );
        }
        if (inference.nestedChart) {
          const { nestedChart } = inference;
          Object.keys(nestedChart.columnNameMap).forEach((key) => {
            this.addColumn(inference.dataSource.table, key);
          });
        }
        if (inference.axis) {
          const templateObject = Prototypes.findObjectById(
            this.chart,
            inference.objectID
          );

          if (
            (templateObject.properties[
              inference.axis.property as string
            ] as any).autoDomainMin !== "undefined"
          ) {
            inference.autoDomainMin = (templateObject.properties[
              inference.axis.property as string
            ] as any).autoDomainMin as boolean;
          }
          if (
            (templateObject.properties[
              inference.axis.property as string
            ] as any).autoDomainMax !== "undefined"
          ) {
            inference.autoDomainMax = (templateObject.properties[
              inference.axis.property as string
            ] as any).autoDomainMax as boolean;
          }
          if (inference.autoDomainMax === undefined) {
            inference.autoDomainMax = true;
          }
          if (inference.autoDomainMax === undefined) {
            inference.autoDomainMax = true;
          }
        }
        template.inference.push(inference);
      }
    }
    if (params && params.properties) {
      for (const property of params.properties) {
        // Make a default display name
        let pn = "";
        if (property.target.property) {
          pn = this.propertyToString(property.target.property);
        } else if (property.target.attribute) {
          pn = property.target.attribute;
        }
        property.displayName = objectClass.object.properties.name + "/" + pn;
        template.properties.push(property);
      }
    }

    // Add filter
    const plotSegmentObj = objectClass.object as Specification.PlotSegment<any>;
    if (Prototypes.isType(plotSegmentObj.classID, "plot-segment")) {
      this.addTable(plotSegmentObj.table);
      const filter = plotSegmentObj.filter;
      if (filter) {
        const { categories, expression } = filter;
        if (expression) {
          this.addColumnsFromExpression(table, expression);
        }
        if (categories) {
          this.addColumnsFromExpression(table, categories.expression);
        }
      }

      const groupBy = plotSegmentObj.groupBy;
      if (groupBy && groupBy.expression) {
        this.addColumnsFromExpression(table, groupBy.expression);
      }
    }

    // Get mappings
    for (const [, mapping] of Prototypes.forEachMapping(
      objectClass.object.mappings
    )) {
      if (mapping.type == MappingType.scale) {
        const scaleMapping = mapping as Specification.ScaleMapping;
        this.addColumnsFromExpression(
          scaleMapping.table,
          scaleMapping.expression
        );
      }
      if (mapping.type == MappingType.text) {
        const textMapping = mapping as Specification.TextMapping;
        this.addColumnsFromExpression(
          textMapping.table,
          textMapping.textExpression,
          true
        );
      }
    }
  }

  /**
   * Builds template.
   * All exposed objects should be initialized in {@link ChartTemplate} class
   * @returns JSON structure of template
   */
  // eslint-disable-next-line
  public build(): Specification.Template.ChartTemplate {
    this.reset();

    const template = this.template;

    for (const elementClass of this.manager.getElements()) {
      let table = null;
      if (Prototypes.isType(elementClass.object.classID, "plot-segment")) {
        const plotSegment = elementClass.object as Specification.PlotSegment;
        table = plotSegment.table;
      }
      if (Prototypes.isType(elementClass.object.classID, "links")) {
        if (Prototypes.isType(elementClass.object.classID, "links.through")) {
          const facetExpressions = (elementClass.object.properties
            .linkThrough as any).facetExpressions as string[];

          const mainTable = this.dataset.tables.find(
            (table) => table.type === TableType.Main
          );
          this.addTable(mainTable.name);
          for (const expression of facetExpressions) {
            this.addColumn(mainTable.name, expression);
          }
        }
        const linkTable = elementClass.object.properties
          .linkTable as Specification.AttributeMap;
        if (linkTable) {
          const linksTableName = linkTable.table as string;
          this.addTable(linksTableName); // TODO get table by type
          const linksTable = this.dataset.tables.find(
            (table) => table.name === linksTableName
          );
          linksTable.columns.forEach((linksColumn) =>
            this.addColumn(linksTableName, linksColumn.name)
          );
          const table = this.dataset.tables[0];
          const idColumn =
            table && table.columns.find((column) => column.name === "id");
          if (idColumn) {
            this.addColumn(table.name, idColumn.name);
          }
        }
      }
      this.addObject(table, elementClass);
      if (Prototypes.isType(elementClass.object.classID, "plot-segment")) {
        const plotSegmentState = elementClass.state as Specification.PlotSegmentState;
        for (const glyph of plotSegmentState.glyphs) {
          this.addObject(table, this.manager.getClass(glyph));
          for (const mark of glyph.marks) {
            this.addObject(table, this.manager.getClass(mark));
          }
          // Only one glyph is enough.
          break;
        }
      }
    }

    for (const scaleState of this.manager.chartState.scales) {
      this.addObject(null, this.manager.getClass(scaleState));
    }

    this.addObject(null, this.manager.getChartClass(this.manager.chartState));

    // need to foreach objects to find all used columns
    try {
      for (const item of forEachObject(this.manager.chart)) {
        if (item.kind == ObjectItemKind.ChartElement) {
          if (Prototypes.isType(item.chartElement.classID, "legend.custom")) {
            const scaleMapping = item.chartElement.mappings
              .mappingOptions as ScaleMapping;
            scaleMapping.expression = this.trackColumnFromExpression(
              scaleMapping.expression,
              scaleMapping.table
            );
          }

          if (Prototypes.isType(item.chartElement.classID, "plot-segment")) {
            const plotSegment = item.chartElement as Specification.PlotSegment;
            // need to parse all expression to get column name
            const originalTable = plotSegment.table;
            const filter = plotSegment.filter;
            if (filter && filter.expression) {
              this.trackColumnFromExpression(filter.expression, originalTable);
            }
            const groupBy = plotSegment.groupBy;
            if (groupBy && groupBy.expression) {
              this.trackColumnFromExpression(groupBy.expression, originalTable);
            }

            const xAxisExpression = (plotSegment.properties.xData as any)
              ?.expression;
            if (xAxisExpression) {
              this.trackColumnFromExpression(xAxisExpression, originalTable);
            }
            const yAxisExpression = (plotSegment.properties.yData as any)
              ?.expression;
            if (yAxisExpression) {
              this.trackColumnFromExpression(yAxisExpression, originalTable);
            }
            const axisExpression = (plotSegment.properties.axis as any)
              ?.expression;
            if (axisExpression) {
              this.trackColumnFromExpression(axisExpression, originalTable);
            }
            const sublayout = (plotSegment.properties
              .sublayout as Region2DSublayoutOptions)?.order?.expression;
            if (sublayout) {
              this.trackColumnFromExpression(sublayout, originalTable);
            }
          }

          if (Prototypes.isType(item.chartElement.classID, "links")) {
            if (item.chartElement.classID == "links.through") {
              const props = item.chartElement
                .properties as Prototypes.Links.LinksProperties;
              if (props.linkThrough.facetExpressions) {
                props.linkThrough.facetExpressions = props.linkThrough.facetExpressions.map(
                  (x) =>
                    this.trackColumnFromExpression(
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
              if (!this.usedColumns[props.linkTable.table]) {
                this.trackTable(props.linkTable.table);
              }
            }
          }
        }

        if (item.kind == "glyph") {
          if (!this.usedColumns[item.glyph.table]) {
            this.trackTable(item.glyph.table);
          }
        }

        if (item.kind === ObjectItemKind.Mark) {
          if (Prototypes.isType(item.mark.classID, "mark.nested-chart")) {
            const nestedChart = item.mark;
            const columnNameMap = Object.keys(
              nestedChart.properties.columnNameMap
            );
            const mainTable = this.usedColumns[
              this.manager.dataset.tables.find((t) => t.type === TableType.Main)
                .name
            ];
            columnNameMap.forEach(
              (columnNames) => (mainTable[columnNames] = columnNames)
            );
          }

          if (Prototypes.isType(item.mark.classID, "mark.data-axis")) {
            try {
              const glyphId = item.glyph._id;

              const glyphPlotSegment = [
                ...forEachObject(this.manager.chart),
              ].find(
                (item) =>
                  item.kind == ObjectItemKind.ChartElement &&
                  Prototypes.isType(
                    item.chartElement.classID,
                    "plot-segment"
                  ) &&
                  (item.chartElement as any).glyph === glyphId
              );

              const dataExpressions = item.mark.properties
                .dataExpressions as DataAxisExpression[];

              const table = (glyphPlotSegment.chartElement as any).table;

              dataExpressions.forEach((expression) => {
                expression.expression = this.trackColumnFromExpression(
                  expression.expression,
                  table
                );
              });
            } catch (ex) {
              console.error(ex);
            }
          }
        }

        const mappings = item.object.mappings;
        for (const [, mapping] of forEachMapping(mappings)) {
          if (mapping.type == MappingType.scale) {
            const scaleMapping = mapping as Specification.ScaleMapping;
            scaleMapping.expression = this.trackColumnFromExpression(
              scaleMapping.expression,
              scaleMapping.table
            );
            if (!this.usedColumns[scaleMapping.table]) {
              this.trackTable(scaleMapping.table);
            }
          }
          if (mapping.type == MappingType.text) {
            const textMapping = mapping as Specification.TextMapping;
            if (!this.usedColumns[textMapping.table]) {
              this.trackTable(textMapping.table);
            }
            textMapping.textExpression = this.trackColumnFromExpression(
              textMapping.textExpression,
              textMapping.table,
              true
            );
          }
        }
      }
    } catch (ex) {
      console.error(ex);
    }

    // Extract data tables
    // if usedColumns count is 0, error was happened, add all columns as used
    const noUsedColumns = Object.keys(this.usedColumns).length === 0;
    template.tables = this.dataset.tables
      .map((table) => {
        if (
          Object.prototype.hasOwnProperty.call(this.tableColumns, table.name) &&
          (this.usedColumns[table.name] || noUsedColumns)
        ) {
          return {
            name: table.name,
            type: table.type,
            columns: table.columns
              .filter((x) => {
                return (
                  (this.tableColumns[table.name].has(x.name) &&
                    this.usedColumns[table.name]?.[x.name]) ||
                  isReservedColumnName(x.name)
                );
              })
              .map((x) => ({
                displayName: x.displayName || x.name,
                name: x.name,
                type: x.type,
                metadata: x.metadata,
              })),
          };
        } else {
          return null;
        }
      })
      .filter((x) => x != null);

    this.computeDefaultAttributes();
    return template;
  }

  private usedColumns: { [name: string]: { [name: string]: string } } = {};

  private trackColumnFromExpression(
    expr: string,
    table?: string,
    isText: boolean = false
  ) {
    if (isText) {
      return Expression.parseTextExpression(expr)
        .replace(Expression.variableReplacer(this.trackTable(table)))
        .toString();
    }
    return Expression.parse(expr)
      .replace(Expression.variableReplacer(this.trackTable(table)))
      .toString();
  }

  public trackTable(table: string) {
    if (!this.usedColumns[table]) {
      this.usedColumns[table] = {
        hasOwnProperty: (v: string) => {
          this.usedColumns[table][v] = v;
          return true;
        },
      } as any;
    }
    return this.usedColumns[table];
  }

  /**
   * Computes the default attributes
   */
  private computeDefaultAttributes() {
    const counts = {} as any;

    // Go through all the mark instances
    this.manager.enumerateClassesByType("mark", (cls, state) => {
      const { _id } = cls.object;
      // Basic idea is sum up the attributes for each mark object, and then average them at the end
      const totals = (this.template.defaultAttributes[_id] =
        this.template.defaultAttributes[_id] || {});

      Object.keys(state.attributes).forEach((attribute) => {
        // Only support numbers for now
        if (
          cls.attributes[attribute] &&
          cls.attributes[attribute].type === "number"
        ) {
          totals[attribute] = totals[attribute] || 0;
          totals[attribute] += state.attributes[attribute] || 0;
          counts[_id] = (counts[_id] || 0) + 1;
        }
      });
    });

    // The default attributes are currently totals, now divide each attribute by the count to average them
    Object.keys(this.template.defaultAttributes).forEach((objId) => {
      const attribs = this.template.defaultAttributes[objId];
      Object.keys(attribs).forEach((attribute) => {
        attribs[attribute] = attribs[attribute] / counts[objId];
      });
    });
  }
}
