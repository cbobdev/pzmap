import { type Comp, type NodeRecord } from '../types';

/** A quantity is one of `Pz_max`, `Pz_min`, or the absolute-max form `|Pz|`. */
export type Qty = string;

const field = (r: NodeRecord, key: string): number =>
  (r as unknown as Record<string, number>)[key] ?? 0;
const combField = (r: NodeRecord, key: string): string =>
  (r as unknown as Record<string, string>)[key] ?? '';

export const isMoment = (q: Qty): boolean => /^\|?M/.test(q);

/** The component (Px…Mz) a quantity refers to. */
export const compOf = (q: Qty): Comp => (q[0] === '|' ? q.slice(1, -1) : q.split('_')[0]!) as Comp;

/** Governing value in SI base units × unit factor. */
export function val(r: NodeRecord, q: Qty, uf: number): number {
  if (q[0] === '|') {
    const c = q.slice(1, -1);
    return Math.abs(field(r, `${c}_max`)) >= Math.abs(field(r, `${c}_min`))
      ? field(r, `${c}_max`) * uf
      : field(r, `${c}_min`) * uf;
  }
  return field(r, q) * uf;
}

/** Governing load-combination label for a quantity. */
export function combOf(r: NodeRecord, q: Qty): string {
  if (q[0] === '|') {
    const c = q.slice(1, -1);
    return Math.abs(field(r, `${c}_max`)) >= Math.abs(field(r, `${c}_min`))
      ? combField(r, `${c}_maxc`)
      : combField(r, `${c}_minc`);
  }
  return combField(
    r,
    q.replace(/_(max|min)$/, (_m, g: string) => `_${g}c`),
  );
}

export const qtyLabel = (q: Qty): string => (q[0] === '|' ? q : q.replace('_', ' '));
export const unitOf = (q: Qty, un: string): string => (isMoment(q) ? `${un}m` : un);

/** Values used to color/size a node: two (max & min) when `pair`, else one. */
export function seriesVals(r: NodeRecord, q: Qty, uf: number, pair: boolean): number[] {
  if (pair) {
    const c = compOf(q);
    return [field(r, `${c}_max`) * uf, field(r, `${c}_min`) * uf];
  }
  return [val(r, q, uf)];
}

export function extent(
  nodes: NodeRecord[],
  q: Qty,
  uf: number,
  pair: boolean,
): { lo: number; hi: number } {
  const vs: number[] = [];
  for (const r of nodes) vs.push(...seriesVals(r, q, uf, pair));
  let lo = Math.min(...vs),
    hi = Math.max(...vs);
  if (!Number.isFinite(lo)) {
    lo = 0;
    hi = 1;
  }
  if (lo === hi) hi = lo + (Math.abs(lo) || 1) * 0.1;
  return { lo, hi };
}
