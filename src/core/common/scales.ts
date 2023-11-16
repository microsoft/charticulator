// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
/* eslint-disable @typescript-eslint/no-namespace */

import { scaleUtc, scaleLinear, scaleLog, scaleTime } from "d3-scale";
import { timeFormat, utcFormat } from "d3-time-format";
import { getSortFunctionByData, isUtcTimeZone } from ".";
import { OrderMode } from "../specification/types";

export namespace Scale {
  /** Base scale class */
  export abstract class BaseScale<InputType, OutputType> {
    /** Infer scale parameters given a list of values */
    public abstract inferParameters(values: InputType[]): void;
    /** Get mapped value */
    public abstract get(value: InputType): OutputType;
    /** Get mapped values */
    public map(values: InputType[]): OutputType[] {
      return values.map((x) => (x == null ? null : this.get(x)));
    }
  }

  export class LinearScale extends BaseScale<number, number> {
    public domainMin: number;
    public domainMax: number;

    public inferParameters(values: number[]) {
      values = values.filter(v => !isNaN(v))
      const scale = scaleLinear()
        .domain([Math.min(...values), Math.max(...values)])
        .nice();
      this.domainMin = scale.domain()[0];
      this.domainMax = scale.domain()[1];
      if (this.domainMax == this.domainMin) {
        this.domainMax = this.domainMin + 1;
      }
    }

    public adjustDomain(options: {
      startWithZero?: "default" | "always" | "never";
    }) {
      if (options.startWithZero == "default" || options.startWithZero == null) {
        if (this.domainMin > 0) {
          this.domainMin = 0;
        }
      } else if (options.startWithZero == "always") {
        this.domainMin = 0;
      }
    }

    public get(v: number) {
      return (v - this.domainMin) / (this.domainMax - this.domainMin);
    }

    public ticks(n: number = 10) {
      const scale = scaleLinear().domain([this.domainMin, this.domainMax]);
      return scale.ticks(n);
    }

    public tickFormat(n: number = 10, specifier?: string) {
      const scale = scaleLinear().domain([this.domainMin, this.domainMax]);
      return scale.tickFormat(n, specifier);
    }
  }

  export class LogarithmicScale extends BaseScale<number, number> {
    public domainMin: number;
    public domainMax: number;

    public inferParameters(values: number[]) {
      const min = Math.min(...values);
      const scale = scaleLog()
        .domain([min <= 0 ? 1 : min, Math.max(...values)])
        .nice();
      this.domainMin = scale.domain()[0];
      this.domainMax = scale.domain()[1];
      if (this.domainMax == this.domainMin) {
        this.domainMax = this.domainMin + 1;
      }
    }

    public get(v: number) {
      return (
        (Math.log(v) - Math.log(this.domainMin)) /
        (Math.log(this.domainMax) - Math.log(this.domainMin))
      );
    }

    public ticks(n: number = 10) {
      const scale = scaleLog().domain([this.domainMin, this.domainMax]);
      return scale.ticks(n);
    }

    public tickFormat(n: number = 10, specifier?: string) {
      const scale = scaleLog().domain([this.domainMin, this.domainMax]);
      return scale.tickFormat(n, specifier);
    }
  }

  export class DateScale extends LinearScale {
    public inferParameters(values: number[], nice: boolean = true) {
      const filteredValues = values.filter((val) => !isNaN(val));
      let scale = (isUtcTimeZone() ? scaleUtc() : scaleTime()).domain([
        Math.min(...filteredValues),
        Math.max(...filteredValues),
      ]);
      if (nice) {
        scale = scale.nice();
      }
      this.domainMin = scale.domain()[0].getTime();
      this.domainMax = scale.domain()[1].getTime();
      if (this.domainMax == this.domainMin) {
        this.domainMax = this.domainMin + 1000; // 1 second difference
      }
    }

    public ticks(n: number = 10) {
      const scale = (isUtcTimeZone() ? scaleUtc() : scaleTime()).domain([this.domainMin, this.domainMax]);
      return scale.ticks(n).map((x) => x.getTime());
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public tickFormat(_n: number = 10, specifier: string) {
      const fmt = isUtcTimeZone() ? utcFormat(specifier) : timeFormat(specifier);

      return (t: number) => fmt(new Date(t));
    }
  }

  export class CategoricalScale extends BaseScale<string, number> {
    public domain: Map<string, number>;
    public length: number;

    public inferParameters(
      values: string[],
      order: OrderMode = OrderMode.alphabetically
    ) {
      const vals = new Map<string, number>();
      const domain: string[] = [];
      for (let v of values) {
        if (v == null) {
          continue;
        }
        v = v.toString();
        if (vals.has(v)) {
          vals.set(v, vals.get(v) + 1);
        } else {
          vals.set(v, 1);
          domain.push(v);
        }
      }
      // Sort alphabetically
      switch (order) {
        case "alphabetically":
          {
            domain.sort(getSortFunctionByData(domain));
          }
          break;
        case "occurrence":
          {
            domain.sort((a, b) => {
              const ca = vals.get(a);
              const cb = vals.get(b);
              if (ca != cb) {
                return cb - ca;
              } else {
                return a < b ? -1 : 1;
              }
            });
          }
          break;
        // case "order":
        //   {
        //   }
        //   break;
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
