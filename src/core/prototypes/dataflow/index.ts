import * as Dataset from "../../dataset";
import * as Expression from "../../expression";
import * as Specification from "../../specification";

export class DataflowTable implements Expression.Context {
  constructor(
    public parent: DataflowManager,
    public name: string,
    public rows: Specification.DataRow[]
  ) {}

  /** Implements Expression.Context */
  public getVariable(name: string) {
    if (name == "rows") {
      return this.rows;
    }
    return this.parent.getVariable(name);
  }

  /** Get a row with index */
  public getRow(index: number): Specification.DataRow {
    return this.rows[index];
  }

  /** Get a row context with index */
  public getRowContext(index: number): Expression.Context {
    return new Expression.ShadowContext(this, this.rows[index]);
  }
}

export class DataflowManager implements Expression.Context {
  private tables: Map<string, DataflowTable>;

  public readonly context: Dataset.DatasetContext;
  public readonly cache: Expression.ExpressionCache;

  constructor(dataset: Dataset.Dataset) {
    this.context = new Dataset.DatasetContext(dataset);
    this.cache = new Expression.ExpressionCache();

    this.tables = new Map<string, DataflowTable>();
    for (const table of dataset.tables) {
      const dfTable = new DataflowTable(this, table.name, table.rows);
      this.tables.set(table.name, dfTable);
    }
  }

  /** Get a table by name (either original table or derived table) */
  public getTable(name: string): DataflowTable {
    return this.tables.get(name);
  }

  /** Implements Expression.Context */
  public getVariable(name: string) {
    if (this.tables.has(name)) {
      return this.tables.get(name).rows;
    }
  }
}
