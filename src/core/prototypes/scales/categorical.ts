/*
Copyright (c) Microsoft Corporation. All rights reserved.
Licensed under the MIT license.
*/
import { Color, Scale } from "../../common";
import {
  ConstraintSolver,
  ConstraintStrength,
  Variable,
  VariableStrength
} from "../../solver";
import * as Specification from "../../specification";
import {
  AttributeDescription,
  Controls,
  DataMappingHints,
  ObjectClasses,
  TemplateParameters
} from "../common";

import { ScaleClass } from "./index";

export interface CategoricalScaleProperties<
  ValueType extends Specification.AttributeValue
> extends Specification.AttributeMap {
  mapping: { [name: string]: ValueType };
}

export interface CategoricalScaleAttributes extends Specification.AttributeMap {
  mapping: { [name: string]: Specification.AttributeValue };
}

export interface CategoricalScaleState extends Specification.ScaleState {
  attributes: CategoricalScaleAttributes;
}

function parseHEX(s: string) {
  return {
    r: parseInt(s.substr(1, 2), 16),
    g: parseInt(s.substr(3, 2), 16),
    b: parseInt(s.substr(5, 2), 16)
  };
}

const brewer3 = ["#7fc97f", "#beaed4", "#fdc086"].map(parseHEX);
const brewer6 = [
  "#a6cee3",
  "#1f78b4",
  "#b2df8a",
  "#33a02c",
  "#fb9a99",
  "#e31a1c"
].map(parseHEX);
const brewer12 = [
  "#a6cee3",
  "#1f78b4",
  "#b2df8a",
  "#33a02c",
  "#fb9a99",
  "#e31a1c",
  "#fdbf6f",
  "#ff7f00",
  "#cab2d6",
  "#6a3d9a",
  "#ffff99",
  "#b15928"
].map(parseHEX);

export function getDefaultColorPalette(count: number) {
  let r = brewer12;
  if (count <= 3) {
    r = brewer3;
  } else if (count <= 6) {
    r = brewer6;
  } else {
    r = brewer12;
  }
  return r;
}

export interface CategoricalScaleNumberAttributes
  extends CategoricalScaleAttributes {
  rangeScale?: number;
}

export interface CategoricalScaleNumberState extends CategoricalScaleState {
  attributes: CategoricalScaleNumberAttributes;
}

class CategoricalScaleNumber extends ScaleClass {
  public static classID = "scale.categorical<string,number>";
  public static type = "scale";

  public readonly object: {
    properties: CategoricalScaleProperties<number>;
  } & Specification.Scale;
  public readonly state: CategoricalScaleNumberState;

  public attributeNames: string[] = ["rangeScale"];
  public attributes: { [name: string]: AttributeDescription } = {
    rangeScale: {
      name: "rangeScale",
      type: "number",
      displayName: "Scale",
      category: "scale-range",
      strength: VariableStrength.MEDIUM
    }
  };

  public mapDataToAttribute(
    data: Specification.DataValue
  ): Specification.AttributeValue {
    const attrs = this.state.attributes;
    const props = this.object.properties;
    const number = props.mapping[data.toString()];
    return number * attrs.rangeScale;
  }

  public buildConstraint(
    data: Specification.DataValue,
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
    column: Specification.DataValue[],
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
        v / (s.domain.size - 1) * (range[1] - range[0]) + range[0];
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

class CategoricalScaleColor extends ScaleClass {
  public static classID = "scale.categorical<string,color>";
  public static type = "scale";

  public readonly object: {
    properties: CategoricalScaleProperties<Color>;
  } & Specification.Scale;

  public attributeNames: string[] = [];
  public attributes: { [name: string]: AttributeDescription } = {};

  public mapDataToAttribute(
    data: Specification.DataValue
  ): Specification.AttributeValue {
    const props = this.object.properties;
    return props.mapping[data.toString()];
  }

  public initializeState(): void {}

  public inferParameters(
    column: Specification.DataValue[],
    hints: DataMappingHints = {}
  ): void {
    const props = this.object.properties;
    const s = new Scale.CategoricalScale();
    const values = column.filter(x => typeof x == "string") as string[];
    s.inferParameters(values, "order");
    props.mapping = {};
    let colorList = brewer12;
    if (s.length <= 3) {
      colorList = brewer3;
    } else if (s.length <= 6) {
      colorList = brewer6;
    } else {
      colorList = brewer12;
    }
    s.domain.forEach((v, d) => {
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

class CategoricalScaleString extends ScaleClass {
  public static classID = "scale.categorical<string,string>";
  public static type = "scale";

  public readonly object: {
    properties: CategoricalScaleProperties<string>;
  } & Specification.Scale;

  public attributeNames: string[] = [];
  public attributes: { [name: string]: AttributeDescription } = {};

  public mapDataToAttribute(
    data: Specification.DataValue
  ): Specification.AttributeValue {
    const props = this.object.properties;
    return props.mapping[data.toString()];
  }

  public initializeState(): void {}

  public inferParameters(
    column: Specification.DataValue[],
    hints: DataMappingHints = {}
  ): void {
    const props = this.object.properties;
    const s = new Scale.CategoricalScale();
    const values = column.filter(x => typeof x == "string") as string[];
    s.inferParameters(values, "order");
    props.mapping = {};
    s.domain.forEach((v, d) => {
      if (hints.rangeString) {
        props.mapping[d] = hints.rangeString[v % hints.rangeString.length];
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
          manager.inputText({ property: "mapping", field: key })
        ])
      )
    );
    return [manager.sectionHeader("String Mapping"), ...items];
  }
}

class CategoricalScaleBoolean extends ScaleClass {
  public static classID = "scale.categorical<string,boolean>";
  public static type = "scale";

  public readonly object: {
    properties: CategoricalScaleProperties<boolean>;
  } & Specification.Scale;

  public attributeNames: string[] = ["mapping"];
  public attributes: { [name: string]: AttributeDescription } = {
    mapping: {
      name: "mapping",
      type: "map<string,boolean>",
      displayName: "Mapping",
      category: "scale-domain",
      solverExclude: true
    }
  };

  public mapDataToAttribute(
    data: Specification.DataValue
  ): Specification.AttributeValue {
    const props = this.object.properties;
    return props.mapping[data.toString()];
  }

  public initializeState(): void {}

  public inferParameters(
    column: Specification.DataValue[],
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

class CategoricalScaleImage extends ScaleClass {
  public static classID = "scale.categorical<string,image>";
  public static type = "scale";

  public readonly object: {
    properties: CategoricalScaleProperties<string>;
  } & Specification.Scale;

  public attributeNames: string[] = [];
  public attributes: { [name: string]: AttributeDescription } = {};

  public mapDataToAttribute(
    data: Specification.DataValue
  ): Specification.AttributeValue {
    const props = this.object.properties;
    return props.mapping[data.toString()];
  }

  public initializeState(): void {}

  public inferParameters(
    column: Specification.DataValue[],
    hints: DataMappingHints = {}
  ): void {
    const props = this.object.properties;
    const s = new Scale.CategoricalScale();
    const values = column.filter(x => typeof x == "string") as string[];
    s.inferParameters(values, "order");
    props.mapping = {};
    s.domain.forEach((v, d) => {
      if (hints.rangeString) {
        props.mapping[d] = hints.rangeString[v % hints.rangeString.length];
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

ObjectClasses.Register(CategoricalScaleNumber);
ObjectClasses.Register(CategoricalScaleColor);
ObjectClasses.Register(CategoricalScaleBoolean);
ObjectClasses.Register(CategoricalScaleString);
ObjectClasses.Register(CategoricalScaleImage);
