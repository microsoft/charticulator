import { VariableStrength } from "../../solver";
import { AttributeDescription } from "../object";
import { lineAttrs, styleAttrs, centerAttrs } from "./attrs";

const attrs = {
  ...lineAttrs(),
  ...centerAttrs(),
  dx: {
    name: "dx",
    type: "number",
    category: "dimensions",
    displayName: "dX",
    strength: VariableStrength.NONE,
    defaultRange: [30, 100]
  },
  dy: {
    name: "dy",
    type: "number",
    category: "dimensions",
    displayName: "dY",
    strength: VariableStrength.NONE,
    defaultRange: [30, 100]
  },
  ...styleAttrs()
};

export default attrs as { [name: string]: AttributeDescription };
