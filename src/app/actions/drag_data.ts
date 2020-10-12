// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import { Dataset } from "../../core";

export class ObjectType {
  constructor(public classID: string, public options: string = null) {}
}

export class ScaffoldType {
  constructor(public type: string) {}
}

export class DropZoneData {}

export class DataExpression extends DropZoneData {
  constructor(
    public table: Dataset.Table,
    public expression: string,
    public valueType: Dataset.DataType,
    public metadata: Dataset.ColumnMetadata = null,
    public rawColumnExpression: string,
    public scaleID?: string,
    public allowSelectValue?: boolean
  ) {
    super();
  }
}
