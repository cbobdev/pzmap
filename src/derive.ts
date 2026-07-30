import { type NodeRecord } from './types';
import { state, type AppState } from './state';
import { extent, seriesVals, compOf, val } from './model/quantity';
import { computeBreaks, computeColors, classOf } from './model/scale';
import { buildColumns, cellValue, testFilter, type Column } from './model/filter';

export const winLo = (s: AppState = state): number => (s.win.lo == null ? s.ext.lo : s.win.lo);
export const winHi = (s: AppState = state): number => (s.win.hi == null ? s.ext.hi : s.win.hi);
export const inWin = (v: number, s: AppState = state): boolean =>
  v >= winLo(s) - 1e-9 && v <= winHi(s) + 1e-9;

export const utilizationActive = (s: AppState = state): boolean =>
  s.capacity != null && s.capacity > 0;

/** Recompute extent, class breaks and colors from the current state. */
export function recolor(s: AppState = state): void {
  s.ext = extent(s.nodes, s.qty, s.uf, s.pair);
  const lo = winLo(s);
  let hi = winHi(s);
  if (lo === hi) hi = lo + (Math.abs(lo) || 1) * 0.1;
  s.breaks = computeBreaks(lo, hi, s.nClass);
  s.colors = computeColors(s.breaks);
}

export const classOfState = (v: number, s: AppState = state): number => classOf(v, s.breaks);

/** Decimal places for the active quantity, based on its magnitude. */
export function valDec(s: AppState = state): number {
  const m = Math.max(...s.nodes.map((r) => Math.abs(val(r, s.qty, s.uf))), 0);
  return m >= 1000 ? 0 : m >= 100 ? 1 : m >= 1 ? 2 : 4;
}

export function columns(s: AppState = state): Column[] {
  const zs = s.nodes.map((r) => r.z);
  return buildColumns({
    comps: s.comps,
    activeComp: compOf(s.qty),
    allCols: s.allCols,
    showComb: s.showComb,
    unit: s.un,
    hasZ: zs.length > 0 && Math.min(...zs) !== Math.max(...zs),
  });
}

const rangeOK = (r: NodeRecord, s: AppState): boolean =>
  seriesVals(r, s.qty, s.uf, s.pair).some((v) => inWin(v, s));

/** Rows passing the range window and every column filter. */
export function baseRows(s: AppState = state): NodeRecord[] {
  const cols = columns(s);
  return s.nodes.filter(
    (r) =>
      rangeOK(r, s) &&
      cols.every((c) => testFilter(s.filters[c.k] || '', cellValue(r, c.k, s.uf), c.n)),
  );
}

/** Rows also passing the class on/off legend toggles. */
export function visibleRows(s: AppState = state): NodeRecord[] {
  return baseRows(s).filter((r) =>
    seriesVals(r, s.qty, s.uf, s.pair).some((v) => !s.off.has(classOfState(v, s))),
  );
}
