import { type Comp, type Meta, type NodeRecord } from './types';
import { type Qty } from './model/quantity';

export interface ViewState {
  k: number;
  tx: number;
  ty: number;
}

export type Lang = 'it' | 'en';

export interface AppState {
  nodes: NodeRecord[];
  meta: Meta;
  comps: Comp[];

  qty: Qty;
  uf: number;
  un: string;
  nClass: number;

  breaks: number[];
  colors: string[];
  off: Set<number>;
  ext: { lo: number; hi: number };
  win: { lo: number | null; hi: number | null };
  pair: boolean;

  filters: Record<string, string>;
  sort: { col: string | null; dir: number };
  sel: number | null;
  region: Set<number> | null;

  view: ViewState;

  showLab: boolean;
  showVal: boolean;
  showComb: boolean;
  allCols: boolean;
  tableHidden: boolean;
  pointsOnly: boolean;
  capacity: number | null; // display units; null → utilization off

  lang: Lang;
}

export const state: AppState = {
  nodes: [],
  meta: { model: '—' },
  comps: [],
  qty: 'Pz_max',
  uf: 0.001,
  un: 'kN',
  nClass: 7,
  breaks: [],
  colors: [],
  off: new Set(),
  ext: { lo: 0, hi: 1 },
  win: { lo: null, hi: null },
  pair: false,
  filters: {},
  sort: { col: null, dir: 1 },
  sel: null,
  region: null,
  view: { k: 1, tx: 0, ty: 0 },
  showLab: false,
  showVal: false,
  showComb: false,
  allCols: false,
  tableHidden: false,
  pointsOnly: false,
  capacity: null,
  lang: 'it',
};

type Listener = () => void;
const listeners = new Set<Listener>();
export function subscribe(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
export function emit(): void {
  for (const l of listeners) l();
}

/** Locale-aware number formatting (thousands + fixed decimals). */
export function fmt(
  v: number | string | null | undefined,
  d: number,
  lang: Lang = state.lang,
): string {
  if (typeof v === 'number' && Number.isFinite(v))
    return v.toLocaleString(lang === 'it' ? 'it-IT' : 'en-US', {
      minimumFractionDigits: d,
      maximumFractionDigits: d,
    });
  return v == null ? '—' : String(v);
}
