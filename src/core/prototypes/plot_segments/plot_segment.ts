// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import { ChartStateManager } from "..";
import * as Graphics from "../../graphics";
import { ConstraintSolver } from "../../solver";
import * as Specification from "../../specification";
import { BuildConstraintsContext, ChartElementClass } from "../chart_element";
import { BoundingBox, Controls, DropZones, Handles } from "../common";
import { DataflowTable } from "../dataflow";
import { FunctionCall, TextExpression, Variable } from "../../expression";
import { refineColumnName } from "../..";
import { AxisRenderer } from "./axis";
import { utcFormat } from "d3-time-format";
import { getDateFormat } from "../../dataset/datetime";

export abstract class PlotSegmentClass<
  PropertiesType extends Specification.AttributeMap = Specification.AttributeMap,
  AttributesType extends Specification.AttributeMap = Specification.AttributeMap
> extends ChartElementClass<PropertiesType, AttributesType> {
  public readonly object: Specification.PlotSegment<PropertiesType>;
  public readonly state: Specification.PlotSegmentState<AttributesType>;

  /** Fill the layout's default state */
  public initializeState(): void {}

  /** Build intrinsic constraints between attributes (e.g., x2 - x1 = width for rectangles) */
  public buildConstraints(
    solver: ConstraintSolver,
    context: BuildConstraintsContext
  ): void {}

  /** Build constraints for glyphs within */
  public buildGlyphConstraints(
    solver: ConstraintSolver,
    context: BuildConstraintsContext
  ): void {}

  /** Get the graphics that represent this layout */
  public getPlotSegmentGraphics(
    glyphGraphics: Graphics.Element,
    manager: ChartStateManager
  ): Graphics.Element {
    return Graphics.makeGroup([glyphGraphics, this.getGraphics(manager)]);
  }

  public getCoordinateSystem(): Graphics.CoordinateSystem {
    return new Graphics.CartesianCoordinates();
  }

  /** Get DropZones given current state */
  public getDropZones(): DropZones.Description[] {
    return [];
  }

  /** Get handles given current state */
  public getHandles(): Handles.Description[] {
    return null;
  }

  public getBoundingBox(): BoundingBox.Description {
    return null;
  }

  public getAttributePanelWidgets(
    manager: Controls.WidgetManager
  ): Controls.Widget[] {
    return [
      manager.row(
        "Data",
        manager.horizontal(
          [0, 1],
          manager.filterEditor({
            table: this.object.table,
            target: { plotSegment: this.object },
            value: this.object.filter,
            mode: "button",
          }),
          manager.groupByEditor({
            table: this.object.table,
            target: { plotSegment: this.object },
            value: this.object.groupBy,
            mode: "button",
          })
        )
      ),
    ];
  }

  public static createDefault(
    glyph: Specification.Glyph
  ): Specification.PlotSegment {
    const plotSegment = super.createDefault() as Specification.PlotSegment;
    plotSegment.glyph = glyph._id;
    plotSegment.table = glyph.table;
    return plotSegment;
  }

  public getDisplayRawFormat(
    binding: Specification.Types.AxisDataBinding,
    manager: ChartStateManager
  ) {
    const tableName = this.object.table;
    const table = manager.dataset.tables.find(
      (table) => table.name === tableName
    );
    const getColumnName = (rawExpression: string) => {
      const expression = TextExpression.Parse(`\$\{${rawExpression}\}`);
      const parsedExpression = expression.parts.find((part) => {
        if (part.expression instanceof FunctionCall) {
          return part.expression.args.find(
            (arg) => arg instanceof Variable
          ) as any;
        }
      });
      const functionCallpart =
        parsedExpression && (parsedExpression.expression as FunctionCall);
      if (functionCallpart) {
        const variable = functionCallpart.args.find(
          (arg) => arg instanceof Variable
        ) as Variable;
        const columnName = variable.name;
        const column = table.columns.find(
          (column) => column.name === columnName
        );

        return column.name;
      }

      return null;
    };
    if (binding.valueType === Specification.DataType.Boolean) {
      const columnName = getColumnName(binding.expression);
      const rawColumnName = getColumnName(binding.rawExpression);
      if (columnName && rawColumnName) {
        const dataMapping = new Map<string, string>();
        table.rows.forEach((row) => {
          const value = row[columnName];
          const rawValue = row[rawColumnName];
          if (value !== undefined && rawValue !== undefined) {
            const stringValue = value.toString();
            const rawValueString = (
              rawValue || row[refineColumnName(rawColumnName)]
            ).toString();
            dataMapping.set(stringValue, rawValueString);
          }
        });
        return (value: any) => {
          const rawValue = dataMapping.get(value);
          return rawValue !== null ? rawValue : value;
        };
      }
    }
    return null;
  }

  public getDisplayFormat = (
    binding: Specification.Types.AxisDataBinding,
    tickFormat?: string,
    manager?: ChartStateManager
  ) => {
    if (binding.numericalMode === "temporal" || binding.valueType === "date") {
      if (tickFormat) {
        return (value: any) => {
          return utcFormat(tickFormat)(value);
        };
      } else {
        return (value: any) => {
          return utcFormat("%m/%d/%Y")(value);
        };
      }
    } else {
      if (tickFormat) {
        const resolvedFormat = AxisRenderer.getTickFormat(tickFormat, null);
        return (value: any) => {
          return resolvedFormat(value);
        };
      } else {
        if (binding.rawExpression && manager) {
          const rawFormat = this.getDisplayRawFormat(binding, manager);
          if (rawFormat) {
            return rawFormat;
          }
        }
        return (value: any) => {
          return value;
        };
      }
    }
  };

  protected buildGlyphOrderedList(): number[] {
    const groups = this.state.dataRowIndices.map((x, i) => i);
    if (!this.object.properties.sublayout) {
      return groups;
    }
    const order = (this.object.properties.sublayout as any).order;
    const dateRowIndices = this.state.dataRowIndices;
    const table = this.parent.dataflow.getTable(this.object.table);

    if (order != null && order.expression) {
      const orderExpression = this.parent.dataflow.cache.parse(
        order.expression
      );
      const compare = (i: number, j: number) => {
        const vi = orderExpression.getValue(
          table.getGroupedContext(dateRowIndices[i])
        );
        const vj = orderExpression.getValue(
          table.getGroupedContext(dateRowIndices[j])
        );
        if (vi < vj) {
          return -1;
        } else if (vi > vj) {
          return 1;
        } else {
          return 0;
        }
      };
      groups.sort(compare);
    }
    if ((this.object.properties.sublayout as any).orderReversed) {
      groups.reverse();
    }

    return groups;
  }

  /**
   * Return the index of the first glyph after sorting glyphs according sublayout order parameter
   */
  public getFirstGlyphIndex() {
    const glyphs = this.buildGlyphOrderedList();
    return glyphs.length > 0 ? glyphs[0] : -1;
  }

  /**
   * Return the index of the last glyph after sorting glyphs according sublayout order parameter
   */
  public getLastGlyphIndex() {
    const glyphs = this.buildGlyphOrderedList();
    return glyphs.length > 0 ? glyphs[glyphs.length - 1] : -1;
  }
}
