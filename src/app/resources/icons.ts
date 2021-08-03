// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
const iconRegistry = new Map<string, string>();

export function addSVGIcon(path: string | string[], svgDataURL: string) {
  if (path instanceof Array) {
    for (const p of path) {
      iconRegistry.set(p, svgDataURL);
    }
  } else {
    iconRegistry.set(path, svgDataURL);
  }
}

export function getSVGIcon(path: string): string {
  const r = iconRegistry.get(path);
  if (r) {
    return r;
  } else {
    console.warn(`Icon ${path} is undefined, using default instead`);
    addSVGIcon(path, getSVGIcon("ChromeClose"));
    return getSVGIcon("ChromeClose");
  }
}

addSVGIcon("ChevronDown", require("resources/icons/icons_chevron_down.svg"));
addSVGIcon("ChevronRight", require("resources/icons/icons_chevron_right.svg"));
addSVGIcon("ChevronLeft", require("resources/icons/icons_chevron_left.svg"));

// General icons
addSVGIcon("ChromeClose", require("resources/icons/icons_cross.svg"));
addSVGIcon("general/plus", require("resources/icons/icons_plus.svg"));
addSVGIcon("general/minus", require("resources/icons/icons_minus.svg"));
addSVGIcon("Copy", require("resources/icons/icons_copy.svg"));
addSVGIcon("general/sort", require("resources/icons/icons_sort.svg"));
addSVGIcon("Sort", require("resources/icons/icons_reverse-order.svg"));
addSVGIcon("general/dropdown", require("resources/icons/icons_dropdown.svg"));
addSVGIcon("Edit", require("resources/icons/icons_edit.svg"));
addSVGIcon("general/eraser", require("resources/icons/icons_eraser.svg"));
addSVGIcon("general/bind-data", require("resources/icons/icons_bind-data.svg"));

addSVGIcon("general/confirm", require("resources/icons/icons_confirm.svg"));
addSVGIcon(
  "general/more-horizontal",
  require("resources/icons/icons_more-horizontal.svg")
);
addSVGIcon(
  "general/more-vertical",
  require("resources/icons/icons_more-vertical.svg")
);
addSVGIcon("general/replace", require("resources/icons/icons_replace.svg"));
addSVGIcon("general/eye", require("resources/icons/icons_eye.svg"));
addSVGIcon("general/eye-faded", require("resources/icons/icons_eye-faded.svg"));

addSVGIcon("general/popout", require("resources/icons/icons_popout.svg"));
addSVGIcon("SortLines", require("resources/icons/icons_order.svg"));

addSVGIcon("ZoomIn", require("resources/icons/icons_zoom-in.svg"));
addSVGIcon("ZoomOut", require("resources/icons/icons_zoom-out.svg"));
addSVGIcon("ZoomToFit", require("resources/icons/icons_zoom-auto.svg"));

addSVGIcon(
  "general/triangle-up",
  require("resources/icons/icons_triangle-up.svg")
);
addSVGIcon(
  "general/triangle-down",
  require("resources/icons/icons_triangle-down.svg")
);
addSVGIcon(
  "general/triangle-left",
  require("resources/icons/icons_triangle-left.svg")
);
addSVGIcon(
  "general/triangle-right-bottom",
  require("resources/icons/icons_triangle-right-bottom.svg")
);
addSVGIcon(
  "general/triangle-right",
  require("resources/icons/icons_triangle-right.svg")
);

addSVGIcon(
  "general/text-size-up",
  require("resources/icons/icons_text-size-up.svg")
);
addSVGIcon(
  "general/text-size-down",
  require("resources/icons/icons_text-size-down.svg")
);
addSVGIcon(
  "general/digits-more",
  require("resources/icons/icons_digits-more.svg")
);
addSVGIcon(
  "general/digits-less",
  require("resources/icons/icons_digits-less.svg")
);

// Toolbar icons
addSVGIcon("toolbar/new", require("resources/icons/icons_toolbar-new.svg"));
addSVGIcon("toolbar/open", require("resources/icons/icons_toolbar-open.svg"));
addSVGIcon("toolbar/save", require("resources/icons/icons_toolbar-save.svg"));
addSVGIcon(
  "toolbar/save-changes",
  require("resources/icons/icons_toolbar-save-has-changes.svg")
);
addSVGIcon("toolbar/copy", require("resources/icons/icons_toolbar-copy.svg"));
addSVGIcon(
  "toolbar/download",
  require("resources/icons/icons_toolbar-download.svg")
);
addSVGIcon(
  "toolbar/export-template",
  require("resources/icons/icons_toolbar-export-template.svg")
);
addSVGIcon(
  "toolbar/export",
  require("resources/icons/icons_toolbar-export.svg")
);
addSVGIcon("Undo", require("resources/icons/icons_toolbar-undo.svg"));
addSVGIcon("Redo", require("resources/icons/icons_toolbar-redo.svg"));
addSVGIcon("toolbar/help", require("resources/icons/icons_toolbar-help.svg"));
addSVGIcon(
  "toolbar/import",
  require("resources/icons/icons_toolbar-import.svg")
);
addSVGIcon(
  "toolbar/import-template",
  require("resources/icons/icons_toolbar-import-template.svg")
);
addSVGIcon("toolbar/back", require("resources/icons/icons_toolbar-back.svg"));
addSVGIcon("toolbar/trash", require("resources/icons/icons_toolbar-trash.svg"));

addSVGIcon("app-icon", require("resources/icons/app_icon.svg"));

// Scaffold icons
addSVGIcon(
  "scaffold/cartesian-x",
  require("resources/icons/icons_scaffold-xline.svg")
);
addSVGIcon(
  "scaffold/cartesian-y",
  require("resources/icons/icons_scaffold-yline.svg")
);
addSVGIcon(
  "scaffold/circle",
  require("resources/icons/icons_scaffold-circle.svg")
);
addSVGIcon(
  "scaffold/curve",
  require("resources/icons/icons_scaffold-curve.svg")
);
addSVGIcon(
  "scaffold/spiral",
  require("resources/icons/icons_scaffold-spiral.svg")
);
addSVGIcon(
  "GripperBarHorizontal",
  require("resources/icons/icons_scaffold-xwrap.svg")
);
addSVGIcon(
  "GripperBarVertical",
  require("resources/icons/icons_scaffold-ywrap.svg")
);
addSVGIcon("scaffold/map", require("resources/icons/icons_scaffold-map.svg"));

addSVGIcon("Line", require("resources/icons/icons_plot-line.svg"));
addSVGIcon("plot/curve", require("resources/icons/icons_plot-curve.svg"));
addSVGIcon("BorderDot", require("resources/icons/icons_plot-region.svg"));

// Chart & Glyph
addSVGIcon("chart", require("resources/icons/icons_chart.svg"));
addSVGIcon("glyph", require("resources/icons/icons_glyph.svg"));

// Plot segment icons
addSVGIcon(
  "plot-segment/cartesian",
  require("resources/icons/icons_plot-segment-cartesian.svg")
);
addSVGIcon(
  "plot-segment/polar",
  require("resources/icons/icons_plot-segment-polar.svg")
);
addSVGIcon(
  "plot-segment/line",
  require("resources/icons/icons_plot-segment-line.svg")
);
addSVGIcon(
  "plot-segment/curve",
  require("resources/icons/icons_plot-segment-curve.svg")
);

// Guide icons
addSVGIcon("guide/x", require("resources/icons/icons_guide-xline.svg"));
addSVGIcon("guide/y", require("resources/icons/icons_guide-yline.svg"));
addSVGIcon(
  "guide/coordinator-x",
  require("resources/icons/icons_guide-coordinator-x.svg")
);
addSVGIcon(
  "guide/coordinator-y",
  require("resources/icons/icons_guide-coordinator-y.svg")
);
addSVGIcon(
  "guide/coordinator-polar",
  require("resources/icons/icons_guide-coordinator-polar.svg")
);

// Link icons
addSVGIcon("CharticulatorLine", require("resources/icons/icons_link-tool.svg"));
addSVGIcon("link/line", require("resources/icons/icons_link-line.svg"));
addSVGIcon("link/band", require("resources/icons/icons_link-band.svg"));
addSVGIcon("link/between", require("resources/icons/icons_link-between.svg"));
addSVGIcon("link/table", require("resources/icons/icons_link-table.svg"));
addSVGIcon("link/through", require("resources/icons/icons_link-through.svg"));

// Mark element icons
addSVGIcon("mark/anchor", require("resources/icons/icons_element-anchor.svg"));
addSVGIcon("RectangleShape", require("resources/icons/icons_element-rect.svg"));
addSVGIcon("Ellipse", require("resources/icons/icons_element-ellipse.svg"));
addSVGIcon(
  "TriangleShape",
  require("resources/icons/icons_element-triangle.svg")
);
addSVGIcon("FileImage", require("resources/icons/icons_element-image.svg"));
addSVGIcon("ImagePixel", require("resources/icons/icons_element-icon.svg"));
addSVGIcon("Shapes", require("resources/icons/icons_element-symbol.svg"));
addSVGIcon("Line", require("resources/icons/icons_element-line.svg"));
addSVGIcon("FontColorA", require("resources/icons/icons_element-text.svg"));
addSVGIcon("TextField", require("resources/icons/icons_element-textbox.svg"));
addSVGIcon("mark/data-axis", require("resources/icons/icons_data-axis.svg"));

addSVGIcon(
  "BarChartVerticalFilter",
  require("resources/icons/icons_nested-chart.svg")
);
addSVGIcon("stroke/dashed", require("resources/icons/icons_stroke-dashed.svg"));
addSVGIcon("stroke/dotted", require("resources/icons/icons_stroke-dotted.svg"));
addSVGIcon("stroke/solid", require("resources/icons/icons_stroke-solid.svg"));

// Handle icons
addSVGIcon("Stack", require("resources/icons/icons_sublayout-overlap.svg"));
addSVGIcon(
  "HorizontalDistributeCenter",
  require("resources/icons/icons_sublayout-dodge-horizontal.svg")
);
addSVGIcon(
  "VerticalDistributeCenter",
  require("resources/icons/icons_sublayout-dodge-vertical.svg")
);
addSVGIcon(
  "CharticulatorArrangePolar",
  require("resources/icons/icons_sublayout-dodge-angular.svg")
);
addSVGIcon(
  "CharticulatorStackRadial",
  require("resources/icons/icons_sublayout-dodge-radial.svg")
);
addSVGIcon(
  "GridViewSmall",
  require("resources/icons/icons_sublayout-grid.svg")
);
addSVGIcon(
  "sublayout/polar-grid",
  require("resources/icons/icons_sublayout-polar-grid.svg")
);
addSVGIcon(
  "sublayout/packing",
  require("resources/icons/icons_sublayout-packing.svg")
);
addSVGIcon(
  "sublayout/jitter",
  require("resources/icons/icons_sublayout-jitter.svg")
);
addSVGIcon("align/left", require("resources/icons/icons_align-left.svg"));
addSVGIcon(
  "AlignHorizontalLeft",
  require("resources/icons/icons_align-left.svg")
);
addSVGIcon(
  "AlignHorizontalCenter",
  require("resources/icons/icons_align-x-middle.svg")
);
addSVGIcon(
  "AlignHorizontalRight",
  require("resources/icons/icons_align-right.svg")
);
addSVGIcon("AlignVerticalTop", require("resources/icons/icons_align-top.svg"));
addSVGIcon(
  "AlignVerticalCenter",
  require("resources/icons/icons_align-y-middle.svg")
);
addSVGIcon(
  "AlignVerticalBottom",
  require("resources/icons/icons_align-bottom.svg")
);
addSVGIcon(
  "text-align/left",
  require("resources/icons/icons_text-align-left.svg")
);
addSVGIcon(
  "text-align/x-middle",
  require("resources/icons/icons_text-align-x-middle.svg")
);
addSVGIcon(
  "text-align/right",
  require("resources/icons/icons_text-align-right.svg")
);
addSVGIcon(
  "text-align/top",
  require("resources/icons/icons_text-align-top.svg")
);
addSVGIcon(
  "text-align/y-middle",
  require("resources/icons/icons_text-align-y-middle.svg")
);
addSVGIcon(
  "text-align/bottom",
  require("resources/icons/icons_text-align-bottom.svg")
);

// Data type icons
addSVGIcon("type/boolean", require("resources/icons/icons_type-boolean.svg"));
addSVGIcon(
  "type/categorical",
  require("resources/icons/icons_type-categorical.svg")
);
addSVGIcon(
  "type/numerical",
  require("resources/icons/icons_type-numerical.svg")
);
addSVGIcon("type/ordinal", require("resources/icons/icons_type-ordinal.svg"));
addSVGIcon("type/temporal", require("resources/icons/icons_type-temporal.svg"));

// Checkbox
addSVGIcon(
  "checkbox/empty",
  require("resources/icons/icons_checkbox-empty.svg")
);
addSVGIcon(
  "checkbox/checked",
  require("resources/icons/icons_checkbox-checked.svg")
);

addSVGIcon("CharticulatorLegend", require("resources/icons/icons_legend.svg"));
addSVGIcon("scale/scale", require("resources/icons/icons_scale.svg"));
addSVGIcon("scale/color", require("resources/icons/icons_scale-color.svg"));

addSVGIcon("loading", require("resources/icons/loading-01.svg"));
