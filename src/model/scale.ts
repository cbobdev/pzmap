/** Color scaling: "nice" break generation and the diverging blue↔red ramp. */

export function niceStep(raw: number): number {
  const mag = Math.pow(10, Math.floor(Math.log10(Math.abs(raw) || 1)));
  const n = raw / mag;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * mag;
}

/** Rounded class breaks spanning [lo, hi] with about `nClass` classes. */
export function computeBreaks(lo: number, hi: number, nClass: number): number[] {
  if (lo === hi) hi = lo + (Math.abs(lo) || 1) * 0.1;
  let step = niceStep((hi - lo) / nClass);
  let a = Math.floor(lo / step) * step,
    b = Math.ceil(hi / step) * step;
  let guard = 0;
  while ((b - a) / step > nClass + 3 && guard++ < 40) {
    step *= 2;
    a = Math.floor(lo / step) * step;
    b = Math.ceil(hi / step) * step;
  }
  const br: number[] = [];
  for (let v = a; v <= b + step * 1e-9; v += step) br.push(+v.toFixed(10));
  if (br.length < 2) br.push(a + step);
  return br;
}

const NEG = ['#DFEAF2', '#A9C6DE', '#6E9CC4', '#3E6FA3', '#22497A', '#0F2C50'];
const POS = ['#FBEFD3', '#F5D07A', '#EC9A47', '#DC5F35', '#B4342A', '#78191A'];

function lerp(ramp: string[], u: number): string {
  u = Math.max(0, Math.min(1, u));
  const t = u * (ramp.length - 1),
    i = Math.min(ramp.length - 2, Math.floor(t)),
    f = t - i;
  const p = (c: number): number => parseInt(ramp[c]!.slice(1), 16),
    A = p(i),
    B = p(i + 1);
  const m = (s: number): number => Math.round(((A >> s) & 255) * (1 - f) + ((B >> s) & 255) * f);
  return `rgb(${m(16)},${m(8)},${m(0)})`;
}

/** One color per class (breaks.length - 1), diverging around zero. */
export function computeColors(breaks: number[]): string[] {
  const nMin = Math.abs(breaks[0]!) || 1,
    pMax = Math.abs(breaks[breaks.length - 1]!) || 1;
  const colors: string[] = [];
  for (let i = 0; i < breaks.length - 1; i++) {
    const mid = (breaks[i]! + breaks[i + 1]!) / 2;
    colors.push(
      mid < 0
        ? lerp(NEG, 0.18 + (0.82 * Math.abs(mid)) / nMin)
        : lerp(POS, 0.18 + (0.82 * mid) / pMax),
    );
  }
  return colors;
}

export function classOf(v: number, breaks: number[]): number {
  if (v <= breaks[0]!) return 0;
  for (let i = 0; i < breaks.length - 1; i++) if (v < breaks[i + 1]!) return i;
  return breaks.length - 2;
}

/** Sequential ramp for utilization (0 → 1+): green → amber → red. */
const UTIL = ['#1B7F4B', '#69A83C', '#C9B02E', '#E8862B', '#D6402C', '#8A1717'];
export function utilColor(ratio: number): string {
  return lerp(UTIL, ratio); // ratio already 0..1; >1 clamps to deepest red
}
