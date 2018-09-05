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
  DateValue
} from "./classes";

export { SyntaxError } from "./parser";

export function parse(str: string): Expression {
  return Expression.Parse(str);
}

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
  verifyUserExpression,
  VerifyUserExpressionOptions,
  VerifyUserExpressionReport
} from "./helpers";
