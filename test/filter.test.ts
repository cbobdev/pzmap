import { describe, it, expect } from 'vitest';
import { testFilter, parseNum, buildColumns } from '../src/model/filter';

describe('testFilter', () => {
  it('empty passes everything', () => {
    expect(testFilter('', 5, true)).toBe(true);
    expect(testFilter('   ', 'abc', false)).toBe(true);
  });
  it('comparison operators', () => {
    expect(testFilter('>500', 600, true)).toBe(true);
    expect(testFilter('>500', 500, true)).toBe(false);
    expect(testFilter('<0', -1, true)).toBe(true);
    expect(testFilter('>=500', 500, true)).toBe(true);
    expect(testFilter('<=500', 500, true)).toBe(true);
    expect(testFilter('<>0', 0, true)).toBe(false);
    expect(testFilter('=42', 42, true)).toBe(true);
  });
  it('range a..b (order-insensitive)', () => {
    expect(testFilter('100..500', 300, true)).toBe(true);
    expect(testFilter('500..100', 300, true)).toBe(true);
    expect(testFilter('100..500', 600, true)).toBe(false);
  });
  it('comma decimals', () => {
    expect(testFilter('>1,5', 2, true)).toBe(true);
  });
  it('text substring (case-insensitive)', () => {
    expect(testFilter('co5', 'CO51', false)).toBe(true);
    expect(testFilter('xx', 'CO51', false)).toBe(false);
  });
});

describe('parseNum', () => {
  it('accepts comma decimal separator', () => {
    expect(parseNum('3,14')).toBeCloseTo(3.14);
  });
});

describe('buildColumns', () => {
  it('includes Z only when present and combos when requested', () => {
    const base = buildColumns({
      comps: ['Pz'],
      activeComp: 'Pz',
      allCols: false,
      showComb: false,
      unit: 'kN',
      hasZ: false,
    });
    expect(base.some((c) => c.k === 'z')).toBe(false);
    expect(base.some((c) => c.k === 'Pz_maxc')).toBe(false);

    const full = buildColumns({
      comps: ['Px', 'Pz'],
      activeComp: 'Pz',
      allCols: true,
      showComb: true,
      unit: 'kN',
      hasZ: true,
    });
    expect(full.some((c) => c.k === 'z')).toBe(true);
    expect(full.some((c) => c.k === 'Px_max')).toBe(true);
    expect(full.some((c) => c.k === 'Pz_minc')).toBe(true);
  });
});
