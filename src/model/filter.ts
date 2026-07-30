import { type Comp, type NodeRecord } from '../types';

export interface Column {
  k: string;
  t: string;
  n: boolean;
}

export const parseNum = (s: string): number => parseFloat(String(s).replace(',', '.'));

/** Per-column filter mini-language: `>500`, `<0`, `>=1`, `<>0`, `100..500`, or
 *  a plain substring for text. Ported from the original tool. */
export function testFilter(expr: string, v: number | string, isNum: boolean): boolean {
  expr = expr.trim();
  if (!expr) return true;
  if (isNum && typeof v === 'number') {
    let m: RegExpMatchArray | null;
    if ((m = expr.match(/^(-?[\d.,]+)\s*\.\.\s*(-?[\d.,]+)$/))) {
      const a = parseNum(m[1]!),
        b = parseNum(m[2]!);
      return v >= Math.min(a, b) && v <= Math.max(a, b);
    }
    if ((m = expr.match(/^(>=|<=|<>|>|<|=)\s*(-?[\d.,]+)$/))) {
      const x = parseNum(m[2]!);
      switch (m[1]) {
        case '>':
          return v > x;
        case '<':
          return v < x;
        case '>=':
          return v >= x;
        case '<=':
          return v <= x;
        case '<>':
          return v !== x;
        default:
          return v === x;
      }
    }
    const x = parseNum(expr);
    if (Number.isFinite(x)) return v === x;
  }
  return String(v).toLowerCase().includes(expr.toLowerCase());
}

export function cellValue(r: NodeRecord, key: string, uf: number): number | string {
  if (key === 'no') return r.no;
  if (key === 'x' || key === 'y' || key === 'z') return r[key];
  if (key.endsWith('c')) return (r as unknown as Record<string, string>)[key] || '';
  return ((r as unknown as Record<string, number>)[key] || 0) * uf;
}

export interface ColumnOpts {
  comps: Comp[];
  activeComp: Comp;
  allCols: boolean;
  showComb: boolean;
  unit: string; // e.g. 'kN'
  hasZ: boolean;
}

/** Table columns for the current view. */
export function buildColumns(o: ColumnOpts): Column[] {
  const cols: Column[] = [
    { k: 'no', t: 'Nodo', n: true },
    { k: 'x', t: 'X [m]', n: true },
    { k: 'y', t: 'Y [m]', n: true },
  ];
  if (o.hasZ) cols.push({ k: 'z', t: 'Z [m]', n: true });
  const list = o.allCols ? o.comps : [o.activeComp];
  for (const c of list) {
    const u = /^M/.test(c) ? `${o.unit}m` : o.unit;
    cols.push({ k: `${c}_max`, t: `${c} max [${u}]`, n: true });
    if (o.showComb) cols.push({ k: `${c}_maxc`, t: `comb. ${c} max`, n: false });
    cols.push({ k: `${c}_min`, t: `${c} min [${u}]`, n: true });
    if (o.showComb) cols.push({ k: `${c}_minc`, t: `comb. ${c} min`, n: false });
  }
  return cols;
}
