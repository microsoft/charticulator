/* eslint-disable max-lines-per-function */
// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as React from "react";
import { CSSProperties } from "react";
import * as ReactDOM from "react-dom";

import * as globals from "../../../globals";
import * as R from "../../../resources";

import {
  applyDateFormat,
  Color,
  ColorGradient,
  EventSubscription,
  getById,
  getField,
  getRandomNumber,
  Point,
  Prototypes,
  refineColumnName,
  Specification,
} from "../../../../core";
import { Actions, DragData } from "../../../actions";
import { ButtonRaised } from "../../../components";
import { SVGImageIcon } from "../../../components/icons";
import { getAlignment, PopupAlignment, PopupView } from "../../../controllers";
import {
  DragContext,
  DragModifiers,
  Droppable,
} from "../../../controllers/drag_controller";

import { AppStore } from "../../../stores";
import {
  classNames,
  readFileAsString,
  showOpenFileDialog,
} from "../../../utils/index";
import { DataFieldSelectorValue } from "../../dataset/data_field_selector";
import { ReorderListView } from "../object_list_editor";
import { FluentComboBoxFontFamily } from "./controls";
import { GroupByEditor } from "./groupby_editor";
import {
  ChartTemplate,
  getFormat,
  tickFormatParserExpression,
} from "../../../../container";
import {
  FunctionCall,
  TextExpression,
  Variable,
} from "../../../../core/expression";
import { getDateFormat } from "../../../../core/dataset/datetime";
import { ScaleMapping } from "../../../../core/specification";
import { ScaleValueSelector } from "../scale_value_selector";

import {
  Checkbox,
  ComboBox,
  DatePicker,
  DayOfWeek,
  DefaultButton,
  Dropdown,
  FontIcon,
  getTheme,
  IconButton,
  Label,
  TextField,
  TooltipHost,
} from "@fluentui/react";
import { FluentMappingEditor } from "./fluent_mapping_editor";
import { CharticulatorPropertyAccessors } from "./types";
import { FluentInputColor } from "./controls/fluentui_input_color";
import { FluentInputExpression } from "./controls/fluentui_input_expression";

import {
  defaultLabelStyle,
  defaultStyle,
  defaultBindButtonSize,
  defaultComponentsHeight,
  FluentButton,
  FluentCheckbox,
  FluentDatePickerWrapper,
  FluentLabelHeader,
  labelRender,
  NestedChartButtonsWrapper,
} from "./controls/fluentui_customized_components";
import { FluentInputNumber } from "./controls/fluentui_input_number";
import {
  InputFontComboboxOptions,
  InputTextOptions,
  ObserverConfig,
  PanelMode,
  SearchWrapperOptions,
} from "../../../../core/prototypes/controls";

import { mergeStyles } from "@fluentui/merge-styles";
import { strings } from "../../../../strings";
import { InputImage } from "./controls/fluentui_image";
import { InputImageProperty } from "./controls/fluentui_image_2";
import {
  Director,
  IDefaultValue,
  MenuItemBuilder,
} from "../../dataset/data_field_binding_builder";
import { FluentInputFormat } from "./controls/fluentui_input_format";

import { CollapsiblePanel } from "./controls/collapsiblePanel";
import { OpenNestedEditor } from "../../../actions/actions";
import { FilterPanel } from "./fluentui_filter";
import { EventManager, EventType, UIManagerListener } from "./observer";
import { FluentUIGradientPicker } from "../../../components/fluent_ui_gradient_picker";
import { OrderMode } from "../../../../core/specification/types";
import { CustomCollapsiblePanel } from "./controls/custom_collapsible_panel";
import { FluentUIReorderStringsValue } from "./controls/fluentui_reorder_string_value";
import { InputColorGradient } from "./controls/input_gradient";
import { dropdownStyles, onRenderOption, onRenderTitle } from "./styles";
import { getDropzoneAcceptTables } from "./utils";
import { EditorType } from "../../../stores/app_store";

export type OnEditMappingHandler = (
  attribute: string,
  mapping: Specification.Mapping
) => void;
export type OnMapDataHandler = (
  attribute: string,
  data: DragData.DataExpression,
  hints: Prototypes.DataMappingHints
) => void;
export type OnSetPropertyHandler = (
  property: string,
  field: string,
  value: Specification.AttributeValue
) => void;

export class FluentUIWidgetManager
  implements Prototypes.Controls.WidgetManager, CharticulatorPropertyAccessors {
  constructor(
    public store: AppStore,
    public objectClass: Prototypes.ObjectClass,
    public ignoreSearch: boolean = false
  ) {
    this.director = new Director();
    this.director.setBuilder(new MenuItemBuilder());
    this.eventManager = new EventManager();
    this.eventListener = new UIManagerListener(this);
    this.eventManager.subscribe(EventType.UPDATE_FIELD, this.eventListener);
  }

  public onMapDataHandler: OnMapDataHandler;
  public onEditMappingHandler: OnEditMappingHandler;
  private director: Director;
  public eventManager: EventManager;
  public eventListener: UIManagerListener;

  private getKeyFromProperty(property: Prototypes.Controls.Property) {
    return `${property?.property}-${property?.field?.toString()}`;
  }

  public searchInput(options: InputTextOptions = {}) {
    return (
      <TextField
        styles={{
          ...(defaultStyle as any),
          field: {
            ...defaultStyle.field,
            height: null,
            padding: "unset",
          },
          root: {
            marginBottom: 5,
            marginTop: 5,
          },
          prefix: {
            backgroundColor: "unset",
          },
        }}
        placeholder={options.placeholder}
        label={options.label}
        disabled={options.disabled}
        onRenderLabel={labelRender}
        onChange={(event, value) => {
          let newValue = "";
          if (value?.length > 0) {
            newValue = value.trim();
          }
          this.store.dispatcher.dispatch(new Actions.SearchUpdated(newValue));
        }}
        type="text"
        underlined={options.underline ?? false}
        borderless={options.borderless ?? false}
        style={options.styles}
        prefix=""
        onRenderPrefix={() => {
          return <FontIcon aria-label="Search" iconName="Search" />;
        }}
        autoComplete="off"
        defaultValue={this.store.searchString}
      />
    );
  }

  public searchWrapper(
    options: SearchWrapperOptions,
    ...widgets: JSX.Element[]
  ) {
    const searchStings = options.searchPattern;
    const searchString = this.store.searchString;
    if (searchString?.length != 0 && searchStings.length >= 0) {
      if (
        !searchStings.some(
          (value) =>
            value && value?.toUpperCase().includes(searchString?.toUpperCase())
        )
      ) {
        return;
      }
    }

    return (
      <>
        {widgets.map((x, id) => (
          <React.Fragment key={`search-${id}-${getRandomNumber()}`}>
            {Array.isArray(x)
              ? x.map((w) => (
                  <React.Fragment key={`search-${id}-${getRandomNumber()}`}>
                    {w}
                  </React.Fragment>
                ))
              : x}
          </React.Fragment>
        ))}
      </>
    );
  }

  public mappingEditor(
    name: string,
    attribute: string,
    options: Prototypes.Controls.MappingEditorOptions
  ): JSX.Element {
    const searchSections = Array.isArray(options.searchSection)
      ? options.searchSection
      : [options.searchSection];
    if (!this.shouldDrawComponent([name, ...searchSections])) {
      return;
    }

    const objectClass = this.objectClass;
    const info = objectClass.attributes[attribute];
    if (options.defaultValue == null) {
      options.defaultValue = info.defaultValue;
    }
    options.acceptLinksTable = options.acceptLinksTable ?? false;
    const openMapping =
      options.openMapping || attribute === this.store.currentAttributeFocus;
    if (openMapping) {
      setTimeout(() => {
        document
          .querySelectorAll(".ms-GroupHeader-expand")
          .forEach((expand: HTMLButtonElement) => {
            if (expand.querySelector("i").classList.contains("is-collapsed")) {
              expand.click();
            }
          });
        this.store.dispatcher.dispatch(new Actions.FocusToMarkAttribute(null));
      }, 0);
    }

    return (
      <FluentMappingEditor
        key={name + attribute}
        store={this.store}
        parent={this}
        attribute={attribute}
        type={info.type}
        options={{
          ...options,
          label: name,
          openMapping,
        }}
      />
    );
  }

  public getAttributeMapping(attribute: string) {
    return this.objectClass.object.mappings[attribute];
  }

  public getPropertyValue(property: Prototypes.Controls.Property) {
    const prop = this.objectClass.object.properties[property.property];
    let value: Specification.AttributeValue;
    if (property.field != null) {
      value = getField(prop, property.field);
    } else {
      value = prop;
    }
    return value;
  }

  private getDateFormat(property: Prototypes.Controls.Property) {
    try {
      const prop = this.objectClass.object.properties[property.property] as any;
      const expressionString: string = prop.expression;
      const expression = TextExpression.Parse(`\${${expressionString}}`);
      // const table = this.store.chartManager.dataflow.getTable((this.objectClass.object as any).table);
      const functionCallpart = expression.parts.find((part) => {
        if (part.expression instanceof FunctionCall) {
          return part.expression.args.find(
            (arg) => arg instanceof Variable
          ) as any;
        }
      }).expression as FunctionCall;
      if (functionCallpart) {
        const variable = functionCallpart.args.find(
          (arg) => arg instanceof Variable
        ) as Variable;
        const columnName = variable.name;
        const tableName = (this.objectClass.object as any).table;
        const table = this.store.dataset.tables.find(
          (table) => table.name === tableName
        );
        const column = table.columns.find(
          (column) => column.name === columnName
        );
        if (column.metadata.format) {
          return column.metadata.format;
        }
        const rawColumnName = column.metadata.rawColumnName;
        if (
          rawColumnName &&
          (column.metadata.kind === Specification.DataKind.Temporal ||
            column.type === Specification.DataType.Boolean)
        ) {
          const value = (
            table.rows[0][rawColumnName] || refineColumnName(rawColumnName)
          ).toString();
          return getDateFormat(value);
        }
      }
    } catch (ex) {
      console.warn(ex);
      return null;
    }

    return null;
  }

  public emitSetProperty(
    property: Prototypes.Controls.Property,
    value: Specification.AttributeValue
  ) {
    new Actions.SetObjectProperty(
      this.objectClass.object,
      property.property,
      property.field,
      value,
      property.noUpdateState,
      property.noComputeLayout
    ).dispatch(this.store.dispatcher);
  }

  public emitUpdateProperty(
    event: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>,
    property: Prototypes.Controls.Property,
    prevKey: string,
    newKey: string
  ) {
    event.preventDefault();
    event.stopPropagation();
    const validatedKey = newKey.length === 0 ? " " : newKey;
    const oldPropertyValue = this.getPropertyValue(property) as Record<
      string,
      unknown
    >;
    const changedValue: Record<string, unknown> = oldPropertyValue;
    const newValue = Object.keys(changedValue).reduce(
      (obj: Record<string, unknown>, key) => {
        obj[key === prevKey ? validatedKey : key] = oldPropertyValue[key];
        return obj;
      },
      {}
    );
    new Actions.SetObjectProperty(
      this.objectClass.object,
      property.property,
      property.field,
      newValue as Specification.AttributeMap,
      property.noUpdateState,
      property.noComputeLayout
    ).dispatch(this.store.dispatcher);
  }

  public inputFormat(
    property: Prototypes.Controls.Property,
    options: Prototypes.Controls.InputFormatOptions = {}
  ) {
    const searchSections = Array.isArray(options.searchSection)
      ? options.searchSection
      : [options.searchSection];
    if (!this.shouldDrawComponent([options.label, ...searchSections])) {
      return;
    }
    return (
      <FluentInputFormat
        label={options.label}
        defaultValue={this.getPropertyValue(property) as string}
        validate={(value: string) => {
          if (value && value.trim() !== "") {
            try {
              getFormat()(value?.replace(tickFormatParserExpression(), "$1"));
              return {
                pass: true,
                formatted: value,
              };
            } catch (ex) {
              try {
                applyDateFormat(
                  new Date(),
                  value?.replace(tickFormatParserExpression(), "$1")
                );
                return {
                  pass: true,
                  formatted: value,
                };
              } catch (ex) {
                return {
                  pass: false,
                  error: strings.objects.invalidFormat,
                };
              }
            }
          }
          return {
            pass: true,
          };
        }}
        placeholder={options.blank || strings.core.none}
        onEnter={(value: string) => {
          if (!value || value.trim() == "") {
            this.emitSetProperty(property, null);
          } else {
            this.emitSetProperty(property, value);
          }
          return true;
        }}
        allowNull={options.allowNull}
      />
    );
  }

  public inputNumber(
    property: Prototypes.Controls.Property,
    options: Prototypes.Controls.InputNumberOptions = {}
  ) {
    const searchSections = Array.isArray(options.searchSection)
      ? options.searchSection
      : [options.searchSection];
    if (
      !options.ignoreSearch &&
      !this.shouldDrawComponent([options.label, ...searchSections])
    ) {
      return;
    }
    const value = this.getPropertyValue(property) as number;
    return (
      <FluentInputNumber
        {...options}
        key={this.getKeyFromProperty(property)}
        defaultValue={value}
        placeholder={options.placeholder}
        onEnter={(value) => {
          if (value == null) {
            this.emitSetProperty(property, null);
          } else {
            this.emitSetProperty(property, value);
          }
          if (options.observerConfig?.isObserver) {
            if (options.observerConfig?.properties instanceof Array) {
              options.observerConfig?.properties.forEach((property) =>
                this.eventManager.notify(
                  EventType.UPDATE_FIELD,
                  property,
                  options.observerConfig?.value
                )
              );
            } else {
              this.eventManager.notify(
                EventType.UPDATE_FIELD,
                options.observerConfig?.properties,
                options.observerConfig?.value
              );
            }
          }
          return true;
        }}
      />
    );
  }

  public inputDate(
    property: Prototypes.Controls.Property,
    options: Prototypes.Controls.InputDateOptions = {}
  ) {
    const searchSections = Array.isArray(options.searchSection)
      ? options.searchSection
      : [options.searchSection];
    if (
      !options.ignoreSearch &&
      !this.shouldDrawComponent([options.label, ...searchSections])
    ) {
      return;
    }
    const value = this.getPropertyValue(property) as number;
    const format = this.getDateFormat(property) as string;

    return (
      <FluentDatePickerWrapper>
        <DatePicker
          key={this.getKeyFromProperty(property)}
          firstDayOfWeek={DayOfWeek.Sunday}
          placeholder={options.placeholder}
          ariaLabel={options.placeholder}
          defaultValue={format}
          value={new Date(value)}
          label={options.label}
          onSelectDate={(value: Date) => {
            if (value == null) {
              this.emitSetProperty(property, null);
              return true;
            } else {
              this.emitSetProperty(property, value as any);
              return true;
            }
          }}
        />
      </FluentDatePickerWrapper>
    );
  }

  public inputText(
    property: Prototypes.Controls.Property,
    options: InputTextOptions
  ) {
    const searchSections = Array.isArray(options.searchSection)
      ? options.searchSection
      : [options.searchSection];
    if (
      !options.ignoreSearch &&
      !this.shouldDrawComponent([options.label, ...searchSections])
    ) {
      return;
    }
    let prevKey: string = options.value ?? "";
    return (
      <TextField
        styles={{
          ...(defaultStyle as any),
          field: {
            ...defaultStyle.field,
            height: null,
          },
        }}
        key={this.getKeyFromProperty(property)}
        value={
          options.value
            ? options.value
            : (this.getPropertyValue(property) as string)
        }
        placeholder={options.placeholder}
        label={options.label}
        disabled={options.disabled}
        onRenderLabel={labelRender}
        onChange={(event, value) => {
          options.updateProperty
            ? this.emitUpdateProperty(event, property, prevKey, value)
            : this.emitSetProperty(property, value);
          prevKey = value;
          if (options.emitMappingAction) {
            new Actions.SetCurrentMappingAttribute(value).dispatch(
              this.store.dispatcher
            );
          }
        }}
        onClick={() => {
          if (options.emitMappingAction) {
            new Actions.SetCurrentMappingAttribute(prevKey).dispatch(
              this.store.dispatcher
            );
          }
        }}
        type="text"
        underlined={options.underline ?? false}
        borderless={options.borderless ?? false}
        style={options.styles}
      />
    );
  }

  public inputFontFamily(
    property: Prototypes.Controls.Property,
    options: InputFontComboboxOptions
  ) {
    const searchSections = Array.isArray(options.searchSection)
      ? options.searchSection
      : [options.searchSection];
    if (!this.shouldDrawComponent([options.label, ...searchSections])) {
      return;
    }
    return (
      <FluentComboBoxFontFamily
        key={this.getKeyFromProperty(property)}
        label={options.label}
        defaultValue={this.getPropertyValue(property) as string}
        onEnter={(value) => {
          this.emitSetProperty(property, value);
          return true;
        }}
      />
    );
  }

  public inputComboBox(
    property: Prototypes.Controls.Property,
    options: Prototypes.Controls.InputComboboxOptions
  ) {
    const searchSections = Array.isArray(options.searchSection)
      ? options.searchSection
      : [options.searchSection];
    if (!this.shouldDrawComponent([options.label, ...searchSections])) {
      return;
    }
    return (
      <ComboBox
        styles={defaultStyle as any}
        key={this.getKeyFromProperty(property)}
        selectedKey={this.getPropertyValue(property) as string}
        label={options.label}
        autoComplete="on"
        options={options.defaultRange.map((rangeValue) => {
          return {
            key: rangeValue,
            text: rangeValue,
          };
        })}
        onChange={(event, value) => {
          this.emitSetProperty(property, value.key);
          return true;
        }}
      />
    );
  }

  public inputSelect(
    property: Prototypes.Controls.Property,
    options: Prototypes.Controls.InputSelectOptions
  ) {
    const searchSections = Array.isArray(options.searchSection)
      ? options.searchSection
      : [options.searchSection];
    if (
      !options.ignoreSearch &&
      !this.shouldDrawComponent([options.label, ...searchSections])
    ) {
      return;
    }
    const theme = getTheme();
    const isLocalIcons = options.isLocalIcons ?? false;
    if (options.type == "dropdown") {
      return (
        <Dropdown
          key={`${this.getKeyFromProperty(property)}-${options.label}-${
            options.type
          }`}
          selectedKey={this.getPropertyValue(property) as string}
          defaultValue={this.getPropertyValue(property) as string}
          label={options.label}
          onRenderLabel={labelRender}
          onRenderOption={onRenderOption}
          onRenderTitle={onRenderTitle}
          options={options.options.map((rangeValue, index) => {
            return {
              key: rangeValue,
              text: options.labels[index],
              data: {
                icon: options.icons?.[index],
                iconStyles: {
                  stroke: "gray",
                },
                isLocalIcons,
              },
            };
          })}
          onChange={(event, value) => {
            this.emitSetProperty(property, value.key);
            this.defaultNotification(options.observerConfig);
            if (options.onChange) {
              options.onChange(value);
            }
            return true;
          }}
          styles={{
            ...defaultStyle,
            ...dropdownStyles(options),
          }}
        />
      );
    } else {
      return (
        <React.Fragment
          key={`${this.getKeyFromProperty(property)}-${options.label}-${
            options.type
          }`}
        >
          {options.label && options.label.length > 0 ? (
            <Label styles={defaultLabelStyle}>{options.label}</Label>
          ) : null}
          {options.options.map((option, index) => {
            return (
              <IconButton
                key={`${this.getKeyFromProperty(property)}-${options.label}-${
                  options.type
                }-${index}`}
                iconProps={{
                  iconName: options.icons[index],
                }}
                style={{
                  stroke: `${theme.palette.themePrimary} !important`,
                }}
                styles={{
                  label: null,
                  root: {
                    minWidth: "unset",
                    ...defaultBindButtonSize,
                  },
                }}
                title={options.labels[index]}
                checked={option === (this.getPropertyValue(property) as string)}
                onClick={() => {
                  this.emitSetProperty(property, option);
                }}
              />
            );
          })}
        </React.Fragment>
      );
    }
  }

  public inputBoolean(
    properties: Prototypes.Controls.Property | Prototypes.Controls.Property[],
    options: Prototypes.Controls.InputBooleanOptions
  ) {
    const searchSections = Array.isArray(options.searchSection)
      ? options.searchSection
      : [options.searchSection];
    if (
      !options.ignoreSearch &&
      !this.shouldDrawComponent([
        options.label,
        options.headerLabel,
        ...searchSections,
      ])
    ) {
      return;
    }
    const property: Prototypes.Controls.Property =
      properties instanceof Array ? properties[0] : properties;
    switch (options.type) {
      case "checkbox-fill-width":
      case "checkbox": {
        return (
          <React.Fragment key={this.getKeyFromProperty(property)}>
            {options.headerLabel ? (
              <Label styles={defaultLabelStyle}>{options.headerLabel}</Label>
            ) : null}
            <FluentCheckbox style={options.styles}>
              <Checkbox
                checked={this.getPropertyValue(property) as boolean}
                label={options.label}
                styles={{
                  label: defaultLabelStyle,
                  root: {
                    ...defaultComponentsHeight,
                  },
                  ...options.checkBoxStyles,
                }}
                onChange={(ev, v) => {
                  if (properties instanceof Array) {
                    properties.forEach((property) =>
                      this.emitSetProperty(property, v)
                    );
                  } else {
                    this.emitSetProperty(property, v);
                  }
                  this.defaultNotification(options.observerConfig);
                  if (options.onChange && !v) {
                    options.onChange(v);
                  }
                }}
              />
            </FluentCheckbox>
          </React.Fragment>
        );
      }
      case "highlight": {
        return (
          <IconButton
            key={this.getKeyFromProperty(property)}
            iconProps={{
              iconName: options.icon,
            }}
            title={options.label}
            label={options.label}
            styles={{
              ...defaultBindButtonSize,
              label: defaultLabelStyle,
              root: {
                minWidth: "unset",
                ...defaultBindButtonSize,
              },
            }}
            text={options.label}
            ariaLabel={options.label}
            checked={this.getPropertyValue(property) as boolean}
            onClick={() => {
              this.defaultNotification(options.observerConfig);
              const v = this.getPropertyValue(property) as boolean;
              this.emitSetProperty(property, !v);
            }}
          />
        );
      }
    }
  }

  private defaultNotification(observerConfig: ObserverConfig) {
    if (observerConfig?.isObserver) {
      if (observerConfig?.properties instanceof Array) {
        observerConfig?.properties.forEach((property) =>
          this.eventManager.notify(
            EventType.UPDATE_FIELD,
            property,
            observerConfig?.value
          )
        );
      } else {
        this.eventManager.notify(
          EventType.UPDATE_FIELD,
          observerConfig?.properties,
          observerConfig?.value
        );
      }
    }
  }

  public inputExpression(
    property: Prototypes.Controls.Property,
    options: Prototypes.Controls.InputExpressionOptions = {}
  ) {
    const searchSections = Array.isArray(options.searchSection)
      ? options.searchSection
      : [options.searchSection];
    if (
      !options.ignoreSearch &&
      !this.shouldDrawComponent([options.label, ...searchSections])
    ) {
      return;
    }
    const value = this.getPropertyValue(property) as string;

    const inputExpression = (
      <FluentInputExpression
        key={this.getKeyFromProperty(property)}
        label={options.label}
        value={value}
        defaultValue={value}
        validate={(value) => {
          if (value && value.trim() !== "") {
            return this.store.verifyUserExpressionWithTable(
              value,
              options.table
            );
          }
          return {
            pass: true,
          };
        }}
        placeholder={options.placeholder ?? strings.core.none}
        onEnter={(value) => {
          if (!value || value.trim() == "") {
            this.emitSetProperty(property, null);
          } else {
            this.emitSetProperty(property, value);
            this.store.updateDataAxes();
            this.store.updatePlotSegments();
          }
          return true;
        }}
        allowNull={options.allowNull}
      />
    );

    if (options.dropzone) {
      const className = options.noLineHeight
        ? "charticulator__widget-section-header-no-height charticulator__widget-section-header-dropzone"
        : "charticulator__widget-section-header charticulator__widget-section-header-dropzone";
      return (
        <DropZoneView
          key={options.label}
          filter={(data) => data instanceof DragData.DataExpression}
          onDrop={(data: DragData.DataExpression) => {
            if (options.dropzone.type === "axis-data-binding") {
              new Actions.BindDataToAxis(
                this.objectClass.object as Specification.PlotSegment,
                options.dropzone.property,
                null,
                data,
                true
              ).dispatch(this.store.dispatcher);
            } else {
              let newValue = data.expression;
              try {
                if (data.metadata?.columnName) {
                  if (data.metadata?.columnName.split(" ").length > 1) {
                    newValue = "`" + data.metadata?.columnName + "`";
                  } else {
                    newValue = data.metadata?.columnName;
                  }
                } else {
                  newValue = data.expression;
                }
                this.emitSetProperty(property, newValue);
              } catch (ex) {
                //put data.expression value
                this.emitSetProperty(property, newValue);
              }
            }
          }}
          className={className}
          draggingHint={() => (
            <span className="el-dropzone-hint">{options.dropzone?.prompt}</span>
          )}
        >
          {inputExpression}
        </DropZoneView>
      );
    } else {
      return inputExpression;
    }
  }

  public inputColor(
    property: Prototypes.Controls.Property,
    options: Prototypes.Controls.InputColorOptions
  ): JSX.Element {
    const searchSections = Array.isArray(options.searchSection)
      ? options.searchSection
      : [options.searchSection];
    if (!this.shouldDrawComponent([options.label, ...searchSections])) {
      return;
    }
    const color = this.getPropertyValue(property) as Color;
    return (
      <FluentInputColor
        key={this.getKeyFromProperty(property)}
        label={options.label}
        store={this.store}
        defaultValue={color}
        allowNull={options.allowNull}
        noDefaultMargin={options.noDefaultMargin}
        labelKey={options.labelKey}
        onEnter={(value) => {
          this.emitSetProperty(property, value);
          return true;
        }}
        width={options.width}
        underline={options.underline}
        pickerBeforeTextField={options.pickerBeforeTextField}
        styles={options.styles}
      />
    );
  }

  public inputColorGradient(
    property: Prototypes.Controls.Property,
    inline: boolean = false
  ): JSX.Element {
    //aAAAA
    const gradient = (this.getPropertyValue(property) as any) as ColorGradient;
    if (inline) {
      return (
        <span className="charticulator__widget-control-input-color-gradient-inline">
          <FluentUIGradientPicker
            key={this.getKeyFromProperty(property)}
            defaultValue={gradient}
            onPick={(value: any) => {
              this.emitSetProperty(property, value);
            }}
          />
        </span>
      );
    } else {
      return (
        <InputColorGradient
          key={this.getKeyFromProperty(property)}
          defaultValue={gradient}
          onEnter={(value: any) => {
            this.emitSetProperty(property, value);
            return true;
          }}
        />
      );
    }
  }

  public inputImage(property: Prototypes.Controls.Property) {
    return (
      <InputImage
        key={this.getKeyFromProperty(property)}
        value={this.getPropertyValue(property) as Specification.Types.Image}
        onChange={(image) => {
          this.emitSetProperty(property, image as Specification.Types.Image);
          return true;
        }}
      />
    );
  }

  public inputImageProperty(property: Prototypes.Controls.Property) {
    return (
      <InputImageProperty
        key={this.getKeyFromProperty(property)}
        value={this.getPropertyValue(property) as Specification.Types.Image}
        onChange={(image) => {
          this.emitSetProperty(property, image as Specification.Types.Image);
          return true;
        }}
      />
    );
  }

  public clearButton(
    property: Prototypes.Controls.Property,
    icon?: string,
    isHeader?: boolean,
    styles?: CSSProperties
  ) {
    return (
      <FluentButton
        key={this.getKeyFromProperty(property)}
        marginTop={isHeader ? "0px" : null}
        style={styles}
      >
        <DefaultButton
          styles={{
            root: {
              minWidth: "unset",
              ...defaultBindButtonSize,
            },
          }}
          iconProps={{
            iconName: icon || "EraseTool",
          }}
          onClick={() => {
            this.emitSetProperty(property, null);
          }}
        />
      </FluentButton>
    );
  }

  public setButton(
    property: Prototypes.Controls.Property,
    value: Specification.AttributeValue,
    icon?: string,
    text?: string
  ) {
    if (!this.shouldDrawComponent([text])) {
      return;
    }
    return (
      <DefaultButton
        key={this.getKeyFromProperty(property)}
        iconProps={{
          iconName: icon,
        }}
        text={text}
        onClick={() => {
          this.emitSetProperty(property, value);
        }}
      />
    );
  }

  public scaleEditor(attribute: string, text: string) {
    if (!this.shouldDrawComponent([text])) {
      return;
    }
    let mappingButton: Element = null;

    const objectClass = this.objectClass;
    const mapping = objectClass.object.mappings[attribute] as ScaleMapping;

    const scaleObject = getById(this.store.chart.scales, mapping.scale);

    return (
      <ButtonRaised
        key={attribute}
        ref={(e) => (mappingButton = ReactDOM.findDOMNode(e) as Element)}
        text={text}
        onClick={() => {
          globals.popupController.popupAt(
            (context) => {
              return (
                <PopupView context={context}>
                  <ScaleValueSelector
                    scale={scaleObject}
                    scaleMapping={mapping}
                    store={this.store}
                  />
                </PopupView>
              );
            },
            { anchor: mappingButton }
          );
        }}
      />
    );
  }

  public orderByWidget(
    property: Prototypes.Controls.Property,
    options: Prototypes.Controls.OrderWidgetOptions
  ) {
    const onClick = (value: DataFieldSelectorValue) => {
      if (value != null) {
        this.emitSetProperty(property, {
          expression: value.expression,
        });
      } else {
        this.emitSetProperty(property, null);
      }
    };

    let currentExpression: string = null;
    const currentSortBy = this.getPropertyValue(
      property
    ) as Specification.Types.SortBy;
    if (currentSortBy != null) {
      currentExpression = currentSortBy.expression;
    }

    const defaultValue: IDefaultValue = currentExpression
      ? { table: options.table, expression: currentExpression }
      : null;

    const menu = this.director.buildSectionHeaderFieldsMenu(
      onClick,
      defaultValue,
      this.store
    );
    const menuRender = this.director.getMenuRender();

    return (
      <DropZoneView
        key={this.getKeyFromProperty(property)}
        filter={(data) => data instanceof DragData.DataExpression}
        onDrop={(data: DragData.DataExpression) => {
          this.emitSetProperty(property, { expression: data.expression });
        }}
        className={""}
      >
        <FluentButton marginTop={"0px"}>
          <IconButton
            styles={{
              root: {
                minWidth: "unset",
                ...defaultBindButtonSize,
              },
              label: null,
            }}
            key={property.property}
            checked={this.getPropertyValue(property) != null}
            iconProps={{
              iconName: "SortLines",
            }}
            menuProps={{
              items: menu,
              gapSpace: options.shiftCallout ? options.shiftCallout : 0,
              onMenuOpened: () => {
                FluentMappingEditor.openEditor(currentExpression, false, null);
              },
              onRenderMenuList: menuRender,
            }}
          />
        </FluentButton>
      </DropZoneView>
    );
  }

  public reorderWidget(
    property: Prototypes.Controls.Property,
    options: Prototypes.Controls.ReOrderWidgetOptions = {}
  ): JSX.Element {
    let container: HTMLSpanElement;
    return (
      <FluentButton
        ref={(e) => (container = e)}
        key={this.getKeyFromProperty(property)}
        marginTop={"1px"}
        paddingRight={"0px"}
      >
        <DefaultButton
          styles={{
            root: {
              minWidth: "unset",
              ...defaultComponentsHeight,
            },
          }}
          iconProps={{
            iconName: "SortLines",
          }}
          onClick={() => {
            globals.popupController.popupAt(
              (context) => {
                const items = options.items
                  ? options.items
                  : (this.getPropertyValue(property) as string[]);
                return (
                  <PopupView context={context}>
                    <FluentUIReorderStringsValue
                      items={items}
                      onConfirm={(items, customOrder, sortOrder) => {
                        this.emitSetProperty(property, items);
                        if (customOrder) {
                          this.emitSetProperty(
                            {
                              property: property.property,
                              field: "orderMode",
                            },
                            OrderMode.order
                          );
                          this.emitSetProperty(
                            {
                              property: property.property,
                              field: "order",
                            },
                            items
                          );
                        } else {
                          if (sortOrder) {
                            this.emitSetProperty(
                              {
                                property: property.property,
                                field: "orderMode",
                              },
                              OrderMode.alphabetically
                            );
                          } else {
                            this.emitSetProperty(
                              {
                                property: property.property,
                                field: "orderMode",
                              },
                              OrderMode.order
                            );
                            this.emitSetProperty(
                              {
                                property: property.property,
                                field: "order",
                              },
                              items
                            );
                          }
                        }
                        context.close();
                      }}
                      onReset={() => {
                        const axisDataBinding = {
                          ...(this.objectClass.object.properties[
                            property.property
                          ] as any),
                        };

                        axisDataBinding.table = this.store.chartManager.getTable(
                          (this.objectClass.object as any).table
                        );
                        axisDataBinding.metadata = {
                          kind: axisDataBinding.dataKind,
                          orderMode: "order",
                        };

                        const groupBy: Specification.Types.GroupBy = this.store.getGroupingExpression(
                          this.objectClass.object
                        );
                        const values = this.store.chartManager.getGroupedExpressionVector(
                          (this.objectClass.object as any).table,
                          groupBy,
                          axisDataBinding.expression
                        );

                        const {
                          categories,
                        } = this.store.getCategoriesForDataBinding(
                          axisDataBinding.metadata,
                          axisDataBinding.type,
                          values
                        );
                        return categories;
                      }}
                      {...options}
                    />
                  </PopupView>
                );
              },
              { anchor: container }
            );
          }}
        />
      </FluentButton>
    );
  }

  public arrayWidget(
    property: Prototypes.Controls.Property,
    renderItem: (item: Prototypes.Controls.Property) => JSX.Element,
    options: Prototypes.Controls.ArrayWidgetOptions = {
      allowDelete: true,
      allowReorder: true,
    }
  ): JSX.Element {
    const items = (this.getPropertyValue(property) as any[]).slice();
    return (
      <div
        className="charticulator__widget-array-view"
        key={this.getKeyFromProperty(property)}
      >
        <ReorderListView
          enabled={options.allowReorder}
          onReorder={(dragIndex, dropIndex) => {
            ReorderListView.ReorderArray(items, dragIndex, dropIndex);
            this.emitSetProperty(property, items);
          }}
        >
          {items.map((item, index) => {
            return (
              <div
                key={index}
                className="charticulator__widget-array-view-item"
              >
                {options.allowReorder ? (
                  <span className="charticulator__widget-array-view-control charticulator__widget-array-view-order">
                    <FontIcon
                      className={mergeStyles({
                        fontSize: "20px",
                        margin: "5px",
                      })}
                      iconName={"CheckListText"}
                    />
                    {/* <SVGImageIcon url={R.getSVGIcon("general/order")} /> */}
                  </span>
                ) : null}
                <span className="charticulator__widget-array-view-content">
                  {renderItem({
                    property: property.property,
                    field: property.field
                      ? property.field instanceof Array
                        ? [...property.field, index]
                        : [property.field, index]
                      : index,
                  })}
                </span>
                {options.allowDelete ? (
                  <span className="charticulator__widget-array-view-control">
                    <FluentButton marginTop={"0px"}>
                      <DefaultButton
                        styles={{
                          root: {
                            minWidth: "unset",
                          },
                        }}
                        iconProps={{
                          iconName: "Delete",
                        }}
                        onClick={() => {
                          items.splice(index, 1);
                          this.emitSetProperty(property, items);
                        }}
                      />
                    </FluentButton>
                  </span>
                ) : null}
              </div>
            );
          })}
        </ReorderListView>
      </div>
    );
  }

  public dropTarget(
    options: Prototypes.Controls.DropTargetOptions,
    widget: JSX.Element
  ) {
    return (
      <DropZoneView
        key={this.getKeyFromProperty(options?.property) + options.label}
        filter={(data) => data instanceof DragData.DataExpression}
        onDrop={(data: DragData.DataExpression) => {
          this.emitSetProperty(options.property, {
            expression: data.expression,
          });
        }}
        className={classNames("charticulator__widget-control-drop-target")}
        draggingHint={() => (
          <span className="el-dropzone-hint">{options.label}</span>
        )}
      >
        {widget}
      </DropZoneView>
    );
  }

  // Label and text
  public icon(icon: string) {
    return (
      <span className="charticulator__widget-label" key={icon}>
        <SVGImageIcon url={R.getSVGIcon(icon)} />
      </span>
    );
  }

  public label(title: string, options?: Prototypes.Controls.LabelOptions) {
    const searchSections = Array.isArray(options?.searchSection)
      ? options?.searchSection
      : [options?.searchSection];
    if (!options?.ignoreSearch && !this.shouldDrawComponent(searchSections)) {
      return;
    }
    return (
      <FluentLabelHeader
        key={title}
        marginBottom={options?.addMargins ? "5px" : "0px"}
        marginTop={options?.addMargins ? "5px" : "0px"}
      >
        <Label styles={defaultLabelStyle}>{title}</Label>
      </FluentLabelHeader>
    );
  }

  public text(title: string, align: "left" | "center" | "right" = "left") {
    return (
      <span
        className="charticulator__widget-text"
        style={{ textAlign: align }}
        key={title + align}
      >
        {title}
      </span>
    );
  }

  public sep() {
    return <span className="charticulator__widget-sep" />;
  }

  // Layout elements
  public sectionHeader(
    title: string,
    widget?: JSX.Element,
    options: Prototypes.Controls.RowOptions = {}
  ) {
    const searchSections = Array.isArray(options.searchSection)
      ? options.searchSection
      : [options.searchSection];
    if (
      !options.ignoreSearch &&
      !this.shouldDrawComponent([title, ...searchSections])
    ) {
      return;
    }
    this.director.setBuilder(new MenuItemBuilder());
    if (options.dropzone && options.dropzone.type == "axis-data-binding") {
      const current = this.getPropertyValue({
        property: options.dropzone.property,
      }) as Specification.Types.AxisDataBinding;

      const onClick = (value: DataFieldSelectorValue) => {
        if (!value) {
          this.emitSetProperty({ property: options.dropzone.property }, null);
        } else {
          const data = new DragData.DataExpression(
            this.store.getTable(value.table),
            value.expression,
            value.type,
            value.metadata,
            value.rawExpression
          );
          new Actions.BindDataToAxis(
            this.objectClass.object as Specification.PlotSegment,
            options.dropzone.property,
            null,
            data,
            false
          ).dispatch(this.store.dispatcher);
        }
      };
      const defaultValue: IDefaultValue =
        current && current.expression
          ? { table: null, expression: current.expression }
          : null;

      const menu = this.director.buildSectionHeaderFieldsMenu(
        onClick,
        defaultValue,
        this.store
      );
      const menuRender = this.director.getMenuRender();

      const className = options.noLineHeight
        ? "charticulator__widget-section-header-no-height charticulator__widget-section-header-dropzone"
        : "charticulator__widget-section-header charticulator__widget-section-header-dropzone";

      const acceptTables = getDropzoneAcceptTables(
        this as FluentUIWidgetManager,
        options.acceptLinksTable ?? false
      );
      return (
        <DropZoneView
          key={title}
          filter={(data) => {
            if (
              acceptTables.length > 0 &&
              !acceptTables.includes(data.table?.name)
            ) {
              return false;
            }
            return data instanceof DragData.DataExpression;
          }}
          onDrop={(data: DragData.DataExpression) => {
            new Actions.BindDataToAxis(
              this.objectClass.object as Specification.PlotSegment,
              options.dropzone.property,
              null,
              data,
              true
            ).dispatch(this.store.dispatcher);
          }}
          className={className}
          draggingHint={() => (
            <span className="el-dropzone-hint">{options.dropzone.prompt}</span>
          )}
        >
          {title ? (
            <FluentLabelHeader>
              <Label>{title}</Label>
            </FluentLabelHeader>
          ) : null}
          {widget}
          <FluentButton marginTop={"0px"} marginLeft={"6px"}>
            <DefaultButton
              key={title}
              iconProps={{
                iconName: "Link",
              }}
              menuProps={{
                items: menu,
                onRenderMenuList: menuRender,
              }}
              styles={{
                menuIcon: {
                  display: "none !important",
                },
                root: {
                  minWidth: "unset",
                  ...defaultBindButtonSize,
                },
              }}
            />
          </FluentButton>
        </DropZoneView>
      );
    } else {
      return (
        <div className="charticulator__widget-section-header">
          <FluentLabelHeader>
            <Label>{title}</Label>
          </FluentLabelHeader>
          {widget}
        </div>
      );
    }
  }

  public horizontal(cols: number[], ...widgets: JSX.Element[]) {
    return (
      <div className="charticulator__widget-horizontal" key="widget-horizontal">
        {widgets.map((x, id) => (
          <span
            className={`el-layout-item el-layout-item-col-${cols[id]}`}
            key={`horizontal-${id}`}
          >
            {x}
          </span>
        ))}
      </div>
    );
  }

  public styledHorizontal(
    styles: CSSProperties,
    cols: number[],
    ...widgets: JSX.Element[]
  ) {
    return (
      <div className="charticulator__widget-horizontal" style={styles}>
        {widgets.map((x, id) => (
          <span
            className={`el-layout-item el-layout-item-col-${cols[id]}`}
            key={id}
          >
            {x}
          </span>
        ))}
      </div>
    );
  }

  public filterEditor(
    options: Prototypes.Controls.FilterEditorOptions
  ): JSX.Element {
    const filterText = strings.filter.filterBy;
    const searchSections = Array.isArray(options.searchSection)
      ? options.searchSection
      : [options.searchSection];
    if (
      !options.ignoreSearch &&
      !this.shouldDrawComponent([
        filterText,
        ...searchSections,
        strings.objects.axes.data,
      ])
    ) {
      return;
    }
    return (
      <FilterPanel
        key={options.key}
        options={{
          ...options,
        }}
        text={filterText}
        manager={this}
      />
    );
  }

  public groupByEditor(
    options: Prototypes.Controls.GroupByEditorOptions
  ): JSX.Element {
    let button: HTMLElement;
    let text = strings.objects.plotSegment.groupBy;
    const searchSections = Array.isArray(options.searchSection)
      ? options.searchSection
      : [options.searchSection];
    if (
      !options.ignoreSearch &&
      !this.shouldDrawComponent([
        text,
        ...searchSections,
        strings.objects.axes.data,
      ])
    ) {
      return;
    }
    const getControl = () => {
      switch (options.mode) {
        case PanelMode.Button:
          if (options.value) {
            if (options.value.expression) {
              text =
                strings.objects.plotSegment.groupByCategory +
                options.value.expression;
            }
          }
          return (
            <FluentButton
              marginTop={"0px"}
              key={
                this.getKeyFromProperty(options.target?.property) +
                options?.table +
                options?.value
              }
            >
              <DefaultButton
                styles={{
                  root: {
                    minWidth: "unset",
                    ...defaultComponentsHeight,
                  },
                }}
                text={text}
                elementRef={(e) => (button = e)}
                iconProps={{
                  iconName: "RowsGroup",
                }}
                onClick={() => {
                  globals.popupController.popupAt(
                    (context) => {
                      return (
                        <PopupView context={context}>
                          <GroupByEditor
                            manager={this}
                            value={options.value}
                            options={options}
                          />
                        </PopupView>
                      );
                    },
                    { anchor: button as Element }
                  );
                }}
              />
            </FluentButton>
          );
        case PanelMode.Panel:
          return (
            <GroupByEditor
              key={
                this.getKeyFromProperty(options?.target?.property) +
                options.table +
                options?.value
              }
              manager={this}
              value={options.value}
              options={options}
            />
          );
      }
    };

    return (
      <div
        key={options.key}
        style={{ display: "inline" }}
        ref={(e) => (button = e)}
      >
        {getControl()}
      </div>
    );
  }

  public nestedChartEditor(
    property: Prototypes.Controls.Property,
    options: Prototypes.Controls.NestedChartEditorOptions
  ) {
    const editNestedChartText = strings.menuBar.editNestedChart;
    const importTemplate = strings.menuBar.importTemplate;
    const searchSections = Array.isArray(options.searchSection)
      ? options.searchSection
      : [options.searchSection];
    if (
      !this.shouldDrawComponent([
        editNestedChartText,
        importTemplate,
        ...searchSections,
      ])
    ) {
      return;
    }
    return (
      <React.Fragment key={this.getKeyFromProperty(property)}>
        {this.vertical(
          <NestedChartButtonsWrapper>
            <ButtonRaised
              text={editNestedChartText}
              onClick={() => {
                this.store.dispatcher.dispatch(
                  new OpenNestedEditor(
                    this.objectClass.object,
                    property,
                    options
                  )
                );
              }}
            />
          </NestedChartButtonsWrapper>,
          <NestedChartButtonsWrapper>
            <ButtonRaised
              text={importTemplate}
              onClick={async () => {
                const file = await showOpenFileDialog(["tmplt", "json"]);
                const str = await readFileAsString(file);
                const data = JSON.parse(str);
                const template = new ChartTemplate(data);
                for (const table of options.dataset.tables) {
                  const tTable = template.getDatasetSchema()[0];
                  template.assignTable(tTable.name, table.name);
                  for (const column of tTable.columns) {
                    template.assignColumn(
                      tTable.name,
                      column.name,
                      column.name
                    );
                  }
                }
                const instance = template.instantiate(
                  options.dataset,
                  false // no scale inference
                );
                this.emitSetProperty(property, instance.chart as any);
              }}
            />
          </NestedChartButtonsWrapper>
        )}
      </React.Fragment>
    );
  }

  public row(title?: string, widget?: JSX.Element) {
    return (
      <div className="charticulator__widget-row" key={title}>
        {title != null ? (
          <span className="charticulator__widget-row-label el-layout-item">
            {title}
          </span>
        ) : // <Label>{title}</Label>
        null}
        {widget}
      </div>
    );
  }

  public vertical(...widgets: JSX.Element[]) {
    return (
      <div className="charticulator__widget-vertical">
        {widgets.map((x, id) => (
          <span className="el-layout-item" key={id}>
            {x}
          </span>
        ))}
      </div>
    );
  }

  public styledVertical(styles: CSSProperties, ...widgets: JSX.Element[]) {
    return (
      <div className="charticulator__widget-vertical" style={styles}>
        {widgets.map((x, id) => (
          <span className="el-layout-item" key={id}>
            {x}
          </span>
        ))}
      </div>
    );
  }

  public verticalGroup(
    options: Prototypes.Controls.VerticalGroupOptions,
    widgets: JSX.Element[]
  ) {
    if (
      widgets.filter((widget) => (Array.isArray(widget) ? widget?.[0] : widget))
        .length == 0
    ) {
      return null;
    }
    return (
      <div>
        <CollapsiblePanel
          header={options.header}
          widgets={widgets}
          isCollapsed={options.isCollapsed}
          alignVertically={options.alignVertically}
          store={this.store}
        />
      </div>
    );
  }

  public table(rows: JSX.Element[][]): JSX.Element {
    return (
      <table className="charticulator__widget-table">
        <tbody>
          {rows.map((row, index) => (
            <tr key={index}>
              {row.map((x, i) => (
                <td key={i}>
                  <span className="el-layout-item">{x}</span>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  public scrollList(
    widgets: Prototypes.Controls.Widget[],
    options: Prototypes.Controls.ScrollListOptions = {}
  ): JSX.Element {
    return (
      <div
        className="charticulator__widget-scroll-list"
        style={{
          maxHeight: options.maxHeight ? options.maxHeight + "px" : undefined,
          height: options.height ? options.height + "px" : undefined,
        }}
      >
        {widgets.map((widget, i) => (
          <div
            className="charticulator__widget-scroll-list-item"
            key={i}
            style={options.styles}
          >
            {widget}
          </div>
        ))}
      </div>
    );
  }

  public tooltip(
    widget: JSX.Element,
    tooltipContent: JSX.Element
  ): JSX.Element {
    return <TooltipHost content={tooltipContent}>{widget}</TooltipHost>;
  }

  public customCollapsiblePanel(
    widgets: JSX.Element[],
    options: Prototypes.Controls.CustomCollapsiblePanelOptions = {}
  ): JSX.Element {
    if (
      widgets.filter((widget) => (Array.isArray(widget) ? widget?.[0] : widget))
        .length == 0
    ) {
      return null;
    }
    return (
      <CustomCollapsiblePanel
        widgets={widgets}
        styles={options.styles}
        header={options.header}
        store={this.store}
      />
    );
  }

  public reorderByAnotherColumnWidget(
    property: Prototypes.Controls.Property,
    options: Prototypes.Controls.ReOrderWidgetOptions = {}
  ): JSX.Element {
    let container: HTMLSpanElement;
    return (
      <FluentButton
        ref={(e) => (container = e)}
        key={this.getKeyFromProperty(property)}
        marginTop={"0px"}
        paddingRight={"0px"}
      >
        <DefaultButton
          styles={{
            root: {
              minWidth: "unset",
              ...defaultComponentsHeight,
            },
          }}
          iconProps={{
            iconName: "SortLines",
          }}
          onClick={() => {
            globals.popupController.popupAt(
              (context) => {
                const items = options.items
                  ? options.items
                  : (this.getPropertyValue(property) as string[]);
                return (
                  <PopupView context={context}>
                    <FluentUIReorderStringsValue
                      items={items}
                      onConfirm={(items) => {
                        this.emitSetProperty(property, items);
                        if (options.onConfirmClick) {
                          options.onConfirmClick(items);
                        }
                        this.emitSetProperty(
                          {
                            property: property.property,
                            field: "orderMode",
                          },
                          OrderMode.order
                        );
                        if (options.onConfirmClick) {
                          options.onConfirmClick(items);
                        }
                        context.close();
                      }}
                      onReset={() => {
                        if (options.onResetCategories) {
                          return options.onResetCategories;
                        }
                        const axisDataBinding = {
                          ...(this.objectClass.object.properties[
                            property.property
                          ] as any),
                        };

                        axisDataBinding.table = this.store.chartManager.getTable(
                          (this.objectClass.object as any).table
                        );
                        axisDataBinding.metadata = {
                          kind: axisDataBinding.dataKind,
                          orderMode: "order",
                        };

                        const groupBy: Specification.Types.GroupBy = this.store.getGroupingExpression(
                          this.objectClass.object
                        );
                        const values = this.store.chartManager.getGroupedExpressionVector(
                          (this.objectClass.object as any).table,
                          groupBy,
                          axisDataBinding.expression
                        );

                        const {
                          categories,
                        } = this.store.getCategoriesForDataBinding(
                          axisDataBinding.metadata,
                          axisDataBinding.type,
                          values
                        );
                        return categories;
                      }}
                      {...options}
                    />
                  </PopupView>
                );
              },
              {
                anchor: container,
                alignX:
                  this.store.editorType == EditorType.Embedded
                    ? PopupAlignment.EndInner
                    : PopupAlignment.StartInner,
              }
            );
          }}
        />
      </FluentButton>
    );
  }

  public shouldDrawComponent(options: string[]): boolean {
    const searchString = this.store.searchString;
    //remove null values
    const componentStings = options.filter((value) => value != undefined);

    if (this.ignoreSearch) {
      return true;
    }

    if (searchString?.length != 0 && componentStings.length >= 0) {
      if (
        !componentStings.some(
          (value) =>
            value && value?.toUpperCase().includes(searchString?.toUpperCase())
        )
      ) {
        return false;
      }
    }
    return true;
  }
}

export interface DropZoneViewProps {
  /** Determine whether the data is acceptable */
  filter: (x: any) => boolean;
  /** The user dropped the thing */
  onDrop: (data: any, point: Point, modifiers: DragModifiers) => void;
  /** className of the root div element */
  className: string;
  onClick?: () => void;
  /** Display this instead when dragging (normally we show what's in this view) */
  draggingHint?: () => JSX.Element;
}

export interface DropZoneViewState {
  isInSession: boolean;
  isDraggingOver: boolean;
  data: any;
}

export class DropZoneView
  extends React.Component<DropZoneViewProps, DropZoneViewState>
  implements Droppable {
  public dropContainer: HTMLDivElement;
  public tokens: EventSubscription[];

  constructor(props: DropZoneViewProps) {
    super(props);
    this.state = {
      isInSession: false,
      isDraggingOver: false,
      data: null,
    };
  }

  public componentDidMount() {
    globals.dragController.registerDroppable(this, this.dropContainer);
    this.tokens = [
      globals.dragController.addListener("sessionstart", () => {
        const session = globals.dragController.getSession();
        if (this.props.filter(session.data)) {
          this.setState({
            isInSession: true,
          });
        }
      }),
      globals.dragController.addListener("sessionend", () => {
        this.setState({
          isInSession: false,
        });
      }),
    ];
  }

  public componentWillUnmount() {
    globals.dragController.unregisterDroppable(this);
    this.tokens.forEach((x) => x.remove());
  }

  public onDragEnter(ctx: DragContext) {
    const data = ctx.data;
    const judge = this.props.filter(data);
    if (judge) {
      this.setState({
        isDraggingOver: true,
        data,
      });
      ctx.onLeave(() => {
        this.setState({
          isDraggingOver: false,
          data: null,
        });
      });
      ctx.onDrop((point: Point, modifiers: DragModifiers) => {
        this.props.onDrop(data, point, modifiers);
      });
      return true;
    }
  }

  public render() {
    return (
      <div
        className={classNames(
          this.props.className,
          ["is-in-session", this.state.isInSession],
          ["is-dragging-over", this.state.isDraggingOver]
        )}
        onClick={this.props.onClick}
        ref={(e) => (this.dropContainer = e)}
      >
        {this.props.draggingHint == null
          ? this.props.children
          : this.state.isInSession
          ? this.props.draggingHint()
          : this.props.children}
      </div>
    );
  }
}

export class FluentDetailsButton extends React.Component<
  {
    widgets: JSX.Element[];
    manager: Prototypes.Controls.WidgetManager;
    label?: string;
  },
  Record<string, unknown>
> {
  public inner: DetailsButtonInner;

  public componentDidUpdate() {
    if (this.inner) {
      this.inner.forceUpdate();
    }
  }

  public render() {
    let btn: Element;
    return (
      <>
        {this.props.label ? (
          <Label styles={defaultLabelStyle}>{this.props.label}</Label>
        ) : null}
        <DefaultButton
          iconProps={{
            iconName: "More",
          }}
          componentRef={(e) =>
            (btn = ReactDOM.findDOMNode(e as any) as Element)
          }
          onClick={() => {
            globals.popupController.popupAt(
              (context) => {
                return (
                  <PopupView context={context}>
                    <DetailsButtonInner
                      parent={this}
                      ref={(e) => (this.inner = e)}
                    />
                  </PopupView>
                );
              },
              {
                anchor: btn,
                alignX: getAlignment(btn).alignX,
              }
            );
          }}
        />
      </>
    );
  }
}

export class DetailsButtonInner extends React.Component<
  { parent: FluentDetailsButton },
  Record<string, unknown>
> {
  public render() {
    const parent = this.props.parent;
    return (
      <div className="charticulator__widget-popup-details">
        {parent.props.manager.vertical(...parent.props.widgets)}
      </div>
    );
  }
}
