import { describe, it, expect } from 'vitest';
import { niceStep, computeBreaks, computeColors, classOf, utilColor } from '../src/model/scale';

describe('niceStep', () => {
  it('rounds to 1/2/2.5/5/10 × 10^n', () => {
    expect(niceStep(1)).toBe(1);
    expect(niceStep(1.5)).toBe(2);
    expect(niceStep(2.3)).toBe(2.5);
    expect(niceStep(4)).toBe(5);
    expect(niceStep(9)).toBe(10);
    expect(niceStep(230)).toBe(250);
    expect(niceStep(0.03)).toBeCloseTo(0.05, 10);
  });
});

describe('computeBreaks', () => {
  it('spans the range with nice, ascending breaks', () => {
    const br = computeBreaks(-120, 640, 7);
    expect(br[0]!).toBeLessThanOrEqual(-120);
    expect(br[br.length - 1]!).toBeGreaterThanOrEqual(640);
    for (let i = 1; i < br.length; i++) expect(br[i]!).toBeGreaterThan(br[i - 1]!);
  });
  it('produces at least two breaks for a flat range', () => {
    expect(computeBreaks(5, 5, 7).length).toBeGreaterThanOrEqual(2);
  });
});

describe('classOf', () => {
  const br = [-100, -50, 0, 50, 100];
  it('clamps below and above', () => {
    expect(classOf(-999, br)).toBe(0);
    expect(classOf(999, br)).toBe(br.length - 2);
  });
  it('assigns interior values', () => {
    expect(classOf(-25, br)).toBe(1);
    expect(classOf(25, br)).toBe(2);
  });
});

describe('color ramps', () => {
  it('computeColors gives one color per class', () => {
    const br = computeBreaks(-100, 300, 6);
    expect(computeColors(br).length).toBe(br.length - 1);
  });
  it('utilColor returns rgb strings', () => {
    expect(utilColor(0)).toMatch(/^rgb\(/);
    expect(utilColor(1.5)).toMatch(/^rgb\(/);
  });
});
