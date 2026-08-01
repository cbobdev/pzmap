import { type Comp, type Meta, type NodeRecord } from './types';

export interface ViewState {
  k: number;
  tx: number;
  ty: number;
}

export type Lang = 'it' | 'en';
export type Extreme = 'max' | 'min';

export interface Group {
  id: number;
  name: string;
  color: string;
  description: string;
  nodes: number[];
  visible: boolean;
}

export interface AppState {
  nodes: NodeRecord[];
  meta: Meta;
  comps: Comp[];

  q: Comp; // active component
  ext: Extreme; // active extreme
  win: { lo: number | null; hi: number | null }; // display-limits window (metric units)
  colF: Record<string, string>; // per-column filter text

  sortKey: string; // column key
  sortDir: -1 | 1;

  sel: number[]; // multi-selection (node ids)
  hover: number | null;

  tableOpen: boolean;
  lblVal: boolean; // value label on every node
  lblIds: boolean;
  sizeUniform: boolean; // color-only, uniform dot size
  pair: boolean; // split-circle max/min for the active component
  legendHidden: boolean;

  groups: Group[];
  isolate: number | null; // group id shown alone (hides everything else)
  colorByGroup: boolean; // color dots by group colour instead of value

  uf: number; // unit factor (SI → display); fixed kN in Phase 1
  un: string;

  view: ViewState;
  lang: Lang;
}

export const state: AppState = {
  nodes: [],
  meta: { model: '—' },
  comps: [],
  q: 'Pz',
  ext: 'max',
  win: { lo: null, hi: null },
  colF: {},
  sortKey: 'Pz_max',
  sortDir: -1,
  sel: [],
  hover: null,
  tableOpen: true,
  lblVal: false,
  lblIds: false,
  sizeUniform: false,
  pair: false,
  legendHidden: false,
  groups: [],
  isolate: null,
  colorByGroup: false,
  uf: 0.001,
  un: 'kN',
  view: { k: 1, tx: 0, ty: 0 },
  lang: 'it',
};

/** Active quantity key (`Pz_max` etc.) derived from component + extreme. */
export const activeQty = (s: AppState = state): string => `${s.q}_${s.ext}`;

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
