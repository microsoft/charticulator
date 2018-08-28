import { VariableStrength } from "../../solver";
import { AttributeDescription } from "../object";
import { styleAttrs } from "./attrs";

const attrs: { [name: string]: AttributeDescription } = {
  x: {
    name: "x",
    type: "number",
    mode: "positional",
    strength: VariableStrength.NONE
  },
  y: {
    name: "y",
    type: "number",
    mode: "positional",
    strength: VariableStrength.NONE
  },
  size: {
    name: "size",
    type: "number",
    mode: "intrinsic",
    solverExclude: true,
    category: "dimensions",
    displayName: "Size",
    defaultRange: [0, 200 * Math.PI],
    defaultValue: 60,
    strength: VariableStrength.NONE
  },
  ...styleAttrs({ fill: true }),
  symbol: {
    name: "symbol",
    type: "string",
    solverExclude: true,
    defaultValue: "circle"
  }
};

export default attrs;
