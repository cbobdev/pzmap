import { type NodeRecord } from './types';
import { state, activeQty, type AppState } from './state';
import { val } from './model/quantity';
import { cellValue, testFilter } from './model/filter';
import { type SignDomain } from './model/color';

const f = (r: NodeRecord, k: string): number => (r as unknown as Record<string, number>)[k] ?? 0;

/** Active quantity value (display units) for a node. */
export const activeVal = (r: NodeRecord, s: AppState = state): number => val(r, activeQty(s), s.uf);

/** The group a node belongs to (last assignment wins), or null. */
export function groupOf(no: number, s: AppState = state): (typeof s.groups)[number] | null {
  for (let i = s.groups.length - 1; i >= 0; i--) if (s.groups[i]!.nodes.includes(no)) return s.groups[i]!;
  return null;
}

/** A node is hidden when a group is isolated and it's not in that group, or
 *  (no isolation) when its group exists and is toggled invisible. */
export function hiddenByGroup(r: NodeRecord, s: AppState = state): boolean {
  if (s.isolate != null) {
    const iso = s.groups.find((g) => g.id === s.isolate);
    return !iso || !iso.nodes.includes(r.no);
  }
  const g = groupOf(r.no, s);
  return !!g && !g.visible;
}

/** Uplift = negative Pz min (real tension on the support). */
export const isUplift = (r: NodeRecord): boolean => f(r, 'Pz_min') < 0;

/** Min/max of the active quantity over all nodes (value color scale + histogram). */
export function valueRange(s: AppState = state): { min: number; max: number } {
  if (!s.nodes.length) return { min: 0, max: 1 };
  let min = Infinity,
    max = -Infinity;
  for (const r of s.nodes) {
    const v = activeVal(r, s);
    if (v < min) min = v;
    if (v > max) max = v;
  }
  if (min === max) max = min + (Math.abs(min) || 1) * 0.1;
  return { min, max };
}

export const maxAbs = (s: AppState = state): number =>
  Math.max(1e-9, ...s.nodes.map((r) => Math.abs(activeVal(r, s))));

function percentile(sortedAsc: number[], p: number): number {
  if (!sortedAsc.length) return 0;
  const i = (sortedAsc.length - 1) * p;
  const lo = Math.floor(i),
    hi = Math.ceil(i);
  return sortedAsc[lo]! + (sortedAsc[hi]! - sortedAsc[lo]!) * (i - lo);
}

/** Robust color domain for value mode: 2nd–98th percentile of the active value,
 *  so a few outliers don't wash the bulk pale. */
export function colorDomain(s: AppState = state): { min: number; max: number } {
  if (!s.nodes.length) return { min: 0, max: 1 };
  const vs = s.nodes.map((r) => activeVal(r, s)).sort((a, b) => a - b);
  const min = percentile(vs, 0.02);
  let max = percentile(vs, 0.98);
  if (min === max) max = min + (Math.abs(min) || 1) * 0.1;
  return { min, max };
}

/** Robust per-sign magnitude domain: positive→red by v/posMax, negative→blue
 *  by |v|/negMax (98th percentile of each sign). */
export function signDomain(s: AppState = state): SignDomain {
  const vs = s.nodes.map((r) => activeVal(r, s));
  const pos = vs.filter((v) => v > 0).sort((a, b) => a - b);
  const neg = vs.filter((v) => v < 0).map((v) => Math.abs(v)).sort((a, b) => a - b);
  return {
    posMax: pos.length ? percentile(pos, 0.98) || 1 : 1,
    negMax: neg.length ? percentile(neg, 0.98) || 1 : 1,
  };
}

/** The metric the legend/slider act on: the signed active value. */
export function metricOf(r: NodeRecord, s: AppState = state): number {
  return activeVal(r, s);
}

export function metricRange(s: AppState = state): { min: number; max: number } {
  if (!s.nodes.length) return { min: 0, max: 1 };
  let min = Infinity,
    max = -Infinity;
  for (const r of s.nodes) {
    const v = metricOf(r, s);
    if (v < min) min = v;
    if (v > max) max = v;
  }
  if (min === max) max = min + (Math.abs(min) || 1) * 0.1;
  return { min, max };
}

export const winLo = (s: AppState = state): number =>
  s.win.lo == null ? metricRange(s).min : s.win.lo;
export const winHi = (s: AppState = state): number =>
  s.win.hi == null ? metricRange(s).max : s.win.hi;
const inWin = (v: number, s: AppState): boolean => v >= winLo(s) - 1e-9 && v <= winHi(s) + 1e-9;
export const winActive = (s: AppState = state): boolean => s.win.lo != null || s.win.hi != null;

function passesColF(r: NodeRecord, s: AppState): boolean {
  for (const k in s.colF) {
    const expr = s.colF[k];
    if (!expr) continue;
    if (!testFilter(expr, cellValue(r, k, s.uf), true)) return false;
  }
  return true;
}

/** Rows passing per-column filters + display-limits window + group visibility. */
export function filteredRows(s: AppState = state): NodeRecord[] {
  return s.nodes.filter(
    (r) => !hiddenByGroup(r, s) && passesColF(r, s) && inWin(metricOf(r, s), s),
  );
}

/** Robust [2,98] percentile domain of an arbitrary node key (× unit factor). */
export function keyDomain(key: string, s: AppState = state): { min: number; max: number } {
  if (!s.nodes.length) return { min: 0, max: 1 };
  const vs = s.nodes.map((r) => f(r, key) * s.uf).sort((a, b) => a - b);
  const min = percentile(vs, 0.02);
  let max = percentile(vs, 0.98);
  if (min === max) max = min + (Math.abs(min) || 1) * 0.1;
  return { min, max };
}

const R_MIN = 4;
const R_MAX = 16;

/** Clamped dot radius (viewBox units): |v| ≤ domLo → rMin, ≥ domHi → rMax,
 *  sqrt-interpolated between; uniform when sizeUniform is on. */
export function radiusClamp(absVal: number, domMin: number, domMax: number, s: AppState = state): number {
  if (s.sizeUniform) return 6;
  const domLo = Math.min(Math.abs(domMin), Math.abs(domMax));
  const domHi = Math.max(Math.abs(domMin), Math.abs(domMax)) || 1;
  if (domHi <= domLo) return (R_MIN + R_MAX) / 2;
  const u = Math.max(0, Math.min(1, (absVal - domLo) / (domHi - domLo)));
  return R_MIN + (R_MAX - R_MIN) * Math.sqrt(u);
}

/** Radius for the active-quantity magnitude, over the robust color domain. */
export function radiusFor(absVal: number, s: AppState = state): number {
  const d = colorDomain(s);
  return radiusClamp(absVal, d.min, d.max, s);
}

/** Filtered rows sorted by the active sort key/direction. */
export function sortedRows(s: AppState = state): NodeRecord[] {
  const rows = filteredRows(s);
  const k = s.sortKey,
    dir = s.sortDir;
  return rows.slice().sort((a, b) => {
    const va = cellValue(a, k, s.uf);
    const vb = cellValue(b, k, s.uf);
    return typeof va === 'number' && typeof vb === 'number'
      ? (va - vb) * dir
      : String(va).localeCompare(String(vb), 'it') * dir;
  });
}

export interface Scope {
  n: number;
  sum: number;
  max: number;
  mean: number;
  min: number;
}

/** Aggregate stats of the active quantity over a row set. */
export function scope(rows: NodeRecord[], s: AppState = state): Scope {
  const vs = rows.map((r) => activeVal(r, s));
  const sum = vs.reduce((a, b) => a + b, 0);
  return {
    n: vs.length,
    sum,
    max: vs.length ? Math.max(...vs) : 0,
    mean: vs.length ? sum / vs.length : 0,
    min: vs.length ? Math.min(...vs) : 0,
  };
}

export const decimals = (s: AppState = state): number => {
  const m = maxAbs(s);
  return m >= 1000 ? 0 : m >= 100 ? 1 : m >= 1 ? 2 : 3;
};
