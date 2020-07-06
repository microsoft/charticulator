// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

/**
 * Chart container module responsible to draw chart on the DOM.
 *
 * {@link ChartComponent} responsible to draw the chart on the DOM. The method {@link renderGraphicalElementSVG} uses it to render the main element of the chart
 *
 * {@link ChartContainer} uses to draw the chart outside of charticulator editor. This class uses {@link ChartComponent} inside for rendering the chart.
 * It's main part of Power BI extension and export as HTML (See {@link "app/actions/actions".Export} for details about export to HTML)
 *
 * {@link "container/chart_template".ChartTemplate} describes the chart itself. Responsible to instantiate the template on loading (in editor, in container of Power BI Visual or in HTML)
 * The interface {@link "core/specification/template".ChartTemplate} describes main parts of template structure.
 *
 * @packageDocumentation
 * @preferred
 */

export { ChartComponent } from "./chart_component";
export { ChartTemplate } from "./chart_template";
export { ChartContainer } from "./container";

export * from "../core";
