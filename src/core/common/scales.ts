const e10 = Math.sqrt(50);
const e5 = Math.sqrt(10);
const e2 = Math.sqrt(2);

export namespace Scale {

    /** D3's d3.tickIncrement function */
    export function tickIncrement(start: number, stop: number, count: number) {
        const step = (stop - start) / Math.max(0, count);
        const power = Math.floor(Math.log(step) / Math.LN10);
        const error = step / Math.pow(10, power);
        return power >= 0
            ? (error >= e10 ? 10 : error >= e5 ? 5 : error >= e2 ? 2 : 1) * Math.pow(10, power)
            : -Math.pow(10, -power) / (error >= e10 ? 10 : error >= e5 ? 5 : error >= e2 ? 2 : 1);
    }

    /** Calculate nice scale boundaries */
    export function nice(domainMin: number, domainMax: number, count: number = 10): [number, number] {
        let step = tickIncrement(domainMin, domainMax, count);
        if (step > 0) {
            domainMin = Math.floor(domainMin / step) * step;
            domainMax = Math.ceil(domainMax / step) * step;
            step = tickIncrement(domainMin, domainMax, count);
        } else if (step < 0) {
            domainMin = Math.ceil(domainMin * step) / step;
            domainMax = Math.floor(domainMax * step) / step;
            step = tickIncrement(domainMin, domainMax, count);
        }
        if (step > 0) {
            domainMin = Math.floor(domainMin / step) * step;
            domainMax = Math.ceil(domainMax / step) * step;
        } else if (step < 0) {
            domainMin = Math.ceil(domainMin * step) / step;
            domainMax = Math.floor(domainMax * step) / step;
        }
        return [domainMin, domainMax];
    }

    export function ticks(start: number, stop: number, count: number): number[] {
        const reverse = stop < start
        let i = -1,
            n,
            ticks,
            step;

        if (reverse) { n = start, start = stop, stop = n; }

        if ((step = tickIncrement(start, stop, count)) === 0 || !isFinite(step)) { return []; }

        if (step > 0) {
            start = Math.ceil(start / step);
            stop = Math.floor(stop / step);
            ticks = new Array<number>(n = Math.ceil(stop - start + 1));
            while (++i < n) { ticks[i] = (start + i) * step; }
        } else {
            start = Math.floor(start * step);
            stop = Math.ceil(stop * step);
            ticks = new Array<number>(n = Math.ceil(start - stop + 1));
            while (++i < n) { ticks[i] = (start - i) / step; }
        }

        if (reverse) { ticks.reverse(); }

        return ticks;
    }

    /** Base scale class */
    export abstract class BaseScale<InputType, OutputType> {
        /** Infer scale parameters given a list of values */
        public abstract inferParameters(values: InputType[]): void;
        /** Get mapped value */
        public abstract get(value: InputType): OutputType;
        /** Get mapped values */
        public map(values: InputType[]): OutputType[] {
            return values.map(x => x == null ? null : this.get(x));
        }
    }

    export class NumericalScale extends BaseScale<number, number> {
        public domainMin: number;
        public domainMax: number;

        public inferParameters(values: number[]) {
            const [min, max] = nice(Math.min(...values), Math.max(...values), 10);
            this.domainMin = min;
            this.domainMax = max;
        }

        public get(v: number) {
            return (v - this.domainMin) / (this.domainMax - this.domainMin);
        }

        public ticks(n: number = 10) {
            return ticks(this.domainMin, this.domainMax, n);
        }
    }

    export class DateScale extends BaseScale<Date, number> {
        public domainMin: number;
        public domainMax: number;

        public inferParameters(values: Date[]) {
            const timestamps = values.map(x => x != null ? x.getTime() : null);
            const [min, max] = nice(Math.min(...timestamps), Math.max(...timestamps), 10);
            this.domainMin = min;
            this.domainMax = max;
        }

        public get(v: Date) {
            return (v.getTime() - this.domainMin) / (this.domainMax - this.domainMin);
        }
    }

    export class CategoricalScale extends BaseScale<string, number> {
        public domain: Map<string, number>;
        public length: number;

        public inferParameters(values: string[], order: "alphabetically" | "occurrence" | "order" = "alphabetically") {
            const vals = new Map<string, number>();
            const domain: string[] = [];
            for (const v of values) {
                if (v == null) { continue; }
                if (vals.has(v)) {
                    vals.set(v, vals.get(v) + 1);
                } else {
                    vals.set(v, 1);
                    domain.push(v);
                }
            }
            // Sort alphabetically
            switch (order) {
                case "alphabetically": {
                    domain.sort((a, b) => a < b ? -1 : 1);
                } break;
                case "occurrence": {
                    domain.sort((a, b) => {
                        const ca = vals.get(a);
                        const cb = vals.get(b);
                        if (ca != cb) {
                            return cb - ca;
                        } else {
                            return a < b ? -1 : 1;
                        }
                    });
                } break;
                case "order": {
                } break;
            }
            this.domain = new Map<string, number>();
            for (let i = 0; i < domain.length; i++) {
                this.domain.set(domain[i], i);
            }
            this.length = domain.length;
        }

        public get(v: string) {
            return this.domain.get(v);
        }
    }
}