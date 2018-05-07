import * as Expression from "../core/expression"
import { expect } from "chai";

describe("Expression", () => {
    let test_cases: [string, any][] = [
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
        ["\`test 1 \\t x\\\"\\\"\` + 4", 6],
        [`date.month(date.parse("2014-12-14 11:23:45"))`, "Dec"],
        [`sum(json.parse("[12,13,14,16,1,2,3]"))`, 61],
        [`average(map(data, x => x.value))`, 2]
    ];
    let context = new Expression.SimpleContext();
    context.variables = {
        a: 1, b: 10,
        value: 8,
        data: [
            { key: "A", value: 1 },
            { key: "B", value: 2 },
            { key: "C", value: 3 }
        ],
        "test 1 \t x\"\"": 2
    };

    it("getValue", () => {
        test_cases.forEach(function (ci) {
            let expr = ci[0];
            let expected = ci[1];
            let e = Expression.parse(expr);
            let returned = e.getValue(context);
            expect(returned).deep.equals(expected, expr);
        });
    });

    it("toString", () => {
        test_cases.forEach(function (ci) {
            let expr = ci[0];
            let expected = ci[1];
            let e = Expression.parse(expr);
            let es = e.toString();
            let ep = Expression.parse(es);
            let epreturned = e.getValue(context);
            expect(epreturned).deep.equals(expected, expr);
        });
    });
});