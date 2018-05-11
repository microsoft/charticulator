import {
    BooleanValue, DateValue, Expression, FieldAccess, FunctionCall,
    LambdaFunction, NumberValue, Operator, StringValue, Variable
} from "./classes";

import { parse } from "./parser";

export function variable(name: string): Variable {
    return new Variable(name);
}

export function functionCall(functionName: string, ...args: Expression[]): FunctionCall {
    const fields = functionName.split(".");
    if (fields.length == 1) {
        return new FunctionCall(new Variable(functionName), args);
    } else {
        return new FunctionCall(new FieldAccess(new Variable(fields[0]), fields.slice(1)), args);
    }
}

export function lambda(names: string[], expression: Expression) {
    return new LambdaFunction(expression, names);
}

export function fields(expr: Expression, ...fields: string[]) {
    return new FieldAccess(expr, fields);
}

export function add(lhs: Expression, rhs: Expression) { return new Operator("+", lhs, rhs); }
export function sub(lhs: Expression, rhs: Expression) { return new Operator("-", lhs, rhs); }
export function mul(lhs: Expression, rhs: Expression) { return new Operator("*", lhs, rhs); }
export function div(lhs: Expression, rhs: Expression) { return new Operator("/", lhs, rhs); }

export function number(v: number) { return new NumberValue(v); }
export function string(v: string) { return new StringValue(v); }
export function boolean(v: boolean) { return new BooleanValue(v); }
export function date(v: Date) { return new DateValue(v); }

export class ExpressionCache {
    private items = new Map<string, Expression>();
    public clear() {
        this.items.clear();
    }

    public parse(expr: string): Expression {
        if (this.items.has(expr)) {
            return this.items.get(expr);
        } else {
            const result = parse(expr);
            this.items.set(expr, result);
            return result;
        }
    }
}