// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

// It's useless typescript file to hold the main page of documentation

/**
 * # Charticulator
 *
 * Startpoint is [Charticulator: Interactive Construction of Bespoke Chart Layouts](https://www.microsoft.com/en-us/research/uploads/prod/2018/08/Charticulator-InfoVis2018.pdf)
 *
 * This document describes the main parts of the project.
 *
 * # App {@link "app/index"}
 *
 * Charticulator UI components and application logic
 *
 * * Basic UI components (button, input field, etc.)
 * * Elaborate UI components (e.g., color picker)
 * * UI controllers (drag-drop, popup)
 * * Note that we support touch input with Hammer.js whenever possible.
 * * Resources (icons)
 *
 * # Core {@link "core/index"}
 *
 * Declare Chart Specification & Chart State data structures
 *
 * * Data parsing and handling
 * * Element classes (see src/core/prototypes): defines the behavior of each element in Charticulator
 * * ChartStateManager (see src/core/prototypes/state.ts)
 * * Parse & evaluate expressions
 * * Common utilities
 * * core/ doesn’t depend on React
 *
 *
 * # Container {@link "container/index"}
 *
 * Charticulator charts as React views (with an entry point to mount a chart)
 *
 * * Compatible with React and Preact (preact is used in the Power BI custom visual because of its smaller size)
 * * Container is used in two places:
 * * The exported Power BI visuals
 * * The render of small multiples in a chart (even in Charticulator itself)
 * * Also include code to import data into a chart template
 *
 * # Worker {@link "worker/index"}
 *
 * * The Web Worker that runs the constraint solver
 * * This is just a wrapper so that we can run the solver in a Web Worker. The actual
 * solver is in src/core/solver/
 *
 * # Tests
 *
 * Rudimentary test code, more tests needed!
 *
 * # Constraint Solver Module {@link "core/solver/index"}
 *
 * A linear least square solver using the Conjugate Gradient method.
 *
 * * Solve sparse linear least square problems.
 * * Solve sparse constrained linear least square problems using a Lagrange method.
 * * Decompose dense matrices with full pivot LU to obtain solution and kernel (null space).
 * * Uses the Eigen library for sparse matrix computation and the conjugate gradient method.
 * * Compiled into WebAssembly for performance.
 *
 * https://github.com/donghaoren/lscg-solver
 * @packageDocumentation
 * @preferred
 */
