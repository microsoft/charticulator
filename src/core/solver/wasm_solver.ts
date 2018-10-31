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

const strengthMap: { [name in ConstraintStrength]: number } = {
  [ConstraintStrength.HARD]: LSCGSolver.ConstraintSolver.STRENGTH_HARD,
  [ConstraintStrength.STRONG]: LSCGSolver.ConstraintSolver.STRENGTH_STRONG,
  [ConstraintStrength.MEDIUM]: LSCGSolver.ConstraintSolver.STRENGTH_MEDIUM,
  [ConstraintStrength.WEAK]: LSCGSolver.ConstraintSolver.STRENGTH_WEAK,
  [ConstraintStrength.WEAKER]: LSCGSolver.ConstraintSolver.STRENGTH_WEAKER
};

export interface WASMSolverVariable extends Variable {
  map: AttributeMap;
  name: string;
  index: number;
}

export class WASMSolver extends ConstraintSolver {
  public solver: LSCGSolver.ConstraintSolver;
  public variables: KeyNameMap<AttributeMap, WASMSolverVariable>;
  public currentIndex: number = 0;
  public softInequalities: Array<{
    id: number;
    bias: number;
    variable_names: number[];
    weights: number[];
  }> = [];

  constructor() {
    super();
    this.variables = new KeyNameMap<AttributeMap, WASMSolverVariable>();
    this.solver = new LSCGSolver.ConstraintSolver();
    this.solver.flags = LSCGSolver.ConstraintSolver.FLAG_REDUCE; // | LSCGSolver.ConstraintSolver.FLAG_LAGRANGE;
    this.solver.tolerance = 1e-8;
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
      let value = +map[name];
      // Safety check: the solver won't like NaNs
      if (isNaN(value)) {
        value = 0;
      }
      this.solver.addVariable(
        this.currentIndex,
        value,
        options ? options.edit : false
      );
      if (!options) {
        console.warn(`Creating new attr ${name} without options`);
      }
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
    const st = strengthMap[strength];
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

  /** Add a soft inequality constraint: bias + linear(lhs) >= linear(rhs) */
  public addSoftInequality(
    strength: ConstraintStrength,
    bias: number,
    lhs: Array<[number, WASMSolverVariable]>,
    rhs?: Array<[number, WASMSolverVariable]>
  ): void {
    const st = strengthMap[strength];
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
    const id = this.solver.addConstraint(st, bias, variable_names, weights);
    this.softInequalities.push({
      id,
      bias,
      variable_names,
      weights
    });
  }

  /** Solve the constraints */
  public solve(): [number, number] {
    this.variables.forEach((value, map, key) => {
      this.solver.setValue(value.index, map[key] as number);
    });

    this.solver.regularizerWeight = 0.001;

    const maxIters = 10;
    for (let iter = 0; iter < maxIters; iter++) {
      this.solver.solve();
      let shouldReiterate = false;
      for (const soft of this.softInequalities) {
        let value = soft.bias;
        for (let i = 0; i < soft.variable_names.length; i++) {
          value +=
            this.solver.getValue(soft.variable_names[i]) * soft.weights[i];
        }
        if (value >= -1e-6) {
          this.solver.setConstraintStrength(
            soft.id,
            LSCGSolver.ConstraintSolver.STRENGTH_DISABLED
          );
        } else {
          shouldReiterate = true;
        }
      }
      if (!shouldReiterate) {
        break;
      }
      if (iter == maxIters - 1) {
        console.warn(
          `Soft inequalities didn't converge within ${maxIters} iterations`
        );
      }
    }

    this.variables.forEach((value, map, key) => {
      map[key] = this.solver.getValue(value.index);
    });
    return [0, this.solver.error];
  }
  public destroy(): void {
    this.solver.destroy();
  }
}
