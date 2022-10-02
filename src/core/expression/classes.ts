// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

// eslint-disable-next-line
export type ValueType = number | boolean | string | Date | Object;
const pegjs = require("./parser.pegjs");

export interface Context {
  getVariable(name: string): ValueType;
}

export class ShadowContext implements Context {
  constructor(
    public upstream: Context = null,
    public shadows: { [name: string]: ValueType } = {}
  ) {}
  public getVariable(name: string): ValueType {
    if (Object.prototype.hasOwnProperty.call(this.shadows, name)) {
      return this.shadows[name];
    }
    return this.upstream.getVariable(name);
  }
}

export class SimpleContext implements Context {
  public variables: { [name: string]: ValueType } = {};

  public getVariable(name: string): ValueType {
    return this.variables[name];
  }
}

import { constants, functions, operators, precedences } from "./intrinsics";
import {
  DataflowTable,
  DataflowTableGroupedContext,
} from "../prototypes/dataflow";
import { applyDateFormat, getFormat, Specification } from "..";

export type PatternReplacer = (expr: Expression) => Expression | void;

export function variableReplacer(map: { [name: string]: string }) {
  return (expr: Expression) => {
    if (expr instanceof Variable) {
      // DON'T CHANGE TO Object.prototype.hasOwnProperty.call !!!
      // Template builder overrides hasOwnProperty method
      // eslint-disable-next-line
      if (map.hasOwnProperty(expr.name)) {
        return new Variable(map[expr.name]);
      }
    }
  };
}

export abstract class Expression {
  public abstract getValue(context: Context): ValueType;
  public abstract toString(): string;
  protected abstract getPrecedence(): number;
  protected abstract replaceChildren(r: PatternReplacer): Expression;

  public toStringPrecedence(parent: number) {
    if (this.getPrecedence() < parent) {
      return `(${this.toString()})`;
    } else {
      return this.toString();
    }
  }

  public getNumberValue(c: Context) {
    const v = this.getValue(c);
    return <number>v;
  }

  public getStringValue(c: Context) {
    const v = this.getValue(c);
    return v !== null && v !== undefined ? v.toString() : "null";
  }

  public static Parse(expr: string): Expression {
    return pegjs.parse(expr) as Expression;
  }

  public replace(replacer: PatternReplacer): Expression {
    const r = replacer(this);
    if (r) {
      // If the expression matches the pattern, replace itself
      return r;
    } else {
      // Otherwise, replace any pattern found inside
      return this.replaceChildren(replacer);
    }
  }
}

export interface TextExpressionPart {
  string?: string;
  expression?: Expression;
  format?: string;
}

/** Text expression is a special class, it cannot be used inside other expression */
export class TextExpression {
  public parts: TextExpressionPart[];

  constructor(parts: TextExpressionPart[] = []) {
    this.parts = parts;
  }

  public getValue(context: Context): string {
    return this.parts
      .map((part) => {
        if (part.string) {
          return part.string;
        } else if (part.expression) {
          const val = part.expression.getValue(context);
          if (part.format) {
            try {
              return getFormat()(part.format)(+val);
            } catch (ex) {
              try {
                return applyDateFormat(new Date(+val), part.format);
              } catch (ex) {
                // try to handle specific format
                if (part.format.match(/^%raw$/).length > 0) {
                  return getFormattedValue(context, val, part.expression);
                } else {
                  throw ex;
                }
              }
            }
          } else {
            return val;
          }
        }
      })
      .join("");
  }

  public isTrivialString() {
    return this.parts.every((x) => x.string != null);
  }

  public toString(): string {
    return this.parts
      .map((part) => {
        if (part.string) {
          return part.string.replace(/([$\\])/g, "\\$1");
        } else if (part.expression) {
          const str = part.expression.toString();
          if (part.format) {
            return "${" + str + "}{" + part.format + "}";
          } else {
            return "${" + str + "}";
          }
        }
      })
      .join("");
  }

  public static Parse(expr: string): TextExpression {
    return pegjs.parse(expr, { startRule: "start_text" }) as TextExpression;
  }

  public replace(r: PatternReplacer): TextExpression {
    return new TextExpression(
      this.parts.map((part) => {
        if (part.string) {
          return { string: part.string };
        } else if (part.expression) {
          if (part.format) {
            return {
              expression: part.expression.replace(r),
              format: part.format,
            };
          } else {
            return { expression: part.expression.replace(r) };
          }
        }
      })
    );
  }
}

export class Value<T> extends Expression {
  constructor(public value: T) {
    super();
  }

  public getValue() {
    return this.value;
  }

  public toString() {
    return JSON.stringify(this.value);
  }

  protected getPrecedence(): number {
    return precedences.VALUE;
  }

  // eslint-disable-next-line
  protected replaceChildren(r: PatternReplacer): Expression {
    return new Value<T>(this.value);
  }
}

export class StringValue extends Value<string> {}
export class NumberValue extends Value<number> {}
export class BooleanValue extends Value<boolean> {}
export class DateValue extends Value<Date> {}

export class FieldAccess extends Expression {
  constructor(public expr: Expression, public fields: string[]) {
    super();
  }

  public getValue(c: Context) {
    let v = <any>this.expr.getValue(c);
    for (const f of this.fields) {
      v = v[f];
    }
    return v;
  }

  public toString() {
    return `${this.expr.toStringPrecedence(
      precedences.FIELD_ACCESS
    )}.${this.fields.map(Variable.VariableNameToString).join(".")}`;
  }

  protected getPrecedence(): number {
    return precedences.FIELD_ACCESS;
  }

  protected replaceChildren(r: PatternReplacer): Expression {
    return new FieldAccess(this.expr.replace(r), this.fields);
  }
}

export class FunctionCall extends Expression {
  public name: string;
  // eslint-disable-next-line
  public function: Function;
  public args: Expression[];

  constructor(parts: string[], args: Expression[]) {
    super();
    this.name = parts.join(".");
    this.args = args;
    let v = <any>functions;
    for (const part of parts) {
      if (Object.prototype.hasOwnProperty.call(v, part)) {
        v = v[part];
      } else {
        v = undefined;
      }
    }
    if (v == undefined) {
      throw new SyntaxError(`undefined function ${this.name}`);
    } else {
      this.function = v;
    }
  }

  public getValue(c: Context) {
    const data = this.args
      .map((arg) => arg.getValue(c))
      ?.filter((item) => item !== undefined);
    if (!data.length) {
      return null;
    }
    return this.function(...data);
  }

  public toString() {
    return `${this.name}(${this.args
      .map((arg) => arg.toStringPrecedence(precedences.FUNCTION_ARGUMENT))
      .join(", ")})`;
  }

  protected getPrecedence(): number {
    return precedences.FUNCTION_CALL;
  }

  protected replaceChildren(r: PatternReplacer): Expression {
    return new FunctionCall(
      this.name.split("."),
      this.args.map((x) => x.replace(r))
    );
  }
}

export class Operator extends Expression {
  // eslint-disable-next-line
  private op: Function;
  constructor(
    public name: string,
    public lhs: Expression,
    public rhs?: Expression
  ) {
    super();
    if (rhs != undefined) {
      this.op = operators[name];
    } else {
      this.op = operators["unary:" + name];
    }
  }

  public getValue(c: Context) {
    const lhs = this.lhs.getValue(c);
    if (this.rhs != undefined) {
      const rhs = this.rhs.getValue(c);
      return this.op(lhs, rhs);
    } else {
      return this.op(lhs);
    }
  }

  public toString() {
    const p = this.getMyPrecedence();
    if (this.rhs != undefined) {
      return `${this.lhs.toStringPrecedence(p[1])} ${
        this.name
      } ${this.rhs.toStringPrecedence(p[2])}`;
    } else {
      return `${this.name} ${this.lhs.toStringPrecedence(p[1])}`;
    }
  }

  protected getMyPrecedence(): number[] {
    if (this.rhs != undefined) {
      return precedences.OPERATORS[this.name];
    } else {
      return precedences.OPERATORS["unary:" + this.name];
    }
  }
  protected getPrecedence(): number {
    return this.getMyPrecedence()[0];
  }

  protected replaceChildren(r: PatternReplacer): Expression {
    return new Operator(
      this.name,
      this.lhs.replace(r),
      this.rhs ? this.rhs.replace(r) : null
    );
  }
}

export class LambdaFunction extends Expression {
  public readonly expr: Expression;
  public readonly argNames: string[];

  public constructor(expr: Expression, argNames: string[]) {
    super();
    this.expr = expr;
    this.argNames = argNames;
  }
  public getValue(c: Context) {
    return (...args: ValueType[]) => {
      const lambdaContext = new ShadowContext(c);
      for (let i = 0; i < this.argNames.length; i++) {
        lambdaContext.shadows[this.argNames[i]] = args[i];
      }
      return this.expr.getValue(lambdaContext);
    };
  }

  public toString() {
    return `(${this.argNames.join(", ")}) => ${this.expr.toStringPrecedence(
      precedences.LAMBDA_EXPRESSION
    )}`;
  }

  protected getPrecedence(): number {
    return precedences.LAMBDA_FUNCTION;
  }

  protected replaceChildren(r: PatternReplacer): Expression {
    // Mask the argument variables in the lambda function
    const rMasked = (expr: Expression) => {
      if (expr instanceof Variable && this.argNames.indexOf(expr.name) >= 0) {
        return undefined;
      } else {
        return r(expr);
      }
    };
    return new LambdaFunction(this.expr.replace(rMasked), this.argNames);
  }
}

export class Variable extends Expression {
  constructor(public readonly name: string) {
    super();
  }
  public getValue(c: Context) {
    const v = c.getVariable(this.name);
    if (v === undefined) {
      return constants[this.name];
    } else {
      return v;
    }
  }
  public toString() {
    return Variable.VariableNameToString(this.name);
  }
  protected getPrecedence(): number {
    return precedences.VARIABLE;
  }

  public static VariableNameToString(name: string) {
    if (name.match(/^[a-zA-Z_][a-zA-Z0-9_]*$/)) {
      return name;
    } else {
      return JSON.stringify(name).replace(/^"|"$/g, "`");
    }
  }

  // eslint-disable-next-line
  protected replaceChildren(r: PatternReplacer): Expression {
    return new Variable(this.name);
  }
}

function getFormattedValue(context: Context, val: any, expression: Expression) {
  if (val === undefined || val === null) {
    return val;
  }
  if (context instanceof ShadowContext) {
    if (
      expression instanceof FunctionCall &&
      expression.args[0] instanceof Variable
    ) {
      const columnName = (<Variable>expression.args[0]).name;
      const column = (<DataflowTable>(
        (<ShadowContext>context).upstream
      )).columns.find((col) => col.name == columnName);
      if (
        column.metadata.rawColumnName &&
        (column.metadata.kind === Specification.DataKind.Temporal ||
          column.type === Specification.DataType.Boolean)
      ) {
        return (<ShadowContext>context).getVariable(
          column.metadata.rawColumnName
        );
      }
    }
  }
  if (context instanceof DataflowTableGroupedContext) {
    if (
      expression instanceof FunctionCall &&
      expression.args[0] instanceof Variable
    ) {
      const columnName = (<Variable>expression.args[0]).name;
      const rawColumnName = (<DataflowTableGroupedContext>context)
        .getTable()
        .columns.find((col) => col.name == columnName).metadata.rawColumnName;
      if (rawColumnName) {
        return (<DataflowTableGroupedContext>context).getVariable(
          rawColumnName
        );
      }
    }
  }
  return val;
}
