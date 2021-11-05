// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { strings } from "../../../strings";
import { interpolateColors, Scale } from "../../common";
import { ConstraintSolver, ConstraintStrength, Variable } from "../../solver";
import * as Specification from "../../specification";
import { MappingType } from "../../specification";
import { Colorspace } from "../../specification/types";
import {
  AttributeDescription,
  Controls,
  TemplateParameters,
  ObjectClassMetadata,
} from "../common";
import { ScaleClass } from "./index";
import { InferParametersOptions } from "./scale";

export interface LinearScaleProperties extends Specification.AttributeMap {
  domainMin: number;
  domainMax: number;
  autoDomainMin: number;
  autoDomainMax: number;
}

export interface LinearScaleAttributes extends Specification.AttributeMap {
  rangeMin: number;
  rangeMax: number;
}

export class LinearScale extends ScaleClass<
  LinearScaleProperties,
  LinearScaleAttributes
> {
  public static classID = "scale.linear<number,number>";
  public static type = "scale";

  public static defaultMappingValues: Specification.AttributeMap = {
    rangeMin: 0,
  };

  public static defaultProperties: Specification.AttributeMap = {
    autoDomainMin: true,
    autoDomainMax: true,
  };

  public attributeNames: string[] = ["rangeMin", "rangeMax"];
  public attributes: { [name: string]: AttributeDescription } = {
    rangeMin: {
      name: "rangeMin",
      type: Specification.AttributeType.Number,
      defaultValue: 0,
    },
    rangeMax: {
      name: "rangeMax",
      type: Specification.AttributeType.Number,
    },
  };

  public mapDataToAttribute(
    data: Specification.DataValue
  ): Specification.AttributeValue {
    const attrs = this.state.attributes;
    const props = this.object.properties;
    const x1 = props.domainMin;
    const x2 = props.domainMax;
    const y1 = attrs.rangeMin;
    const y2 = attrs.rangeMax;
    return ((<number>data - x1) / (x2 - x1)) * (y2 - y1) + y1;
  }

  public buildConstraint(
    data: Specification.DataValue,
    target: Variable,
    solver: ConstraintSolver
  ) {
    const attrs = this.state.attributes;
    const props = this.object.properties;
    const x1 = props.domainMin;
    const x2 = props.domainMax;
    const k = (<number>data - x1) / (x2 - x1);
    solver.addLinear(
      ConstraintStrength.HARD,
      0,
      [[1, target]],
      [
        [1 - k, solver.attr(attrs, "rangeMin")],
        [k, solver.attr(attrs, "rangeMax")],
      ]
    );
  }

  public initializeState(): void {
    const attrs = this.state.attributes;
    attrs.rangeMin = 0;
    attrs.rangeMax = 100;
  }

  public inferParameters(
    column: Specification.DataValue[],
    options: InferParametersOptions = {}
  ): void {
    const attrs = this.state.attributes;
    const props = this.object.properties;
    const s = new Scale.LinearScale();
    const values = <number[]>column.filter((x) => typeof x == "number");
    s.inferParameters(values);
    s.adjustDomain(options);

    if (options.extendScaleMin || props.domainMin === undefined) {
      props.domainMin = s.domainMin;
    }
    if (options.extendScaleMax || props.domainMax === undefined) {
      props.domainMax = s.domainMax;
    }

    if (!options.reuseRange) {
      if (options.rangeNumber) {
        attrs.rangeMin = options.rangeNumber[0];
        attrs.rangeMax = options.rangeNumber[1];
      } else {
        attrs.rangeMin = 0;
        attrs.rangeMax = 100;
      }

      if (!options.autoRange) {
        this.object.mappings.rangeMin = <Specification.ValueMapping>{
          type: MappingType.value,
          value: attrs.rangeMin,
        };
        this.object.mappings.rangeMax = <Specification.ValueMapping>{
          type: MappingType.value,
          value: attrs.rangeMax,
        };
      }

      if (options.startWithZero === "always") {
        this.object.mappings.rangeMin = <Specification.ValueMapping>{
          type: MappingType.value,
          value: 0,
        };
      }
    }
  }

  public getAttributePanelWidgets(
    manager: Controls.WidgetManager
  ): Controls.Widget[] {
    return [
      manager.sectionHeader(strings.objects.dataAxis.domain),
      manager.inputNumber(
        { property: "domainMin" },
        { label: strings.objects.dataAxis.start, stopPropagation: true }
      ),
      manager.inputNumber(
        { property: "domainMax" },
        { label: strings.objects.dataAxis.end, stopPropagation: true }
      ),
      manager.sectionHeader(strings.objects.dataAxis.autoUpdateValues),
      manager.inputBoolean(
        {
          property: "autoDomainMin",
        },
        {
          type: "checkbox",
          label: strings.objects.dataAxis.start,
        }
      ),
      manager.inputBoolean(
        {
          property: "autoDomainMax",
        },
        {
          type: "checkbox",
          label: strings.objects.dataAxis.end,
        }
      ),
      manager.sectionHeader(strings.objects.dataAxis.range),
      manager.mappingEditor(strings.objects.dataAxis.start, "rangeMin", {
        defaultValue: 0,
        stopPropagation: true,
      }),
      manager.mappingEditor(strings.objects.dataAxis.end, "rangeMax", {
        defaultAuto: true,
        stopPropagation: true,
      }),
    ];
  }

  public getTemplateParameters(): TemplateParameters {
    const parameters = super.getTemplateParameters();
    if (!parameters.properties) {
      parameters.properties = [];
    }
    parameters.properties.push({
      objectID: this.object._id,
      target: {
        property: "domainMin",
      },
      type: Specification.AttributeType.Number,
    });
    parameters.properties.push({
      objectID: this.object._id,
      target: {
        property: "domainMax",
      },
      type: Specification.AttributeType.Number,
    });
    parameters.properties.push({
      objectID: this.object._id,
      target: {
        attribute: "rangeMin",
      },
      type: Specification.AttributeType.Number,
      default: null,
    });
    parameters.properties.push({
      objectID: this.object._id,
      target: {
        attribute: "rangeMax",
      },
      type: Specification.AttributeType.Number,
      default: null,
    });
    return parameters;
  }
}

export interface LinearColorScaleProperties extends LinearScaleProperties {
  range: Specification.Types.ColorGradient;
}

function getDefaultGradient(): Specification.Types.ColorGradient {
  return {
    colorspace: Colorspace.Lab,
    colors: [
      { r: 255, g: 255, b: 255 },
      { r: 0, g: 0, b: 0 },
    ],
  };
}

export class LinearColorScale extends ScaleClass<
  LinearColorScaleProperties,
  any
> {
  public static classID = "scale.linear<number,color>";
  public static type = "scale";

  public static metadata: ObjectClassMetadata = {
    displayName: strings.objects.scale,
    iconPath: "scale/color",
  };

  public static defaultMappingValues: Specification.AttributeMap = {
    range: getDefaultGradient(),
  };

  public readonly object: {
    properties: LinearColorScaleProperties;
  } & Specification.Scale;

  public attributeNames: string[] = [];
  public attributes: { [name: string]: AttributeDescription } = {};

  public mapDataToAttribute(
    data: Specification.DataValue
  ): Specification.AttributeValue {
    const props = this.object.properties;
    const x1 = props.domainMin;
    const x2 = props.domainMax;
    const t = (<number>data - x1) / (x2 - x1);
    const c = interpolateColors(props.range.colors, props.range.colorspace);
    return c(t);
  }

  // eslint-disable-next-line
  public buildConstraint(
    // eslint-disable-next-line
    data: Specification.DataValue,
    // eslint-disable-next-line
    target: Variable,
    // eslint-disable-next-line
    solver: ConstraintSolver
    // eslint-disable-next-line
  ) {}

  // eslint-disable-next-line
  public initializeState(): void {}

  public inferParameters(
    column: Specification.DataValue[],
    options: InferParametersOptions = {}
  ): void {
    const props = this.object.properties;
    const s = new Scale.LinearScale();
    const values = <number[]>column.filter((x) => typeof x == "number");
    s.inferParameters(values);
    s.adjustDomain(options);

    if (options.extendScaleMin || props.domainMin === undefined) {
      props.domainMin = s.domainMin;
    }
    if (options.extendScaleMax || props.domainMax === undefined) {
      props.domainMax = s.domainMax;
    }

    if (!options.reuseRange) {
      props.range = getDefaultGradient();
    }
  }

  public getAttributePanelWidgets(
    manager: Controls.WidgetManager
  ): Controls.Widget[] {
    return [
      manager.sectionHeader(strings.objects.dataAxis.domain),
      manager.inputNumber(
        { property: "domainMin" },
        { stopPropagation: true, label: strings.objects.dataAxis.start }
      ),
      manager.inputNumber(
        { property: "domainMax" },
        { stopPropagation: true, label: strings.objects.dataAxis.end }
      ),
      manager.sectionHeader(strings.objects.dataAxis.gradient),
      manager.inputColorGradient(
        { property: "range", noComputeLayout: true },
        true
      ),
    ];
  }

  public getTemplateParameters(): TemplateParameters {
    const parameters = super.getTemplateParameters();
    if (!parameters.properties) {
      parameters.properties = [];
    }
    parameters.properties.push({
      objectID: this.object._id,
      target: {
        property: "domainMin",
      },
      type: Specification.AttributeType.Number,
    });
    parameters.properties.push({
      objectID: this.object._id,
      target: {
        property: "domainMax",
      },
      type: Specification.AttributeType.Number,
    });
    return parameters;
  }
}

export interface LinearBooleanScaleProperties extends LinearScaleProperties {
  min: number;
  max: number;
  mode: LinearBooleanScaleMode;
}

export enum LinearBooleanScaleMode {
  GreaterThan = "Greater than",
  LessThan = "Less than",
  Between = "Between",
  EqualTo = "Equal to",
  GreaterThanOrEqualTo = "Greater than or equal to",
  LessThanOrEqualTo = "Less than or equal to",
  NotBetween = "Not between",
  NotEqualTo = "Not Equal to",
}

export class LinearBooleanScale extends ScaleClass<
  LinearBooleanScaleProperties,
  any
> {
  public static classID = "scale.linear<number,boolean>";
  public static type = "scale";

  public static defaultMappingValues: Specification.AttributeMap = {
    min: 0,
    max: 1,
    mode: LinearBooleanScaleMode.GreaterThan,
  };

  public attributeNames: string[] = [];
  public attributes: { [name: string]: AttributeDescription } = {};

  public mapDataToAttribute(
    data: Specification.DataValue
  ): Specification.AttributeValue {
    const props = this.object.properties;
    const value = <number>data;
    switch (props.mode) {
      case LinearBooleanScaleMode.GreaterThan:
        return value > props.min;
      case LinearBooleanScaleMode.GreaterThanOrEqualTo:
        return value >= props.min;
      case LinearBooleanScaleMode.LessThan:
        return value < props.max;
      case LinearBooleanScaleMode.LessThanOrEqualTo:
        return value <= props.max;
      case LinearBooleanScaleMode.EqualTo:
        return value == props.min;
      case LinearBooleanScaleMode.NotEqualTo:
        return value != props.min;
      case LinearBooleanScaleMode.Between:
        return value <= props.max && value >= props.min;
      case LinearBooleanScaleMode.NotBetween:
        return value > props.max || value < props.min;
    }
  }

  public buildConstraint() {
    //ignore
  }

  public initializeState(): void {
    //ignore
  }

  public inferParameters(
    column: Specification.DataValue[],
    options: InferParametersOptions = {}
  ): void {
    const props = this.object.properties;
    const s = new Scale.LinearScale();
    const values = <number[]>column.filter((x) => typeof x == "number");
    s.inferParameters(values);
    if (options.extendScaleMin || props.min === undefined) {
      props.min = s.domainMin;
    }
    if (options.extendScaleMax || props.max === undefined) {
      props.max = s.domainMax;
    }
    props.mode = LinearBooleanScaleMode.GreaterThan;
  }

  public getAttributePanelWidgets(
    manager: Controls.WidgetManager
  ): Controls.Widget[] {
    const props = this.object.properties;
    const minMax = [];

    const isEqual: boolean =
      props.mode === LinearBooleanScaleMode.EqualTo ||
      props.mode === LinearBooleanScaleMode.NotEqualTo;

    if (
      props.mode === LinearBooleanScaleMode.GreaterThan ||
      props.mode === LinearBooleanScaleMode.GreaterThanOrEqualTo ||
      props.mode === LinearBooleanScaleMode.Between ||
      props.mode === LinearBooleanScaleMode.NotBetween ||
      props.mode === LinearBooleanScaleMode.EqualTo ||
      props.mode === LinearBooleanScaleMode.NotEqualTo
    ) {
      minMax.push(
        manager.vertical(
          this.object.inputType === Specification.DataType.Date
            ? manager.inputDate(
                { property: "min" },
                { label: isEqual ? "Date" : "Start date" }
              )
            : manager.inputNumber(
                { property: "min" },
                {
                  stopPropagation: true,
                  label: isEqual ? "Value" : "Minimum value",
                }
              )
        )
      );
    }

    if (
      props.mode === LinearBooleanScaleMode.LessThan ||
      props.mode === LinearBooleanScaleMode.LessThanOrEqualTo ||
      props.mode === LinearBooleanScaleMode.Between ||
      props.mode === LinearBooleanScaleMode.NotBetween
    ) {
      minMax.push(
        this.object.inputType === Specification.DataType.Date
          ? manager.inputDate({ property: "max" }, { label: "End date" })
          : manager.inputNumber(
              { property: "max" },
              { stopPropagation: true, label: "Maximum value" }
            )
      );
    }
    return [
      manager.sectionHeader(strings.typeDisplayNames.boolean),
      manager.inputSelect(
        { property: "mode" },
        {
          type: "dropdown",
          options: [
            LinearBooleanScaleMode.GreaterThan,
            LinearBooleanScaleMode.GreaterThanOrEqualTo,
            LinearBooleanScaleMode.LessThan,
            LinearBooleanScaleMode.LessThanOrEqualTo,
            LinearBooleanScaleMode.EqualTo,
            LinearBooleanScaleMode.NotEqualTo,
            LinearBooleanScaleMode.Between,
            LinearBooleanScaleMode.NotBetween,
          ],
          labels: [
            LinearBooleanScaleMode.GreaterThan,
            LinearBooleanScaleMode.GreaterThanOrEqualTo,
            LinearBooleanScaleMode.LessThan,
            LinearBooleanScaleMode.LessThanOrEqualTo,
            LinearBooleanScaleMode.EqualTo,
            LinearBooleanScaleMode.NotEqualTo,
            LinearBooleanScaleMode.Between,
            LinearBooleanScaleMode.NotBetween,
          ],
          showLabel: true,
          label: strings.objects.scales.mode,
        }
      ),

      ...minMax,
    ];
  }

  public getTemplateParameters(): TemplateParameters {
    const parameters = super.getTemplateParameters();
    const props = this.object.properties;
    if (!parameters.properties) {
      parameters.properties = [];
    }
    if (
      props.mode === LinearBooleanScaleMode.GreaterThan ||
      props.mode === LinearBooleanScaleMode.GreaterThanOrEqualTo
    ) {
      parameters.properties.push({
        objectID: this.object._id,
        target: {
          property: "min",
        },
        type: Specification.AttributeType.Number,
        default: this.object.properties.min,
      });
    }
    if (
      props.mode === LinearBooleanScaleMode.LessThan ||
      props.mode === LinearBooleanScaleMode.LessThanOrEqualTo
    ) {
      parameters.properties.push({
        objectID: this.object._id,
        target: {
          property: "max",
        },
        type: Specification.AttributeType.Number,
        default: this.object.properties.max,
      });
    }
    if (
      props.mode === LinearBooleanScaleMode.Between ||
      props.mode === LinearBooleanScaleMode.NotBetween
    ) {
      parameters.properties.push({
        objectID: this.object._id,
        target: {
          property: "min",
        },
        type: Specification.AttributeType.Number,
        default: this.object.properties.min,
      });
      parameters.properties.push({
        objectID: this.object._id,
        target: {
          property: "max",
        },
        type: Specification.AttributeType.Number,
        default: this.object.properties.max,
      });
    }
    if (
      props.mode === LinearBooleanScaleMode.EqualTo ||
      props.mode === LinearBooleanScaleMode.NotEqualTo
    ) {
      parameters.properties.push({
        objectID: this.object._id,
        target: {
          property: "min",
        },
        type: Specification.AttributeType.Number,
        default: this.object.properties.min,
      });
    }
    return parameters;
  }
}
