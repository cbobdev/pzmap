import { type Comp, type NodeRecord } from '../types';
import { val, type Qty } from './quantity';

const field = (r: NodeRecord, key: string): number =>
  (r as unknown as Record<string, number>)[key] ?? 0;

export interface QtyStats {
  count: number;
  sum: number;
  mean: number;
  min: number;
  max: number;
  neg: number;
}

/** Descriptive stats of the active quantity over the given rows. */
export function qtyStats(rows: NodeRecord[], q: Qty, uf: number): QtyStats {
  const vs = rows.map((r) => val(r, q, uf));
  const sum = vs.reduce((a, b) => a + b, 0);
  const neg = vs.filter((v) => v < 0).length;
  return {
    count: vs.length,
    sum,
    mean: vs.length ? sum / vs.length : 0,
    min: vs.length ? Math.min(...vs) : 0,
    max: vs.length ? Math.max(...vs) : 0,
    neg,
  };
}

/** Σ of a component's envelope-max (design value) over rows, in display units. */
export function componentSum(rows: NodeRecord[], comp: Comp, uf: number): number {
  return rows.reduce((a, r) => a + field(r, `${comp}_max`) * uf, 0);
}

export interface Resultant {
  count: number;
  sumX: number;
  sumY: number;
  sumZ: number;
  centroid: { x: number; y: number } | null;
}

/** Resultant force (Σ Fx/Fy/Fz, design values) and |Pz|-weighted centroid of a
 *  node selection — used by the region-select readout. */
export function resultant(rows: NodeRecord[], uf: number): Resultant {
  let sw = 0,
    sx = 0,
    sy = 0;
  for (const r of rows) {
    const w = Math.abs(field(r, 'Pz_max'));
    if (!w) continue;
    sw += w;
    sx += w * r.x;
    sy += w * r.y;
  }
  return {
    count: rows.length,
    sumX: componentSum(rows, 'Px', uf),
    sumY: componentSum(rows, 'Py', uf),
    sumZ: componentSum(rows, 'Pz', uf),
    centroid: sw > 0 ? { x: sx / sw, y: sy / sw } : null,
  };
}
