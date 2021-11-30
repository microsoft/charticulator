// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import { expect } from "chai";
import {
  DataKind,
  DataType,
  ObjectProperties,
  PlotSegment,
} from "../../core/specification";
import { BindDataToAxis, UpdatePlotSegments } from "../../app/actions/actions";
import { DataExpression } from "../../app/actions/drag_data";
import { AxisDataBinding } from "../../core/specification/types";
import { Expression, initialize, Prototypes } from "./../../core";
import { createMockStore } from "./mock";
import { Region2DSublayoutType } from "../../core/prototypes/plot_segments/region_2d/base";

describe("Plot segment", () => {
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
        const plotSegment = item.object;

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
    const properties = plotSegment.properties;
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

  it("update plotsegments doesn't change properties", (done) => {
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
        const plotSegment = item.object;

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
            false
          )
        );
      }
    }
    appStore.dispatcher.dispatch(new UpdatePlotSegments());

    const plotSegment = appStore.chart.elements[0];
    const properties = plotSegment.properties;
    const plotsegmentPropertyValue = properties[
      plotsegmentProperty
    ] as AxisDataBinding;
    expect(plotsegmentPropertyValue.type).to.equal(firstColumn.metadata.kind);
    expect(plotsegmentPropertyValue.valueType).to.equal(firstColumn.type);
    expect(plotsegmentPropertyValue.side).to.equal("default");
    expect(plotsegmentPropertyValue.rawExpression).to.equal("first(Month)");

    expect(plotsegmentPropertyValue.numericalMode).to.oneOf([null, undefined]);
    expect(plotsegmentPropertyValue.expression).to.equal(expression);
    expect(plotsegmentPropertyValue.gapRatio).to.equal(0.1);
    expect(plotsegmentPropertyValue.dataKind).to.equal(
      firstColumn.metadata.kind
    );
    expect(plotsegmentPropertyValue.autoDomainMin).to.equal(true);
    expect(plotsegmentPropertyValue.autoDomainMax).to.equal(true);
    done();
  }).timeout(10000);

  //categorical - categorical sub layout
  it("update plotsegments sub layout property", (done) => {
    const plotsegmentXDataProperty = "xData";
    const plotsegmentYDataProperty = "yData";
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

    const numericColumn = mainTable.columns.find(
      (column) => column.type == DataType.Number
    );
    const numericColumnAggregation = Expression.getDefaultAggregationFunction(
      numericColumn.type,
      DataKind.Numerical
    );
    const numericColumnExpression = Expression.functionCall(
      numericColumnAggregation,
      Expression.parse(Expression.variable(numericColumn.name).toString())
    ).toString();

    for (const item of Prototypes.forEachObject(appStore.chart)) {
      if (Prototypes.isType(item.object.classID, "plot-segment")) {
        const plotSegment = item.object;

        // X data
        appStore.dispatcher.dispatch(
          new BindDataToAxis(
            plotSegment as PlotSegment<ObjectProperties>,
            plotsegmentXDataProperty,
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
            false
          )
        );

        //yData
        appStore.dispatcher.dispatch(
          new BindDataToAxis(
            plotSegment as PlotSegment<ObjectProperties>,
            plotsegmentYDataProperty,
            null,
            new DataExpression(
              mainTable,
              numericColumnExpression,
              numericColumn.type,
              numericColumn.metadata,
              null,
              null,
              null,
              null
            ),
            false
          )
        );
      }
    }
    appStore.dispatcher.dispatch(new UpdatePlotSegments());

    const plotSegment = appStore.chart.elements[0];
    const properties = plotSegment.properties as Prototypes.PlotSegments.Region2DProperties;
    expect(properties.sublayout.type).to.equal(Region2DSublayoutType.Overlap);

    //switch to categorical
    for (const item of Prototypes.forEachObject(appStore.chart)) {
      if (Prototypes.isType(item.object.classID, "plot-segment")) {
        const plotSegment = item.object;

        // X data
        appStore.dispatcher.dispatch(
          new BindDataToAxis(
            plotSegment as PlotSegment<ObjectProperties>,
            plotsegmentYDataProperty,
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
            false
          )
        );
      }
    }
    appStore.dispatcher.dispatch(new UpdatePlotSegments());
    expect(properties.sublayout.type).to.equal(Region2DSublayoutType.Grid);
    done();
  }).timeout(10000);
});
