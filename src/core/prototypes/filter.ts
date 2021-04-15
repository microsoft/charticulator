// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import * as Specification from "../specification";
import { ExpressionCache, Context } from "../expression";

export class CompiledFilter {
  constructor(filter: Specification.Types.Filter, cache: ExpressionCache) {
    if (filter.categories) {
      const expr = cache.parse(filter.categories.expression);
      const map = filter.categories.values;
      this.filter = (context) => {
        const val = expr.getStringValue(context);
        // eslint-disable-next-line
        return map.hasOwnProperty(val) && map[val] == true;
      };
    } else if (filter.expression) {
      const expr = cache.parse(filter.expression);
      this.filter = (context) => {
        return <boolean>expr.getValue(context);
      };
    }
  }

  public filter: (context: Context) => boolean;
}
