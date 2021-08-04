// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import {
  DataFieldSelectorValue,
  DataFieldSelectorValueCandidate,
} from "./fluent_ui_data_field_selector";
import { Dataset, Expression, getById, Specification } from "../../../core";
import { AppStore } from "../../stores";
import { IContextualMenuItem } from "@fluentui/react";
import { isKindAcceptable, type2DerivedColumns } from "./common";
import { ScaleEditor } from "../panels/scale_editor";
import {
  FluentMappingEditor,
  parentOfType,
} from "../panels/widgets/fluent_mapping_editor";
import React = require("react");
import { strings } from "../../../strings";

export interface IDefaultValue {
  table: string;
  // lambdaExpression?: string;
  expression?: string;
}

interface Builder {
  /**
   * Description for null element
   * @default (none)
   */
  produceNullDescription(nullDescription: string): void;

  /**
   * Add onChange function for menu items
   */
  produceOnChange(fn: (value: DataFieldSelectorValue) => void): void;

  /**
   * Use Aggregation
   */
  produceUsingAggregation(useAggregation: boolean): void;

  /**
   * Show fields only from a particular table
   * Show fields only of certain kinds or types (categorical / numerical)
   */
  produceFields(
    datasetStore: AppStore,
    table?: string,
    kinds?: Dataset.DataKind[],
    types?: Dataset.DataType[]
  ): void;

  /**
   * Add default value
   */
  produceDefaultValue(dafaultValue: IDefaultValue): void;

  getMenuItems(): IContextualMenuItem[];

  produceScaleEditor(
    store: AppStore,
    attribute: string,
    parent: FluentMappingEditor
  ): void;

  buildMenu(): void;
}
const DELIMITER = "-";

class MenuItemsCreator {
  public menuItems: IContextualMenuItem[] = [];
  public nullDescription: string = strings.core.none;
  public fields: DataFieldSelectorValue[] = [];
  public nullSelectable: boolean = true;
  public onClick: (value: DataFieldSelectorValue) => void = () => {
    alert();
  };
  public useAggregation: boolean = false;

  private selectedKey: string = null;

  public defaultValue: IDefaultValue = null;

  private onToggleSelect(
    field: DataFieldSelectorValue,
    ev?: React.MouseEvent<HTMLButtonElement>,
    item?: IContextualMenuItem
  ): void {
    ev && ev.preventDefault();

    if (item && field) {
      this.selectedKey = field.columnName + DELIMITER + item.key;
    }
  }

  public setFieds(
    datasetStore: AppStore,
    table?: string,
    kinds?: Dataset.DataKind[],
    types?: Dataset.DataType[]
  ): void {
    this.fields = this.getTableFields(datasetStore, table, kinds, types);
  }

  private getTableFields(
    store: AppStore,
    table?: string,
    kinds?: Dataset.DataKind[],
    types?: Dataset.DataType[]
  ): DataFieldSelectorValueCandidate[] {
    const storeTable = store
      .getTables()
      .filter((storeTable) => storeTable.name == table || table == null)[0];
    const columns = storeTable.columns;
    const columnFilters: ((x: DataFieldSelectorValue) => boolean)[] = [];
    columnFilters.push((x) => !x.metadata.isRaw);
    if (table) {
      columnFilters.push((x) => x.table == table);
    }
    if (kinds) {
      columnFilters.push(
        (x) => x.metadata != null && isKindAcceptable(x.metadata.kind, kinds)
      );
    }
    if (types) {
      columnFilters.push(
        (x) => x.metadata != null && types.indexOf(x.type) >= 0
      );
    }
    const columnFilter = (x: DataFieldSelectorValue) => {
      for (const f of columnFilters) {
        if (!f(x)) {
          return false;
        }
      }
      return true;
    };
    let candidates = columns.map((c) => {
      const r: DataFieldSelectorValueCandidate = {
        selectable: true,
        table: storeTable.name,
        columnName: c.name,
        expression: Expression.variable(c.name).toString(),
        rawExpression: Expression.variable(
          c.metadata.rawColumnName || c.name
        ).toString(),
        type: c.type,
        displayName: c.name,
        metadata: c.metadata,
        derived: [],
      };
      // Compute derived columns.
      const derivedColumns = type2DerivedColumns[r.type];
      if (derivedColumns) {
        for (const item of derivedColumns) {
          const ditem: DataFieldSelectorValueCandidate = {
            table: storeTable.name,
            columnName: null,
            expression: Expression.functionCall(
              item.function,
              Expression.parse(r.expression)
            ).toString(),
            rawExpression: Expression.functionCall(
              item.function,
              Expression.parse(r.rawExpression)
            ).toString(),
            type: item.type,
            metadata: item.metadata,
            displayName: item.name,
            selectable: true,
          };
          if (columnFilter(ditem)) {
            r.derived.push(ditem);
          }
        }
      }
      r.selectable = columnFilter(r);
      return r;
    });
    // Make sure we only show good ones
    candidates = candidates.filter(
      (x) => (x.derived.length > 0 || x.selectable) && !x.metadata.isRaw
    );
    return candidates;
  }

  private transformField(
    item: DataFieldSelectorValue,
    aggregation: string = null
  ) {
    if (aggregation == null) {
      aggregation = Expression.getDefaultAggregationFunction(
        item.type,
        item.metadata?.kind
      );
    }
    const r = {
      table: item.table,
      expression: item.expression,
      rawExpression: item.rawExpression,
      columnName: item.columnName,
      type: item.type,
      metadata: item.metadata,
    };
    if (this.useAggregation) {
      r.expression = Expression.functionCall(
        aggregation,
        Expression.parse(item.expression)
      ).toString();
      r.rawExpression = Expression.functionCall(
        aggregation,
        Expression.parse(item.rawExpression)
      ).toString();
    }
    return r;
  }

  private checkSelection(key: string): boolean {
    return key.localeCompare(this.selectedKey) === 0;
  }

  public buildMenuFieldsItems(): void {
    // if useAggregation == true -> create sub menu
    const mapping = this.parent?.props?.parent?.getAttributeMapping(
      this.attribute
    );

    this.menuItems = this.fields.map((field) => {
      const onClickFn = (
        ev?: React.MouseEvent<HTMLButtonElement>,
        item?: IContextualMenuItem
      ) => {
        this.onClick(this.transformField(field, item?.key));
        this.onToggleSelect(field, ev, item);
      };

      let subMenuCheckedItem: string = null;

      const subMenuProps = this.useAggregation
        ? {
            items: Expression.getCompatibleAggregationFunctions(field.type).map(
              (subMenuItem): IContextualMenuItem => {
                const selectionKey: string =
                  field.columnName + DELIMITER + subMenuItem.name;
                const isSelected: boolean = this.checkSelection(selectionKey);
                if (isSelected) {
                  subMenuCheckedItem = subMenuItem.displayName;
                }
                const mapping = this.parent?.props?.parent?.getAttributeMapping(
                  this.attribute
                );
                const isMappingEditor: boolean =
                  mapping &&
                  mapping.type == "scale" &&
                  (mapping as Specification.ScaleMapping).scale
                    ? true
                    : false;

                const scaleEditorSubMenuProps =
                  isSelected && isMappingEditor
                    ? {
                        items: [
                          {
                            key: "mapping",
                            onRender: () =>
                              this.renderScaleEditor(this.parent, this.store),
                          },
                        ],
                      }
                    : null;

                return {
                  key: subMenuItem.name,
                  text: subMenuItem.displayName,
                  isChecked: isSelected,
                  canCheck: true,
                  onClick: onClickFn,
                  split: isMappingEditor,
                  subMenuProps: scaleEditorSubMenuProps,
                };
              }
            ),
          }
        : null;
      const selectionKey: string =
        field.columnName + DELIMITER + field.columnName;

      const itemText =
        field.columnName +
        (subMenuProps && subMenuCheckedItem && mapping
          ? ` (${subMenuCheckedItem})`
          : "");

      return {
        key: field.columnName,
        text: itemText,
        subMenuProps,
        canCheck: subMenuProps ? null : true,
        isChecked: this.checkSelection(selectionKey),
        onClick: subMenuProps ? null : onClickFn,
        data: subMenuCheckedItem,
      };
    });
  }

  public store: AppStore;
  public attribute: string;
  public parent: FluentMappingEditor;

  public renderScaleEditor(
    parent: FluentMappingEditor,
    store: AppStore
  ): JSX.Element {
    const mapping = this.parent?.props?.parent.getAttributeMapping(
      this.attribute
    );

    if (mapping && mapping.type == "scale") {
      const scaleMapping = mapping as Specification.ScaleMapping;
      if (scaleMapping.scale) {
        const scaleObject = getById<Specification.Scale>(
          this.store.chart.scales,
          scaleMapping.scale
        );

        return (
          <ScaleEditor
            scale={scaleObject}
            scaleMapping={scaleMapping}
            store={store}
            plotSegment={parentOfType(
              (parent.props.parent as any).objectClass.parent,
              "plot-segment"
            )}
          />
        );
      }
      return null;
    }
    return null;
  }

  public produceScaleEditor(
    store: AppStore,
    attribute: string,
    parent: FluentMappingEditor
  ): void {
    this.attribute = attribute;
    this.parent = parent;
    this.store = store;
  }

  private appendNull(): void {
    this.menuItems = [
      {
        key: this.nullDescription,
        text: this.nullDescription,
        onClick: () => this.onClick(null),
      },
      ...this.menuItems,
    ];
  }

  public buildMenu(): void {
    this.buildMenuFieldsItems();
    this.appendNull();
  }

  //todo: defaultValue without Aggregation
  public produceDefaultValue(defaultValue: IDefaultValue): void {
    this.defaultValue = defaultValue;
    let expression = null;
    let expressionAggregation = null;
    if (defaultValue != null) {
      if (defaultValue.expression != null) {
        const parsed = Expression.parse(defaultValue.expression);

        if (parsed instanceof Expression.FunctionCall) {
          expression = parsed.args[0].toString();
          expressionAggregation = parsed.name;
        }
      }
      const value =
        (expression ? expression + DELIMITER : "") + expressionAggregation;
      if (value) {
        this.selectedKey = value;
      }
    }
  }
}

export class MenuItemBuilder implements Builder {
  private menuItemsCreator: MenuItemsCreator;

  constructor() {
    this.reset();
  }

  produceScaleEditor(
    store: AppStore,
    attribute: string,
    parent: FluentMappingEditor
  ): void {
    this.menuItemsCreator.produceScaleEditor(store, attribute, parent);
  }

  produceOnChange(fn: (value: DataFieldSelectorValue) => void): void {
    this.menuItemsCreator.onClick = fn;
  }

  getMenuItems(): IContextualMenuItem[] {
    return this.menuItemsCreator.menuItems;
  }

  public reset(): void {
    this.menuItemsCreator = new MenuItemsCreator();
  }

  public produceNullDescription(nullDescription: string): void {
    this.menuItemsCreator.nullDescription = nullDescription;
  }

  public produceUsingAggregation(useAggregation: boolean): void {
    this.menuItemsCreator.useAggregation = useAggregation;
  }

  public produceFields(
    datasetStore: AppStore,
    table?: string,
    kinds?: Dataset.DataKind[],
    types?: Dataset.DataType[]
  ): void {
    this.menuItemsCreator.setFieds(datasetStore, table, kinds, types);
  }

  public produceDefaultValue(dafaultValue: IDefaultValue): void {
    this.menuItemsCreator.produceDefaultValue(dafaultValue);
  }

  public buildMenu(): void {
    return this.menuItemsCreator.buildMenu();
  }
}

export class Director {
  private builder: Builder;

  public setBuilder(builder: Builder): void {
    this.builder = builder;
  }

  public buildNullMenu(): IContextualMenuItem[] {
    this.builder.buildMenu();
    return this.builder.getMenuItems();
  }

  public buildFieldsMenu(
    onClick: (value: DataFieldSelectorValue) => void,
    defaultValue: IDefaultValue,
    datasetStore: AppStore,
    parent: FluentMappingEditor,
    attribute: string,
    table?: string,
    kinds?: Dataset.DataKind[],
    types?: Dataset.DataType[]
  ): IContextualMenuItem[] {
    this.builder.produceFields(datasetStore, table, kinds, types);
    this.builder.produceOnChange(onClick);
    this.builder.produceUsingAggregation(true);
    this.builder.produceDefaultValue(defaultValue);
    this.builder.produceScaleEditor(datasetStore, attribute, parent);
    this.builder.buildMenu();
    return this.builder.getMenuItems();
  }

  public buildSectionHeaderFieldsMenu(
    onClick: (value: DataFieldSelectorValue) => void,
    defaultValue: IDefaultValue,
    datasetStore: AppStore,
    table?: string,
    kinds?: Dataset.DataKind[],
    types?: Dataset.DataType[]
  ): IContextualMenuItem[] {
    this.builder.produceFields(datasetStore, table, kinds, types);
    this.builder.produceOnChange(onClick);
    this.builder.produceUsingAggregation(true);
    this.builder.produceDefaultValue(defaultValue);
    this.builder.buildMenu();
    return this.builder.getMenuItems();
  }
}
