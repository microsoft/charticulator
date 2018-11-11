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
    addSVGIcon(path, getSVGIcon("general/cross"));
    return getSVGIcon("general/cross");
  }
}

// General icons
addSVGIcon(
  "general/cross",
  require("url-loader!resources/icons/icons_cross.svg")
);
addSVGIcon(
  "general/plus",
  require("url-loader!resources/icons/icons_plus.svg")
);
addSVGIcon(
  "general/minus",
  require("url-loader!resources/icons/icons_minus.svg")
);
addSVGIcon(
  "general/copy",
  require("url-loader!resources/icons/icons_copy.svg")
);
addSVGIcon(
  "general/sort",
  require("url-loader!resources/icons/icons_sort.svg")
);
addSVGIcon(
  "general/order-reversed",
  require("url-loader!resources/icons/icons_reverse-order.svg")
);
addSVGIcon(
  "general/dropdown",
  require("url-loader!resources/icons/icons_dropdown.svg")
);
addSVGIcon(
  "general/edit",
  require("url-loader!resources/icons/icons_edit.svg")
);
addSVGIcon(
  "general/eraser",
  require("url-loader!resources/icons/icons_eraser.svg")
);
addSVGIcon(
  "general/bind-data",
  require("url-loader!resources/icons/icons_bind-data.svg")
);
addSVGIcon(
  "general/confirm",
  require("url-loader!resources/icons/icons_confirm.svg")
);
addSVGIcon(
  "general/more-horizontal",
  require("url-loader!resources/icons/icons_more-horizontal.svg")
);
addSVGIcon(
  "general/more-vertical",
  require("url-loader!resources/icons/icons_more-vertical.svg")
);
addSVGIcon(
  "general/replace",
  require("url-loader!resources/icons/icons_replace.svg")
);
addSVGIcon("general/eye", require("url-loader!resources/icons/icons_eye.svg"));
addSVGIcon(
  "general/eye-faded",
  require("url-loader!resources/icons/icons_eye-faded.svg")
);

addSVGIcon(
  "general/popout",
  require("url-loader!resources/icons/icons_popout.svg")
);
addSVGIcon(
  "general/order",
  require("url-loader!resources/icons/icons_order.svg")
);

addSVGIcon(
  "general/zoom-in",
  require("url-loader!resources/icons/icons_zoom-in.svg")
);
addSVGIcon(
  "general/zoom-out",
  require("url-loader!resources/icons/icons_zoom-out.svg")
);
addSVGIcon(
  "general/zoom-auto",
  require("url-loader!resources/icons/icons_zoom-auto.svg")
);

addSVGIcon(
  "general/triangle-up",
  require("url-loader!resources/icons/icons_triangle-up.svg")
);
addSVGIcon(
  "general/triangle-down",
  require("url-loader!resources/icons/icons_triangle-down.svg")
);
addSVGIcon(
  "general/triangle-left",
  require("url-loader!resources/icons/icons_triangle-left.svg")
);
addSVGIcon(
  "general/triangle-right",
  require("url-loader!resources/icons/icons_triangle-right.svg")
);

addSVGIcon(
  "general/text-size-up",
  require("url-loader!resources/icons/icons_text-size-up.svg")
);
addSVGIcon(
  "general/text-size-down",
  require("url-loader!resources/icons/icons_text-size-down.svg")
);
addSVGIcon(
  "general/digits-more",
  require("url-loader!resources/icons/icons_digits-more.svg")
);
addSVGIcon(
  "general/digits-less",
  require("url-loader!resources/icons/icons_digits-less.svg")
);

// Toolbar icons
addSVGIcon(
  "toolbar/new",
  require("url-loader!resources/icons/icons_toolbar-new.svg")
);
addSVGIcon(
  "toolbar/open",
  require("url-loader!resources/icons/icons_toolbar-open.svg")
);
addSVGIcon(
  "toolbar/save",
  require("url-loader!resources/icons/icons_toolbar-save.svg")
);
addSVGIcon(
  "toolbar/copy",
  require("url-loader!resources/icons/icons_toolbar-copy.svg")
);
addSVGIcon(
  "toolbar/download",
  require("url-loader!resources/icons/icons_toolbar-download.svg")
);
addSVGIcon(
  "toolbar/export",
  require("url-loader!resources/icons/icons_toolbar-export.svg")
);
addSVGIcon(
  "toolbar/undo",
  require("url-loader!resources/icons/icons_toolbar-undo.svg")
);
addSVGIcon(
  "toolbar/redo",
  require("url-loader!resources/icons/icons_toolbar-redo.svg")
);
addSVGIcon(
  "toolbar/help",
  require("url-loader!resources/icons/icons_toolbar-help.svg")
);
addSVGIcon(
  "toolbar/import",
  require("url-loader!resources/icons/icons_toolbar-import.svg")
);
addSVGIcon(
  "toolbar/back",
  require("url-loader!resources/icons/icons_toolbar-back.svg")
);
addSVGIcon(
  "toolbar/trash",
  require("url-loader!resources/icons/icons_toolbar-trash.svg")
);

addSVGIcon("app-icon", require("url-loader!resources/icons/app_icon.svg"));

// Scaffold icons
addSVGIcon(
  "scaffold/cartesian-x",
  require("url-loader!resources/icons/icons_scaffold-xline.svg")
);
addSVGIcon(
  "scaffold/cartesian-y",
  require("url-loader!resources/icons/icons_scaffold-yline.svg")
);
addSVGIcon(
  "scaffold/circle",
  require("url-loader!resources/icons/icons_scaffold-circle.svg")
);
addSVGIcon(
  "scaffold/curve",
  require("url-loader!resources/icons/icons_scaffold-curve.svg")
);
addSVGIcon(
  "scaffold/spiral",
  require("url-loader!resources/icons/icons_scaffold-spiral.svg")
);
addSVGIcon(
  "scaffold/xwrap",
  require("url-loader!resources/icons/icons_scaffold-xwrap.svg")
);
addSVGIcon(
  "scaffold/ywrap",
  require("url-loader!resources/icons/icons_scaffold-ywrap.svg")
);
addSVGIcon(
  "scaffold/map",
  require("url-loader!resources/icons/icons_scaffold-map.svg")
);

addSVGIcon(
  "plot/line",
  require("url-loader!resources/icons/icons_plot-line.svg")
);
addSVGIcon(
  "plot/curve",
  require("url-loader!resources/icons/icons_plot-curve.svg")
);
addSVGIcon(
  "plot/region",
  require("url-loader!resources/icons/icons_plot-region.svg")
);

// Chart & Glyph
addSVGIcon("chart", require("url-loader!resources/icons/icons_chart.svg"));
addSVGIcon("glyph", require("url-loader!resources/icons/icons_glyph.svg"));

// Plot segment icons
addSVGIcon(
  "plot-segment/cartesian",
  require("url-loader!resources/icons/icons_plot-segment-cartesian.svg")
);
addSVGIcon(
  "plot-segment/polar",
  require("url-loader!resources/icons/icons_plot-segment-polar.svg")
);
addSVGIcon(
  "plot-segment/line",
  require("url-loader!resources/icons/icons_plot-segment-line.svg")
);
addSVGIcon(
  "plot-segment/curve",
  require("url-loader!resources/icons/icons_plot-segment-curve.svg")
);

// Guide icons
addSVGIcon(
  "guide/x",
  require("url-loader!resources/icons/icons_guide-xline.svg")
);
addSVGIcon(
  "guide/y",
  require("url-loader!resources/icons/icons_guide-yline.svg")
);
addSVGIcon(
  "guide/coordinator-x",
  require("url-loader!resources/icons/icons_guide-coordinator-x.svg")
);
addSVGIcon(
  "guide/coordinator-y",
  require("url-loader!resources/icons/icons_guide-coordinator-y.svg")
);

// Link icons
addSVGIcon(
  "link/tool",
  require("url-loader!resources/icons/icons_link-tool.svg")
);
addSVGIcon(
  "link/line",
  require("url-loader!resources/icons/icons_link-line.svg")
);
addSVGIcon(
  "link/band",
  require("url-loader!resources/icons/icons_link-band.svg")
);
addSVGIcon(
  "link/between",
  require("url-loader!resources/icons/icons_link-between.svg")
);
addSVGIcon(
  "link/table",
  require("url-loader!resources/icons/icons_link-table.svg")
);
addSVGIcon(
  "link/through",
  require("url-loader!resources/icons/icons_link-through.svg")
);

// Mark element icons
addSVGIcon(
  "mark/anchor",
  require("url-loader!resources/icons/icons_element-anchor.svg")
);
addSVGIcon(
  "mark/rect",
  require("url-loader!resources/icons/icons_element-rect.svg")
);
addSVGIcon(
  "mark/ellipse",
  require("url-loader!resources/icons/icons_element-ellipse.svg")
);
addSVGIcon(
  "mark/triangle",
  require("url-loader!resources/icons/icons_element-triangle.svg")
);
addSVGIcon(
  "mark/image",
  require("url-loader!resources/icons/icons_element-image.svg")
);
addSVGIcon(
  "mark/icon",
  require("url-loader!resources/icons/icons_element-icon.svg")
);
addSVGIcon(
  "mark/symbol",
  require("url-loader!resources/icons/icons_element-symbol.svg")
);
addSVGIcon(
  "mark/line",
  require("url-loader!resources/icons/icons_element-line.svg")
);
addSVGIcon(
  "mark/text",
  require("url-loader!resources/icons/icons_element-text.svg")
);
addSVGIcon(
  "mark/textbox",
  require("url-loader!resources/icons/icons_element-textbox.svg")
);
addSVGIcon(
  "mark/data-axis",
  require("url-loader!resources/icons/icons_data-axis.svg")
);
addSVGIcon(
  "mark/nested-chart",
  require("url-loader!resources/icons/icons_nested-chart.svg")
);
// Handle icons
addSVGIcon(
  "sublayout/dodge-x",
  require("url-loader!resources/icons/icons_sublayout-dodge-horizontal.svg")
);
addSVGIcon(
  "sublayout/dodge-y",
  require("url-loader!resources/icons/icons_sublayout-dodge-vertical.svg")
);
addSVGIcon(
  "sublayout/dodge-angular",
  require("url-loader!resources/icons/icons_sublayout-dodge-angular.svg")
);
addSVGIcon(
  "sublayout/dodge-radial",
  require("url-loader!resources/icons/icons_sublayout-dodge-radial.svg")
);
addSVGIcon(
  "sublayout/grid",
  require("url-loader!resources/icons/icons_sublayout-grid.svg")
);
addSVGIcon(
  "sublayout/polar-grid",
  require("url-loader!resources/icons/icons_sublayout-polar-grid.svg")
);
addSVGIcon(
  "sublayout/packing",
  require("url-loader!resources/icons/icons_sublayout-packing.svg")
);
addSVGIcon(
  "align/left",
  require("url-loader!resources/icons/icons_align-left.svg")
);
addSVGIcon(
  "align/x-middle",
  require("url-loader!resources/icons/icons_align-x-middle.svg")
);
addSVGIcon(
  "align/right",
  require("url-loader!resources/icons/icons_align-right.svg")
);
addSVGIcon(
  "align/top",
  require("url-loader!resources/icons/icons_align-top.svg")
);
addSVGIcon(
  "align/y-middle",
  require("url-loader!resources/icons/icons_align-y-middle.svg")
);
addSVGIcon(
  "align/bottom",
  require("url-loader!resources/icons/icons_align-bottom.svg")
);
addSVGIcon(
  "text-align/left",
  require("url-loader!resources/icons/icons_text-align-left.svg")
);
addSVGIcon(
  "text-align/x-middle",
  require("url-loader!resources/icons/icons_text-align-x-middle.svg")
);
addSVGIcon(
  "text-align/right",
  require("url-loader!resources/icons/icons_text-align-right.svg")
);
addSVGIcon(
  "text-align/top",
  require("url-loader!resources/icons/icons_text-align-top.svg")
);
addSVGIcon(
  "text-align/y-middle",
  require("url-loader!resources/icons/icons_text-align-y-middle.svg")
);
addSVGIcon(
  "text-align/bottom",
  require("url-loader!resources/icons/icons_text-align-bottom.svg")
);

// Data type icons
addSVGIcon(
  "type/boolean",
  require("url-loader!resources/icons/icons_type-boolean.svg")
);
addSVGIcon(
  "type/categorical",
  require("url-loader!resources/icons/icons_type-categorical.svg")
);
addSVGIcon(
  "type/numerical",
  require("url-loader!resources/icons/icons_type-numerical.svg")
);
addSVGIcon(
  "type/ordinal",
  require("url-loader!resources/icons/icons_type-ordinal.svg")
);
addSVGIcon(
  "type/temporal",
  require("url-loader!resources/icons/icons_type-temporal.svg")
);

// Checkbox
addSVGIcon(
  "checkbox/empty",
  require("url-loader!resources/icons/icons_checkbox-empty.svg")
);
addSVGIcon(
  "checkbox/checked",
  require("url-loader!resources/icons/icons_checkbox-checked.svg")
);

addSVGIcon(
  "legend/legend",
  require("url-loader!resources/icons/icons_legend.svg")
);
addSVGIcon(
  "scale/scale",
  require("url-loader!resources/icons/icons_scale.svg")
);
addSVGIcon(
  "scale/color",
  require("url-loader!resources/icons/icons_scale-color.svg")
);

addSVGIcon("loading", require("url-loader!resources/icons/loading-01.svg"));
