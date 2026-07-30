import { describe, it, expect } from 'vitest';
import { qtyStats, componentSum, resultant } from '../src/model/stats';
import { val, extent } from '../src/model/quantity';
import type { NodeRecord } from '../src/types';

function node(no: number, x: number, y: number, pz: number, px = 0): NodeRecord {
  const zero = { Mx: 0, My: 0, Mz: 0, Py: 0 };
  const rec: Record<string, number | string> = { no, x, y, z: 0 };
  for (const c of ['Px', 'Py', 'Pz', 'Mx', 'My', 'Mz']) {
    rec[`${c}_max`] = 0;
    rec[`${c}_min`] = 0;
    rec[`${c}_maxc`] = '';
    rec[`${c}_minc`] = '';
  }
  rec.Pz_max = pz;
  rec.Px_max = px;
  void zero;
  return rec as unknown as NodeRecord;
}

const nodes = [node(1, 0, 0, 100, 10), node(2, 4, 0, 300, -30), node(3, 0, 3, -40, 5)];

describe('quantity value', () => {
  it('applies the unit factor', () => {
    expect(val(nodes[1]!, 'Pz_max', 0.001)).toBeCloseTo(0.3); // 300 N → 0.3 kN
  });
  it('|abs| picks the larger magnitude', () => {
    expect(val(nodes[2]!, '|Pz|', 1)).toBe(-40);
  });
});

describe('extent', () => {
  it('covers min and max of the series', () => {
    const e = extent(nodes, 'Pz_max', 1, false);
    expect(e.lo).toBe(-40);
    expect(e.hi).toBe(300);
  });
});

describe('stats', () => {
  it('qtyStats aggregates the active quantity', () => {
    const s = qtyStats(nodes, 'Pz_max', 1);
    expect(s.count).toBe(3);
    expect(s.sum).toBe(360);
    expect(s.min).toBe(-40);
    expect(s.max).toBe(300);
    expect(s.neg).toBe(1);
  });
  it('componentSum sums envelope max', () => {
    expect(componentSum(nodes, 'Pz', 1)).toBe(360);
    expect(componentSum(nodes, 'Px', 1)).toBe(-15);
  });
  it('resultant sums forces and centroid weighted by |Pz|', () => {
    const r = resultant(nodes, 1);
    expect(r.sumZ).toBe(360);
    expect(r.sumX).toBe(-15);
    // centroid X weighted by |Pz|: (100*0 + 300*4 + 40*0)/(100+300+40)
    expect(r.centroid!.x).toBeCloseTo(1200 / 440, 6);
  });
});
