/**
 * Expressions
 *
 * The module of exressions responsible for data binding or data fetching
 * Grammar of expression described in [parser.pegjs file](\src\core\expression\index.ts)
 *
 * @packageDocumentation
 * @preferred
 */

// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import { Expression, TextExpression } from "./classes";

export {
  Expression,
  TextExpression,
  TextExpressionPart,
  Context,
  ShadowContext,
  LambdaFunction,
  SimpleContext,
  FieldAccess,
  FunctionCall,
  Variable,
  Value,
  NumberValue,
  BooleanValue,
  StringValue,
  DateValue,
  variableReplacer
} from "./classes";

export { SyntaxError } from "./parser";

/** Shortcut to Expression.Parse */
export function parse(str: string): Expression {
  return Expression.Parse(str);
}

/** Shortcut to TextExpression.Parse */
export function parseTextExpression(str: string): TextExpression {
  return TextExpression.Parse(str);
}

export {
  variable,
  functionCall,
  lambda,
  fields,
  add,
  sub,
  mul,
  div,
  number,
  string,
  date,
  boolean,
  ExpressionCache,
  getDefaultAggregationFunction,
  getCompatibleAggregationFunctions,
  aggregationFunctions,
  AggregationFunctionDescription,
  verifyUserExpression,
  VerifyUserExpressionOptions,
  VerifyUserExpressionReport
} from "./helpers";
