// Copyright (c) Microsoft Corporation. All rights reserved.
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
    middle: [0.34642399534071056, -0.22714036109493208]
  };

  constructor() {
    if (typeof document != "undefined") {
      this.canvas = document.createElement("canvas");
      this.context = this.canvas.getContext("2d");
      this.fontFamily = "Arial";
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
        TextMeasurer.parameters.middle[1]
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
