// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import { expect } from "chai";
import { parseDate } from "../../core/dataset/datetime";
import * as Expression from "../../core/expression";

describe("Datetime Parser", () => {
  it("parseDate", () => {
    const cases: Array<[string, string, string]> = [
      // Date only
      ["2016-01", "2016-01-01T00:00:00.000Z", "Jan 2016 01 00 00"],
      ["01/2016", "2016-01-01T00:00:00.000Z", "Jan 2016 01 00 00"],
      ["2016-01-23", "2016-01-23T00:00:00.000Z", "Jan 2016 23 00 00"],
      ["01/23/2016", "2016-01-23T00:00:00.000Z", "Jan 2016 23 00 00"],
      // Date & Time
      ["01/23/2016  07:39:46", "2016-01-23T07:39:46.000Z", "Jan 2016 23 07 39"],
      ["01/23/2016  07:39", "2016-01-23T07:39:00.000Z", "Jan 2016 23 07 39"],
      // Date & Time (am/pm)
      [
        "2016-01-23   07:39:46am",
        "2016-01-23T07:39:46.000Z",
        "Jan 2016 23 07 39",
      ],
      [
        "2016-01-23 07:39:46pm",
        "2016-01-23T19:39:46.000Z",
        "Jan 2016 23 19 39",
      ],
      ["01/23/2016 12:03am", "2016-01-23T00:03:00.000Z", "Jan 2016 23 00 03"],
      ["01/23/2016 01:03am", "2016-01-23T01:03:00.000Z", "Jan 2016 23 01 03"],
      ["01/23/2016 01:03pm", "2016-01-23T13:03:00.000Z", "Jan 2016 23 13 03"],
      ["01/23/2016 12:03PM", "2016-01-23T12:03:00.000Z", "Jan 2016 23 12 03"],
      // Datetime & Timezone
      [
        "01/23/2016 12:03PM +01:34",
        "2016-01-23T13:37:00.000Z",
        "Jan 2016 23 13 37",
      ],
      [
        "01/23/2016 12:03PM -01:34",
        "2016-01-23T10:29:00.000Z",
        "Jan 2016 23 10 29",
      ],
      // ISO8601
      [
        "2016-05-24T15:54:14.876Z",
        "2016-05-24T15:54:14.876Z",
        "May 2016 24 15 54",
      ],
      ["2016-05-24T15:54:14Z", "2016-05-24T15:54:14.000Z", "May 2016 24 15 54"],
    ];
    for (const [str, datestr, exprdatestr] of cases) {
      const r = parseDate(str, 0);
      const p = new Date(r).toISOString();
      expect(p).to.equal(datestr, str);

      const ctx = new Expression.SimpleContext();
      ctx.variables.t = r;
      const expr =
        "${date.month(t)} ${date.year(t)} ${date.day(t)} ${date.hour(t)} ${date.minute(t)}";
      const parsed = Expression.parseTextExpression(expr);
      expect(parsed.getValue(ctx)).to.equals(exprdatestr);
    }
  });
});
