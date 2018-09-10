// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import {
  Dataset,
  deepClone,
  Expression,
  getByName,
  Prototypes,
  Specification
} from "../../core";

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
  /** Get the file extension */
  getFileExtension(): string;
  /** Generate the exported template, return a base64 string encoding the file */
  generate(properties: { [name: string]: any }): Promise<string>;
}

export class ChartTemplateBuilder {
  protected template: Specification.Template.ChartTemplate;
  protected tableColumns: { [name: string]: Set<string> };
  private objectVisited: { [id: string]: boolean };

  constructor(
    public readonly chart: Specification.Chart,
    public readonly dataset: Dataset.Dataset,
    public readonly manager: Prototypes.ChartStateManager
  ) {}

  public reset() {
    this.template = {
      specification: deepClone(this.chart),
      tables: [],
      inference: [],
      properties: []
    };
    this.tableColumns = {};
    this.objectVisited = {};
  }

  public addColumn(table: string, column: string) {
    if (table == null) {
      table = this.dataset.tables[0].name;
    }
    const tableObject = getByName(this.dataset.tables, table);
    if (tableObject) {
      if (getByName(tableObject.columns, column)) {
        if (this.tableColumns[table]) {
          this.tableColumns[table].add(column);
        } else {
          this.tableColumns[table] = new Set([column]);
        }
      }
    }
  }

  public addColumnsFromExpression(
    table: string,
    expr: string,
    textExpression?: boolean
  ) {
    console.log(table, expr, textExpression);
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
    }
    return pn;
  }

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
              if (mapping.type == "scale") {
                const scaleMapping = mapping as Specification.ScaleMapping;
                expressions.add(scaleMapping.expression);
                if (item.kind == "glyph" || item.kind == "mark") {
                  table = item.glyph.table;
                  // Find the plot segment
                  for (const ps of Prototypes.forEachObject(
                    this.template.specification
                  )) {
                    if (
                      ps.kind == "chart-element" &&
                      Prototypes.isType(ps.object.classID, "plot-segment")
                    ) {
                      groupBy = (ps.chartElement as Specification.PlotSegment)
                        .groupBy;
                      break; // TODO: for now, we assume it's the first one
                    }
                  }
                }
              }
            }
          }
          inference.scale.expressions = Array.from(expressions);
          if (!inference.dataSource) {
            inference.dataSource = {
              table,
              groupBy
            };
          }
        }
        if (inference.expression) {
          this.addColumnsFromExpression(
            inference.dataSource.table,
            inference.expression.expression
          );
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
    // Get mappings
    for (const [, mapping] of Prototypes.forEachMapping(
      objectClass.object.mappings
    )) {
      if (mapping.type == "scale") {
        const scaleMapping = mapping as Specification.ScaleMapping;
        this.addColumnsFromExpression(
          scaleMapping.table,
          scaleMapping.expression
        );
      }
      if (mapping.type == "text") {
        const textMapping = mapping as Specification.TextMapping;
        this.addColumnsFromExpression(
          textMapping.table,
          textMapping.textExpression,
          true
        );
      }
    }
  }

  public build(): Specification.Template.ChartTemplate {
    this.reset();

    const template = this.template;

    for (const elementClass of this.manager.getElements()) {
      let table = null;
      if (Prototypes.isType(elementClass.object.classID, "plot-segment")) {
        const plotSegment = elementClass.object as Specification.PlotSegment;
        table = plotSegment.table;
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

    // Extract data tables
    template.tables = this.dataset.tables
      .map(table => {
        if (this.tableColumns.hasOwnProperty(table.name)) {
          return {
            name: table.name,
            columns: table.columns
              .filter(x => {
                return this.tableColumns[table.name].has(x.name);
              })
              .map(x => ({
                displayName: x.name,
                name: x.name,
                type: x.type,
                metadata: x.metadata
              }))
          };
        } else {
          return null;
        }
      })
      .filter(x => x != null);

    return template;
  }
}
