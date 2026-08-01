/** Sign-based diverging colour: positive (compression/max) → red ramp,
 *  negative (uplift) → blue ramp, pale near zero. Magnitude within each sign is
 *  scaled by a robust per-sign domain (passed in) so an outlier can't flatten it. */

const NEG = ['#dfeaf2', '#a9c6de', '#6e9cc4', '#3e6fa3', '#22497a', '#0f2c50']; // uplift / negative
const POS = ['#fbe3d4', '#f5b48a', '#ec8a52', '#dc5f35', '#b4342a', '#78191a']; // compression / positive

/** Reserved critical signal — uplift stroke. */
export const CRITICAL = '#a5231c';

function lerp(ramp: string[], u: number): string {
  u = Math.max(0, Math.min(1, u));
  const t = u * (ramp.length - 1),
    i = Math.min(ramp.length - 2, Math.floor(t)),
    f = t - i;
  const p = (c: number): number => parseInt(ramp[c]!.slice(1), 16),
    A = p(i),
    B = p(i + 1);
  const m = (s: number): number => Math.round((((A >> s) & 255) * (1 - f) + ((B >> s) & 255) * f));
  return `rgb(${m(16)},${m(8)},${m(0)})`;
}

export interface SignDomain {
  posMax: number; // robust max of positive values (≥ small positive)
  negMax: number; // robust max magnitude of negative values (≥ 0)
}

/** Positive → red by v/posMax; negative → blue by |v|/negMax. */
export function valueColor(v: number, dom: SignDomain): string {
  if (v >= 0) return lerp(POS, 0.15 + (0.85 * v) / (dom.posMax || 1));
  return lerp(NEG, 0.15 + (0.85 * Math.abs(v)) / (dom.negMax || 1));
}

/** CSS gradient for the legend bar across [min,max]: blue → pale → red. */
export function valueGradient(min: number, max: number, dom: SignDomain): string {
  const stops: string[] = [];
  const n = 16;
  for (let i = 0; i <= n; i++) {
    const v = min + ((max - min) * i) / n;
    stops.push(`${valueColor(v, dom)} ${(100 * i) / n}%`);
  }
  return `linear-gradient(90deg, ${stops.join(',')})`;
}
