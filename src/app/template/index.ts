import { Specification, Prototypes, Dataset, deepClone } from "../../core";

export interface ExportTemplateTargetProperty {
    displayName: string;
    name: string;
    type: string;
    default: any;
}
export interface ExportTemplateTarget {
    /** Get export format properties */
    getProperties(): ExportTemplateTargetProperty[];
    /** Get the file extension */
    getFileExtension(): string;
    /** Generate the exported template, return a base64 string encoding the file */
    generate(properties: { [name: string]: any }): Promise<string>;
}

export class ChartTemplateBuilder {
    chart: Specification.Chart;
    dataset: Dataset.Dataset;
    manager: Prototypes.ChartStateManager;
    template: Specification.Template.ChartTemplate;

    private slots: { [name: string]: Specification.Template.DataSlot } = {};
    private objectVisited: { [id: string]: boolean } = {};

    constructor(
        chart: Specification.Chart,
        dataset: Dataset.Dataset,
        manager: Prototypes.ChartStateManager
    ) {
        this.chart = chart;
        this.dataset = dataset;
        this.manager = manager;
    }

    public reset() {
        this.template = {
            specification: deepClone(this.chart),
            tables: [],
            dataSlots: [],
            inference: {},
            mappings: {},
            properties: {}
        };
        this.slots = {};
        this.objectVisited = {};
    }


    public addSlot(slotTable: string, slotName: string, slotKind?: string) {
        if (!this.slots[slotName]) {
            this.slots[slotName] = {
                table: slotTable,
                name: slotName,
                kind: slotKind
            };
        } else {
            if (slotKind != null) {
                this.slots[slotName].kind = slotKind;
            }
        }
    }


    public addObject(table: string, objectClass: Prototypes.ObjectClass) {
        // Visit a object only once
        if (this.objectVisited[objectClass.object._id]) return;
        this.objectVisited[objectClass.object._id] = true;

        let template = this.template;

        // Get template inference data
        let params = objectClass.getTemplateParameters();
        if (params && params.inferences && params.inferences.length > 0) {
            let inferences = params.inferences;
            template.inference[objectClass.object._id] = inferences;
            for (let item of inferences) {
                switch (item.type) {
                    case "scale": {
                        let scaleInference = item as Specification.Template.Scale;
                        // Find the first mapping that uses this scale
                        for (let id in this.template.mappings) {
                            if (!this.template.mappings.hasOwnProperty(id)) continue;
                            for (let mapping of this.template.mappings[id]) {
                                if (mapping.scale == objectClass.object._id) {
                                    scaleInference.slotName = mapping.slotName;
                                }
                            }
                        }
                        if (scaleInference.slotName != null) {
                            this.addSlot(table, scaleInference.slotName, scaleInference.slotKind);
                        }
                    } break;
                    case "axis": {
                        let axisInference = item as Specification.Template.Axis;
                        if (axisInference.slotName != null) {
                            this.addSlot(table, axisInference.slotName, axisInference.slotKind);
                        }
                    } break;
                    case "order": {
                        let orderInference = item as Specification.Template.Order;
                        if (orderInference.slotName != null) {
                            this.addSlot(table, orderInference.slotName, orderInference.slotKind);
                        }
                    } break;
                    case "slot-list": {
                        let slotListInference = item as Specification.Template.SlotList;
                        for (let slot of slotListInference.slots) {
                            this.addSlot(table, slot.slotName, slot.slotKind);
                        }
                    } break;
                }

            }
        }
        if (params && params.properties && params.properties.length > 0) {
            template.properties[objectClass.object._id] = params.properties;
            for (let property of params.properties) {
                let pn = "";
                if (property.mode == "attribute") {
                    pn = property.attribute;
                } else {
                    pn = property.property;
                    if (property.fields) {
                        if (typeof (property.fields) == "string") {
                            pn += "." + property.fields;
                        } else {
                            pn += "." + property.fields.join(".");
                        }
                    }
                }
                if (!property.displayName) {
                    property.displayName = objectClass.object.properties.name + "/" + pn;
                }
                property.name = property.displayName.replace(/[^0-9a-zA-Z\_]+/g, "_");
            }
        }
        // Get mappings
        let mappings: Specification.Template.Mapping[] = [];
        for (let attribute in objectClass.object.mappings) {
            if (objectClass.object.mappings.hasOwnProperty(attribute)) {
                let item = objectClass.object.mappings[attribute];
                if (item.type == "scale") {
                    let scaleMapping = item as Specification.ScaleMapping;
                    let kind = null;
                    // Resolve scale kind
                    if (scaleMapping.scale) {
                        let scaleClass = this.manager.getClassById(scaleMapping.scale);
                        if (scaleClass) {
                            let params = scaleClass.getTemplateParameters();
                            if (params && params.inferences) {
                                for (let infer of params.inferences) {
                                    if (infer.type == "scale") {
                                        kind = (infer as Specification.Template.Scale).slotKind;
                                    }
                                }
                            }
                        }
                    }
                    this.addSlot(table, scaleMapping.expression, kind);
                    mappings.push({
                        attribute: attribute,
                        scale: scaleMapping.scale,
                        slotName: scaleMapping.expression
                    });
                }
            }
        }
        if (mappings.length > 0) {
            template.mappings[objectClass.object._id] = mappings;
        }
    }

    public build(): Specification.Template.ChartTemplate {
        this.reset();

        let template = this.template;
        // Extract data tables
        template.tables = this.dataset.tables.map((table) => {
            return { name: table.name };
        });

        for (let elementClass of this.manager.getElements()) {
            let table = null;
            if (Prototypes.isType(elementClass.object.classID, "plot-segment")) {
                let plotSegment = elementClass.object as Specification.PlotSegment;
                table = plotSegment.table;
            }
            this.addObject(table, elementClass);
            if (Prototypes.isType(elementClass.object.classID, "plot-segment")) {
                let plotSegmentState = elementClass.state as Specification.PlotSegmentState;
                for (let glyph of plotSegmentState.glyphs) {
                    this.addObject(table, this.manager.getClass(glyph));
                    for (let mark of glyph.marks) {
                        this.addObject(table, this.manager.getClass(mark));
                    }
                    // Only one glyph is enough.
                    break;
                }
            }
        }

        for (let scaleState of this.manager.chartState.scales) {
            this.addObject(null, this.manager.getClass(scaleState));
        }

        this.addObject(null, this.manager.getChartClass(this.manager.chartState));

        for (let slot in this.slots) {
            if (this.slots.hasOwnProperty(slot)) {
                template.dataSlots.push(this.slots[slot]);
            }
        }

        return template;
    }
}