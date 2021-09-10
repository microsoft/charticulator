// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
/* tslint:disable */

"use strict";

import { expect_deep_approximately_equals } from "../unit/utils";

const { parseSync } = require("svgson");

function serialize(data: HTMLDocument) {
  return JSON.stringify(
    parseSync(new XMLSerializer().serializeToString(data)),
    null,
    ""
  );
}

function snapshotPath(node: any) {
  var path = [];
  while (node && node.parent) {
    path.push(node.title);
    node = node.parent;
  }
  return path.reverse();
}

export function matchSnapshot(chai: any, utils: any) {
  var context = (<any>window).__mocha_context__;
  var snapshotState = (<any>window).__snapshot__;

  utils.addMethod(chai.Assertion.prototype, "matchSnapshot", aMethodForExpect);
  chai.assert.matchSnapshot = aMethodForAssert;

  function aMethodForAssert(lang: any, update: boolean, msg: any) {
    // This basically wraps the 'expect' version of the assertion to allow using 'assert' syntax.
    return new chai.Assertion(lang, update, msg).to.matchSnapshot();
  }

  function aMethodForExpect(lang: any, update: boolean) {
    var obj = serialize(chai.util.flag(this, "object"));
    var index = context.index++;
    var path;

    // For a hook, use the currentTest for path
    if (context.runnable.type === "hook") {
      path = snapshotPath(context.runnable.ctx.currentTest);
    } else {
      path = snapshotPath(context.runnable);
    }

    if (update || snapshotState.update) {
      snapshotState.set(path, index, obj, lang);
    } else {
      var snapshot = snapshotState.get(path, index);
      if (!snapshot) {
        snapshotState.set(path, index, obj, lang);
      } else {
        try {
          expect_deep_approximately_equals(
            JSON.parse(obj),
            JSON.parse(snapshot.code),
            1
          );
        } catch (ex) {
          throw new chai.AssertionError(
            "Received value does not match stored snapshot " + index,
            {
              actual: ex.actual,
              expected: ex.expected,
              showDiff: true,
              stack: ex.stack,
            },
            chai.util.flag(this, "ssfi")
          );
        }
      }
    }
  }
}

declare global {
  namespace Chai {
    interface Assertion {
      matchSnapshot(lang?: any, update?: boolean): Assertion;
    }
    interface AssertStatic {
      matchSnapshot(lang?: any, update?: boolean): Assertion;
    }
  }
}
