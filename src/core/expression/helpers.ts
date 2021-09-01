// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import {
  BooleanValue,
  DateValue,
  Expression,
  FieldAccess,
  FunctionCall,
  LambdaFunction,
  NumberValue,
  Operator,
  StringValue,
  Variable,
  TextExpression,
  Context,
} from "./classes";
import { DataflowTable } from "../prototypes/dataflow";
import { DataKind, DataType } from "../specification";

export function variable(name: string): Variable {
  return new Variable(name);
}

export function functionCall(
  functionName: string,
  ...args: Expression[]
): FunctionCall {
  const fields = functionName.split(".");
  return new FunctionCall(fields, args);
}

export function lambda(names: string[], expression: Expression) {
  return new LambdaFunction(expression, names);
}

export function fields(expr: Expression, ...fields: string[]) {
  return new FieldAccess(expr, fields);
}

export function add(lhs: Expression, rhs: Expression) {
  return new Operator("+", lhs, rhs);
}
export function sub(lhs: Expression, rhs: Expression) {
  return new Operator("-", lhs, rhs);
}
export function mul(lhs: Expression, rhs: Expression) {
  return new Operator("*", lhs, rhs);
}
export function div(lhs: Expression, rhs: Expression) {
  return new Operator("/", lhs, rhs);
}

export function number(v: number) {
  return new NumberValue(v);
}
export function string(v: string) {
  return new StringValue(v);
}
export function boolean(v: boolean) {
  return new BooleanValue(v);
}
export function date(v: Date) {
  return new DateValue(v);
}

export interface AggregationFunctionDescription {
  name: string;
  displayName: string;
  /** Supported input types, if unspecified, any */
  inputTypes?: DataType[];
  inputKind?: DataKind[];
}
export const aggregationFunctions: AggregationFunctionDescription[] = [
  {
    name: "avg",
    displayName: "Average",
    inputTypes: [DataType.Number],
    inputKind: [DataKind.Numerical, DataKind.Temporal],
  },
  {
    name: "median",
    displayName: "Median",
    inputTypes: [DataType.Number],
    inputKind: [DataKind.Numerical, DataKind.Temporal],
  },
  {
    name: "sum",
    displayName: "Sum",
    inputTypes: [DataType.Number],
    inputKind: [DataKind.Numerical, DataKind.Temporal],
  },
  {
    name: "min",
    displayName: "Min",
    inputTypes: [DataType.Number],
    inputKind: [DataKind.Numerical, DataKind.Temporal],
  },
  {
    name: "max",
    displayName: "Max",
    inputTypes: [DataType.Number],
    inputKind: [DataKind.Numerical, DataKind.Temporal],
  },
  {
    name: "stdev",
    displayName: "Standard Deviation",
    inputTypes: [DataType.Number],
    inputKind: [DataKind.Numerical, DataKind.Temporal],
  },
  {
    name: "variance",
    displayName: "Variance",
    inputTypes: [DataType.Number],
    inputKind: [DataKind.Numerical, DataKind.Temporal],
  },
  {
    name: "first",
    displayName: "First",
    inputTypes: [DataType.String, DataType.Boolean],
    inputKind: [DataKind.Categorical, DataKind.Ordinal],
  },
  {
    name: "last",
    displayName: "Last",
    inputTypes: [DataType.String, DataType.Boolean],
    inputKind: [DataKind.Categorical, DataKind.Ordinal],
  },
  {
    name: "count",
    displayName: "Count",
    inputTypes: [DataType.String, DataType.Boolean],
    inputKind: [DataKind.Categorical, DataKind.Ordinal],
  },
  {
    name: "quartile1",
    displayName: "1st Quartile",
    inputTypes: [DataType.Number],
    inputKind: [DataKind.Numerical, DataKind.Temporal],
  },
  {
    name: "quartile3",
    displayName: "3rd Quartile",
    inputTypes: [DataType.Number],
    inputKind: [DataKind.Numerical, DataKind.Temporal],
  },
  {
    name: "iqr",
    displayName: "Inter Quartile Range (IQR)",
    inputTypes: [DataType.Number],
    inputKind: [DataKind.Numerical, DataKind.Temporal],
  },
];

export function getCompatibleAggregationFunctionsByDataType(
  inputType: DataType
) {
  return aggregationFunctions.filter(
    (x) => x.inputTypes == null || x.inputTypes.indexOf(inputType) >= 0
  );
}

export function getCompatibleAggregationFunctionsByDataKind(
  inputKind: DataKind
) {
  return aggregationFunctions.filter(
    (x) => x.inputKind == null || x.inputKind.indexOf(inputKind) >= 0
  );
}

export function getDefaultAggregationFunction(
  inputType: DataType,
  kind: DataKind
) {
  if (inputType == DataType.Number || inputType == DataType.Date) {
    if (kind === DataKind.Categorical || kind === DataKind.Ordinal) {
      return "first";
    } else {
      return "avg";
    }
  } else {
    return "first";
  }
}

export class ExpressionCache {
  private items = new Map<string, Expression>();
  private textItems = new Map<string, TextExpression>();
  public clear() {
    this.items.clear();
    this.textItems.clear();
  }

  public parse(expr: string): Expression {
    if (this.items.has(expr)) {
      return this.items.get(expr);
    } else {
      const result = Expression.Parse(expr);
      this.items.set(expr, result);
      return result;
    }
  }

  public parseTextExpression(expr: string): TextExpression {
    if (this.textItems.has(expr)) {
      return this.textItems.get(expr);
    } else {
      const result = TextExpression.Parse(expr);
      this.textItems.set(expr, result);
      return result;
    }
  }
}

export interface VerifyUserExpressionOptions {
  /** Specify this to verify expression against data */
  data?: Iterable<Context>;
  /** Specify this to verify expression against table */
  table?: DataflowTable;
  /** Specify this to verify return types */
  expectedTypes?: string[];
  textExpression?: boolean;
}

export interface VerifyUserExpressionReport {
  /** Verification is passed */
  pass: boolean;
  /** Re-formatted expression if passed */
  formatted?: string;
  /** Error message if not passed */
  error?: string;
}

/**
 * Verify user input expression
 * @param inputString The expression from user input
 * @param options Verification options
 */
export function verifyUserExpression(
  inputString: string,
  options: VerifyUserExpressionOptions
): VerifyUserExpressionReport {
  let expr: Expression | TextExpression;
  // Try parse the expression
  try {
    if (options.textExpression) {
      expr = TextExpression.Parse(inputString);
    } else {
      expr = Expression.Parse(inputString);
    }
  } catch (error) {
    return {
      pass: false,
      error: "Parse Error: " + error.message,
    };
  }
  if (options.table) {
    try {
      expr.getValue(options.table);
    } catch (error) {
      return {
        pass: false,
        error: "Evaluate Error: " + error.message,
      };
    }
  } else if (options.data) {
    if (options.expectedTypes) {
      const expectedTypes = new Set(options.expectedTypes);
      try {
        for (const ctx of options.data) {
          const value = expr.getValue(ctx);
          let valueType: string = typeof value;
          if (value == null || valueType == "undefined") {
            valueType = "null";
          }
          if (!expectedTypes.has(valueType)) {
            return {
              pass: false,
              error: `Type Error: unexpected ${valueType} returned`,
            };
          }
        }
      } catch (error) {
        return {
          pass: false,
          error: "Evaluate Error: " + error.message,
        };
      }
    } else {
      try {
        for (const ctx of options.data) {
          expr.getValue(ctx);
        }
      } catch (error) {
        return {
          pass: false,
          error: "Evaluate Error: " + error.message,
        };
      }
    }
  }
  return {
    pass: true,
    formatted: expr.toString(),
  };
}
