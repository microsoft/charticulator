// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { interpolateColors, Scale } from "../../common";
import { ConstraintSolver, ConstraintStrength, Variable } from "../../solver";
import * as Specification from "../../specification";
import { MappingType } from "../../specification";
import { Colorspace } from "../../specification/types";
import {
  AttributeDescription,
  Controls,
  DataMappingHints,
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
    return (((<number>data) - x1) / (x2 - x1)) * (y2 - y1) + y1;
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
    const k = ((<number>data) - x1) / (x2 - x1);
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

    props.domainMin = s.domainMin;
    props.domainMax = s.domainMax;

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
      manager.sectionHeader("Domain"),
      manager.row("Start", manager.inputNumber({ property: "domainMin" })),
      manager.row("End", manager.inputNumber({ property: "domainMax" })),
      manager.sectionHeader("Range"),
      manager.mappingEditor("Start", "rangeMin", { defaultValue: 0 }),
      manager.mappingEditor("End", "rangeMax", { defaultAuto: true }),
      manager.sectionHeader("Scale export properties"),
      manager.row(
        "",
        manager.vertical(
          manager.horizontal(
            [0, 1],
            manager.label("Auto range min value"),
            null,
            manager.inputBoolean(
              {
                property: "autoDomainMin",
              },
              {
                type: "checkbox",
              }
            )
          ),
          manager.horizontal(
            [0, 1],
            manager.label("Auto range max value"),
            null,
            manager.inputBoolean(
              {
                property: "autoDomainMax",
              },
              {
                type: "checkbox",
              }
            )
          )
        )
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
  {}
> {
  public static classID = "scale.linear<number,color>";
  public static type = "scale";

  public static metadata: ObjectClassMetadata = {
    displayName: "Scale",
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
    const t = ((<number>data) - x1) / (x2 - x1);
    const c = interpolateColors(props.range.colors, props.range.colorspace);
    return c(t);
  }

  public buildConstraint(
    data: Specification.DataValue,
    target: Variable,
    solver: ConstraintSolver
  ) {}

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

    props.domainMin = s.domainMin;
    props.domainMax = s.domainMax;

    if (!options.reuseRange) {
      props.range = getDefaultGradient();
    }
  }

  public getAttributePanelWidgets(
    manager: Controls.WidgetManager
  ): Controls.Widget[] {
    return [
      manager.sectionHeader("Domain"),
      manager.row("Start", manager.inputNumber({ property: "domainMin" })),
      manager.row("End", manager.inputNumber({ property: "domainMax" })),
      manager.sectionHeader("Gradient"),
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
  mode: "greater" | "less" | "interval";
  inclusive: boolean;
}

export class LinearBooleanScale extends ScaleClass<
  LinearBooleanScaleProperties,
  {}
> {
  public static classID = "scale.linear<number,boolean>";
  public static type = "scale";

  public static defaultMappingValues: Specification.AttributeMap = {
    min: 0,
    max: 1,
    mode: "interval",
    inclusive: true,
  };

  public attributeNames: string[] = [];
  public attributes: { [name: string]: AttributeDescription } = {};

  public mapDataToAttribute(
    data: Specification.DataValue
  ): Specification.AttributeValue {
    const props = this.object.properties;
    const value = <number>data;
    if (props.inclusive) {
      switch (props.mode) {
        case "greater":
          return value >= props.min;
        case "less":
          return value <= props.max;
        case "interval":
          return value <= props.max && value >= props.min;
      }
    } else {
      switch (props.mode) {
        case "greater":
          return value > props.min;
        case "less":
          return value < props.max;
        case "interval":
          return value < props.max && value > props.min;
      }
    }
  }

  public buildConstraint(
    data: Specification.DataValue,
    target: Variable,
    solver: ConstraintSolver
  ) {}

  public initializeState(): void {}

  public inferParameters(
    column: Specification.DataValue[],
    options: InferParametersOptions = {}
  ): void {
    const props = this.object.properties;
    const s = new Scale.LinearScale();
    const values = <number[]>column.filter((x) => typeof x == "number");
    s.inferParameters(values);
    props.min = s.domainMin;
    props.max = s.domainMax;
    props.mode = "interval";
    props.inclusive = true;
  }

  public getAttributePanelWidgets(
    manager: Controls.WidgetManager
  ): Controls.Widget[] {
    const props = this.object.properties;
    const minMax = [];
    if (props.mode == "greater" || props.mode == "interval") {
      minMax.push(
        manager.row(
          props.inclusive ? ">=" : ">",
          manager.inputNumber({ property: "min" })
        )
      );
    }
    if (props.mode == "less" || props.mode == "interval") {
      minMax.push(
        manager.row(
          props.inclusive ? "<=" : "<",
          manager.inputNumber({ property: "max" })
        )
      );
    }
    return [
      manager.sectionHeader("Boolean"),
      manager.row(
        "Mode",
        manager.inputSelect(
          { property: "mode" },
          {
            type: "dropdown",
            options: ["greater", "less", "interval"],
            showLabel: true,
            labels: ["Greater", "Less", "Interval"],
          }
        )
      ),
      manager.row(
        "Inclusive",
        manager.inputBoolean({ property: "inclusive" }, { type: "checkbox" })
      ),
      ...minMax,
    ];
  }

  public getTemplateParameters(): TemplateParameters {
    const parameters = super.getTemplateParameters();
    if (!parameters.properties) {
      parameters.properties = [];
    }
    if (this.object.properties.mode === "interval") {
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
      parameters.properties.push({
        objectID: this.object._id,
        target: {
          property: "inclusive",
        },
        type: Specification.AttributeType.Boolean,
        default: this.object.properties.inclusive,
      });
    }
    if (this.object.properties.mode === "greater") {
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
          property: "inclusive",
        },
        type: Specification.AttributeType.Boolean,
        default: this.object.properties.inclusive,
      });
    }
    if (this.object.properties.mode === "less") {
      parameters.properties.push({
        objectID: this.object._id,
        target: {
          property: "max",
        },
        type: Specification.AttributeType.Number,
        default: this.object.properties.max,
      });
      parameters.properties.push({
        objectID: this.object._id,
        target: {
          property: "inclusive",
        },
        type: Specification.AttributeType.Boolean,
        default: this.object.properties.inclusive,
      });
    }
    return parameters;
  }
}
