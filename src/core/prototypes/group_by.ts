// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import * as Specification from "../specification";
import { ExpressionCache, Context } from "../expression";
import { DataflowTable } from "./dataflow";
import { gather, makeRange } from "../common";

export class CompiledGroupBy {
  constructor(groupBy: Specification.Types.GroupBy, cache: ExpressionCache) {
    if (groupBy.expression) {
      const expr = cache.parse(groupBy.expression);
      this.groupBy = (table: DataflowTable) => {
        const indices = makeRange(0, table.rows.length);
        const groups = gather(indices, i =>
          expr.getStringValue(table.getRowContext(i))
        );
        return groups;
      };
    }
  }

  public groupBy: (table: DataflowTable) => number[][];
}
