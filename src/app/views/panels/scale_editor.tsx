import * as React from "react";
import { Prototypes, Specification, Color, getById } from "../../../core";
import * as R from "../../resources";
import { ChartStore } from "../../stores";
import { Actions } from "../../actions";

import { AttributeEditor } from "./attribute_editor";
import { EventSubscription } from "../../../core";
import { EditableTextView } from "../../components";
import { WidgetManager } from "./widgets/manager";
import { ButtonRaised } from "../../components";

export interface ScaleEditorProps {
    scale: Specification.Scale;
    scaleMapping: Specification.ScaleMapping;
    store: ChartStore;
}

export interface ScaleEditorState {

}

export class ScaleEditor extends React.Component<ScaleEditorProps, ScaleEditorState> {
    token: EventSubscription;

    public componentDidMount() {
        this.token = this.props.store.addListener(ChartStore.EVENT_GRAPHICS, () => {
            this.forceUpdate();
        });
    }

    public componentWillUnmount() {
        this.token.remove();
    }

    public render() {
        let { scale, scaleMapping, store } = this.props;
        let scaleClass = store.chartManager.getClassById(scale._id);
        let manager = new WidgetManager(this.props.store, scaleClass);
        manager.onEditMappingHandler = (attribute: string, mapping: Specification.Mapping) => {
            new Actions.SetScaleAttribute(scale, attribute, mapping).dispatch(store.dispatcher);
        };
        let canAddLegend = true;
        if (scale.classID.startsWith("scale.format")) {
            canAddLegend = false;
        }
        return (
            <div className="scale-editor-view" style={{ width: "300px", padding: "10px" }}>
                <div className="attribute-editor">
                    <section className="attribute-editor-element">
                        <div className="header">
                            <EditableTextView text={scale.properties.name} onEdit={(newText) => {
                                new Actions.SetObjectProperty(scale, "name", null, newText, true).dispatch(store.dispatcher);
                            }} />
                        </div>
                        {manager.vertical(...scaleClass.getAttributePanelWidgets(manager))}
                        {canAddLegend ? (
                            <div className="action-buttons">
                                <ButtonRaised url={R.getSVGIcon("legend/legend")} text={store.isLegendExistForScale(scale._id) ? "Remove Legend" : "Add Legend"} onClick={() => {
                                    new Actions.ToggleLegendForScale(scale._id).dispatch(store.dispatcher);
                                }} />
                            </div>
                        ) : null}
                    </section>
                </div>
            </div>
        );
    }
}