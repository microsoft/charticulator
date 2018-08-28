import { VariableStrength } from "../../solver";
import { AttributeDescription } from "../object";
import { lineAttrs, styleAttrs, sizeAttrs, centerAttrs } from "./attrs";

const attrs = {
  ...lineAttrs(),
  ...centerAttrs(),
  ...sizeAttrs(),
  ...styleAttrs({ fill: true })
} as { [name: string]: AttributeDescription };

export default attrs;
