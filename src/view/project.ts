import { state } from '../state';
import type { NodeRecord } from '../types';

export const VB_W = 1000;
export const VB_H = 720;
const PAD = 60;

export interface Projector {
  k: number;
  vbx: (x: number) => number;
  vby: (y: number) => number;
}

/** Fit all nodes into the fixed 1000×720 viewBox (plan projection, Y down). */
export function projector(nodes: NodeRecord[] = state.nodes): Projector {
  if (!nodes.length) return { k: 1, vbx: (x) => x, vby: (y) => y };
  const xs = nodes.map((r) => r.x),
    ys = nodes.map((r) => r.y);
  const x0 = Math.min(...xs),
    x1 = Math.max(...xs),
    y0 = Math.min(...ys),
    y1 = Math.max(...ys);
  const w = Math.max(x1 - x0, 1e-6),
    h = Math.max(y1 - y0, 1e-6);
  const k = Math.min((VB_W - 2 * PAD) / w, (VB_H - 2 * PAD) / h);
  const tx = VB_W / 2 - ((x0 + x1) / 2) * k;
  const ty = VB_H / 2 - ((y0 + y1) / 2) * k;
  return { k, vbx: (x) => x * k + tx, vby: (y) => y * k + ty };
}

export interface ScreenParams {
  scale: number;
  ox: number;
  oy: number;
}

/** Scale + origin of the meet-fitted viewBox inside a w×h container. */
export function screenParams(w: number, h: number): ScreenParams {
  const scale = Math.min(w / VB_W, h / VB_H);
  return { scale, ox: (w - VB_W * scale) / 2, oy: (h - VB_H * scale) / 2 };
}

/** Screen transform for the meet-fitted viewBox (for HTML overlay labels). */
export function screenMap(w: number, h: number): (vx: number, vy: number) => { x: number; y: number } {
  const p = screenParams(w, h);
  return (vx, vy) => ({ x: p.ox + vx * p.scale, y: p.oy + vy * p.scale });
}
