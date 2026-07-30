import { describe, it, expect } from 'vitest';
import { tableOf, isNodeTable, isForceTable, buildNodes } from '../src/parse/rfemJson';
import type { RfemTable } from '../src/types';

const nodeTable: RfemTable = {
  data: [
    { no: 1, global_coordinate_1: 0, global_coordinate_2: 0, global_coordinate_3: 0 },
    { no: 2, global_coordinate_1: 4, global_coordinate_2: 0, global_coordinate_3: 0 },
  ],
};

// Two reaction blocks (node 1, node 2), each with a Pz max then Pz min row,
// separated by an empty-tag row.
const forceTable: RfemTable = {
  data: [
    { tag: 'Pz', p_z: 100, specification: 'CO1', node: 1 },
    { tag: 'Pz', p_z: -10, specification: 'CO2', node: 1 },
    { tag: '' },
    { tag: 'Pz', p_z: 200, specification: 'CO3', node: 2 },
    { tag: 'Pz', p_z: 20, specification: 'CO4', node: 2 },
    { tag: '' },
  ],
};

describe('table detection', () => {
  it('recognizes wrapped and bare tables', () => {
    expect(tableOf({ tables: [nodeTable] })).toBe(nodeTable);
    expect(tableOf(nodeTable.data)).toEqual({ data: nodeTable.data });
    expect(isNodeTable(nodeTable)).toBe(true);
    expect(isForceTable(forceTable)).toBe(true);
    expect(isForceTable(nodeTable)).toBe(false);
  });
});

describe('buildNodes', () => {
  it('merges coordinates with reaction envelopes', () => {
    const res = buildNodes(nodeTable, forceTable);
    expect(res.error).toBeUndefined();
    expect(res.nodes).toHaveLength(2);
    const n1 = res.nodes![0]!;
    expect(n1.no).toBe(1);
    expect(n1.x).toBe(0);
    expect(n1.Pz_max).toBe(100);
    expect(n1.Pz_maxc).toBe('CO1');
    expect(n1.Pz_min).toBe(-10);
    const n2 = res.nodes![1]!;
    expect(n2.x).toBe(4);
    expect(n2.Pz_max).toBe(200);
    // untouched components default to zero
    expect(n1.Px_max).toBe(0);
    expect(n1.Mx_min).toBe(0);
  });
});
