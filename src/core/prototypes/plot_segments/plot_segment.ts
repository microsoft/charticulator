// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import { ChartStateManager } from "..";
import * as Graphics from "../../graphics";
import { ConstraintSolver } from "../../solver";
import * as Specification from "../../specification";
import { BuildConstraintsContext, ChartElementClass } from "../chart_element";
import { BoundingBox, Controls, DropZones, Handles } from "../common";
import { FunctionCall, TextExpression, Variable } from "../../expression";
import {
  getSortFunctionByData,
  refineColumnName,
  tickFormatParserExpression,
} from "../..";
import { AxisRenderer } from "./axis";
import { utcFormat } from "d3-time-format";
import { AxisDataBindingType, NumericalMode } from "../../specification/types";
import { strings } from "../../../strings";
import { PanelMode } from "../controls";

export abstract class PlotSegmentClass<
  PropertiesType extends Specification.AttributeMap = Specification.AttributeMap,
  AttributesType extends Specification.AttributeMap = Specification.AttributeMap
> extends ChartElementClass<PropertiesType, AttributesType> {
  public readonly object: Specification.PlotSegment<PropertiesType>;
  public readonly state: Specification.PlotSegmentState<AttributesType>;

  /** Fill the layout's default state */
  // eslint-disable-next-line
  public initializeState(): void {}

  /** Build intrinsic constraints between attributes (e.g., x2 - x1 = width for rectangles) */
  // eslint-disable-next-line
  public buildConstraints(
    // eslint-disable-next-line
    solver: ConstraintSolver,
    // eslint-disable-next-line
    context: BuildConstraintsContext,
    // eslint-disable-next-line
    manager: ChartStateManager
    // eslint-disable-next-line
  ): void {}

  /** Build constraints for glyphs within */
  // eslint-disable-next-line
  public buildGlyphConstraints(
    // eslint-disable-next-line
    solver: ConstraintSolver,
    // eslint-disable-next-line
    context: BuildConstraintsContext
    // eslint-disable-next-line
  ): void {}

  /** Get the graphics that represent this layout */
  public getPlotSegmentGraphics(
    glyphGraphics: Graphics.Element,
    manager: ChartStateManager
  ): Graphics.Element {
    return Graphics.makeGroup([glyphGraphics, this.getGraphics(manager)]);
  }

  /** Get the graphics that represent this layout */
  public getPlotSegmentBackgroundGraphics(
    // eslint-disable-next-line
    manager: ChartStateManager
  ): Graphics.Element {
    return null;
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

  /**
   * Renders gridlines for axis
   * @param data axis data binding
   * @param manager widgets manager
   * @param axisProperty property name of plotsegment with axis properties (xData, yData, axis)
   */
  public buildGridLineWidgets(
    data: Specification.Types.AxisDataBinding,
    manager: Controls.WidgetManager,
    axisProperty: string
  ) {
    if (!data) {
      return [];
    }

    if (data.type === AxisDataBindingType.Categorical) {
      return [];
    }

    return [
      manager.verticalGroup(
        {
          header: strings.objects.plotSegment.gridline,
        },
        [
          manager.inputSelect(
            { property: axisProperty, field: ["style", "gridlineStyle"] },
            {
              type: "dropdown",
              showLabel: true,
              icons: [
                "ChromeClose",
                "stroke/solid",
                "stroke/dashed",
                "stroke/dotted",
              ],
              options: ["none", "solid", "dashed", "dotted"],
              labels: ["None", "Solid", "Dashed", "Dotted"],
              label: strings.objects.style,
            }
          ),
          manager.inputColor(
            {
              property: axisProperty,
              field: ["style", "gridlineColor"],
            },
            {
              label: strings.objects.color,
              labelKey: strings.objects.color,
            }
          ),
          manager.inputNumber(
            {
              property: axisProperty,
              field: ["style", "gridlineWidth"],
            },
            {
              minimum: 0,
              maximum: 100,
              showUpdown: true,
              label: strings.objects.width,
            }
          ),
        ]
      ),
    ];
  }

  public getAttributePanelWidgets(
    manager: Controls.WidgetManager
  ): Controls.Widget[] {
    return [
      manager.horizontal(
        [0, 1, 1],
        manager.label("Data", {
          addMargins: true,
        }),
        manager.horizontal(
          [1],
          [
            manager.filterEditor({
              table: this.object.table,
              target: { plotSegment: this.object },
              value: this.object.filter,
              mode: PanelMode.Button,
            }),
            manager.groupByEditor({
              table: this.object.table,
              target: { plotSegment: this.object },
              value: this.object.groupBy,
              mode: PanelMode.Button,
            }),
          ]
        )
      ),
    ];
  }

  public static createDefault(
    glyph: Specification.Glyph
  ): Specification.PlotSegment {
    const plotSegment = <Specification.PlotSegment>super.createDefault();
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
      // eslint-disable-next-line
      const expression = TextExpression.Parse(`\$\{${rawExpression}\}`);
      const parsedExpression = expression.parts.find((part) => {
        if (part.expression instanceof FunctionCall) {
          return <any>(
            part.expression.args.find((arg) => arg instanceof Variable)
          );
        }
      });
      const functionCallpart =
        parsedExpression && <FunctionCall>parsedExpression.expression;
      if (functionCallpart) {
        const variable = <Variable>(
          functionCallpart.args.find((arg) => arg instanceof Variable)
        );
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
          if (value !== undefined && value !== null && rawValue !== undefined) {
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
    if (
      binding.numericalMode === NumericalMode.Temporal ||
      binding.valueType === Specification.DataType.Date
    ) {
      if (tickFormat) {
        return (value: any) => {
          return utcFormat(
            tickFormat.replace(tickFormatParserExpression(), "$1")
          )(value);
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
    const order = (<any>this.object.properties.sublayout).order;
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

        return getSortFunctionByData([vi + "", vj + ""])(vi, vj);
      };
      groups.sort(compare);
    }
    if ((<any>this.object.properties.sublayout).orderReversed) {
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
