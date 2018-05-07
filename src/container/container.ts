import { Specification, Dataset, initialize, deepClone, Prototypes, Graphics, Solver, getById, setField, getField, getByName, Expression, Scale, Color } from "../core";
import { renderGraphicalElementCanvas } from "../app/renderer/canvas";
import { CharticulatorWorker } from "../worker";
import { getDefaultColorPalette } from "../core/prototypes/scales/categorical";

export * from "../core";

export class ChartTemplate {
    private template: Specification.Template.ChartTemplate;
    private slotAssignment: { [name: string]: string };
    private tableAssignment: { [name: string]: string };

    constructor(template: Specification.Template.ChartTemplate) {
        this.template = template;
        this.slotAssignment = {};
        this.tableAssignment = {};
    }

    public getSlots(): Specification.Template.DataSlot[] {
        return this.template.dataSlots;
    }

    public reset() {
        this.slotAssignment = {};
        this.tableAssignment = {};
    }

    public assignTable(tableName: string, table: string) {
        this.tableAssignment[tableName] = table;
    }
    public assignSlot(slotName: string, expression: string) {
        this.slotAssignment[slotName] = expression;
    }

    public findObjectById(spec: Specification.Chart, id: string): Specification.Object {
        if (spec._id == id) return spec;
        let obj = getById(spec.scales, id) || getById(spec.elements, id) || getById(spec.glyphs, id);
        if (obj != null) {
            return obj;
        }
        for (let glyph of spec.glyphs) {
            obj = getById(glyph.marks, id);
            if (obj != null) {
                return obj;
            }
        }
        return null;
    }

    public setProperty(object: Specification.Object, property: string, field: string | string[] = null, value: any) {
        if (field != null) {
            setField(object.properties[property], field, value);
        } else {
            object.properties[property] = value;
        }
    }

    public getProperty(object: Specification.Object, property: string, field: string | string[] = null) {
        if (field != null) {
            return getField(object.properties[property], field);
        } else {
            return object.properties[property];
        }
    }

    public instantiate(dataset: Dataset.Dataset) {
        let template = deepClone(this.template);

        let df = new Prototypes.Dataflow.DataflowManager(dataset);
        let getExpressionVector = (table: string, expression: string): any[] => {
            let expr = Expression.parse(expression);
            let tableContext = df.getTable(table);
            let r = [];
            for (let i = 0; i < tableContext.rows.length; i++) {
                let ctx = tableContext.getRowContext(i);
                let value = expr.getValue(ctx);
                r.push(value);
            }
            return r;
        }

        // Assign slots.
        for (let id in template.inference) {
            if (template.inference.hasOwnProperty(id)) {
                let object = this.findObjectById(template.specification, id);
                if (object) {
                    for (let inference of template.inference[id]) {
                        switch (inference.type) {
                            case "axis": {
                                let axis = inference as Specification.Template.Axis;
                                let expression = this.slotAssignment[axis.slotName];
                                let slot = getByName(this.template.dataSlots, axis.slotName);
                                if (expression == null || slot == null) continue;
                                let original = this.getProperty(object, axis.property, axis.fields) as Specification.Types.AxisDataBinding;
                                original.expression = expression;
                                // Infer scale domain or mapping
                                let columnVector = getExpressionVector(this.tableAssignment[slot.table], expression);
                                switch (original.type) {
                                    case "categorical": {
                                        let scale = new Scale.CategoricalScale();
                                        scale.inferParameters(columnVector, "order");
                                        original.categories = new Array<string>(scale.domain.size);
                                        scale.domain.forEach((index, key) => {
                                            original.categories[index] = key;
                                        });
                                    } break;
                                    case "numerical": {
                                        let scale = new Scale.NumericalScale();
                                        scale.inferParameters(columnVector);
                                        original.domainMin = scale.domainMin;
                                        original.domainMax = scale.domainMax;
                                    } break;
                                }

                                this.setProperty(object, axis.property, axis.fields, original);
                            } break;
                            case "scale": {
                                let scale = inference as Specification.Template.Scale;
                                let expression = this.slotAssignment[scale.slotName];
                                let slot = getByName(this.template.dataSlots, scale.slotName);
                                // TODO: infer scale domain or mapping
                                let columnVector = getExpressionVector(this.tableAssignment[slot.table], expression);
                                switch (scale.slotKind) {
                                    case "numerical": {
                                        let s = new Scale.NumericalScale();
                                        s.inferParameters(columnVector);
                                        object.properties[scale.properties.min] = s.domainMin;
                                        object.properties[scale.properties.max] = s.domainMax;
                                        // Zero domain min for now.
                                        object.properties[scale.properties.min] = 0;
                                    } break;
                                    case "categorical": {
                                        let s = new Scale.CategoricalScale();
                                        s.inferParameters(columnVector, "order");
                                        switch (scale.rangeType) {
                                            case "number": {
                                                let mapping: { [name: string]: number } = {};
                                                s.domain.forEach((index, key) => {
                                                    mapping[key] = index;
                                                });
                                                object.properties[scale.properties.mapping] = mapping;
                                            } break;
                                            case "color": {
                                                let mapping: { [name: string]: Color } = {};
                                                let palette = getDefaultColorPalette(s.domain.size);
                                                s.domain.forEach((index, key) => {
                                                    mapping[key] = palette[index % palette.length];
                                                });
                                                object.properties[scale.properties.mapping] = mapping;
                                            }
                                        }
                                    } break;
                                }
                            } break;
                            case "order": {
                                let order = inference as Specification.Template.Order;
                                let expression = this.slotAssignment[order.slotName];
                                let slot = getByName(this.template.dataSlots, order.slotName);
                                this.setProperty(object, order.property, order.field, "sortBy((x) => x." + expression + ")");
                            } break;
                            case "slot-list": {
                                let slotList = inference as Specification.Template.SlotList;
                                let expressions = slotList.slots.map((slot) => {
                                    return this.slotAssignment[slot.slotName];
                                });
                                this.setProperty(object, slotList.property, slotList.fields, expressions);
                            } break;
                        }
                    }
                }
            }
        }
        for (let id in template.mappings) {
            if (template.mappings.hasOwnProperty(id)) {
                let object = this.findObjectById(template.specification, id);
                if (object) {
                    for (let mapping of template.mappings[id]) {
                        let mappingItem = object.mappings[mapping.attribute];
                        if (mappingItem.type == "scale") {
                            let scaleMapping = mappingItem as Specification.ScaleMapping;
                            scaleMapping.expression = this.slotAssignment[mapping.slotName];
                        }
                    }
                }
            }
        }

        // Set table
        for (let element of template.specification.elements) {
            if (Prototypes.isType(element.classID, "plot-segment")) {
                let plotSegment = element as Specification.PlotSegment;
                plotSegment.table = this.tableAssignment[plotSegment.table];
            }
            if (Prototypes.isType(element.classID, "links")) {
                switch (element.classID) {
                    case "links.through": {
                        let props = element.properties as Prototypes.Links.LinksProperties;
                        if (props.linkThrough.facetExpressions) {
                            props.linkThrough.facetExpressions = props.linkThrough.facetExpressions.map(x => this.slotAssignment[x]);
                        }
                    } break;
                }
            }
        }
        for (let glyph of template.specification.glyphs) {
            glyph.table = this.tableAssignment[glyph.table];
        }
        return new ChartContainer(template.specification, dataset);
    }
}

export class ChartContainer {
    public chart: Specification.Chart;
    public dataset: Dataset.Dataset;
    public state: Specification.ChartState;
    public manager: Prototypes.ChartStateManager;

    constructor(specification: Specification.Chart, dataset: Dataset.Dataset) {
        this.chart = specification;
        this.dataset = dataset;
        this.manager = new Prototypes.ChartStateManager(specification, dataset);
        this.state = this.manager.chartState;
    }

    public update() {
        for (let i = 0; i < 2; i++) {
            let solver = new Solver.ChartConstraintSolver();
            solver.setup(this.manager);
            solver.solve();
            solver.destroy();
        }
    }

    public resize(width: number, height: number) {
        this.chart.mappings.width = { type: "value", value: width } as Specification.ValueMapping;
        this.chart.mappings.height = { type: "value", value: height } as Specification.ValueMapping;
    }

    public render(context: CanvasRenderingContext2D) {
        let renderer = new Graphics.ChartRenderer(this.manager);
        let graphics = renderer.render();
        context.save();
        context.translate((this.state.attributes.width as number) / 2, (this.state.attributes.height as number) / 2);
        renderGraphicalElementCanvas(context, graphics);
        context.restore();
    }
}