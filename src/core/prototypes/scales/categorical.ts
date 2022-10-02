// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import {
  Color,
  Scale,
  getDefaultColorPalette,
  getDefaultColorPaletteByValue,
  getDefaultColorPaletteGenerator,
} from "../../common";
import { ConstraintSolver, ConstraintStrength, Variable } from "../../solver";
import {
  DataValue,
  AttributeValue,
  AttributeMap,
  AttributeType,
} from "../../specification";
import { AttributeDescription, Controls, ObjectClassMetadata } from "../common";

import { ScaleClass } from "./index";
import { AttributeDescriptions } from "../object";
import { InferParametersOptions } from "./scale";
import { color as d3color } from "d3-color";
import { OrderMode } from "../../specification/types";
import { ReservedMappingKeyNamePrefix } from "../legends/categorical_legend";
import { strings } from "../../../strings";
import { Specification } from "../..";

function reuseMapping<T>(
  domain: Map<string, any>,
  existing: { [key: string]: T }
): { [key: string]: T } {
  const result: { [key: string]: T } = {};
  const available: T[] = [];
  for (const d of Object.keys(existing)) {
    if (domain.has(d)) {
      // Found one with the same key, reuse the color
      result[d] = existing[d];
    } else {
      // Other, make the color available
      available.push(existing[d]);
    }
  }
  // Assign remaining keys from the domain
  domain.forEach((v, d) => {
    if (!Object.prototype.hasOwnProperty.call(result, d)) {
      if (available.length > 0) {
        result[d] = available[0];
        available.splice(0, 1);
      } else {
        // No available color left, fail
        return null;
      }
    }
  });
  return result;
}

export interface CategoricalScaleProperties<ValueType extends AttributeValue>
  extends AttributeMap {
  mapping: { [name: string]: ValueType };
  defaultRange?: ValueType[];
}

export interface CategoricalScaleNumberAttributes extends AttributeMap {
  rangeScale?: number;
}

export class CategoricalScaleNumber extends ScaleClass<
  CategoricalScaleProperties<number>,
  CategoricalScaleNumberAttributes
> {
  public static classID = "scale.categorical<string,number>";
  public static type = "scale";

  public attributeNames: string[] = ["rangeScale"];
  public attributes: { [name: string]: AttributeDescription } = {
    rangeScale: {
      name: "rangeScale",
      type: AttributeType.Number,
    },
  };

  public static defaultProperties: Specification.AttributeMap = {
    exposed: true,
    autoDomainMin: true,
    autoDomainMax: true,
  };

  public mapDataToAttribute(data: DataValue): AttributeValue {
    const attrs = this.state.attributes;
    const props = this.object.properties;
    const number = props.mapping[data ? data?.toString() : null];
    return (number ?? 0) * attrs.rangeScale;
  }

  public buildConstraint(
    data: DataValue,
    target: Variable,
    solver: ConstraintSolver
  ) {
    const attrs = this.state.attributes;
    const props = this.object.properties;
    const k = props.mapping[data?.toString()];
    solver.addLinear(
      ConstraintStrength.HARD,
      0,
      [[1, target]],
      [[k, solver.attr(attrs, "rangeScale")]]
    );
  }

  public initializeState(): void {
    const attrs = this.state.attributes;
    attrs.rangeScale = 10;
  }

  public inferParameters(
    column: DataValue[],
    options: InferParametersOptions = {}
  ): void {
    const attrs = this.state.attributes;
    const props = this.object.properties;
    const s = new Scale.CategoricalScale();
    const values = <string[]>column.filter((x) => typeof x == "string");
    s.inferParameters(values, OrderMode.order);

    props.mapping = {};

    let range = [1, s.domain.size];
    if (options.rangeNumber) {
      range = options.rangeNumber;
    }

    s.domain.forEach((v, d) => {
      props.mapping[d] =
        (v / (s.domain.size - 1)) * (range[1] - range[0]) + range[0];
    });

    attrs.rangeScale = <number>range[1];
  }

  public getAttributePanelWidgets(
    manager: Controls.WidgetManager
  ): Controls.Widget[] {
    const props = this.object.properties;
    const keys: string[] = [];
    for (const key in props.mapping) {
      if (Object.prototype.hasOwnProperty.call(props.mapping, key)) {
        keys.push(key);
      }
    }
    return [
      manager.sectionHeader(strings.objects.scales.numberMapping),
      manager.scrollList(
        keys.map((key) =>
          manager.horizontal(
            [2, 3],
            manager.text(key, "right"),
            manager.inputNumber({ property: "mapping", field: key })
          )
        )
      ),
      manager.sectionHeader(strings.objects.scales.exportProperties),
      manager.row(
        "",
        manager.vertical(
          manager.inputBoolean(
            {
              property: "autoDomainMin",
            },
            {
              type: "checkbox",
              label: strings.objects.scales.autoMin,
            }
          ),
          manager.inputBoolean(
            {
              property: "autoDomainMax",
            },
            {
              type: "checkbox",
              label: strings.objects.scales.autoMax,
            }
          )
        )
      ),
    ];
  }
}

export class CategoricalScaleColor extends ScaleClass<
  CategoricalScaleProperties<Color>,
  any
> {
  public static metadata: ObjectClassMetadata = {
    displayName: "Scale",
    iconPath: "scale/color",
  };

  public static classID = "scale.categorical<string,color>";
  public static type = "scale";

  public attributeNames: string[] = [];
  public attributes: AttributeDescriptions = {};

  public mapDataToAttribute(data: DataValue): AttributeValue {
    const props = this.object.properties;
    return props.mapping[data?.toString()];
  }

  // eslint-disable-next-line
  public initializeState(): void {}

  public inferParameters(
    column: DataValue[],
    options: InferParametersOptions = {}
  ): void {
    const props = this.object.properties;
    const s = new Scale.CategoricalScale();
    const values = column.filter((x) => x != null).map((x) => x.toString());
    s.inferParameters(values, OrderMode.order);

    props.autoDomainMin = true;
    props.autoDomainMax = true;
    // If we shouldn't reuse the range, then reset the mapping
    if (!options.reuseRange) {
      props.mapping = null;

      // Otherwise, if we already have a mapping, try to reuse it
    } else if (props.mapping != null) {
      if (options.extendScaleMin || options.extendScaleMax) {
        const mapping = reuseMapping(s.domain, props.mapping);

        let colorList = literalColorValues(values);
        if (!colorList) {
          // Find a good default color palette
          colorList = getDefaultColorPalette(s.length);
        }
        s.domain.forEach((v, d) => {
          // If we still don't have enough colors, reuse them
          // NEEDTO: fix this with a better method
          if (!mapping[d]) {
            mapping[d] = colorList[v % colorList.length];
          }
        });

        // Find unused mapping and save them, if count if new mapping domain is less than old.
        const newMappingKeys = Object.keys(mapping);
        const oldMappingKeys = Object.keys(props.mapping);
        if (newMappingKeys.length < oldMappingKeys.length) {
          oldMappingKeys
            .slice(newMappingKeys.length, oldMappingKeys.length)
            .filter((key) => key.startsWith(ReservedMappingKeyNamePrefix))
            .forEach((key) => {
              mapping[key] = props.mapping[key];
            });
        }

        props.mapping = mapping;
      } else {
        props.mapping = reuseMapping(s.domain, props.mapping);
      }
    }
    if (props.mapping == null) {
      // If we can't reuse existing colors, infer from scratch
      props.mapping = {};
      // try to use literal values as color
      let colorList = literalColorValues(values);
      if (colorList) {
        s.domain.forEach((v, d) => {
          props.mapping[d] = colorList[v % colorList.length];
        });
      } else if (getDefaultColorPaletteGenerator()) {
        s.domain.forEach((v, d) => {
          props.mapping[d] = getDefaultColorPaletteByValue(d);
        });
      } else {
        colorList = getDefaultColorPalette(s.length);
        s.domain.forEach((v, d) => {
          props.mapping[d] = colorList[v % colorList.length];
        });
      }
    }
  }

  public getAttributePanelWidgets(
    manager: Controls.WidgetManager
  ): Controls.Widget[] {
    const props = this.object.properties;
    const keys: string[] = [];
    for (const key in props.mapping) {
      if (Object.prototype.hasOwnProperty.call(props.mapping, key)) {
        keys.push(key);
      }
    }
    return [
      manager.inputBoolean(
        [
          {
            property: "autoDomainMin",
          },
          {
            property: "autoDomainMax",
          },
        ],
        {
          type: "checkbox",
          label: strings.objects.dataAxis.autoUpdateValues,
        }
      ),
      manager.sectionHeader(strings.objects.scales.colorMapping),
      manager.scrollList(
        keys.map((key) =>
          manager.horizontal(
            [1, 0],
            manager.inputText(
              { property: "mapping" },
              {
                updateProperty: true,
                value: key,
                underline: true,
                styles: {
                  textAlign: "right",
                },
                emitMappingAction: true,
              }
            ),
            manager.inputColor(
              {
                property: "mapping",
                field: key,
                noComputeLayout: true,
              },
              {
                // label: key,
                noDefaultMargin: true,
                stopPropagation: true,
                labelKey: key,
                width: 100,
                underline: true,
                pickerBeforeTextField: true,
                styles: {
                  marginTop: "0px",
                },
              }
            )
          )
        )
      ),
    ];
  }
}

function literalColorValues(values: string[]) {
  const colorList: Color[] = [];
  const cache: { [color: string]: true } = {};
  for (let i = 0; i < values.length; i++) {
    const value = values[i];
    if (cache[value]) {
      continue;
    }

    const d3c = d3color(value);
    if (!d3c) {
      return null;
    }
    const { r, g, b, opacity } = d3c.rgb();
    if (opacity !== 1) {
      return null;
    }
    colorList.push({ r, g, b });
    cache[value] = true;
  }
  return colorList;
}

export class CategoricalScaleEnum extends ScaleClass<
  CategoricalScaleProperties<string>,
  any
> {
  public static classID = "scale.categorical<string,enum>";
  public static type = "scale";

  public attributeNames: string[] = [];
  public attributes: { [name: string]: AttributeDescription } = {};

  public mapDataToAttribute(data: DataValue): AttributeValue {
    const props = this.object.properties;
    return props.mapping[data?.toString()];
  }

  // eslint-disable-next-line
  public initializeState(): void {}

  public inferParameters(
    column: DataValue[],
    options: InferParametersOptions = {}
  ): void {
    const props = this.object.properties;
    const s = new Scale.CategoricalScale();
    const values = column.filter((x) => x != null).map((x) => x.toString());
    s.inferParameters(values, OrderMode.order);

    // If we shouldn't reuse the range, then reset the mapping
    if (!options.reuseRange) {
      props.mapping = null;

      // Otherwise, if we already have a mapping, try to reuse it
    } else if (props.mapping != null) {
      props.mapping = reuseMapping(s.domain, props.mapping);
    }
    if (props.mapping == null) {
      props.mapping = {};
      if (options.rangeEnum) {
        props.defaultRange = options.rangeEnum.slice();
      }
      s.domain.forEach((v, d) => {
        if (options.rangeEnum) {
          props.mapping[d] = options.rangeEnum[v % options.rangeEnum.length];
        } else {
          props.mapping[d] = d;
        }
      });
    }
  }

  public getAttributePanelWidgets(
    manager: Controls.WidgetManager
  ): Controls.Widget[] {
    const props = this.object.properties;
    const keys: string[] = [];
    for (const key in props.mapping) {
      if (Object.prototype.hasOwnProperty.call(props.mapping, key)) {
        keys.push(key);
      }
    }
    return [
      manager.sectionHeader(strings.objects.scales.stringMapping),
      manager.scrollList(
        keys.map((key) =>
          manager.horizontal(
            [2, 3],
            manager.inputText(
              { property: "mapping" },
              {
                updateProperty: true,
                value: key,
                underline: true,
                styles: {
                  textAlign: "right",
                },
              }
            ),
            manager.inputComboBox(
              { property: "mapping", field: key },
              {
                defaultRange: props.defaultRange,
                valuesOnly: false,
              }
            )
          )
        )
      ),
    ];
  }
}

export class CategoricalScaleBoolean extends ScaleClass<
  CategoricalScaleProperties<boolean>,
  any
> {
  public static classID = "scale.categorical<string,boolean>";
  public static type = "scale";

  public attributeNames: string[] = [];
  public attributes: { [name: string]: AttributeDescription } = {};

  public mapDataToAttribute(data: DataValue): AttributeValue {
    const props = this.object.properties;
    return props.mapping[data?.toString()];
  }

  // eslint-disable-next-line
  public initializeState(): void {}

  public inferParameters(
    column: DataValue[],
    options: InferParametersOptions = {}
  ): void {
    const props = this.object.properties;
    const s = new Scale.CategoricalScale();
    const values = column.filter((x) => x != null).map((x) => x.toString());
    s.inferParameters(values, OrderMode.order);

    // If we shouldn't reuse the range, then reset the mapping
    if (!options.reuseRange) {
      props.mapping = null;

      // Otherwise, if we already have a mapping, try to reuse it
    } else if (props.mapping != null) {
      props.mapping = reuseMapping(s.domain, props.mapping);
    }
    if (props.mapping == null) {
      props.mapping = {};
      s.domain.forEach((v, d) => {
        props.mapping[d] = true;
      });
    }
  }

  public getAttributePanelWidgets(
    manager: Controls.WidgetManager
  ): Controls.Widget[] {
    const items: Controls.Widget[] = [];
    const props = this.object.properties;
    const mappingALL: { [name: string]: boolean } = {};
    const mappingNONE: { [name: string]: boolean } = {};
    for (const key in props.mapping) {
      if (Object.prototype.hasOwnProperty.call(props.mapping, key)) {
        items.push(
          manager.inputBoolean(
            { property: "mapping", field: key },
            {
              type: "checkbox-fill-width",
              label: key,
              styles: {
                overflowX: "hidden",
              },
            }
          )
        );
        mappingALL[key] = true;
        mappingNONE[key] = false;
      }
    }
    return [
      manager.inputBoolean(
        [
          {
            property: "autoDomainMin",
          },
          {
            property: "autoDomainMax",
          },
        ],
        {
          type: "checkbox",
          label: strings.objects.dataAxis.autoUpdateValues,
        }
      ),
      manager.sectionHeader(strings.objects.scales.booleanMapping),
      manager.row(
        null,
        manager.horizontal(
          [0, 0],
          manager.setButton(
            { property: "mapping" },
            mappingALL,
            null,
            strings.objects.scales.selectAll
          ),
          manager.setButton(
            { property: "mapping" },
            mappingNONE,
            null,
            strings.objects.scales.clear
          )
        )
      ),
      manager.scrollList(items),
    ];
  }
}

export class CategoricalScaleImage extends ScaleClass<
  CategoricalScaleProperties<string>,
  any
> {
  public static classID = "scale.categorical<string,image>";
  public static type = "scale";

  public attributeNames: string[] = [];
  public attributes: { [name: string]: AttributeDescription } = {};

  public mapDataToAttribute(data: DataValue): AttributeValue {
    const props = this.object.properties;
    return props.mapping[data?.toString()];
  }

  // eslint-disable-next-line
  public initializeState(): void {}

  public inferParameters(
    column: DataValue[],
    options: InferParametersOptions = {}
  ): void {
    const props = this.object.properties;
    const s = new Scale.CategoricalScale();
    const values = column.filter((x) => x != null).map((x) => x.toString());
    s.inferParameters(values, OrderMode.order);

    // If we shouldn't reuse the range, then reset the mapping
    if (!options.reuseRange) {
      props.mapping = null;

      // Otherwise, if we already have a mapping, try to reuse it
    } else if (props.mapping != null) {
      props.mapping = reuseMapping(s.domain, props.mapping);
    }
    if (props.mapping == null) {
      props.mapping = {};
      s.domain.forEach((v, d) => {
        if (options.rangeImage) {
          props.mapping[d] = options.rangeImage[v % options.rangeImage.length];
        } else {
          props.mapping[d] = null;
        }
      });
    }
  }

  public getAttributePanelWidgets(
    manager: Controls.WidgetManager
  ): Controls.Widget[] {
    const props = this.object.properties;
    const keys: string[] = [];
    for (const key in props.mapping) {
      if (Object.prototype.hasOwnProperty.call(props.mapping, key)) {
        keys.push(key);
      }
    }
    return [
      manager.inputBoolean(
        [
          {
            property: "autoDomainMin",
          },
          {
            property: "autoDomainMax",
          },
        ],
        {
          type: "checkbox",
          label: strings.objects.dataAxis.autoUpdateValues,
        }
      ),
      manager.sectionHeader(strings.objects.scales.imageMapping),
      manager.scrollList(
        keys.map((key) =>
          manager.horizontal(
            [2, 5, 0],
            manager.inputText(
              { property: "mapping" },
              {
                updateProperty: true,
                value: key,
                underline: true,
                styles: {
                  textAlign: "right",
                },
              }
            ),
            manager.inputImageProperty({ property: "mapping", field: key }),
            manager.clearButton({ property: "mapping", field: key }, "", true)
          )
        ),
        {
          styles: {
            paddingBottom: 5,
            paddingTop: 5,
          },
        }
      ),
    ];
  }
}

export class CategoricalScaleBase64Image extends ScaleClass<
  CategoricalScaleProperties<string>,
  any
> {
  public static classID = "scale.categorical<image,image>";
  public static type = "scale";

  public attributeNames: string[] = [];
  public attributes: { [name: string]: AttributeDescription } = {};

  public mapDataToAttribute(data: DataValue): AttributeValue {
    const props = this.object.properties;
    return props.mapping[data?.toString()];
  }

  // eslint-disable-next-line
  public initializeState(): void {}

  public inferParameters(
    idColumn: string[],
    options: InferParametersOptions
  ): void {
    const props = this.object.properties;
    const s = new Scale.CategoricalScale();
    const idValues = idColumn.filter((x) => x != null).map((x) => x.toString());
    s.inferParameters(idValues, OrderMode.order);

    // If we shouldn't reuse the range, then reset the mapping
    if (!options.reuseRange) {
      props.mapping = null;

      // Otherwise, if we already have a mapping, try to reuse it
    } else if (props.mapping != null) {
      props.mapping = reuseMapping(s.domain, props.mapping);
    }
    if (props.mapping == null) {
      props.mapping = {};
      s.domain.forEach((v, d) => {
        if (options.rangeImage) {
          props.mapping[d] = options.rangeImage[v % options.rangeImage.length];
        } else {
          props.mapping[d] = null;
        }
      });
    }
  }

  public getAttributePanelWidgets(
    manager: Controls.WidgetManager
  ): Controls.Widget[] {
    const props = this.object.properties;
    const keys: string[] = [];
    for (const key in props.mapping) {
      // eslint-disable-next-line
      if (props.mapping.hasOwnProperty(key)) {
        keys.push(key);
      }
    }
    return [
      manager.inputBoolean(
        [
          {
            property: "autoDomainMin",
          },
          {
            property: "autoDomainMax",
          },
        ],
        {
          type: "checkbox",
          label: strings.objects.dataAxis.autoUpdateValues,
        }
      ),
      manager.sectionHeader(strings.objects.scales.imageMapping),
      manager.scrollList(
        keys.map((key) =>
          manager.horizontal(
            [2, 5],
            manager.inputText(
              { property: "mapping" },
              {
                updateProperty: true,
                value: key,
                underline: true,
                styles: {
                  textAlign: "right",
                },
              }
            ),
            manager.inputImageProperty({ property: "mapping", field: key }),
            manager.clearButton({ property: "mapping", field: key }, "", true)
          )
        ),
        {
          styles: {
            paddingTop: 5,
            paddingBottom: 5,
          },
        }
      ),
    ];
  }
}
