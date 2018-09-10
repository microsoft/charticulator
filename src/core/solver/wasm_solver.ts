// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import * as LSCGSolver from "lscg-solver";
import { KeyNameMap } from "../common";
import { AttributeMap } from "../specification";
import {
  AttributeOptions,
  ConstraintSolver,
  ConstraintStrength,
  Variable
} from "./abstract";

export function initialize() {
  return LSCGSolver.initialize();
}

export let Matrix = LSCGSolver.Matrix;

export interface WASMSolverVariable extends Variable {
  map: AttributeMap;
  name: string;
  index: number;
}

export class WASMSolver extends ConstraintSolver {
  public solver: LSCGSolver.ConstraintSolver;
  public variables: KeyNameMap<AttributeMap, WASMSolverVariable>;
  public currentIndex: number = 0;

  constructor() {
    super();
    this.variables = new KeyNameMap<AttributeMap, WASMSolverVariable>();
    this.solver = new LSCGSolver.ConstraintSolver();
    this.solver.flags = LSCGSolver.ConstraintSolver.FLAG_REDUCE; // | LSCGSolver.ConstraintSolver.FLAG_LAGRANGE;
  }

  public makeConstant(map: AttributeMap, name: string): void {
    this.solver.makeConstant(this.attr(map, name).index);
  }
  /** Get the variable of an attribute */
  public attr(
    map: AttributeMap,
    name: string,
    options?: AttributeOptions
  ): WASMSolverVariable {
    if (this.variables.has(map, name)) {
      return this.variables.get(map, name);
    } else {
      this.currentIndex++;
      const item: WASMSolverVariable = { index: this.currentIndex, map, name };
      this.variables.add(map, name, item);
      this.solver.addVariable(this.currentIndex, map[name] as number, true);
      return item;
    }
  }
  /** Get the value of a variable */
  public getValue(attr: WASMSolverVariable): number {
    return attr.map[attr.name] as number;
  }
  /** Set the value of a variable */
  public setValue(attr: WASMSolverVariable, value: number): void {
    attr.map[attr.name] = value;
  }

  /** Add a linear constraint */
  public addLinear(
    strength: ConstraintStrength,
    bias: number,
    lhs: Array<[number, WASMSolverVariable]>,
    rhs?: Array<[number, WASMSolverVariable]>
  ): void {
    let st = 0;
    switch (strength) {
      case ConstraintStrength.HARD:
        {
          st = LSCGSolver.ConstraintSolver.STRENGTH_HARD;
        }
        break;
      case ConstraintStrength.STRONG:
        {
          st = LSCGSolver.ConstraintSolver.STRENGTH_STRONG;
        }
        break;
      case ConstraintStrength.MEDIUM:
        {
          st = LSCGSolver.ConstraintSolver.STRENGTH_MEDIUM;
        }
        break;
      case ConstraintStrength.WEAK:
        {
          st = LSCGSolver.ConstraintSolver.STRENGTH_WEAK;
        }
        break;
      case ConstraintStrength.WEAKER:
        {
          st = LSCGSolver.ConstraintSolver.STRENGTH_WEAKER;
        }
        break;
    }
    const weights = [];
    const variable_names = [];
    for (const item of lhs) {
      weights.push(item[0]);
      variable_names.push(item[1].index);
    }
    if (rhs) {
      for (const item of rhs) {
        weights.push(-item[0]);
        variable_names.push(item[1].index);
      }
    }
    this.solver.addConstraint(st, bias, variable_names, weights);
  }

  private _count = 0;

  /** Solve the constraints */
  public solve(): [number, number] {
    this.variables.forEach((value, map, key) => {
      this.solver.setValue(value.index, map[key] as number);
    });
    this.solver.solve();
    this.variables.forEach((value, map, key) => {
      map[key] = this.solver.getValue(value.index);
    });
    return [0, this.solver.error];
  }
  public destroy(): void {
    this.solver.destroy();
  }
}
