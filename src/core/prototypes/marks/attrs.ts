import { VariableStrength } from "../../solver";

export function lineAttrs() {
  return {
    x1: {
      name: "x1",
      type: "number",
      mode: "positional",
      strength: VariableStrength.WEAKER
    },
    y1: {
      name: "y1",
      type: "number",
      mode: "positional",
      strength: VariableStrength.WEAKER
    },
    x2: {
      name: "x2",
      type: "number",
      mode: "positional",
      strength: VariableStrength.WEAKER
    },
    y2: {
      name: "y2",
      type: "number",
      mode: "positional",
      strength: VariableStrength.WEAKER
    }
  };
}

export function styleAttrs(options: any = {}) {
  const style = {
    stroke: {
      name: "stroke",
      type: "color",
      category: "style",
      displayName: "Stroke",
      solverExclude: true,
      defaultValue: null as any
    },
    strokeWidth: {
      name: "strokeWidth",
      type: "number",
      category: "style",
      displayName: "Line Width",
      solverExclude: true,
      defaultValue: 1,
      defaultRange: [0, 5]
    },
    opacity: {
      name: "opacity",
      type: "number",
      category: "style",
      displayName: "Opacity",
      solverExclude: true,
      defaultValue: 1,
      defaultRange: [0, 1]
    },
    visible: {
      name: "visible",
      type: "boolean",
      category: "style",
      displayName: "Visible",
      solverExclude: true,
      defaultValue: true
    }
  } as any;

  if (options.fill) {
    style.fill = {
      name: "fill",
      type: "color",
      category: "style",
      displayName: "Fill",
      solverExclude: true,
      defaultValue: null as any
    };
  }

  return style;
}

export function sizeAttrs() {
  return {
    width: {
      name: "width",
      type: "number",
      mode: "intrinsic",
      category: "dimensions",
      displayName: "Width",
      defaultRange: [0, 200],
      strength: VariableStrength.NONE
    },
    height: {
      name: "height",
      type: "number",
      mode: "intrinsic",
      category: "dimensions",
      displayName: "Height",
      defaultRange: [0, 200],
      strength: VariableStrength.NONE
    }
  };
}

export function centerAttrs() {
  return {
    cx: {
      name: "cx",
      type: "number",
      mode: "positional",
      strength: VariableStrength.NONE
    },
    cy: {
      name: "cy",
      type: "number",
      mode: "positional",
      strength: VariableStrength.NONE
    }
  };
}
