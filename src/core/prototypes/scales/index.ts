// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import { ScaleClass } from "./scale";
import { AttributeType, DataKind, DataType } from "../../specification";
import { ObjectClasses } from "../object";
import {
  CategoricalScaleNumber,
  CategoricalScaleColor,
  CategoricalScaleBoolean,
  CategoricalScaleEnum,
  CategoricalScaleImage,
} from "./categorical";
import { LinearScale, LinearColorScale, LinearBooleanScale } from "./linear";

export { ScaleClass };

interface InferScaleTypeRule {
  input: { type: DataType | DataType[]; kind: DataKind | DataKind[] };
  output: AttributeType | AttributeType[];
  scale: string;
  priority: number;
}

const inferScaleTypeRules: InferScaleTypeRule[] = [
  {
    input: {
      type: [DataType.Number, DataType.Date],
      kind: [DataKind.Numerical, DataKind.Temporal],
    },
    output: AttributeType.Number,
    scale: "scale.linear<number,number>",
    priority: 1,
  },
  {
    input: {
      type: [DataType.Number, DataType.Date],
      kind: [DataKind.Numerical, DataKind.Temporal],
    },
    output: AttributeType.Color,
    scale: "scale.linear<number,color>",
    priority: 1,
  },
  {
    input: {
      type: [DataType.Number, DataType.Date],
      kind: [DataKind.Categorical, DataKind.Ordinal],
    },
    output: AttributeType.Color,
    scale: "scale.categorical<string,color>",
    priority: 1,
  },
  {
    input: {
      type: [DataType.Number, DataType.Date],
      kind: [DataKind.Numerical, DataKind.Temporal],
    },
    output: AttributeType.Boolean,
    scale: "scale.linear<number,boolean>",
    priority: 1,
  },
  {
    input: {
      type: [DataType.String, DataType.Boolean],
      kind: [DataKind.Categorical, DataKind.Ordinal],
    },
    output: AttributeType.Color,
    scale: "scale.categorical<string,color>",
    priority: 1,
  },
  {
    input: {
      type: [DataType.String, DataType.Boolean],
      kind: [DataKind.Categorical, DataKind.Ordinal],
    },
    output: AttributeType.Image,
    scale: "scale.categorical<string,image>",
    priority: 1,
  },
  {
    input: {
      type: [DataType.String, DataType.Boolean],
      kind: [DataKind.Categorical, DataKind.Ordinal],
    },
    output: AttributeType.Enum,
    scale: "scale.categorical<string,enum>",
    priority: 1,
  },
  {
    input: {
      type: [DataType.String, DataType.Boolean],
      kind: [DataKind.Categorical, DataKind.Ordinal],
    },
    output: AttributeType.Boolean,
    scale: "scale.categorical<string,boolean>",
    priority: 1,
  },
  {
    input: { type: DataType.String, kind: [DataKind.Ordinal] },
    output: AttributeType.Number,
    scale: "scale.categorical<string,number>",
    priority: 1,
  },
];

function match<T>(test: T | T[], input: T): boolean {
  if (test instanceof Array) {
    return test.indexOf(input) >= 0;
  } else {
    return test == input;
  }
}

// Return the scale class by matching dataType and attrType
export function inferScaleType(
  dataType: DataType,
  dataKind: DataKind,
  attrType: AttributeType
) {
  // Match scale inference rules, find the matched one with top priority.
  let candidate: InferScaleTypeRule = null;
  for (const rule of inferScaleTypeRules) {
    // Filter non-matches
    if (!match(rule.input.type, dataType)) {
      continue;
    }
    if (!match(rule.output, attrType)) {
      continue;
    }
    if (!match(rule.input.kind, dataKind)) {
      continue;
    }
    if (!candidate || candidate.priority < rule.priority) {
      candidate = rule;
    }
  }
  if (candidate) {
    return candidate.scale;
  } else {
    return null;
  }
}

export function registerClasses() {
  ObjectClasses.Register(CategoricalScaleNumber);
  ObjectClasses.Register(CategoricalScaleColor);
  ObjectClasses.Register(CategoricalScaleBoolean);
  ObjectClasses.Register(CategoricalScaleEnum);
  ObjectClasses.Register(CategoricalScaleImage);
  ObjectClasses.Register(LinearScale);
  ObjectClasses.Register(LinearColorScale);
  ObjectClasses.Register(LinearBooleanScale);
}
