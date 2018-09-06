/*
Copyright (c) Microsoft Corporation. All rights reserved.
Licensed under the MIT license.
*/
// import { fillDefaults } from "../common";
// import { BLAS, BLASFloat64Array } from "../blas";

// export type FComputeGradient = (dLoss: number, variables: Float64Array, gradients: Float64Array) => void;
// export type FComputeLoss = (variables: Float64Array) => number;
// export type FComputeLossGradient = [FComputeLoss, FComputeGradient];

// export interface GradientDescentOptions {
//     learningRate?: number;
//     tolerance?: number;
//     maxIterations?: number;
//     verbose?: boolean;
// }

// // Given initial x, optimize y with gradient function gradient
// export function gradientDescent(
//     blas: BLAS,
//     x: BLASFloat64Array,
//     f: (x: BLASFloat64Array, gradients?: BLASFloat64Array) => number,
//     options: GradientDescentOptions = {}
// ) {
//     let gradients = blas.allocateFloat64Array(x.length);
//     let newX = blas.allocateFloat64Array(x.length);
//     let loss = f(x, gradients);

//     let { learningRate, tolerance, maxIterations, verbose } = fillDefaults(options, {
//         learningRate: 0.1,
//         tolerance: 1e-8,
//         maxIterations: 1000,
//         verbose: false
//     });

//     for (let i = 0; i < maxIterations; i++) {
//         let gradientLength = Math.sqrt(blas.dot(gradients, gradients));
//         if (gradientLength < tolerance) break;

//         blas.weightedSum(newX, x, gradients, 1, -learningRate);

//         let nextLoss = f(newX, gradients);
//         if (nextLoss < loss) {
//             loss = nextLoss;
//             blas.copy(x, newX);
//         } else {
//             learningRate *= 0.8;
//         }
//     }

//     blas.free(gradients);
//     blas.free(newX);
// }

// export interface RMSPropOptions {
//     eta?: number;
//     gamma?: number;
//     tolerance?: number;
//     learningRate?: number;
//     maxIterations?: number;
// }

// export function RMSProp(
//     blas: BLAS,
//     x: BLASFloat64Array,
//     f: (x: BLASFloat64Array, gradients?: BLASFloat64Array) => number,
//     options: RMSPropOptions = {}
// ) {
//     let { eta, gamma, maxIterations, tolerance, learningRate } = fillDefaults(options, {
//         eta: 0.001,
//         gamma: 0.9,
//         maxIterations: 10000,
//         learningRate: 0.1,
//         tolerance: 1e-8
//     });

//     let gradients = blas.allocateFloat64Array(x.length);
//     let R = blas.allocateFloat64Array(x.length);
//     let newX = blas.allocateFloat64Array(x.length);

//     blas.ones(R);

//     let loss = f(x, gradients);

//     for (let i = 0; i < maxIterations; i++) {
//         let gradientLength = Math.sqrt(blas.dot(gradients, gradients));
//         if (gradientLength < tolerance) {
//             break;
//         }

//         // Update R
//         let _R = blas.getFloat64Array(R);
//         let _x = blas.getFloat64Array(x);
//         let _newX = blas.getFloat64Array(newX);
//         let _gradients = blas.getFloat64Array(gradients);
//         for (let k = 0; k < x.length; ++k) {
//             _R[k] = (1 - gamma) * _R[k] + gamma * _gradients[k] * _gradients[k];
//             _newX[k] = _x[k] - learningRate * _gradients[k] / Math.sqrt(_R[k] + 1e-6);
//         }

//         let newLoss = f(newX, gradients);
//         if (newLoss < loss) {
//             loss = newLoss;
//             blas.copy(x, newX);
//         } else {
//             learningRate *= 0.8;
//             f(x, gradients);
//         }
//     }

//     blas.free(gradients);
//     blas.free(R);
//     blas.free(newX);
// }

// export interface CGContext {
//     x: BLASFloat64Array;
//     y: number;
//     gradient: BLASFloat64Array;
// }

// export interface ConjugateGradientOptions {
//     tolerance?: number;
//     maxIterations?: number;
//     verbose?: boolean;
// }

// /** Conjugate gradient method to minimize ||Ax - b||^2 */
// export function linearConjugateGradient(
//     blas: BLAS,
//     x: BLASFloat64Array,
//     b: BLASFloat64Array,
//     fAx: (x: BLASFloat64Array, y: BLASFloat64Array) => void,
//     options: ConjugateGradientOptions = {}
// ) {
//     let { tolerance, maxIterations, verbose } = fillDefaults(options, {
//         tolerance: 1e-8,
//         maxIterations: 1000,
//         verbose: false
//     });

//     let success = false;

//     let r = blas.allocateFloat64Array(b.length);
//     let y = blas.allocateFloat64Array(b.length);
//     let p = blas.allocateFloat64Array(b.length);

//     // r = b - Ax
//     fAx(x, y);
//     blas.weightedSum(r, b, y, 1, -1);
//     blas.copy(p, r);

//     let rTr = blas.dot(r, r);

//     for (let k = 0; k < maxIterations; k++) {
//         // y = A p
//         fAx(p, y);
//         // alphaK = rTr / (pT A p)
//         let alphaK = rTr / blas.dot(p, y);
//         // x = x + alphaK * p
//         blas.weightedSum(x, x, p, 1, alphaK);
//         // r = r - alphaK * A p
//         blas.weightedSum(r, r, y, 1, -alphaK);
//         let residualLength = blas.dot(r, r);
//         if (residualLength < tolerance) {
//             success = true;
//             break;
//         }
//         let rTrNew = blas.dot(r, r);
//         let betaK = rTrNew / rTr;
//         blas.weightedSum(p, r, p, 1, betaK);
//         rTr = rTrNew;
//     }

//     blas.free(r);
//     blas.free(y);
//     blas.free(p);

//     return success;
// }

// export function conjugateGradient(
//     blas: BLAS,
//     x: BLASFloat64Array,
//     f: (x: BLASFloat64Array, gradients?: BLASFloat64Array) => number,
//     options: ConjugateGradientOptions = {}
// ) {
//     let { tolerance, maxIterations, verbose } = fillDefaults(options, {
//         tolerance: 1e-8,
//         maxIterations: 1000,
//         verbose: false
//     });
//     let success = false;

//     // allocate all memory up front here, keep out of the loop for perfomance
//     // reasons
//     let g1 = blas.allocateFloat64Array(x.length);
//     let cx1 = blas.allocateFloat64Array(x.length); blas.copy(cx1, x);
//     let current: CGContext = { x: cx1, y: f(x, g1), gradient: g1 };

//     let g2 = blas.allocateFloat64Array(x.length);
//     let cx2 = blas.allocateFloat64Array(x.length); blas.copy(cx2, x);
//     let next: CGContext = { x: cx2, y: f(x, g2), gradient: g2 };

//     let yk = blas.allocateFloat64Array(x.length); blas.copy(yk, x);
//     let pk: BLASFloat64Array;
//     let temp: CGContext;
//     let a = 1;

//     pk = blas.allocateFloat64Array(x.length);

//     blas.scale(pk, current.gradient, -1);

//     let alreadyReset = false;

//     for (let i = 0; i < maxIterations; ++i) {
//         // a = wolfeLineSearch(blas, f, pk, current, next, a);
//         let a = quadraticLineSearch(blas, f, pk, current, next);

//         if (!a) {
//             // faiiled to find point that satifies wolfe conditions.
//             // reset direction for next iteration
//             blas.scale(pk, current.gradient, -1);
//             if (alreadyReset) {
//                 console.log("line search failed");
//                 break;
//             }
//             alreadyReset = true;
//         } else {
//             // // update direction using Polak–Ribiere CG method
//             // blas.weightedSum(yk, next.gradient, current.gradient, 1, -1);

//             // let delta_k = blas.dot(current.gradient, current.gradient);
//             // let beta_k = Math.max(0, blas.dot(yk, next.gradient) / delta_k);

//             // alternatively, use Fletcher-Reeves method:
//             let beta_k = blas.dot(next.gradient, next.gradient) / blas.dot(current.gradient, current.gradient);

//             // Update search direction
//             blas.weightedSum(pk, pk, next.gradient, beta_k, -1);

//             temp = current;
//             current = next;
//             next = temp;
//             alreadyReset = false;
//         }

//         let gradientLength = Math.sqrt(blas.dot(current.gradient, current.gradient)) / current.gradient.length;
//         // console.log(a, gradientLength);
//         if (gradientLength <= tolerance) {
//             success = true;
//             break;
//         }
//     }

//     blas.copy(x, current.x);

//     blas.free(g1);
//     blas.free(g2);
//     blas.free(pk);
//     blas.free(cx1);
//     blas.free(cx2);
//     blas.free(yk);

//     return success;
// }

// export function quadraticLineSearch(
//     blas: BLAS,
//     f: (x: BLASFloat64Array, g: BLASFloat64Array) => number,
//     pk: BLASFloat64Array, current: CGContext, next: CGContext,
//     a: number = 1
// ) {
//     let scaler = 100;
//     let y0 = current.y;
//     blas.weightedSum(next.x, current.x, pk, 1, scaler);
//     let y1 = f(next.x, null) - y0;
//     blas.weightedSum(next.x, current.x, pk, 1, scaler * 2);
//     let y2 = f(next.x, null) - y0;
//     let qa = (y2 - y1 * 2) / (2 * scaler * scaler);
//     let qb = y1 / scaler - qa * scaler;
//     if (Math.abs(qa) < 1e-20) {
//         blas.weightedSum(next.x, current.x, pk, 1, 0);
//         next.y = f(next.x, next.gradient);
//         return 0;
//     } else {
//         let minimize = -qb / (2 * qa);
//         if(minimize < 0) {
//             return 0;
//         } else {
//             blas.weightedSum(next.x, current.x, pk, 1, minimize);
//             next.y = f(next.x, next.gradient);
//             return minimize;
//         }
//     }
// }

// export function wolfeLineSearch(
//     blas: BLAS,
//     f: (x: BLASFloat64Array, g: BLASFloat64Array) => number,
//     pk: BLASFloat64Array, current: CGContext, next: CGContext,
//     a: number = 1, c1: number = 1e-8, c2: number = 0.01
// ) {
//     let phi0 = current.y, phiPrime0 = blas.dot(current.gradient, pk),
//         phi = phi0, phi_old = phi0,
//         phiPrime = phiPrime0,
//         a0 = 0;

//     function zoom(a_lo: number, a_high: number, phi_lo: number) {
//         for (var iteration = 0; iteration < 16; ++iteration) {
//             a = (a_lo + a_high) / 2;
//             blas.weightedSum(next.x, current.x, pk, 1, a);
//             phi = next.y = f(next.x, next.gradient);
//             phiPrime = blas.dot(next.gradient, pk);

//             if ((phi > (phi0 + c1 * a * phiPrime0)) ||
//                 (phi >= phi_lo)) {
//                 a_high = a;

//             } else {
//                 if (Math.abs(phiPrime) <= -c2 * phiPrime0) {
//                     return a;
//                 }

//                 if (phiPrime * (a_high - a_lo) >= 0) {
//                     a_high = a_lo;
//                 }

//                 a_lo = a;
//                 phi_lo = phi;
//             }
//         }

//         return 0;
//     }

//     for (var iteration = 0; iteration < 16; ++iteration) {
//         blas.weightedSum(next.x, current.x, pk, 1, a);
//         phi = next.y = f(next.x, next.gradient)
//         phiPrime = blas.dot(next.gradient, pk);
//         if ((phi > (phi0 + c1 * a * phiPrime0)) ||
//             (iteration && (phi >= phi_old))) {
//             return zoom(a0, a, phi_old);
//         }

//         if (Math.abs(phiPrime) <= -c2 * phiPrime0) {
//             return a;
//         }

//         if (phiPrime >= 0) {
//             return zoom(a, a0, phi);
//         }

//         phi_old = phi;
//         a0 = a;
//         a *= 2;
//     }

//     return a;
// }

// export interface ExpressionGroup {
//     size(): number;
//     computeExpression(x: BLASFloat64Array, output: BLASFloat64Array): void;
//     computeGradient(dY: BLASFloat64Array, x: BLASFloat64Array, gradients: BLASFloat64Array): void;
// }

// export function lagrangeOptimizer(
//     blas: BLAS,
//     x0: BLASFloat64Array,
//     minimize: ExpressionGroup,
//     constraints: ExpressionGroup,
//     options: {
//         tolerance?: number;
//         cgOptions?: ConjugateGradientOptions;
//         verbose?: boolean;
//     } = {}
// ) {
//     let { tolerance, cgOptions } = fillDefaults(options, {
//         tolerance: 1e-6,
//         cgOptions: {},
//         verbose: false
//     });
//     let N = x0.length;
//     let nMinimize = minimize.size();
//     let nConstraint = constraints.size();
//     let phiX = blas.allocateFloat64Array(N + constraints.size());
//     blas.zeros(phiX);
//     blas.copy(phiX, x0);
//     let lambdas = blas.subarray(phiX, N);
//     let mu = 100;

//     let Y1 = blas.allocateFloat64Array(minimize.size());
//     let Y2 = blas.allocateFloat64Array(constraints.size());

//     let phiK = (x: BLASFloat64Array, gradients?: BLASFloat64Array) => {
//         if (gradients != null) {
//             blas.zeros(gradients);
//         }
//         minimize.computeExpression(x, Y1);
//         constraints.computeExpression(x, Y2);
//         let fval = blas.dot(Y1, Y1);
//         blas.scale(Y1, Y1, 2.0);
//         if (gradients != null) {
//             minimize.computeGradient(Y1, x, gradients);
//         }
//         fval += 0.5 * mu * blas.dot(Y2, Y2) - blas.dot(lambdas, Y2);
//         blas.weightedSum(Y2, Y2, lambdas, mu, -1);
//         if (gradients != null) {
//             constraints.computeGradient(Y2, x, gradients);
//         }
//         return fval;
//     };
//     for (let iteration = 0; iteration < 5; iteration++) {
//         let success = conjugateGradient(blas, phiX, phiK, cgOptions);
//         if (!success) {
//             // console.log("CG failed...");
//             // RMSProp(blas, phiX, phiK, { tolerance: cgOptions.tolerance });
//         }

//         minimize.computeExpression(phiX, Y1);
//         constraints.computeExpression(phiX, Y2);

//         // Update lambda
//         blas.weightedSum(lambdas, lambdas, Y2, 1, -mu);

//         let functionLoss = blas.dot(Y1, Y1);
//         let constraintsLoss = blas.dot(Y2, Y2);
//         // console.log("lagrangeOptimizer", iteration + 1, mu.toFixed(2), functionLoss.toFixed(2), constraintsLoss.toFixed(2))

//         if (Math.sqrt(constraintsLoss) < tolerance) {
//             break;
//         }

//         mu *= 10;
//     }
//     blas.copy(x0, phiX);

//     blas.free(Y1);
//     blas.free(Y2);
//     blas.free(phiX);
// }
