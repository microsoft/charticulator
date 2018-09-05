/*
Copyright (c) Microsoft Corporation. All rights reserved.
Licensed under the MIT license.
*/
import { expect } from "chai";
import * as Expression from "../core/expression";

describe("Expression", () => {
  const test_cases: Array<[string, any]> = [
    // Arithmetics
    [`1 - 2 - 3 - 4`, -8],
    [`12 * (3 + 6 - 5 + 4 * (3 + 7)) * 13 / 12`, 572],
    [`1 + 2 * 3 - 4 - (-7 + 5 * 6)`, -20],
    [`-3 + 5`, 2],
    [`-5^3`, -125],
    [`--5^3`, 125],
    [`3--5^3`, 128],
    [`3-(-5)^3`, 128],
    [`+--++-5`, -5],
    [`a + b + sum(1,2,3,4) - (1+2-3*4)`, 30],
    [`1 + 2 < 3 + 4`, true],
    [`1 + 2 == 3 + 4 - 4`, true],
    [`1 + 2 == 3 + 4`, false],
    [`3 * 4 <= 4 * 3`, true],
    [`3 > 1 and 5 < 8 `, true],
    [`not a == 1`, false],
    [`true == (a == 1)`, true],
    [`false == (a == 1)`, false],
    [`min(1,2,3,4) == 1 and max(1,2,3,4,5) != 4`, true],
    [`mean(1,2,3,4)`, 2.5],
    [`value + 5`, 13],
    [`mean(1,2,3,4)`, 2.5],
    [`sum(map(range(1, 5), x => x * x))`, 55],
    ['`test 1 \\t x\\"\\"` + 4', 6],
    [`date.month(date.parse("2014-12-14 11:23:45"))`, "Dec"],
    [`sum(json.parse("[12,13,14,16,1,2,3]"))`, 61],
    [`average(map(data, x => x.value))`, 2]
  ];
  const context = new Expression.SimpleContext();
  context.variables = {
    a: 1,
    b: 10,
    value: 8,
    data: [
      { key: "A", value: 1 },
      { key: "B", value: 2 },
      { key: "C", value: 3 }
    ],
    'test 1 \t x""': 2
  };

  it("getValue", () => {
    test_cases.forEach(ci => {
      const expr = ci[0];
      const expected = ci[1];
      const e = Expression.parse(expr);
      const returned = e.getValue(context);
      expect(returned).deep.equals(expected, expr);
    });
  });

  it("toString", () => {
    test_cases.forEach(ci => {
      const expr = ci[0];
      const expected = ci[1];
      const e = Expression.parse(expr);
      const es = e.toString();
      const ep = Expression.parse(es);
      const epreturned = e.getValue(context);
      expect(epreturned).deep.equals(expected, expr);
    });
  });
});

describe("Text Expression", () => {
  const test_cases: Array<[string, any]> = [
    [
      "Hello World, Temperature is ${Temperature}{.1f} degree",
      "Hello World, Temperature is 70.0 degree"
    ],
    ["\\$ ${Temperature}{.1f} \\\\F", "$ 70.0 \\F"]
  ];
  const context = new Expression.SimpleContext();
  context.variables = {
    Temperature: 70
  };

  it("getValue", () => {
    test_cases.forEach(ci => {
      const expr = ci[0];
      const expected = ci[1];
      const e = Expression.parseTextExpression(expr);
      const returned = e.getValue(context);
      expect(returned).deep.equals(expected, expr);
    });
  });

  it("toString", () => {
    test_cases.forEach(ci => {
      const expr = ci[0];
      const expected = ci[1];
      const e = Expression.parseTextExpression(expr);
      const es = e.toString();
      const ep = Expression.parseTextExpression(es);
      const epreturned = e.getValue(context);
      expect(epreturned).deep.equals(expected, expr);
    });
  });
});
