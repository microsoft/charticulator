import { ConstraintSolver, ConstraintPlugin, Variable } from "../abstract";
import * as d3 from "d3";

export class PackingPlugin extends ConstraintPlugin {
    solver: ConstraintSolver;
    cx: Variable; cy: Variable;
    points: [Variable, Variable, number][];

    constructor(solver: ConstraintSolver, cx: Variable, cy: Variable, points: [Variable, Variable, number][]) {
        super();
        this.solver = solver;
        this.cx = cx;
        this.cy = cy;
        this.points = points;
    }

    public apply() {
        let cx = this.solver.getValue(this.cx);
        let cy = this.solver.getValue(this.cy);
        let nodes = this.points.map(pt => {
            return {
                x: this.solver.getValue(pt[0]) - cx,
                y: this.solver.getValue(pt[1]) - cy,
                r: pt[2]
            };
        });

        let force = d3.forceSimulation(nodes);
        force.force("collision", d3.forceCollide<{ x: number, y: number, r: number }>(d => d.r));
        force.force("gravityX", d3.forceX().strength(0.1));
        force.force("gravityY", d3.forceY().strength(0.1));
        force.stop();
        let n = Math.ceil(Math.log(force.alphaMin()) / Math.log(1 - force.alphaDecay()));
        for (let i = 0; i < n; i++) {
            force.tick();
        }

        for (let i = 0; i < nodes.length; i++) {
            this.solver.setValue(this.points[i][0], nodes[i].x + cx);
            this.solver.setValue(this.points[i][1], nodes[i].y + cy);
        }
        return true;
    }
}