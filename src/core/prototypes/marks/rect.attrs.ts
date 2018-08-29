import { AttributeDescription } from "../object";
import { lineAttrs, styleAttrs, sizeAttrs, centerAttrs } from "./attrs";
import { Color } from "../../common";
import { AttributeMap } from "../../specification/index";

export const attributes = {
  ...lineAttrs(),
  ...centerAttrs(),
  ...sizeAttrs(),
  ...styleAttrs({ fill: true })
} as { [name: string]: AttributeDescription };

export interface RectElementAttributes extends AttributeMap {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  cx: number;
  cy: number;
  width: number;
  height: number;
  stroke: Color;
  fill: Color;
  strokeWidth: number;
  opacity: number;
  visible: boolean;
}
