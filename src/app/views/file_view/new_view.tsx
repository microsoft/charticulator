import * as React from "react";
import { Actions } from "../../actions";
import { ContextedComponent } from "../../context_component";
import { ImportDataView } from "./import_data_view";

export class FileViewNew extends ContextedComponent<{
    onClose: () => void;
}, {}> {
    public render() {
        return (
            <section className="charticulator__file-view-content">
                <h1>New</h1>
                <ImportDataView onConfirmImport={(dataset) => {
                    this.dispatch(new Actions.ImportDataset(dataset));
                    this.props.onClose();
                }} />
            </section>
        );
    }
}