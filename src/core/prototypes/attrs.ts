// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import { AttributeDescriptions, AttributeDescription } from "./object";
import { AttributeType } from "../specification";

export class AttrBuilder {
  public static attr(
    name: string,
    type: AttributeType,
    options: Partial<AttributeDescription> = {}
  ) {
    const r: AttributeDescriptions = {};
    r[name] = { name, type, ...options };
    return r;
  }

  public static number(
    name: string,
    solvable: boolean = true,
    options: Partial<AttributeDescription> = {}
  ): AttributeDescriptions {
    if (solvable) {
      return this.attr(name, AttributeType.Number, options);
    } else {
      return this.attr(name, AttributeType.Number, {
        solverExclude: true,
        ...options
      });
    }
  }

  public static color(
    name: string,
    options: Partial<AttributeDescription> = {}
  ): AttributeDescriptions {
    return this.attr(name, AttributeType.Color, {
      solverExclude: true,
      ...options
    });
  }

  public static boolean(
    name: string,
    options: Partial<AttributeDescription> = {}
  ): AttributeDescriptions {
    return this.attr(name, AttributeType.Boolean, {
      solverExclude: true,
      ...options
    });
  }

  public static enum(
    name: string,
    options: Partial<AttributeDescription> = {}
  ): AttributeDescriptions {
    return this.attr(name, AttributeType.Enum, {
      solverExclude: true,
      ...options
    });
  }

  public static line(): AttributeDescriptions {
    return {
      ...this.number("x1"),
      ...this.number("y1"),
      ...this.number("x2"),
      ...this.number("y2")
    };
  }

  public static point(): AttributeDescriptions {
    return {
      ...this.number("x"),
      ...this.number("y")
    };
  }

  public static center(): AttributeDescriptions {
    return {
      ...this.number("cx"),
      ...this.number("cy")
    };
  }

  public static size(): AttributeDescriptions {
    return {
      ...this.number("width", true, { defaultRange: [0, 200] }),
      ...this.number("height", true, { defaultRange: [0, 200] })
    };
  }

  public static dXdY(): AttributeDescriptions {
    return {
      ...this.number("dx", true, { defaultRange: [30, 100] }),
      ...this.number("dy", true, { defaultRange: [30, 100] })
    };
  }

  public static opacity() {
    return this.number("opacity", false, {
      defaultRange: [0, 1],
      defaultValue: 1
    });
  }

  public static visible() {
    return this.boolean("visible", { defaultValue: true });
  }

  public static image() {
    return this.attr("image", AttributeType.Image, {
      solverExclude: true,
      defaultValue: null
    });
  }

  public static style(options: { fill?: boolean } = {}): AttributeDescriptions {
    const r = {
      ...this.color("stroke", { defaultValue: null }),
      ...this.number("strokeWidth", false, {
        defaultRange: [0, 5],
        defaultValue: 1
      }),
      ...this.opacity(),
      ...this.visible()
    };
    if (options.fill) {
      r.fill = this.color("fill", { defaultValue: null }).fill;
    }
    return r;
  }
}
