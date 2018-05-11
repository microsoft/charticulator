/** Color in RGB */
export interface Color {
    r: number;
    g: number;
    b: number;
}

/** Color gradient */
export interface ColorGradient {
    colorspace: "hcl" | "lab";
    colors: Color[];
}

/** Get Color from HTML color string */
export function colorFromHTMLColor(html: string): Color {
    let m: RegExpMatchArray;
    m = html.match(/^ *rgb *\( *([0-9\.\-e]+) *, *([0-9\.\-e]+) *, *([0-9\.\-e]+) *\) *$/);
    if (m) {
        return { r: +m[1], g: +m[2], b: +m[3] };
    }
    m = html.match(/^ *rgba *\( *([0-9\.\-e]+) *, *([0-9\.\-e]+) *, *([0-9\.\-e]+) *, *([0-9\.\-e]+) *\) *$/);
    if (m) {
        return { r: +m[1], g: +m[2], b: +m[3] };
    }
    m = html.match(/^ *\#([0-9a-fA-F]{3}) *$/);
    if (m) {
        const r = parseInt(m[1][0], 16) * 17;
        const g = parseInt(m[1][1], 16) * 17;
        const b = parseInt(m[1][2], 16) * 17;
        return { r, g, b };
    }
    m = html.match(/^ *\#([0-9a-fA-F]{6}) *$/);
    if (m) {
        const r = parseInt(m[1].slice(0, 2), 16);
        const g = parseInt(m[1].slice(2, 4), 16);
        const b = parseInt(m[1].slice(4, 6), 16);
        return { r, g, b };
    }
    return { r: 0, g: 0, b: 0 };
}

export function colorToHTMLColor(color: Color): string {
    return `rgb(${color.r.toFixed(0)},${color.g.toFixed(0)},${color.b.toFixed(0)})`;
}

export function colorToHTMLColorHEX(color: Color): string {
    const f = (x: number) => (0x100 | Math.round(x)).toString(16).substring(1);
    return `#${f(color.r)}${f(color.g)}${f(color.b)}`;
}

function xyz_to_lab_f(t: number): number {
    if (t > 0.008856451679035631) {
        return Math.cbrt(t);
    } else {
        return t / 0.12841854934601665 + 0.13793103448275862;
    }
}

// D65 Luminant
const D65_Xn = 95.047;
const D65_Yn = 100.000;
const D65_Zn = 108.883;

function xyz_to_lab(x: number, y: number, z: number): [number, number, number] {
    // D65 white point:
    const l = 116 * xyz_to_lab_f(y / D65_Yn) - 16;
    const a = 500 * (xyz_to_lab_f(x / D65_Xn) - xyz_to_lab_f(y / D65_Yn));
    const b = 200 * (xyz_to_lab_f(y / D65_Yn) - xyz_to_lab_f(z / D65_Zn));
    return [l, a, b];
}

function lab_to_xyz_f(t: number): number {
    if (t > 0.20689655172413793) {
        return t * t * t;
    } else {
        return 0.12841854934601665 * (t - 0.13793103448275862);
    }
}

function lab_to_xyz(l: number, a: number, b: number): [number, number, number] {
    const x = D65_Xn * lab_to_xyz_f((l + 16) / 116 + a / 500);
    const y = D65_Yn * lab_to_xyz_f((l + 16) / 116);
    const z = D65_Zn * lab_to_xyz_f((l + 16) / 116 - b / 200);
    return [x, y, z];
}

function hcl_to_lab(h_degree: number, c: number, l: number): [number, number, number] {
    const h = h_degree / 180 * Math.PI;
    return [l, c * Math.cos(h), c * Math.sin(h)];
}

function lab_to_hcl(l: number, a: number, b: number): [number, number, number] {
    const c = Math.sqrt(a * a + b * b);
    let h_degree = Math.atan2(b, a) / Math.PI * 180;
    h_degree = (h_degree % 360 + 360) % 360;
    return [h_degree, c, l];
}

function hcl_to_xyz(h: number, c: number, l: number): [number, number, number] {
    const [L, a, b] = hcl_to_lab(h, c, l);
    return lab_to_xyz(L, a, b);
}

function xyz_to_hcl(x: number, y: number, z: number): [number, number, number] {
    const [L, a, b] = xyz_to_lab(x, y, z);
    return lab_to_hcl(L, a, b);
}


function xyz_to_sRGB_f(v: number) {
    if (v > 0.0031308) {
        return 1.055 * Math.pow(v, (1.0 / 2.4)) - 0.055;
    } else {
        return 12.92 * v;
    }
}

function xyz_to_sRGB(x: number, y: number, z: number): [number, number, number, boolean] {
    const Rl = x * 3.2406 + y * -1.5372 + z * -0.4986;
    const Gl = x * -0.9689 + y * 1.8758 + z * 0.0415;
    const Bl = x * 0.0557 + y * -0.2040 + z * 1.0570;
    let r = xyz_to_sRGB_f(Rl / 100) * 255;
    let g = xyz_to_sRGB_f(Gl / 100) * 255;
    let b = xyz_to_sRGB_f(Bl / 100) * 255;
    const clamped = r < 0 || g < 0 || b < 0 || r > 255 || g > 255 || b > 255;
    r = Math.min(255, Math.max(0, r));
    g = Math.min(255, Math.max(0, g));
    b = Math.min(255, Math.max(0, b));
    return [r, g, b, clamped];
}

function sRGB_to_xyz_f(v: number) {
    if (v <= 0.04045) {
        return v / 12.92;
    } else {
        return Math.pow((v + 0.055) / 1.055, 2.4);
    }
}

function sRGB_to_xyz(r: number, g: number, b: number): [number, number, number] {
    const Rl = sRGB_to_xyz_f(r / 255);
    const Gl = sRGB_to_xyz_f(g / 255);
    const Bl = sRGB_to_xyz_f(b / 255);
    const x = 0.4124 * Rl + 0.3576 * Gl + 0.1805 * Bl;
    const y = 0.2126 * Rl + 0.7152 * Gl + 0.0722 * Bl;
    const z = 0.0193 * Rl + 0.1192 * Gl + 0.9505 * Bl;
    return [x * 100, y * 100, z * 100];
}

function xyz_to_AppleP3_f(v: number) {
    if (v > 0.0031308) {
        return 1.055 * Math.pow(v, (1.0 / 2.4)) - 0.055;
    } else {
        return 12.92 * v;
    }
}

function xyz_to_AppleP3(x: number, y: number, z: number): [number, number, number, boolean] {
    const Rl = x * 2.725394 + y * -1.018003 + z * -0.440163;
    const Gl = x * -0.795168 + y * 1.689732 + z * 0.022647;
    const Bl = x * 0.041242 + y * -0.087639 + z * 1.100929;
    let r = xyz_to_AppleP3_f(Rl / 100) * 255;
    let g = xyz_to_AppleP3_f(Gl / 100) * 255;
    let b = xyz_to_AppleP3_f(Bl / 100) * 255;
    const clamped = r < 0 || g < 0 || b < 0 || r > 255 || g > 255 || b > 255;
    r = Math.min(255, Math.max(0, r));
    g = Math.min(255, Math.max(0, g));
    b = Math.min(255, Math.max(0, b));
    return [r, g, b, clamped];
}

function AppleP3_to_xyz_f(v: number) {
    if (v <= 0.04045) {
        return v / 12.92;
    } else {
        return Math.pow((v + 0.055) / 1.055, 2.4);
    }
}

function AppleP3_to_xyz(r: number, g: number, b: number): [number, number, number] {
    const Rl = AppleP3_to_xyz_f(r / 255);
    const Gl = AppleP3_to_xyz_f(g / 255);
    const Bl = AppleP3_to_xyz_f(b / 255);
    const x = 0.445170 * Rl + 0.277134 * Gl + 0.172283 * Bl;
    const y = 0.209492 * Rl + 0.721595 * Gl + 0.068913 * Bl;
    const z = 0.000000 * Rl + 0.047061 * Gl + 0.907355 * Bl;
    return [x * 100, y * 100, z * 100];
}

export type ColorConverter = (a: number, b: number, c: number) => [number, number, number] | [number, number, number, boolean];
const colorspaces = new Map<string, { fromXYZ: ColorConverter, toXYZ: ColorConverter }>();
const converter_cache = new Map<string, ColorConverter>();

function addColorspace(name: string, fromXYZ: ColorConverter, toXYZ: ColorConverter) {
    colorspaces.set(name, { fromXYZ, toXYZ });
}

addColorspace("lab", xyz_to_lab, lab_to_xyz);
addColorspace("sRGB", xyz_to_sRGB, sRGB_to_xyz);
addColorspace("AppleDisplayP3", xyz_to_AppleP3, AppleP3_to_xyz);
addColorspace("hcl", xyz_to_hcl, hcl_to_xyz);

export function getColorConverter(from: string, to: string): ColorConverter {
    const hash = from + "|" + to;
    if (converter_cache.has(hash)) { return converter_cache.get(hash); }
    let c: ColorConverter;
    if (from == to) {
        c = (a: number, b: number, c: number) => [a, b, c];
    } else if (from == "xyz") {
        c = colorspaces.get(to).fromXYZ;
    } else if (to == "xyz") {
        c = colorspaces.get(from).toXYZ;
    } else {
        const f1 = colorspaces.get(from).toXYZ;
        const f2 = colorspaces.get(to).fromXYZ;
        c = (a: number, b: number, c: number) => {
            const [x, y, z] = f1(a, b, c);
            return f2(x, y, z);
        };
    }
    converter_cache.set(hash, c);
    return c;
}

export type ColorInterpolation = (t: number) => Color;

function hueInterp(a: number, b: number, t: number): number {
    if (Math.abs(b - a) > 180) {
        if (b > a) {
            b = b - 360;
        } else {
            a = a - 360;
        }
    }
    return t * (b - a) + a;
}

export function interpolateColor(from: Color, to: Color, colorspace: string = "lab"): ColorInterpolation {
    const color_to_space = getColorConverter("sRGB", colorspace);
    const space_to_color = getColorConverter(colorspace, "sRGB");
    const c1 = color_to_space(from.r, from.g, from.b);
    const c2 = color_to_space(to.r, to.g, to.b);
    return (t: number) => {
        t = Math.min(1, Math.max(0, t));
        const [r, g, b] = space_to_color(
            colorspace == "hcl" ? hueInterp(c1[0], c2[0], t) : c1[0] * (1 - t) + c2[0] * t,
            c1[1] * (1 - t) + c2[1] * t,
            c1[2] * (1 - t) + c2[2] * t
        );
        return { r, g, b };
    };
}

export function interpolateColors(colors: Color[], colorspace: string = "lab"): ColorInterpolation {
    const color_to_space = getColorConverter("sRGB", colorspace);
    const space_to_color = getColorConverter(colorspace, "sRGB");
    const cs = colors.map(x => color_to_space(x.r, x.g, x.b));
    return (t: number) => {
        t = Math.min(1, Math.max(0, t));
        const pos = t * (colors.length - 1);
        let i1 = Math.floor(pos);
        let i2 = i1 + 1;
        i1 = Math.min(colors.length - 1, Math.max(i1, 0));
        i2 = Math.min(colors.length - 1, Math.max(i2, 0));
        const d = pos - i1;
        const c1 = cs[i1];
        const c2 = cs[i2];
        const [r, g, b] = space_to_color(
            colorspace == "hcl" ? hueInterp(c1[0], c2[0], d) : c1[0] * (1 - d) + c2[0] * d,
            c1[1] * (1 - d) + c2[1] * d,
            c1[2] * (1 - d) + c2[2] * d
        );
        return { r, g, b };
    };
}