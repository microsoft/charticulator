import * as React from "react";
import * as ReactDOM from "react-dom";

import * as R from "../../../resources";
import { Prototypes, Specification, getField, prettyNumber, Point, EventSubscription, Expression, Color, ColorGradient } from "../../../../core";
import { ChartStore } from "../../../stores";
import { AttributeEditorItem } from "../attribute_editor";
import { Actions, DragData } from "../../../actions";
import * as globals from "../../../globals";

import { InputText, Select, Radio, Button, InputFile, InputColor, InputColorGradient, InputNumber } from "./controls";
import { SVGImageIcon } from "../../../components/icons";
import { Droppable, DragContext, DragModifiers } from "../../../controllers/drag_controller";
import { classNames } from "../../../utils/index";
import { PopupView } from "../../../controllers";
import { DataFieldSelector } from "../../dataset/data_field_selector";
import { ButtonRaised, GradientPicker } from "../../../components";
import { ReorderListView } from "../object_list_editor";
import { MappingEditor } from "./mapping_editor";

export type OnEditMappingHandler = (attribute: string, mapping: Specification.Mapping) => void;
export type OnMapDataHandler = (attribute: string, data: DragData.DataExpression, hints: Prototypes.DataMappingHints) => void;
export type OnSetPropertyHandler = (property: string, field: string, value: Specification.AttributeValue) => void;

export class WidgetManager implements Prototypes.Controls.WidgetManager {
    constructor(
        public store: ChartStore,
        public objectClass: Prototypes.ObjectClass
    ) { }

    public onMapDataHandler: OnMapDataHandler;
    public onEditMappingHandler: OnEditMappingHandler;

    // A row for value/data mapping.
    public mappingEditorTOFIX(attribute: string) {
        let objectClass = this.objectClass;
        let info = objectClass.attributes[attribute];
        return this.mappingEditor(info.displayName, attribute, info.type, {
            defaultValue: info.defaultValue,
            defaultAuto: !info.solverExclude && !info.stateExclude,
            hints: {
                rangeNumber: info.defaultRange as [number, number]
            }
        });
        // return (
        //     <AttributeEditorItem
        //         chart={this.store.chart}
        //         attributeName={attribute}
        //         attributeDescription={objectClass.attributes[attribute]}
        //         mapping={objectClass.object.mappings[attribute]}
        //         onEdit={(mapping) => {
        //             if (this.onEditMappingHandler) {
        //                 this.onEditMappingHandler(attribute, mapping);
        //             }
        //         }}
        //         onMapData={(data) => {
        //             if (this.onMapDataHandler) {
        //                 this.onMapDataHandler(attribute, data, false);
        //             }
        //         }}
        //         store={this.store}
        //     />
        // );
    }

    public mappingEditor(name: string, attribute: string, type: string, options: Prototypes.Controls.MappingEditorOptions): JSX.Element {
        let mapping = this.getAttributeMapping(attribute);
        return this.row(name, (
            <MappingEditor parent={this} attribute={attribute} type={type} options={options} />
        ));
    }

    public getAttributeMapping(attribute: string) {
        return this.objectClass.object.mappings[attribute];
    }

    public getPropertyValue(property: Prototypes.Controls.Property) {
        let prop = this.objectClass.object.properties[property.property];
        let value: Specification.AttributeValue = undefined;
        if (property.field) {
            value = getField(prop, property.field);
        } else {
            value = prop;
        }
        return value;
    }

    public emitSetProperty(property: Prototypes.Controls.Property, value: Specification.AttributeValue) {
        new Actions.SetObjectProperty(
            this.objectClass.object, property.property, property.field,
            value,
            property.noUpdateState,
            property.noComputeLayout
        ).dispatch(this.store.dispatcher);
    }

    // Property widgets
    public inputNumber(property: Prototypes.Controls.Property, options: Prototypes.Controls.InputNumberOptions = {}) {
        let value = this.getPropertyValue(property) as number;
        return (
            <InputNumber
                {...options}
                defaultValue={value}
                onEnter={(value) => {
                    if (value == null) {
                        this.emitSetProperty(property, null);
                        return true;
                    } else if (value == value) {
                        this.emitSetProperty(property, value);
                        return true;
                    }
                    return false;
                }}
            />
        );
    }

    public inputText(property: Prototypes.Controls.Property) {
        return (
            <InputText
                defaultValue={this.getPropertyValue(property) as string}
                onEnter={(value) => {
                    this.emitSetProperty(property, value);
                    return true;
                }}
            />
        );
    }

    public inputSelect(property: Prototypes.Controls.Property, options: Prototypes.Controls.InputSelectOptions) {
        if (options.type == "dropdown") {
            return (
                <Select
                    labels={options.labels} icons={options.icons} options={options.options}
                    value={this.getPropertyValue(property) as string}
                    showText={options.showLabel}
                    onChange={(value) => {
                        this.emitSetProperty(property, value);
                    }}
                />
            );
        } else {
            return (
                <Radio
                    labels={options.labels} icons={options.icons} options={options.options}
                    value={this.getPropertyValue(property) as string}
                    showText={options.showLabel}
                    onChange={(value) => {
                        this.emitSetProperty(property, value);
                    }}
                />
            );
        }
    }
    public inputBoolean(property: Prototypes.Controls.Property, options: Prototypes.Controls.InputBooleanOptions) {
        switch (options.type) {
            case "checkbox": {
                return (
                    <Button
                        icon={(this.getPropertyValue(property) as boolean) ? "checkbox/checked" : "checkbox/empty"}
                        text={options.label}
                        active={false}
                        onClick={() => {
                            let v = this.getPropertyValue(property) as boolean;
                            this.emitSetProperty(property, !v);
                        }}
                    />
                );
            }
            case "highlight": {
                return (
                    <Button
                        icon={options.icon}
                        text={options.label}
                        active={this.getPropertyValue(property) as boolean}
                        onClick={() => {
                            let v = this.getPropertyValue(property) as boolean;
                            this.emitSetProperty(property, !v);
                        }}
                    />
                );
            }
        }
    }
    public inputExpression(property: Prototypes.Controls.Property) {
        return (
            <InputText
                defaultValue={this.getPropertyValue(property) as string}
                placeholder="(none)"
                onEnter={(value) => {
                    if (value.trim() == "") {
                        this.emitSetProperty(property, null);
                    } else {
                        this.emitSetProperty(property, value);
                    }
                    return true;
                }}
            />
        );
    }
    public inputColor(property: Prototypes.Controls.Property, options: Prototypes.Controls.InputColorOptions = {}): JSX.Element {
        let color = this.getPropertyValue(property) as Color;
        return (
            <InputColor
                defaultValue={color}
                allowNull={options.allowNull}
                onEnter={(value) => {
                    this.emitSetProperty(property, value);
                    return true;
                }}
            />
        );
    }
    public inputColorGradient(property: Prototypes.Controls.Property, inline: boolean = false): JSX.Element {
        let gradient = this.getPropertyValue(property) as any as ColorGradient;
        if (inline) {
            return (
                <span className="charticulator__widget-control-input-color-gradient-inline">
                    <GradientPicker
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
        let currentImage = this.getPropertyValue(property) as { fileName: string, dataURL: string };
        return (
            <span className="charticulator__widget-control-image">
                <InputFile
                    fileName={currentImage ? currentImage.fileName : null}
                    accept={[".jpg", ".png", ".svg"]}
                    outputType="data-url"
                    onOpenFile={(fileName: string, dataURL: string) => {
                        this.emitSetProperty(property, {
                            fileName: fileName,
                            dataURL: dataURL
                        });
                    }}
                />
            </span>
        );
    }
    public clearButton(property: Prototypes.Controls.Property, icon?: string) {
        return (
            <span className="charticulator__widget-control-button"
                onClick={() => {
                    this.emitSetProperty(property, null);
                }}
            ><SVGImageIcon url={R.getSVGIcon(icon || "general/eraser")} /></span>
        );
    }
    public setButton(property: Prototypes.Controls.Property, value: Specification.AttributeValue, icon?: string, text?: string) {
        return (
            <span className="charticulator__widget-control-button"
                onClick={() => {
                    this.emitSetProperty(property, value);
                }}
            >
                {icon != null ? <SVGImageIcon url={R.getSVGIcon(icon)} /> : null}
                {text != null ? <span className="el-text">{text}</span> : null}
            </span>
        );
    }
    public orderByWidget(property: Prototypes.Controls.Property, options: Prototypes.Controls.OrderWidgetOptions) {
        let ref: DropZoneView;
        return (
            <DropZoneView
                filter={(data) => data instanceof DragData.DataExpression}
                onDrop={(data: DragData.DataExpression) => {
                    let expr = Expression.functionCall("sortBy", Expression.parse(data.lambdaExpression)).toString();
                    this.emitSetProperty(property, expr);
                }}
                ref={(e) => ref = e}
                className={classNames("charticulator__widget-control-order-widget", ["is-active", this.getPropertyValue(property) != null])}
                onClick={() => {
                    globals.popupController.popupAt((context) => {
                        let fieldSelector: DataFieldSelector;
                        let currentSortByLambdaExpression: string = null;
                        let currentOrderValue = this.getPropertyValue(property) as string;
                        if (currentOrderValue != null) {
                            let currentOrder = Expression.parse(currentOrderValue);

                            if (currentOrder instanceof Expression.FunctionCall) {
                                if (currentOrder.callable instanceof Expression.Variable && currentOrder.callable.name == "sortBy") {
                                    currentSortByLambdaExpression = currentOrder.args[0].toString();
                                }
                            }
                        }
                        return (
                            <PopupView context={context}>
                                <div className="charticulator__widget-popup-order-widget">
                                    <div className="el-row">
                                        <DataFieldSelector
                                            ref={(e) => fieldSelector = e}
                                            nullDescription="(default order)"
                                            datasetStore={this.store.datasetStore}
                                            defaultValue={currentSortByLambdaExpression ? { table: options.table, lambdaExpression: currentSortByLambdaExpression } : null}
                                            onChange={(value) => {
                                                if (value != null) {
                                                    let expr = Expression.functionCall("sortBy", Expression.parse(value.lambdaExpression)).toString();
                                                    this.emitSetProperty(property, expr);
                                                } else {
                                                    this.emitSetProperty(property, null);
                                                }
                                                context.close();
                                            }}
                                        />
                                    </div>
                                </div>
                            </PopupView>
                        );
                    }, { anchor: ref.dropContainer });
                }}
            >
                <SVGImageIcon url={R.getSVGIcon("general/sort")} />
                <SVGImageIcon url={R.getSVGIcon("general/dropdown")} />
            </DropZoneView >
        );
    }

    public reorderWidget(property: Prototypes.Controls.Property): JSX.Element {
        let container: HTMLSpanElement;
        return (
            <span ref={(e) => container = e}>
                <Button
                    icon={"general/sort"}
                    active={false}
                    onClick={() => {
                        globals.popupController.popupAt((context) => {
                            let items = this.getPropertyValue(property) as string[];
                            return (
                                <PopupView context={context}>
                                    <ReorderStringsValue items={items} onConfirm={(items) => {
                                        this.emitSetProperty(property, items);
                                        context.close();
                                    }} />
                                </PopupView>
                            );
                        }, { anchor: container });
                    }}
                />
            </span>
        );
    }

    public dropTarget(options: Prototypes.Controls.DropTargetOptions, widget: JSX.Element) {
        return (
            <DropZoneView
                filter={(data) => data instanceof DragData.DataExpression}
                onDrop={(data: DragData.DataExpression) => {
                    let expr = Expression.functionCall("sortBy", Expression.parse(data.lambdaExpression)).toString();
                    this.emitSetProperty(options.property, expr);
                }}
                className={classNames("charticulator__widget-control-drop-target")}
                draggingHint={() => <span className="el-dropzone-hint">{options.label}</span>}
            >
                {widget}
            </DropZoneView>
        );
    }

    // Label and text
    public icon(icon: string) {
        return (
            <span className="charticulator__widget-label">
                <SVGImageIcon url={R.getSVGIcon(icon)} />
            </span>
        );
    }
    public label(title: string) {
        return (
            <span className="charticulator__widget-label">
                {title}
            </span>
        );
    }
    public text(title: string, align: "left" | "center" | "right" = "left") {
        return (
            <span className="charticulator__widget-text" style={{ textAlign: align }}>
                {title}
            </span>
        );
    }
    public sep() {
        return (
            <span className="charticulator__widget-sep"></span>
        );
    }

    // Layout elements
    public sectionHeader(title: string, widget?: JSX.Element, options: Prototypes.Controls.RowOptions = {}) {
        if (options.dropzone && options.dropzone.type == "axis-data-binding") {
            let refButton: Element;
            let current = this.getAttributeMapping(options.dropzone.attribute) as Specification.Types.AxisDataBinding;
            return (
                <DropZoneView
                    filter={(data) => data instanceof DragData.DataExpression}
                    onDrop={(data: DragData.DataExpression) => {
                        new Actions.BindDataToAxis(
                            this.objectClass.object as Specification.PlotSegment,
                            options.dropzone.attribute,
                            null,
                            data
                        ).dispatch(this.store.dispatcher);
                    }}
                    className="charticulator__widget-section-header charticulator__widget-section-header-dropzone"
                    draggingHint={() => <span className="el-dropzone-hint">{options.dropzone.prompt}</span>}
                >
                    <span className="charticulator__widget-section-header-title">{title}</span>
                    {widget}
                    <Button
                        icon={"general/bind-data"}
                        ref={(e) => refButton = ReactDOM.findDOMNode(e)}
                        onClick={() => {
                            globals.popupController.popupAt((context) => {
                                return (
                                    <PopupView context={context}>
                                        <DataFieldSelector
                                            datasetStore={this.store.datasetStore}
                                            defaultValue={current && current.expression ? { table: null, expression: current.expression } : null}
                                            nullDescription={"(none)"}
                                            nullNotHighlightable
                                            onChange={(value) => {
                                                if (!value) {
                                                    this.emitSetProperty({ property: options.dropzone.attribute }, null);
                                                } else {
                                                    let data = new DragData.DataExpression(
                                                        this.store.datasetStore.getTable(value.table),
                                                        value.expression, value.lambdaExpression, value.type, value.metadata
                                                    );
                                                    new Actions.BindDataToAxis(
                                                        this.objectClass.object as Specification.PlotSegment,
                                                        options.dropzone.attribute,
                                                        null,
                                                        data
                                                    ).dispatch(this.store.dispatcher);
                                                }
                                                context.close();
                                            }}
                                        />
                                    </PopupView>
                                );
                            }, { anchor: refButton });
                        }}
                        active={false}
                    />
                </DropZoneView>
            );
        } else {
            return (
                <div className="charticulator__widget-section-header">
                    <span className="charticulator__widget-section-header-title">{title}</span>
                    {widget}
                </div>
            );
        }
    }

    public horizontal(cols: number[], ...widgets: JSX.Element[]) {
        return (
            <div className="charticulator__widget-horizontal">
                {widgets.map((x, id) => <span className={`el-layout-item el-layout-item-col-${cols[id]}`} key={id}>{x}</span>)}
            </div>
        );
    }

    public detailsButton(...widgets: JSX.Element[]): JSX.Element {
        return (
            <DetailsButton widgets={widgets} manager={this}></DetailsButton>
        );
    }

    public row(title: string, widget?: JSX.Element) {
        return (
            <div className="charticulator__widget-row">
                <span className="charticulator__widget-row-label el-layout-item">{title}</span>
                {widget}
            </div>
        );
    }

    public vertical(...widgets: JSX.Element[]) {
        return (
            <div className="charticulator__widget-vertical">
                {widgets.map((x, id) => <span className="el-layout-item" key={id}>{x}</span>)}
            </div>
        );
    }

    public table(rows: JSX.Element[][], options: Prototypes.Controls.TableOptions): JSX.Element {
        return (
            <table className="charticulator__widget-table">
                {rows.map((row, index) => (
                    <tr key={index}>
                        {row.map((x, i) => <td key={i}><span className="el-layout-item">{x}</span></td>)}
                    </tr>
                ))}
            </table>
        );
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

export class DropZoneView extends React.Component<DropZoneViewProps, DropZoneViewState> implements Droppable {
    dropContainer: HTMLDivElement;
    tokens: EventSubscription[];

    constructor(props: DropZoneViewProps) {
        super(props);
        this.state = {
            isInSession: false,
            isDraggingOver: false,
            data: null
        };
    }

    public componentDidMount() {
        globals.dragController.registerDroppable(this, this.dropContainer);
        this.tokens = [
            globals.dragController.addListener("sessionstart", () => {
                let session = globals.dragController.getSession();
                if (this.props.filter(session.data)) {
                    this.setState({
                        isInSession: true
                    });
                }
            }),
            globals.dragController.addListener("sessionend", () => {
                this.setState({
                    isInSession: false
                });
            })
        ];
    }

    public componentWillUnmount() {
        globals.dragController.unregisterDroppable(this);
        this.tokens.forEach(x => x.remove());
    }

    public onDragEnter(ctx: DragContext) {
        let data = ctx.data;
        let judge = this.props.filter(data);
        if (judge) {
            this.setState({
                isDraggingOver: true,
                data: data
            });
            ctx.onLeave(() => {
                this.setState({
                    isDraggingOver: false,
                    data: null
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
                ref={(e) => this.dropContainer = e}
            >
                {this.props.draggingHint == null ? this.props.children : (
                    this.state.isInSession ? this.props.draggingHint() : this.props.children
                )}
            </div>
        );
    }
}

export class ReorderStringsValue extends React.Component<{
    items: string[];
    onConfirm: (items: string[]) => void;
}, { items: string[]; }> {
    state: { items: string[] } = {
        items: this.props.items.slice()
    };

    public render() {
        let items = this.state.items.slice();
        return (
            <div className="charticulator__widget-popup-reorder-widget">
                <div className="el-row el-list-view">
                    <ReorderListView enabled onReorder={(a, b) => {
                        ReorderListView.ReorderArray(items, a, b);
                        this.setState({ items: items });
                    }}>
                        {items.map(x => <div key={x} className="el-item">{x}</div>)}
                    </ReorderListView>
                </div>
                <div className="el-row">
                    <ButtonRaised text="OK" onClick={() => {
                        this.props.onConfirm(this.state.items);
                    }} />
                </div>
            </div>
        );
    }
}

export class DetailsButton extends React.Component<{
    widgets: JSX.Element[];
    manager: WidgetManager;
}, {}> {
    inner: DetailsButtonInner
    public componentDidUpdate() {
        if (this.inner) this.inner.forceUpdate();
    }

    public render() {
        let btn: Element;
        return (
            <Button icon={"general/more-horizontal"}
                ref={(e) => btn = ReactDOM.findDOMNode(e)}
                onClick={() => {
                    globals.popupController.popupAt((context) => {
                        return (
                            <PopupView context={context}>
                                <DetailsButtonInner parent={this} ref={(e) => this.inner = e} />
                            </PopupView>
                        );
                    }, { anchor: btn });
                }}
            />
        );
    }
}

export class DetailsButtonInner extends React.Component<{ parent: DetailsButton }, {}> {
    public render() {
        let parent = this.props.parent;
        return (
            <div className="charticulator__widget-popup-details">
                {parent.props.manager.vertical(...parent.props.widgets)}
            </div>
        )
    }
}