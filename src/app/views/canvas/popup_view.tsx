import * as React from "react";
import { classNames } from "../../utils";
import { SVGImageIcon, DropdownButton } from "../../components";
import * as R from "../../resources";
import { Prototypes, Specification, zipArray, Expression } from "../../../core";

import * as globals from "../../globals";
import { Droppable, DragContext } from "../../controllers";

import { DragData } from "../../actions";

// export interface PopupAttributeEditorProps {
//     controls: Prototypes.Controls.Description[];
//     onUpdateValue: (attribute: string, field: string, value: Specification.AttributeValue) => void;
// }

// export interface PopupAttributeEditorState {
// }

// export class PopupAttributeEditor extends React.Component<PopupAttributeEditorProps, PopupAttributeEditorState> {
//     public renderControlView(key: string, control: Prototypes.Controls.Description) {
//         switch (control.type) {
//             case "toggle": {
//                 let toggle = control as Prototypes.Controls.Toggle;
//                 return (
//                     <ToggleControlView key={key}
//                         icon={toggle.icon}
//                         active={toggle.value}
//                         onChange={(active) => this.props.onUpdateValue(control.attribute, control.field, active)}
//                     />
//                 );
//             }
//             case "radio": {
//                 let radio = control as Prototypes.Controls.Radio;
//                 return (
//                     <RadioControlView key={key}
//                         icons={radio.icons}
//                         options={radio.options}
//                         value={radio.value}
//                         labels={radio.labels}
//                         onChange={(value) => this.props.onUpdateValue(control.attribute, control.field, value)}
//                     />
//                 );
//             }
//             case "order": {
//                 let order = control as Prototypes.Controls.Order;
//                 return (
//                     <OrderControlView key={key}
//                         value={order.value}
//                         onChange={(value) => this.props.onUpdateValue(control.attribute, control.field, value)}
//                     />
//                 );
//             }
//         }
//     }
//     public render() {
//         return (
//             <div className="popup-attribute-editor">
//                 {this.props.controls.map((control, index) => this.renderControlView(`m${index}`, control))}
//             </div>
//         );
//     }
// }

export interface ToggleControlViewProps {
    icon: string;
    active: boolean;
    onChange: (active: boolean) => void;
}

export class ToggleControlView extends React.Component<ToggleControlViewProps, {}> {
    public render() {
        return (
            <span className={classNames("button-toggle button-icon", ["active", this.props.active])}
                onClick={() => this.props.onChange(!this.props.active)}
            >
                <SVGImageIcon url={R.getSVGIcon(this.props.icon)} />
            </span>
        )
    }
}

export interface RadioControlViewProps {
    icons: string[];
    options: string[];
    labels?: string[];
    value: string;
    onChange: (active: string) => void;
}

export class RadioControlView extends React.Component<RadioControlViewProps, {}> {
    public render() {
        let currentIndex = this.props.options.indexOf(this.props.value);
        return (
            <span className="button-radio">
                <DropdownButton
                    url={R.getSVGIcon(this.props.icons[currentIndex])}
                    list={this.props.options.map((x, i) => { return { url: R.getSVGIcon(this.props.icons[i]), name: x, text: this.props.labels ? this.props.labels[i] : null } })}
                    onSelect={this.props.onChange}
                />
            </span>
        )
    }
}

export interface OrderControlViewProps {
    value: Specification.Expression;
    onChange: (order: Specification.Expression) => void;
}

export interface OrderControlViewState {
    active: boolean;
}

export class OrderControlView extends React.Component<OrderControlViewProps, OrderControlViewState> implements Droppable {
    refs: {
        container: HTMLSpanElement;
    }

    constructor(props: OrderControlViewProps) {
        super(props);
        this.state = {
            active: false
        };
    }

    public onDragEnter(ctx: DragContext) {
        if (ctx.data instanceof DragData.DataExpression) {
            let data = ctx.data as DragData.DataExpression;
            this.setState({ active: true });
            ctx.onDrop(() => {
                this.props.onChange(Expression.functionCall("sortBy", Expression.parse(data.lambdaExpression)).toString());
            });
            ctx.onLeave(() => {
                this.setState({ active: false });
            });
            return true;
        }
        return false;
    }

    public componentDidMount() {
        globals.dragController.registerDroppable(this, this.refs.container);
    }

    public componentWillUnmount() {
        globals.dragController.unregisterDroppable(this);
    }

    public render() {
        return (
            <span className="button-order" ref="container">
                <span className={classNames("button-icon", ["active", this.state.active || (this.props.value != null)])}>
                    <SVGImageIcon url={R.getSVGIcon("general/sort")} />
                </span>
            </span>
        )
    }
}
// export interface ControlsHandleViewProps extends HandleViewProps {
//     handle: Prototypes.Handles.Controls;
// }

// export class ControlsHandleView extends React.Component<ControlsHandleViewProps, ControlsHandleViewState> {
//     public controlSize = 18;

//     public renderControl(control: Prototypes.Handles.ControlInfo) {
//         switch (control.type) {
//             case "toggle": {
//                 return (
//                     <SVGImageButton
//                         url={getSVGIcon(control.toggleIcon)}
//                         width={this.controlSize} height={this.controlSize}
//                         active={control.value as boolean}
//                         onClick={() => {
//                             let value = JSON.parse(JSON.stringify(this.props.handle.value));
//                             let entries = control.field.split(".");
//                             let o = value;
//                             for (let i = 0; i < entries.length - 1; i++) {
//                                 o = o[entries[i]];
//                                 if (!o) return;
//                             }
//                             o[entries[entries.length - 1]] = !(control.value as boolean);
//                             if (this.props.onUpdateValue) this.props.onUpdateValue(this.props.handle, value);
//                         }}
//                     />
//                 );
//             }
//             case "radio": {
//                 let thisIndex = control.radioOptions.indexOf(control.value as string);
//                 let nextIndex = (thisIndex + 1) % control.radioOptions.length;
//                 return (
//                     <SVGImageButton
//                         url={getSVGIcon(control.radioIcons[thisIndex])}
//                         width={this.controlSize} height={this.controlSize}
//                         active={control.value as boolean}
//                         onClick={() => {
//                             let value = JSON.parse(JSON.stringify(this.props.handle.value));
//                             let entries = control.field.split(".");
//                             let o = value;
//                             for (let i = 0; i < entries.length - 1; i++) {
//                                 o = o[entries[i]];
//                                 if (!o) return;
//                             }
//                             o[entries[entries.length - 1]] = control.radioOptions[nextIndex];
//                             if (this.props.onUpdateValue) this.props.onUpdateValue(this.props.handle, value);
//                         }}
//                     />
//                 );
//             }
//         }
//     }

//     public render() {
//         let fX = (x: number) => x * this.props.zoom.scale + this.props.zoom.centerX;
//         let fY = (y: number) => y * this.props.zoom.scale + this.props.zoom.centerY;
//         let handle = this.props.handle;
//         if (handle.x != null && handle.ySpan != null) {
//             let x = fX(handle.x);
//             let y1 = fY(handle.ySpan[0]);
//             let y2 = fY(handle.ySpan[1]);
//             let transform = `translate(${x.toFixed(6)},${y1.toFixed(6)})`;
//             let y = 0;
//             return (
//                 <g transform={transform}>
//                     {handle.controls.map((control, index) => {
//                         let g = <g key={`m${index}`} transform={`translate(2,${y})`}>{this.renderControl(control)}</g>;
//                         y += this.controlSize + 2;
//                         return g;
//                     })}
//                 </g>
//             );
//         }
//     }
// }