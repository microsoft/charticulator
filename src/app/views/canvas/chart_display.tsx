// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
/* eslint-disable @typescript-eslint/ban-types  */
/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/no-empty-interface */

import * as React from "react";
import * as ReactDOMServer from "react-dom/server";
import { Dataset, Graphics, Prototypes, Specification } from "../../../core";
import { strings } from "../../../strings";
import {
  GraphicalElementDisplay,
  renderGraphicalElementSVG,
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
        /* eslint-disable-next-line */
        xmlns="http://www.w3.org/2000/svg"
        /* eslint-disable-next-line */
        xmlnsXlink="http://www.w3.org/1999/xlink"
        xmlSpace="preserve"
      >
        <g
          transform={`translate(${(width / 2).toFixed(6)},${(
            height / 2
          ).toFixed(6)})`}
        >
          <GraphicalElementDisplay element={graphics} />
          {renderer.renderControls(
            this.props.manager.chart,
            this.props.manager.chartState
          )}
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
  const allTasks: Promise<void>[] = [];
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
          reject(new Error(strings.error.imageLoad(url)));
        };
        img.src = url;
      }).then((dataurl) => {
        urls.set(url, dataurl);
      });
      allTasks.push(task);
      return url;
    },
  });
  return Promise.all(allTasks).then(() => {
    return ReactDOMServer.renderToString(
      <svg
        x={0}
        y={0}
        width={width}
        height={height}
        viewBox={`0 0 ${width.toFixed(6)} ${height.toFixed(6)}`}
        /* eslint-disable-next-line */
        xmlns="http://www.w3.org/2000/svg"
        /* eslint-disable-next-line */
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
            externalResourceResolver: (url: string) => urls.get(url),
          })}
        </g>
      </svg>
    );
  });
}
