/*
Copyright (c) Microsoft Corporation. All rights reserved.
Licensed under the MIT license.
*/
import * as Specification from "../specification";
import { ExpressionCache, Context } from "../expression";

export class CompiledFilter {
  constructor(filter: Specification.Types.Filter, cache: ExpressionCache) {
    if (filter.categories) {
      const map = filter.categories.values;
      this.filter = context => {
        const val = context.getVariable(filter.categories.column).toString();
        return map.hasOwnProperty(val) && map[val] == true;
      };
    } else if (filter.expression) {
      const expr = cache.parse(filter.expression);
      this.filter = context => {
        return expr.getValue(context) as boolean;
      };
    }
  }

  public filter: (context: Context) => boolean;
}
