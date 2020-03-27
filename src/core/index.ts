// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

/**
 * # Core documentation
 *
 * ## Actions {@link "core/actions/index"}
 * The module contains all actions available in the charticulator.
 *
 * ## Common {@link "core/common/index"}
 *
 * Contains several modules such as
 *
 * * {@link "core/common/color"} to work with colors
 * * {@link "core/common/events"} event bus uses for notifying different parts of UI about updates.
 * * {@link "core/common/fetch"}
 * * {@link "core/common/math"} contains math operations for geometry
 * * {@link "core/common/scales"} scales for map data values to properties of graphic elements
 * * {@link "core/common/unique_id"} id generator for all objects used in charticulator
 * * {@link "core/common/utils"} contains different helper functions
 *
 * ## Dataset {@link "core/dataset/index"}
 *
 * The module is responsible for loading data from *.csv/*.tsv files and parse them
 *
 * ## Expression {@link "core/expression/index"}
 *
 * Describes all supported expressions in the charticulator and helper functions for process date on binding to elements
 *
 * ## Graphics {@link "core/graphics/index"}
 *
 * Contains logic responsible  for rendering elements and coordinate systems
 *
 * ## Prototypes {@link "core/prototypes/index"}
 *
 * Contains bricks of the chart: *Marks*({@link "core/prototypes/marks/index"}) (rect, image, symbol, text e.t.c.), Legends, Links, Plot Segments e.t.c
 *
 * * Declares the properties and attributes of a class of object (chart, chart element, glyph, mark) in the spec
 *
 * * Including default attribute values and property values
 *
 * * Generate graphical elements (if any) for ChartRenderer
 *
 * * Generate constraints (if any) for the constraint solver
 *
 * * Declare widgets (if any) for the attribute panel
 *
 * ### Difference between “attribute” and “property”
 *
 * Attribute (e.g., height on a rect mark):
 *
 * * Defined on the object state (an object can have multiple instances, each instance has its own state)
 * * Variable among the instances of the object
 * * Can involve in constraint solving
 * * Can be bound to data
 *
 * Property (e.g., anchor on a text mark):
 *
 * * Defined directly on the object specification
 * * Same across all instances of the object
 * * Does not involve in constraint solving
 * * Cannot be bound to data
 *
 * ## Solver {@link "core/solver/index"}
 *
 * Wrapping over lscg-solver package to convert chart co constrains.
 *
 * ## Specification {@link "core/specification/index"}
 *
 * It contains interfaces for the chart template. The template describes the internal structure of the chart.
 *
 * ## Store {@link "core/store/base"}
 *
 * @packageDocumentation
 * @preferred
 */
export * from "./common";

export { CharticulatorCoreConfig, getConfig } from "./config";

import * as Dataset from "./dataset";
import * as Expression from "./expression";
import * as Graphics from "./graphics";
import * as Prototypes from "./prototypes";
import * as Solver from "./solver";
import * as Specification from "./specification";
export * from "./actions";

export { Expression, Specification, Prototypes, Solver, Graphics, Dataset };

import { CharticulatorCoreConfig, setConfig } from "./config";

import { initialize as initialize_WASMSolver } from "./solver/wasm_solver";

export function initialize(config?: CharticulatorCoreConfig): Promise<void> {
  setConfig(config);
  return initialize_WASMSolver();
}
