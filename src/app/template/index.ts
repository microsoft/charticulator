/*
Copyright (c) Microsoft Corporation. All rights reserved.
Licensed under the MIT license.
*/

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
    let ex:
      | Expression.Expression
      | Expression.TextExpression = Expression.parse(expr);
    if (textExpression) {
      ex = Expression.parseTextExpression(expr);
    }
    ex.replace((e: Expression.Expression) => {
      if (e instanceof Expression.Variable) {
        this.addColumn(table, e.name);
      }
    });
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
      // const inferences = params.inferences;
      // template.inference[objectClass.object._id] = inferences;
      // for (const item of inferences) {
      //   switch (item.type) {
      //     case "scale":
      //       {
      //         const scaleInference = item as Specification.Template.Scale;
      //         // Find the first mapping that uses this scale
      //         for (const id in this.template.mappings) {
      //           if (!this.template.mappings.hasOwnProperty(id)) {
      //             continue;
      //           }
      //           for (const mapping of this.template.mappings[id]) {
      //             if (mapping.scale == objectClass.object._id) {
      //               scaleInference.slotName = mapping.slotName;
      //             }
      //           }
      //         }
      //         if (scaleInference.slotName != null) {
      //           this.addSlot(
      //             table,
      //             scaleInference.slotName,
      //             scaleInference.slotKind
      //           );
      //         }
      //       }
      //       break;
      //     case "axis":
      //       {
      //         const axisInference = item as Specification.Template.Axis;
      //         if (axisInference.slotName != null) {
      //           this.addSlot(
      //             table,
      //             axisInference.slotName,
      //             axisInference.slotKind
      //           );
      //         }
      //       }
      //       break;
      //     case "order":
      //       {
      //         const orderInference = item as Specification.Template.Order;
      //         if (orderInference.slotName != null) {
      //           this.addSlot(
      //             table,
      //             orderInference.slotName,
      //             orderInference.slotKind
      //           );
      //         }
      //       }
      //       break;
      //     case "slot-list":
      //       {
      //         const slotListInference = item as Specification.Template.SlotList;
      //         for (const slot of slotListInference.slots) {
      //           this.addSlot(table, slot.slotName, slot.slotKind);
      //         }
      //       }
      //       break;
      //   }
      // }
    }
    if (params && params.properties) {
      // template.properties[objectClass.object._id] = params.properties;
      // for (const property of params.properties) {
      //   let pn = "";
      //   if (property.mode == "attribute") {
      //     pn = property.attribute;
      //   } else {
      //     pn = property.property;
      //     if (property.fields) {
      //       if (typeof property.fields == "string") {
      //         pn += "." + property.fields;
      //       } else {
      //         pn += "." + property.fields.join(".");
      //       }
      //     }
      //   }
      //   if (!property.displayName) {
      //     property.displayName = objectClass.object.properties.name + "/" + pn;
      //   }
      //   property.name = property.displayName.replace(/[^0-9a-zA-Z\_]+/g, "_");
      // }
    }
    // Get mappings
    for (const [attribute, mapping] of Prototypes.forEachMapping(
      objectClass.object.mappings
    )) {
      if (mapping.type == "scale") {
        const scaleMapping = mapping as Specification.ScaleMapping;
        this.addColumnsFromExpression(
          scaleMapping.table,
          scaleMapping.expression
        );
      }
      // const item = objectClass.object.mappings[attribute];
      // if (item.type == "scale") {
      //   const scaleMapping = item as Specification.ScaleMapping;
      //   let kind = null;
      //   // Resolve scale kind
      //   if (scaleMapping.scale) {
      //     const scaleClass = this.manager.getClassById(scaleMapping.scale);
      //     if (scaleClass) {
      //       const params = scaleClass.getTemplateParameters();
      //       if (params && params.inferences) {
      //         for (const infer of params.inferences) {
      //           if (infer.type == "scale") {
      //             kind = (infer as Specification.Template.Scale).slotKind;
      //           }
      //         }
      //       }
      //     }
      //   }
      //   this.addSlot(table, scaleMapping.expression, kind);
      //   mappings.push({
      //     attribute,
      //     scale: scaleMapping.scale,
      //     slotName: scaleMapping.expression
      //   });
      // }
      if (mapping.type == "scale") {
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
