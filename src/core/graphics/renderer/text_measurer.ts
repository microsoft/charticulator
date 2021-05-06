// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { Graphics } from "../..";
import { defaultFont } from "../../../app/stores/defaults";

// Licensed under the MIT license.
export interface TextMeasurement {
  width: number;
  fontSize: number;
  ideographicBaseline: number;
  hangingBaseline: number;
  alphabeticBaseline: number;
  middle: number;
}

export class TextMeasurer {
  public canvas: HTMLCanvasElement;
  public context: CanvasRenderingContext2D;
  public fontFamily: string;
  public fontSize: number;

  public static parameters = {
    hangingBaseline: [0.7245381636743151, -0.005125313493913097],
    ideographicBaseline: [-0.2120442632498544, 0.008153756552125913],
    alphabeticBaseline: [0, 0],
    middle: [0.34642399534071056, -0.22714036109493208],
  };

  constructor() {
    if (typeof document != "undefined") {
      this.canvas = document.createElement("canvas");
      this.context = this.canvas.getContext("2d");
      this.fontFamily = defaultFont;
      this.fontSize = 13;
    }
  }

  public setFontFamily(family: string) {
    this.fontFamily = family;
  }

  public setFontSize(size: number) {
    this.fontSize = size;
  }

  public measure(text: string): TextMeasurement {
    this.context.font = `${this.fontSize}px "${this.fontFamily}"`;
    return {
      width: this.context.measureText(text).width,
      fontSize: this.fontSize,
      ideographicBaseline:
        this.fontSize * TextMeasurer.parameters.ideographicBaseline[0] +
        TextMeasurer.parameters.ideographicBaseline[1],
      hangingBaseline:
        this.fontSize * TextMeasurer.parameters.hangingBaseline[0] +
        TextMeasurer.parameters.hangingBaseline[1],
      alphabeticBaseline:
        this.fontSize * TextMeasurer.parameters.alphabeticBaseline[0] +
        TextMeasurer.parameters.alphabeticBaseline[1],
      middle:
        this.fontSize * TextMeasurer.parameters.middle[0] +
        TextMeasurer.parameters.middle[1],
    };
  }

  private static globalInstance: TextMeasurer = null;

  public static GetGlobalInstance() {
    if (this.globalInstance == null) {
      this.globalInstance = new TextMeasurer();
    }
    return this.globalInstance;
  }

  public static Measure(text: string, family: string, size: number) {
    const inst = this.GetGlobalInstance();
    inst.setFontFamily(family);
    inst.setFontSize(size);
    return inst.measure(text);
  }

  public static ComputeTextPosition(
    x: number,
    y: number,
    metrics: TextMeasurement,
    alignX: "left" | "middle" | "right" = "left",
    alignY: "top" | "middle" | "bottom" = "middle",
    xMargin: number = 0,
    yMargin: number = 0
  ): [number, number] {
    const cwidth = metrics.width;
    const cheight = (metrics.middle - metrics.ideographicBaseline) * 2;

    let cx: number = cwidth / 2,
      cy: number = cheight / 2;
    if (alignX == "left") {
      cx = -xMargin;
    }
    if (alignX == "right") {
      cx = cwidth + xMargin;
    }
    if (alignY == "top") {
      cy = -yMargin;
    }
    if (alignY == "bottom") {
      cy = cheight + yMargin;
    }
    return [x - cx, y - cheight + cy - metrics.ideographicBaseline];
  }
}

export const SPACE = " ";
export const BREAKERS_REGEX = /[\s]+/g;

export function split(str: string): string[] {
  return str.split(BREAKERS_REGEX);
}

/**
 * Splits text to fragments do display text with word wrap
 * Source code taken from https://github.com/microsoft/powerbi-visuals-utils-formattingutils/blob/master/src/wordBreaker.ts#L130
 * @param content source of text
 * @param maxWidth max awailable with for text
 * @param maxNumLines limit lines count, rest of words will be drew in the last line
 * @param fontFamily font family
 * @param fontSize font size in px
 */
export function splitByWidth(
  content: string,
  maxWidth: number,
  maxNumLines: number,
  fontFamily: string,
  fontSize: number
): string[] {
  // Default truncator returns string as-is

  const result: string[] = [];
  const words = split(content);

  let usedWidth = 0;
  let wordsInLine: string[] = [];

  for (const word of words) {
    // Last line? Just add whatever is left
    if (maxNumLines > 0 && result.length >= maxNumLines - 1) {
      wordsInLine.push(word);
      continue;
    }

    // Determine width if we add this word
    // Account for SPACE we will add when joining...
    const metrics = Graphics.TextMeasurer.Measure(word, fontFamily, fontSize);
    const wordWidth = metrics.width;

    // If width would exceed max width,
    // then push used words and start new split result
    if (usedWidth + wordWidth > maxWidth) {
      // Word alone exceeds max width, just add it.
      if (wordsInLine.length === 0) {
        result.push(word);

        usedWidth = 0;
        wordsInLine = [];
        continue;
      }

      result.push(wordsInLine.join(SPACE));

      usedWidth = 0;
      wordsInLine = [];
    }

    // ...otherwise, add word and continue
    wordsInLine.push(word);
    usedWidth += wordWidth;
  }

  // Push remaining words onto result (if any)
  if (wordsInLine && wordsInLine.length) {
    result.push(wordsInLine.join(SPACE));
  }

  return result;
}
