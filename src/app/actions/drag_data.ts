import { Dataset } from "../../core";
import { Value } from "../../core/expression/classes";

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
    public valueType: string,
    public metadata: Dataset.ColumnMetadata = null
  ) {
    super();
  }
}

// export class TableColumn extends DropZoneData {
//     constructor(
//         public table: Dataset.Table,
//         public column: Dataset.Column
//     ) { super(); }
// }
