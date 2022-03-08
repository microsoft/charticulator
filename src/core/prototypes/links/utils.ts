// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { ChartClass } from "../charts";
import { LinksProperties } from "./index";
import { PolarPlotSegment } from "../plot_segments";

export function shouldShowCloseLink(
  parent: ChartClass,
  linkProperties: LinksProperties,
  userClose?: boolean
): boolean {
  if (linkProperties.linkTable) {
    return false;
  }

  if (!parent) {
    return false;
  }

  if (!parent.object.elements) {
    return false;
  }

  if (linkProperties.linkThrough) {
    const plotSegment = parent.object.elements.find(
      (element) => element._id == linkProperties.linkThrough.plotSegment
    );

    if (plotSegment?.classID == PolarPlotSegment.classID) {
      if (userClose) {
        return linkProperties.closeLink;
      }
      return true;
    }
  }

  return false;
}
