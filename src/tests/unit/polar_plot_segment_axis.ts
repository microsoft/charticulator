// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import { expect } from "chai";
import {
  DataKind,
  DataType,
  ObjectProperties,
  PlotSegment,
} from "../../core/specification";
import {
  BindDataToAxis,
  ExtendPlotSegment,
  Load,
  UpdatePlotSegments,
} from "../../app/actions/actions";
import { DataExpression } from "../../app/actions/drag_data";
import { AxisDataBinding } from "../../core/specification/types";
import { Expression, initialize, Prototypes } from "./../../core";
import { createMockStore } from "./mock";
import { PolarProperties } from "../../core/prototypes/plot_segments/region_2d/polar";

describe("Polar plot segment", () => {
  // The directory containing test cases
  before(async () => {
    await initialize();
  });

  it("binding data to axis adds property", (done) => {
    const plotsegmentProperty = "xData";
    const appStore = createMockStore();
    const mainTable = appStore.dataset.tables[0];
    const firstColumn = mainTable.columns[0];
    const aggregation = Expression.getDefaultAggregationFunction(
      firstColumn.type,
      DataKind.Categorical
    );
    const expression = Expression.functionCall(
      aggregation,
      Expression.parse(Expression.variable(firstColumn.name).toString())
    ).toString();

    for (const item of Prototypes.forEachObject(appStore.chart)) {
      if (Prototypes.isType(item.object.classID, "plot-segment")) {
        const plotSegment = item.object as PlotSegment;
        appStore.dispatcher.dispatch(
          new ExtendPlotSegment(plotSegment, "polar")
        );

        appStore.dispatcher.dispatch(
          new BindDataToAxis(
            plotSegment as PlotSegment<ObjectProperties>,
            plotsegmentProperty,
            null,
            new DataExpression(
              mainTable,
              expression,
              firstColumn.type,
              firstColumn.metadata,
              null,
              null,
              null,
              null
            ),
            true
          )
        );
      }
    }

    const plotSegment = appStore.chart.elements[0];
    const properties = plotSegment.properties as PolarProperties;

    expect(plotSegment.classID).to.equal("plot-segment.polar");

    const plotsegmentPropertyValue = properties[
      plotsegmentProperty
    ] as AxisDataBinding;
    expect(plotsegmentPropertyValue.type).to.equal(firstColumn.metadata.kind);
    expect(plotsegmentPropertyValue.valueType).to.equal(firstColumn.type);
    expect(plotsegmentPropertyValue.side).to.equal("default");
    expect(plotsegmentPropertyValue.numericalMode).to.oneOf([null, undefined]);
    expect(plotsegmentPropertyValue.rawExpression).to.equal("first(Month)");
    expect(plotsegmentPropertyValue.expression).to.equal(expression);
    expect(plotsegmentPropertyValue.gapRatio).to.closeTo(0.1, 0.001);
    expect(plotsegmentPropertyValue.dataKind).to.equal(
      firstColumn.metadata.kind
    );
    expect(plotsegmentPropertyValue.autoDomainMin).to.equal(true);
    expect(plotsegmentPropertyValue.autoDomainMax).to.equal(true);

    expect(plotsegmentPropertyValue.offset).to.equal(0);
    done();
  }).timeout(10000);

  it("updated to polar plot segment", (done) => {
    const appStore = createMockStore();

    for (const item of Prototypes.forEachObject(appStore.chart)) {
      if (Prototypes.isType(item.object.classID, "plot-segment")) {
        const plotSegment = item.object as PlotSegment;
        appStore.dispatcher.dispatch(
          new ExtendPlotSegment(plotSegment, "polar")
        );
      }
    }

    const plotSegment = appStore.chart.elements[0];
    const properties = plotSegment.properties as PolarProperties;

    //check default properties
    expect(plotSegment.classID).to.equal("plot-segment.polar");
    expect(properties.startAngle).to.equal(0);
    expect(properties.endAngle).to.equal(360);
    expect(properties.innerRatio).to.equal(0.5);
    expect(properties.outerRatio).to.equal(0.9);

    done();
  }).timeout(10000);
});
