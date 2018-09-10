// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import * as React from "react";
import * as ReactDOMServer from "react-dom/server";

import {
  Specification,
  Prototypes,
  Graphics,
  zip,
  zipArray,
  getById,
  ZoomInfo,
  indexOf,
  Geometry,
  Point,
  Dataset
} from "../../../core";
import {
  GraphicalElementDisplay,
  renderGraphicalElementSVG
} from "../../renderer";

export interface ChartDisplayViewProps {
  manager: Prototypes.ChartStateManager;
}

export class ChartDisplayView extends React.Component<
  ChartDisplayViewProps,
  {}
> {
  public render() {
    const chartState = this.props.manager.chartState;
    const width = chartState.attributes.width as number;
    const height = chartState.attributes.height as number;
    const renderer = new Graphics.ChartRenderer(this.props.manager);
    const graphics = renderer.render();
    return (
      <svg
        x={0}
        y={0}
        width={width}
        height={height}
        viewBox={`0 0 ${width.toFixed(6)} ${height.toFixed(6)}`}
        xmlns="http://www.w3.org/2000/svg"
        xmlnsXlink="http://www.w3.org/1999/xlink"
        xmlSpace="preserve"
      >
        <g
          transform={`translate(${(width / 2).toFixed(6)},${(
            height / 2
          ).toFixed(6)})`}
        >
          <GraphicalElementDisplay element={graphics} />
        </g>
      </svg>
    );
  }
}

export function renderChartToString(
  dataset: Dataset.Dataset,
  chart: Specification.Chart,
  chartState: Specification.ChartState
) {
  const manager = new Prototypes.ChartStateManager(chart, dataset, chartState);
  return ReactDOMServer.renderToString(<ChartDisplayView manager={manager} />);
}

export function renderChartToLocalString(
  dataset: Dataset.Dataset,
  chart: Specification.Chart,
  chartState: Specification.ChartState
): Promise<string> {
  const manager = new Prototypes.ChartStateManager(chart, dataset, chartState);
  const width = chartState.attributes.width as number;
  const height = chartState.attributes.height as number;
  const renderer = new Graphics.ChartRenderer(manager);
  const graphics = renderer.render();
  const urls = new Map<string, string>();
  const allTasks: Array<Promise<void>> = [];
  renderGraphicalElementSVG(graphics, {
    chartComponentSync: true,
    externalResourceResolver: (url: string) => {
      const task = new Promise<string>((resolve, reject) => {
        const img = new Image();
        img.setAttribute("crossOrigin", "anonymous");
        img.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = img.width;
          canvas.height = img.height;
          canvas.getContext("2d").drawImage(img, 0, 0);
          resolve(canvas.toDataURL("image/png"));
        };
        img.onerror = () => {
          reject(new Error(`failed to retrieve map image at url ${url}`));
        };
        img.src = url;
      }).then(dataurl => {
        urls.set(url, dataurl);
      });
      allTasks.push(task);
      return url;
    }
  });
  return Promise.all(allTasks).then(() => {
    return ReactDOMServer.renderToString(
      <svg
        x={0}
        y={0}
        width={width}
        height={height}
        viewBox={`0 0 ${width.toFixed(6)} ${height.toFixed(6)}`}
        xmlns="http://www.w3.org/2000/svg"
        xmlnsXlink="http://www.w3.org/1999/xlink"
        xmlSpace="preserve"
      >
        <g
          transform={`translate(${(width / 2).toFixed(6)},${(
            height / 2
          ).toFixed(6)})`}
        >
          {renderGraphicalElementSVG(graphics, {
            chartComponentSync: true,
            externalResourceResolver: (url: string) => urls.get(url)
          })}
        </g>
      </svg>
    );
  });
}
