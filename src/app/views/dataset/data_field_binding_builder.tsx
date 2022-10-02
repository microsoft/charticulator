/* eslint-disable max-lines-per-function */
// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import {
  DataFieldSelectorValue,
  DataFieldSelectorValueCandidate,
} from "./fluent_ui_data_field_selector";
import {
  Dataset,
  deepClone,
  Expression,
  getById,
  Specification,
} from "../../../core";
import { AppStore } from "../../stores";
import {
  Callout,
  ContextualMenu,
  DirectionalHint,
  Dropdown,
  getTheme,
  IContextualMenuItem,
  IContextualMenuListProps,
  IRenderFunction,
  Label,
} from "@fluentui/react";
import {
  DerivedColumnDescription,
  isKindAcceptable,
  type2DerivedColumns,
} from "./common";
import { ScaleEditor } from "../panels/scale_editor";
import {
  FluentMappingEditor,
  parentOfType,
} from "../panels/widgets/fluent_mapping_editor";
import { strings } from "../../../strings";
import { DataType, MappingType } from "../../../core/specification";
import { AggregationFunctionDescription } from "../../../core/expression";
import {
  defaultLabelStyle,
  defaultStyle,
  defaultBindButtonSize,
  FluentDataBindingMenuItem,
  FluentDataBindingMenuLabel,
} from "../panels/widgets/controls/fluentui_customized_components";
import { CollapsiblePanel } from "../panels/widgets/controls/collapsiblePanel";
import React = require("react");

export interface IDefaultValue {
  table: string;
  // lambdaExpression?: string;
  expression?: string;
  type?: MappingType;
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
  produceDefaultValue(defaultValue: IDefaultValue): void;

  getMenuItems(): IContextualMenuItem[];

  produceScaleEditor(
    store: AppStore,
    attribute: string,
    parent: FluentMappingEditor
  ): void;

  buildMenu(): void;

  /**
   * Add additional derived columns
   * @see type2DerivedColumns
   */
  produceDerivedColumns(): void;
}

const DELIMITER = "-";
const DERIVED_COLUMNS_KEY_PREFIX = "_derived";

class MenuItemsCreator {
  public menuItems: IContextualMenuItem[] = [];
  public nullDescription: string = strings.core.none;
  public fields: DataFieldSelectorValue[] = [];
  public nullSelectable: boolean = true;
  public onClick: (value: DataFieldSelectorValue) => void = () => {
    alert();
  };
  public useAggregation: boolean = false;
  public useDerivedColumns: boolean = false;
  private isDerivedColumns: boolean = false;
  private derivedColumnsIdx: [number, DataFieldSelectorValue][] = [];
  private selectedKey: string = null;

  public defaultValue: IDefaultValue = null;

  private onToggleSelect(
    field: DataFieldSelectorValue,
    ev?: React.MouseEvent<HTMLButtonElement>,
    item?: IContextualMenuItem
  ): void {
    ev && ev.preventDefault && ev.preventDefault();

    if (item && field) {
      this.selectedKey = field.columnName + DELIMITER + item.key;
    }
  }

  private onToggleDerivedSelect(
    field: DataFieldSelectorValue,
    derivedField: string,
    ev?: React.MouseEvent<HTMLButtonElement>,
    item?: IContextualMenuItem
  ): void {
    ev && ev.preventDefault();

    if (derivedField && field && item) {
      this.selectedKey =
        field.columnName + DELIMITER + derivedField + DELIMITER + item.key;
    }
  }

  public setFields(
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
    const imagesTable = store
      .getTables()
      .filter((storeTable) => storeTable.name.endsWith("Images"))[0];

    const columns = deepClone<Dataset.Column[]>(storeTable.columns);

    //append image column
    if (imagesTable) {
      const imageColumn = imagesTable.columns.filter(
        (column) => column.type === DataType.Image
      )[0];
      columns.push(imageColumn);
    }

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

  private transformDerivedField(
    item: DataFieldSelectorValue,
    expression: string,
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
      expression: item.expression + expression,
      rawExpression: item.rawExpression + expression,
      columnName: item.columnName,
      type: item.type,
      metadata: item.metadata,
    };
    if (this.useAggregation) {
      r.expression = expression;
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

    this.menuItems = this.fields.map((field, idx) => {
      const onClickFn = (
        ev?: React.MouseEvent<HTMLButtonElement>,
        item?: IContextualMenuItem
      ) => {
        const transformedField = this.transformField(field, item?.key);
        if (mapping?.type === MappingType.text) {
          this.textMappingOnClick(transformedField.expression, field);
        } else {
          this.onClick(transformedField);
        }
        this.onToggleSelect(field, ev, item);
      };

      let subMenuCheckedItem: string = null;

      const derivedColumns = type2DerivedColumns[field.type];
      if (derivedColumns) {
        this.isDerivedColumns = true;
        this.derivedColumnsIdx.push([idx, field]);
      }
      const subMenuProps = this.useAggregation
        ? {
            items: Expression.getCompatibleAggregationFunctionsByDataKind(
              field.metadata.kind
            ).map(
              (subMenuItem): IContextualMenuItem => {
                const selectionKey: string =
                  field.columnName + DELIMITER + subMenuItem.name;
                const isSelected: boolean = this.checkSelection(selectionKey);
                if (isSelected) {
                  subMenuCheckedItem = subMenuItem.displayName;
                }
                const mappingConfig = this.scaleEditorMenu(isSelected);

                return {
                  key: subMenuItem.name,
                  text: subMenuItem.displayName,
                  isChecked: isSelected,
                  canCheck: true,
                  onClick: onClickFn,
                  split: mappingConfig.isMappingEditor,
                  subMenuProps: mappingConfig.scaleEditorSubMenuProps,
                };
              }
            ),
          }
        : null;
      const selectionKey: string =
        field.columnName + DELIMITER + field.columnName;

      const itemText =
        field.columnName +
        (subMenuProps && subMenuCheckedItem && mapping ? `` : "");

      return {
        key:
          field.columnName + (derivedColumns ? DERIVED_COLUMNS_KEY_PREFIX : ""),
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

    if (mapping && mapping.type == MappingType.scale) {
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

  private scaleEditorMenu(isSelected: boolean) {
    const mapping = this.parent?.props?.parent?.getAttributeMapping(
      this.attribute
    );
    const isMappingEditor: boolean = !!(
      mapping &&
      mapping.type == MappingType.scale &&
      (mapping as Specification.ScaleMapping).scale
    );

    const scaleEditorSubMenuProps =
      isSelected && isMappingEditor
        ? {
            items: [
              {
                key: "mapping",
                onRender: () => this.renderScaleEditor(this.parent, this.store),
              },
            ],
          }
        : null;
    return { scaleEditorSubMenuProps, isMappingEditor };
  }

  private textMappingOnClick(menuExpr: string, field: DataFieldSelectorValue) {
    const newValue = "${" + menuExpr + "}";
    if (Expression.parseTextExpression(newValue).isTrivialString()) {
      this?.parent?.props?.parent?.onEditMappingHandler(this.attribute, {
        type: "value",
        value: newValue,
      } as Specification.ValueMapping);
    } else {
      this?.parent?.props?.parent?.onEditMappingHandler(this.attribute, {
        type: "text",
        table: field.table,
        textExpression: newValue,
      } as Specification.TextMapping);
    }
  }

  private getDerivedColumnExpression(
    derivedColumn: DerivedColumnDescription,
    field: DataFieldSelectorValue,
    aggregationMenuItem: AggregationFunctionDescription
  ) {
    const expr = Expression.functionCall(
      derivedColumn.function,
      Expression.variable(field.columnName)
    ).toString();
    return `${aggregationMenuItem.name}(${expr})`;
  }

  /**
   * Add DerivedColumn
   * @see derivedColumnsIdx
   */
  // eslint-disable-next-line max-lines-per-function
  public appendDerivedColumn(): void {
    const mapping = this.parent?.props?.parent?.getAttributeMapping(
      this.attribute
    );

    if (this.useAggregation && this.isDerivedColumns) {
      for (let i = 0; i < this.derivedColumnsIdx.length; i++) {
        const menuIdx = this.derivedColumnsIdx[i][0];
        const field = this.derivedColumnsIdx[i][1];
        const derivedColumns = type2DerivedColumns[field.type];

        let subMenuCheckedItem: string = null;
        const subMenuProps = this.useAggregation
          ? {
              items: derivedColumns.map(
                (derivedColumn): IContextualMenuItem => {
                  const subMenuProps = this.useAggregation
                    ? {
                        items: Expression.getCompatibleAggregationFunctionsByDataKind(
                          derivedColumn.metadata.kind
                        ).map(
                          (aggregationMenuItem): IContextualMenuItem => {
                            const onClickFn = (
                              ev?: React.MouseEvent<HTMLButtonElement>,
                              item?: IContextualMenuItem
                            ) => {
                              const menuExpr = this.getDerivedColumnExpression(
                                derivedColumn,
                                field,
                                aggregationMenuItem
                              );

                              if (
                                mapping?.type === MappingType.text ||
                                mapping?.type === MappingType.value
                              ) {
                                this.textMappingOnClick(menuExpr, field);
                              } else {
                                this.onClick(
                                  this.transformDerivedField(
                                    field,
                                    menuExpr,
                                    item?.key
                                  )
                                );
                              }

                              //update selection key
                              this.onToggleDerivedSelect(
                                field,
                                derivedColumn.name,
                                ev,
                                item
                              );
                            };
                            const selectionKey: string =
                              field.columnName +
                              DELIMITER +
                              derivedColumn.name +
                              DELIMITER +
                              aggregationMenuItem.name;
                            const isSelected: boolean = this.checkSelection(
                              selectionKey
                            );

                            if (isSelected) {
                              subMenuCheckedItem =
                                derivedColumn.displayName +
                                DELIMITER +
                                aggregationMenuItem.displayName;
                            }

                            //function for mapping renderer
                            const mapping = this.parent?.props?.parent?.getAttributeMapping(
                              this.attribute
                            );

                            const mappingConfig = this.scaleEditorMenu(
                              isSelected
                            );

                            return {
                              key: aggregationMenuItem.name,
                              text: aggregationMenuItem.displayName,
                              isChecked: isSelected,
                              canCheck: true,
                              onClick: onClickFn,
                              split: mappingConfig.isMappingEditor,
                              subMenuProps:
                                mappingConfig.scaleEditorSubMenuProps,
                            };
                          }
                        ),
                      }
                    : null;
                  return {
                    key: derivedColumn.name,
                    text: derivedColumn.displayName,
                    canCheck: true,
                    subMenuProps,
                  };
                }
              ),
            }
          : null;

        //key for no aggregation option
        const selectionKey: string =
          field.columnName + DELIMITER + field.columnName;

        const itemText =
          field.columnName +
          strings.objects.derivedColumns.menuSuffix +
          (subMenuProps && subMenuCheckedItem && mapping ? `` : "");

        const derivedColumnsField = {
          key: field.columnName,
          text: itemText,
          subMenuProps,
          canCheck: subMenuProps ? null : true,
          isChecked: this.checkSelection(selectionKey),
          data: subMenuCheckedItem,
        };
        //add derived column field to menu
        this.menuItems.splice(menuIdx + 1, 0, derivedColumnsField);
      }
      //we need clear array between renders
      this.derivedColumnsIdx = [];
    }
  }

  public buildMenu(): void {
    this.buildMenuFieldsItems();

    if (this.useDerivedColumns) {
      this.appendDerivedColumn();
    }
    this.appendNull();
  }

  private parseDerivedColumnsExpression(expression: string): string {
    const DATE_DERIVED_PREDIX: string = "date.";
    if (expression.startsWith(DATE_DERIVED_PREDIX)) {
      //data.year(DATE) -> DATE-year
      return (
        expression.match(/\(([^)]+)\)/)[1] +
        DELIMITER +
        expression.match(/\.([^(]+)\(/)[1]
      );
    }
    return expression;
  }

  //todo: defaultValue without Aggregation
  public produceDefaultValue(defaultValue: IDefaultValue): void {
    const mappingType = defaultValue?.type;
    this.defaultValue = defaultValue;
    let expression = null;
    let expressionAggregation = null;
    if (defaultValue != null) {
      if (defaultValue.expression != null) {
        let parsed;
        if (mappingType === MappingType.text) {
          parsed = Expression.parseTextExpression(defaultValue.expression)
            ?.parts[0]?.expression;
        } else {
          parsed = Expression.parse(defaultValue.expression);
        }
        if (parsed instanceof Expression.FunctionCall) {
          expression = parsed.args[0].toString();
          expressionAggregation = parsed.name;
          expression = expression?.split("`").join("");
          //need to provide date.year() etc.
          expression = this.parseDerivedColumnsExpression(expression);
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

  produceDerivedColumns() {
    this.menuItemsCreator.useDerivedColumns = true;
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
    this.menuItemsCreator.setFields(datasetStore, table, kinds, types);
  }

  public produceDefaultValue(defaultValue: IDefaultValue): void {
    this.menuItemsCreator.produceDefaultValue(defaultValue);
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
    // console.log(datasetStore, table, kinds, types)
    this.builder.produceFields(datasetStore, table, kinds, types);
    this.builder.produceOnChange(onClick);
    this.builder.produceUsingAggregation(true);
    this.builder.produceDefaultValue(defaultValue);
    this.builder.produceScaleEditor(datasetStore, attribute, parent);
    this.builder.produceDerivedColumns();
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

  public getMenuRender(): IRenderFunction<IContextualMenuListProps> {
    const theme = getTheme();

    const CustomMenuRender: React.FC<{
      item: IContextualMenuItem;
      defaultKey: string;
    }> = ({ item, defaultKey }) => {
      let currentFunction: IContextualMenuItem;
      if (item.subMenuProps) {
        currentFunction = item.subMenuProps.items.find((i) => i.isChecked);
        if (currentFunction) {
          defaultKey = currentFunction.key;
        }
      }

      return (
        <FluentDataBindingMenuItem
          key={item.key}
          backgroundColor={
            currentFunction
              ? theme.semanticColors.buttonBackgroundChecked
              : null
          }
          backgroundColorHover={theme.semanticColors.buttonBackgroundHovered}
        >
          <FluentDataBindingMenuLabel>
            <Label
              onClick={(e) => {
                const agr = item.subMenuProps?.items.find(
                  (item) => item.key === defaultKey
                );
                if (agr) {
                  agr.onClick(e as any, agr);
                } else {
                  item.onClick(e as any, item);
                }
              }}
              styles={defaultLabelStyle}
            >
              {item.text}
            </Label>
          </FluentDataBindingMenuLabel>
          {item.subMenuProps ? (
            <Dropdown
              styles={{
                ...(defaultStyle as any),
                title: {
                  ...defaultStyle.title,
                  lineHeight: defaultBindButtonSize.height,
                  borderWidth: "0px",
                },
                dropdownOptionText: {
                  boxSizing: "unset",
                  lineHeight: defaultBindButtonSize.height,
                },
                callout: {
                  minWidth: 180,
                },
              }}
              selectedKey={defaultKey}
              options={item.subMenuProps.items.map((i) => ({
                key: i.key,
                text: i.text,
              }))}
              onChange={(e, opt) => {
                const agr = item.subMenuProps.items.find(
                  (item) => item.key === opt.key
                );
                if (agr) {
                  agr.onClick(e as any, agr);
                } else {
                  item.onClick(e as any, item);
                }
              }}
            />
          ) : null}
        </FluentDataBindingMenuItem>
      );
    };

    return (props) => {
      const calloutKey = "mappingMenuAnchor";

      // find current mapping
      let mapping = null;
      const currentColumn = props.items
        .filter((item) => item.subMenuProps) // exclude None
        .flatMap((items) => {
          if (
            items.subMenuProps &&
            items.subMenuProps.items.find((i) => i.key === "year")
          ) {
            return items.subMenuProps.items;
          } else {
            return items;
          }
        })
        .find(
          (item) =>
            item.subMenuProps.items.filter((i) => i.isChecked && i.subMenuProps)
              .length > 0
        ); // Exclude unselected columns

      if (currentColumn) {
        const aggregationFunction = currentColumn.subMenuProps.items.find(
          (i) => i.isChecked && i.subMenuProps
        );

        const currentMapping = aggregationFunction.subMenuProps.items.find(
          (i) => i.key === "mapping"
        ); // Select mapping of column

        // set current mapping
        mapping = currentMapping;
      }

      return (
        <div id={calloutKey}>
          {mapping ? (
            <Callout
              target={`#${calloutKey}`}
              directionalHint={DirectionalHint.leftCenter}
            >
              {mapping.onRender(mapping, () => null)}
            </Callout>
          ) : null}
          {!props.items.find(
            (item) => item.key === "first" || item.key === "avg"
          ) ? (
            <>
              {props.items.map((item) => {
                if (item.subMenuProps?.items.find((i) => i.key === "year")) {
                  const expand = item.subMenuProps.items.find((columns) =>
                    columns.subMenuProps.items.find((func) => func.isChecked)
                  );
                  return (
                    <CollapsiblePanel
                      key={item.key}
                      header={() => (
                        <Label styles={defaultLabelStyle}>{item.text}</Label>
                      )}
                      isCollapsed={expand === null}
                      widgets={item.subMenuProps.items.map((item) => {
                        const currentKey = item.subMenuProps?.items[0].key;
                        return (
                          <CustomMenuRender
                            key={item.key}
                            item={item}
                            defaultKey={currentKey}
                          />
                        );
                      })}
                    />
                  );
                } else {
                  const currentKey = item.subMenuProps?.items[0].key;
                  return (
                    <CustomMenuRender
                      key={item.key}
                      item={item}
                      defaultKey={currentKey}
                    />
                  );
                }
              })}
            </>
          ) : (
            <ContextualMenu {...props} />
          )}
        </div>
      );
    };
  }
}
