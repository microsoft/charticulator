// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import { AttributeMap } from "../specification";

export enum ConstraintStrength {
  HARD = 1,
  STRONG = 2,
  MEDIUM = 3,
  WEAK = 4,
  WEAKER = 5
}

export interface AttributeOptions {
  /** Attribute is editable, default: true */
  edit: boolean;
}

export interface Variable {}

export abstract class ConstraintPlugin {
  public abstract apply(): boolean;
}

export abstract class ConstraintSolver {
  /** Make an attribute constant */
  public abstract makeConstant(map: AttributeMap, name: string): void;
  /** Get the variable of an attribute */
  public abstract attr(
    map: AttributeMap,
    name: string,
    options?: AttributeOptions
  ): Variable;
  /** Get the value of a variable */
  public abstract getValue(attr: Variable): number;
  /** Set the value of a variable */
  public abstract setValue(attr: Variable, value: number): void;

  /**
   * Add a linear constraint: bias + linear(lhs) == linear(rhs)
   */
  public abstract addLinear(
    strength: ConstraintStrength,
    bias: number,
    lhs: Array<[number, Variable]>,
    rhs?: Array<[number, Variable]>
  ): void;

  /**
   * Add a soft inequality constraint: bias + linear(lhs) >= linear(rhs)
   */
  public abstract addSoftInequality(
    strength: ConstraintStrength,
    bias: number,
    lhs: Array<[number, Variable]>,
    rhs?: Array<[number, Variable]>
  ): void;

  /** Solve the constraints */
  public abstract solve(): [number, number];
  public abstract destroy(): void;

  // /** Solve the constraints asynchronously */
  // public abstract solveAsync(callback: (finish: boolean) => void): void;
  // /** Stop the async solve */
  // public abstract solveAsyncStop(): void;

  // Below are general helper functions

  /** Get attributes */
  public attrs(map: AttributeMap, name: string[]): Variable[] {
    return name.map(n => this.attr(map, n));
  }

  /** Get a linear value */
  public getLinear(...items: Array<[number, Variable]>) {
    let s = 0;
    for (const v of items) {
      s += v[0] * this.getValue(v[1]);
    }
    return s;
  }

  /** Add a constraint that enfoces a = b */
  public addEquals(strength: ConstraintStrength, a: Variable, b: Variable) {
    this.addLinear(strength, 0, [[1, a], [-1, b]]);
  }

  /** Add a constraint that enfoces a = value */
  public addEqualToConstant(
    strength: ConstraintStrength,
    a: Variable,
    value: number
  ) {
    this.addLinear(strength, value, [[-1, a]]);
  }

  public plugins: ConstraintPlugin[] = [];

  public addPlugin(plugin: ConstraintPlugin): void {
    this.plugins.push(plugin);
  }

  public applyPlugins() {
    this.plugins.forEach(p => p.apply());
  }
}
