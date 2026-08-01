import { type Meta, type NodeRecord } from '../types';
import {
  state,
  type AppState,
  type Extreme,
  type Lang,
  type Group,
} from '../state';

export interface PersistedView {
  q: string;
  ext: Extreme;
  win: { lo: number | null; hi: number | null };
  colF: Record<string, string>;
  sortKey: string;
  sortDir: -1 | 1;
  sel: number[];
  tableOpen: boolean;
  lblVal: boolean;
  lblIds: boolean;
  sizeUniform: boolean;
  pair: boolean;
  legendHidden: boolean;
  groups: Group[];
  isolate: number | null;
  colorByGroup: boolean;
  lang: Lang;
}

export interface ProjectFile {
  format: 'pzmap';
  version: 2;
  meta: Meta;
  nodes: NodeRecord[];
  view: PersistedView;
}

export function captureView(s: AppState): PersistedView {
  return {
    q: s.q,
    ext: s.ext,
    win: { lo: s.win.lo, hi: s.win.hi },
    colF: s.colF,
    sortKey: s.sortKey,
    sortDir: s.sortDir,
    sel: s.sel,
    tableOpen: s.tableOpen,
    lblVal: s.lblVal,
    lblIds: s.lblIds,
    sizeUniform: s.sizeUniform,
    pair: s.pair,
    legendHidden: s.legendHidden,
    groups: s.groups,
    isolate: s.isolate,
    colorByGroup: s.colorByGroup,
    lang: s.lang,
  };
}

export function applyView(s: AppState, v: PersistedView, hasComp: (c: string) => boolean): void {
  if (v.q && hasComp(v.q)) s.q = v.q as AppState['q'];
  if (v.ext === 'max' || v.ext === 'min') s.ext = v.ext;
  s.win = { lo: v.win ? v.win.lo : null, hi: v.win ? v.win.hi : null };
  s.colF = v.colF || {};
  s.sortKey = v.sortKey || `${s.q}_${s.ext}`;
  s.sortDir = v.sortDir === 1 ? 1 : -1;
  s.sel = Array.isArray(v.sel) ? v.sel : [];
  s.tableOpen = v.tableOpen !== false;
  s.lblVal = !!v.lblVal;
  s.lblIds = !!v.lblIds;
  s.sizeUniform = !!v.sizeUniform;
  s.pair = !!v.pair;
  s.legendHidden = !!v.legendHidden;
  s.groups = Array.isArray(v.groups)
    ? (v.groups as Partial<Group>[]).map((g) => ({ description: '', visible: true, ...g }) as Group)
    : [];
  s.isolate = typeof v.isolate === 'number' ? v.isolate : null;
  s.colorByGroup = !!v.colorByGroup;
  if (v.lang === 'it' || v.lang === 'en') s.lang = v.lang;
}

export function buildProject(): ProjectFile {
  return {
    format: 'pzmap',
    version: 2,
    meta: { ...state.meta, savedAt: new Date().toISOString() },
    nodes: state.nodes,
    view: captureView(state),
  };
}

export function parseProject(text: string): ProjectFile {
  const o = JSON.parse(text) as ProjectFile;
  if (!o || o.format !== 'pzmap' || !Array.isArray(o.nodes)) throw new Error('not a pzmap project');
  return o;
}
