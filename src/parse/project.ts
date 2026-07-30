import { type Meta, type NodeRecord } from '../types';
import { state, type AppState } from '../state';

export interface ProjectFile {
  format: 'pzmap';
  version: 1;
  meta: Meta;
  nodes: NodeRecord[];
  view: PersistedView;
}

export interface PersistedView {
  qty: string;
  uf: number;
  un: string;
  nClass: number;
  pair: boolean;
  win: { lo: number | null; hi: number | null };
  filters: Record<string, string>;
  off: number[];
  sort: { col: string | null; dir: number };
  showLab: boolean;
  showVal: boolean;
  showComb: boolean;
  allCols: boolean;
  tableHidden: boolean;
  pointsOnly: boolean;
  capacity: number | null;
  sel: number | null;
  camera: { kw: number; cx: number; cy: number };
  lang: string;
}

export function captureView(s: AppState, W: number, H: number): PersistedView {
  const k = s.view.k || 1;
  return {
    qty: s.qty,
    uf: s.uf,
    un: s.un,
    nClass: s.nClass,
    pair: s.pair,
    win: { lo: s.win.lo, hi: s.win.hi },
    filters: s.filters,
    off: [...s.off],
    sort: s.sort,
    showLab: s.showLab,
    showVal: s.showVal,
    showComb: s.showComb,
    allCols: s.allCols,
    tableHidden: s.tableHidden,
    pointsOnly: s.pointsOnly,
    capacity: s.capacity,
    sel: s.sel,
    camera: { kw: k / W, cx: (W / 2 - s.view.tx) / k, cy: (H / 2 - s.view.ty) / k },
    lang: s.lang,
  };
}

/** Apply a persisted view onto state (validating the quantity against options). */
export function applyView(s: AppState, v: PersistedView, hasQty: (q: string) => boolean): void {
  if (v.qty && hasQty(v.qty)) s.qty = v.qty;
  if (v.uf) {
    s.uf = v.uf;
    s.un = v.un || s.un;
  }
  if (v.nClass) s.nClass = v.nClass;
  s.pair = !!v.pair && s.qty[0] !== '|';
  s.win = { lo: v.win ? v.win.lo : null, hi: v.win ? v.win.hi : null };
  s.filters = v.filters || {};
  s.off = new Set(v.off || []);
  s.sort = v.sort || { col: null, dir: 1 };
  s.showLab = !!v.showLab;
  s.showVal = !!v.showVal;
  s.showComb = !!v.showComb;
  s.allCols = !!v.allCols;
  s.tableHidden = !!v.tableHidden;
  s.pointsOnly = !!v.pointsOnly;
  s.capacity = v.capacity ?? null;
  s.sel = v.sel ?? null;
  if (v.lang === 'it' || v.lang === 'en') s.lang = v.lang;
}

export function buildProject(W: number, H: number): ProjectFile {
  return {
    format: 'pzmap',
    version: 1,
    meta: { ...state.meta, savedAt: new Date().toISOString() },
    nodes: state.nodes,
    view: captureView(state, W, H),
  };
}

export function parseProject(text: string): ProjectFile {
  const o = JSON.parse(text) as ProjectFile;
  if (!o || o.format !== 'pzmap' || !Array.isArray(o.nodes)) throw new Error('not a pzmap project');
  return o;
}
