// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import { Color, Scale, getDefaultColorPalette } from "../../common";
import { ConstraintSolver, ConstraintStrength, Variable } from "../../solver";
import {
  DataValue,
  AttributeValue,
  AttributeMap,
  AttributeType
} from "../../specification";
import { AttributeDescription, Controls, DataMappingHints } from "../common";

import { ScaleClass } from "./index";
import { AttributeDescriptions } from "../object";

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
      type: AttributeType.Number
    }
  };

  public mapDataToAttribute(data: DataValue): AttributeValue {
    const attrs = this.state.attributes;
    const props = this.object.properties;
    const number = props.mapping[data.toString()];
    return number * attrs.rangeScale;
  }

  public buildConstraint(
    data: DataValue,
    target: Variable,
    solver: ConstraintSolver
  ) {
    const attrs = this.state.attributes;
    const props = this.object.properties;
    const k = props.mapping[data.toString()];
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
    hints: DataMappingHints = {}
  ): void {
    const attrs = this.state.attributes;
    const props = this.object.properties;
    const s = new Scale.CategoricalScale();
    const values = column.filter(x => typeof x == "string") as string[];
    s.inferParameters(values, "order");

    props.mapping = {};

    let range = [1, s.domain.size];
    if (hints.rangeNumber) {
      range = hints.rangeNumber;
    }

    s.domain.forEach((v, d) => {
      props.mapping[d] =
        (v / (s.domain.size - 1)) * (range[1] - range[0]) + range[0];
    });

    attrs.rangeScale = range[1] as number;
  }

  public getAttributePanelWidgets(
    manager: Controls.WidgetManager
  ): Controls.Widget[] {
    const items: Controls.Widget[] = [];
    const props = this.object.properties;
    const keys: string[] = [];
    for (const key in props.mapping) {
      if (props.mapping.hasOwnProperty(key)) {
        keys.push(key);
      }
    }
    items.push(
      manager.table(
        keys.map(key => [
          manager.text(key, "right"),
          manager.inputNumber({ property: "mapping", field: key })
        ])
      )
    );
    return [manager.sectionHeader("Number Mapping"), ...items];
  }
}

export class CategoricalScaleColor extends ScaleClass<
  CategoricalScaleProperties<Color>,
  {}
> {
  public static classID = "scale.categorical<string,color>";
  public static type = "scale";

  public attributeNames: string[] = [];
  public attributes: AttributeDescriptions = {};

  public mapDataToAttribute(data: DataValue): AttributeValue {
    const props = this.object.properties;
    return props.mapping[data.toString()];
  }

  public initializeState(): void {}

  public inferParameters(
    column: DataValue[],
    hints: DataMappingHints = {}
  ): void {
    const props = this.object.properties;
    const s = new Scale.CategoricalScale();
    const values = column.filter(x => typeof x == "string") as string[];
    s.inferParameters(values, "order");
    props.mapping = {};
    // Find a good default color palette
    const colorList = getDefaultColorPalette(s.length);
    s.domain.forEach((v, d) => {
      // If we still don't have enough colors, reuse them
      // TODO: fix this with a better method
      props.mapping[d] = colorList[v % colorList.length];
    });
  }

  public getAttributePanelWidgets(
    manager: Controls.WidgetManager
  ): Controls.Widget[] {
    const items: Controls.Widget[] = [];
    const props = this.object.properties;
    const keys: string[] = [];
    for (const key in props.mapping) {
      if (props.mapping.hasOwnProperty(key)) {
        keys.push(key);
      }
    }
    items.push(
      manager.table(
        keys.map(key => [
          manager.text(key, "right"),
          manager.inputColor({
            property: "mapping",
            field: key,
            noComputeLayout: true
          })
        ])
      )
    );
    return [manager.sectionHeader("Color Mapping"), ...items];
  }
}

export class CategoricalScaleEnum extends ScaleClass<
  CategoricalScaleProperties<string>,
  {}
> {
  public static classID = "scale.categorical<string,enum>";
  public static type = "scale";

  public attributeNames: string[] = [];
  public attributes: { [name: string]: AttributeDescription } = {};

  public mapDataToAttribute(data: DataValue): AttributeValue {
    const props = this.object.properties;
    return props.mapping[data.toString()];
  }

  public initializeState(): void {}

  public inferParameters(
    column: DataValue[],
    hints: DataMappingHints = {}
  ): void {
    const props = this.object.properties;
    const s = new Scale.CategoricalScale();
    const values = column.filter(x => typeof x == "string") as string[];
    s.inferParameters(values, "order");
    props.mapping = {};
    if (hints.rangeEnum) {
      props.defaultRange = hints.rangeEnum.slice();
    }
    s.domain.forEach((v, d) => {
      if (hints.rangeEnum) {
        props.mapping[d] = hints.rangeEnum[v % hints.rangeEnum.length];
      } else {
        props.mapping[d] = d;
      }
    });
  }

  public getAttributePanelWidgets(
    manager: Controls.WidgetManager
  ): Controls.Widget[] {
    const items: Controls.Widget[] = [];
    const props = this.object.properties;
    const keys: string[] = [];
    for (const key in props.mapping) {
      if (props.mapping.hasOwnProperty(key)) {
        keys.push(key);
      }
    }
    items.push(
      manager.table(
        keys.map(key => [
          manager.text(key, "right"),
          manager.inputComboBox(
            { property: "mapping", field: key },
            props.defaultRange,
            false
          )
        ])
      )
    );
    return [manager.sectionHeader("String Mapping"), ...items];
  }
}

export class CategoricalScaleBoolean extends ScaleClass<
  CategoricalScaleProperties<boolean>,
  {}
> {
  public static classID = "scale.categorical<string,boolean>";
  public static type = "scale";

  public attributeNames: string[] = [];
  public attributes: { [name: string]: AttributeDescription } = {};

  public mapDataToAttribute(data: DataValue): AttributeValue {
    const props = this.object.properties;
    return props.mapping[data.toString()];
  }

  public initializeState(): void {}

  public inferParameters(
    column: DataValue[],
    hints: DataMappingHints = {}
  ): void {
    const props = this.object.properties;
    const s = new Scale.CategoricalScale();
    const values = column.filter(x => typeof x == "string") as string[];
    s.inferParameters(values, "order");
    props.mapping = {};
    s.domain.forEach((v, d) => {
      props.mapping[d] = true;
    });
  }

  public getAttributePanelWidgets(
    manager: Controls.WidgetManager
  ): Controls.Widget[] {
    const items: Controls.Widget[] = [];
    const props = this.object.properties;
    const mappingALL: { [name: string]: boolean } = {};
    const mappingNONE: { [name: string]: boolean } = {};
    for (const key in props.mapping) {
      if (props.mapping.hasOwnProperty(key)) {
        items.push(
          manager.inputBoolean(
            { property: "mapping", field: key },
            { type: "checkbox", label: key }
          )
        );
        mappingALL[key] = true;
        mappingNONE[key] = false;
      }
    }
    return [
      manager.sectionHeader("Boolean Mapping"),
      manager.horizontal(
        [0, 0],
        manager.setButton(
          { property: "mapping" },
          mappingALL,
          null,
          "Select All"
        ),
        manager.setButton({ property: "mapping" }, mappingNONE, null, "Clear")
      ),
      ...items
    ];
  }
}

export class CategoricalScaleImage extends ScaleClass<
  CategoricalScaleProperties<string>,
  {}
> {
  public static classID = "scale.categorical<string,image>";
  public static type = "scale";

  public attributeNames: string[] = [];
  public attributes: { [name: string]: AttributeDescription } = {};

  public mapDataToAttribute(data: DataValue): AttributeValue {
    const props = this.object.properties;
    return props.mapping[data.toString()];
  }

  public initializeState(): void {}

  public inferParameters(
    column: DataValue[],
    hints: DataMappingHints = {}
  ): void {
    const props = this.object.properties;
    const s = new Scale.CategoricalScale();
    const values = column.filter(x => typeof x == "string") as string[];
    s.inferParameters(values, "order");
    props.mapping = {};
    s.domain.forEach((v, d) => {
      if (hints.rangeImage) {
        props.mapping[d] = hints.rangeImage[v % hints.rangeImage.length];
      } else {
        props.mapping[d] = "";
      }
    });
  }

  public getAttributePanelWidgets(
    manager: Controls.WidgetManager
  ): Controls.Widget[] {
    const items: Controls.Widget[] = [];
    const props = this.object.properties;
    const keys: string[] = [];
    for (const key in props.mapping) {
      if (props.mapping.hasOwnProperty(key)) {
        keys.push(key);
      }
    }
    items.push(
      manager.table(
        keys.map(key => [
          manager.text(key, "right"),
          manager.inputImage({ property: "mapping", field: key })
        ])
      )
    );
    return [manager.sectionHeader("Image Mapping"), ...items];
  }
}
