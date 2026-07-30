import { type RfemRow, type RfemTable } from '../types';

/** Minimal ZIP + worksheet-XML reader — no external library.
 *  Reads the shared strings and the first worksheet of an .xlsx file. */

type Cell = string | number | null;

interface Zip {
  has(name: string): boolean;
  text(name: string): Promise<string>;
}

async function zipRead(u8: Uint8Array): Promise<Zip> {
  const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
  let eo = -1;
  for (let i = u8.length - 22; i >= 0 && i > u8.length - 66000; i--)
    if (dv.getUint32(i, true) === 0x06054b50) {
      eo = i;
      break;
    }
  if (eo < 0) throw new Error('archivio xlsx non valido');
  const n = dv.getUint16(eo + 10, true);
  let p = dv.getUint32(eo + 16, true);
  const dir: Record<string, { method: number; csize: number; lho: number }> = {};
  for (let k = 0; k < n; k++) {
    if (dv.getUint32(p, true) !== 0x02014b50) break;
    const nlen = dv.getUint16(p + 28, true),
      elen = dv.getUint16(p + 30, true),
      clen = dv.getUint16(p + 32, true);
    dir[new TextDecoder().decode(u8.subarray(p + 46, p + 46 + nlen))] = {
      method: dv.getUint16(p + 10, true),
      csize: dv.getUint32(p + 20, true),
      lho: dv.getUint32(p + 42, true),
    };
    p += 46 + nlen + elen + clen;
  }
  return {
    has: (name) => name in dir,
    async text(name) {
      const e = dir[name];
      if (!e) return '';
      const ln = dv.getUint16(e.lho + 26, true),
        le = dv.getUint16(e.lho + 28, true);
      const raw = u8.subarray(e.lho + 30 + ln + le, e.lho + 30 + ln + le + e.csize);
      if (e.method === 0) return new TextDecoder().decode(raw);
      if (typeof DecompressionStream === 'undefined')
        throw new Error('questo browser non sa decomprimere xlsx: usa i JSON');
      const st = new Blob([raw as unknown as BlobPart])
        .stream()
        .pipeThrough(new DecompressionStream('deflate-raw'));
      return new TextDecoder().decode(await new Response(st).arrayBuffer());
    },
  };
}

/** Read an .xlsx File into a dense array-of-rows (cells as string|number|null). */
export async function readXlsx(file: File): Promise<Cell[][]> {
  const z = await zipRead(new Uint8Array(await file.arrayBuffer()));
  const parse = (t: string): Document => new DOMParser().parseFromString(t, 'application/xml');
  const ss: string[] = [];
  if (z.has('xl/sharedStrings.xml'))
    for (const si of Array.from(
      parse(await z.text('xl/sharedStrings.xml')).getElementsByTagName('si'),
    ))
      ss.push(
        Array.from(si.getElementsByTagName('t'))
          .map((t) => t.textContent)
          .join(''),
      );
  let path = 'xl/worksheets/sheet1.xml';
  if (!z.has(path))
    for (let i = 2; i < 12; i++) {
      const p = 'xl/worksheets/sheet' + i + '.xml';
      if (z.has(p)) {
        path = p;
        break;
      }
    }
  const out: Cell[][] = [];
  for (const row of Array.from(parse(await z.text(path)).getElementsByTagName('row'))) {
    const arr: Cell[] = [];
    for (const c of Array.from(row.getElementsByTagName('c'))) {
      const m = (c.getAttribute('r') || '').match(/^([A-Z]+)/);
      let ci = 0;
      if (m) {
        for (const ch of m[1]!) ci = ci * 26 + (ch.charCodeAt(0) - 64);
        ci--;
      }
      const t = c.getAttribute('t');
      let v: Cell = null;
      if (t === 'inlineStr') {
        const n = c.getElementsByTagName('t');
        v = n.length ? n[0]!.textContent : '';
      } else {
        const n = c.getElementsByTagName('v')[0];
        if (n)
          v =
            t === 's'
              ? (ss[+n.textContent!] ?? '')
              : t === 'str'
                ? n.textContent
                : parseFloat(n.textContent!);
      }
      arr[ci] = v;
    }
    out.push(arr);
  }
  return out;
}

export const cellStr = (v: Cell | undefined): string =>
  v == null ? '' : String(v).replace(/\s+/g, ' ').trim();

/** Worksheet "Nodi | Forze vincolari" → same shape as the JSON reactions data (SI units). */
export function xlsxForces(rows: Cell[][]): RfemTable | null {
  let hi = -1;
  const col: Record<string, number> = {};
  for (let i = 0; i < Math.min(10, rows.length); i++) {
    const idx: Record<string, number> = {};
    (rows[i] || []).forEach((v, j) => {
      const s = cellStr(v);
      if (/^[PM][xyz]$/.test(s)) idx[s] = j;
      if (/carico|load|situazione/i.test(s)) idx.spec = j;
    });
    if (idx.Px != null && idx.Py != null && idx.Pz != null) {
      hi = i;
      Object.assign(col, idx);
      break;
    }
  }
  if (hi < 0) return null;
  const head = rows
    .slice(0, hi + 1)
    .flat()
    .map(cellStr)
    .join(' ');
  const scale = /\[\s*MN/i.test(head) ? 1e6 : /\[\s*kN/i.test(head) ? 1e3 : 1;

  let tagCol = -1;
  for (let i = hi + 1; i < rows.length && tagCol < 0; i++)
    (rows[i] || []).forEach((v, j) => {
      if (tagCol < 0 && /^[PM][xyz]$/.test(cellStr(v))) tagCol = j;
    });
  if (tagCol < 0) return null;
  const noCol = tagCol > 0 ? tagCol - 1 : 0;
  if (col.spec == null) col.spec = Math.max(col.Mz!, col.Pz!) + 1;

  const KEY: Record<string, string> = {
    Px: 'p_x',
    Py: 'p_y',
    Pz: 'p_z',
    Mx: 'm_x',
    My: 'm_y',
    Mz: 'm_z',
  };
  const data: RfemRow[] = [];
  let n = 0;
  let id: number | null = null;
  for (let i = hi + 1; i < rows.length; i++) {
    const r = rows[i] || [];
    if (r.some((v) => /valori\s+max|totali/i.test(cellStr(v)))) break;
    const tg = cellStr(r[tagCol]);
    if (!/^[PM][xyz]$/.test(tg)) {
      if (n) {
        data.push({ tag: '' }, { tag: '' });
        n = 0;
      }
      continue;
    }
    if (n === 0) {
      const s = cellStr(r[noCol]);
      id = /^\d+$/.test(s) ? +s : null;
    }
    const rec: RfemRow = { tag: tg, specification: cellStr(r[col.spec!]), node: id };
    for (const k in KEY) rec[KEY[k]!] = (parseFloat(String(r[col[k]!])) || 0) * scale;
    data.push(rec);
    if (++n === 12) {
      data.push({ tag: '' }, { tag: '' });
      n = 0;
    }
  }
  return { data };
}

/** Worksheet "Nodi" → coordinate table. */
export function xlsxNodes(rows: Cell[][]): RfemTable | null {
  let hi = -1;
  const col: Record<string, number> = {};
  for (let i = 0; i < Math.min(10, rows.length); i++) {
    const idx: Record<string, number> = {};
    (rows[i] || []).forEach((v, j) => {
      const s = cellStr(v);
      if (/^X\b/i.test(s)) idx.x = j;
      if (/^Y\b/i.test(s)) idx.y = j;
      if (/^Z\b/i.test(s)) idx.z = j;
      if (/nodo|node/i.test(s)) idx.no = j;
    });
    if (idx.x != null && idx.y != null) {
      hi = i;
      Object.assign(col, idx);
      break;
    }
  }
  if (hi < 0) return null;
  const data: RfemRow[] = [];
  for (let i = hi + 1; i < rows.length; i++) {
    const r = rows[i] || [];
    const x = parseFloat(String(r[col.x!])),
      y = parseFloat(String(r[col.y!]));
    if (!isFinite(x) || !isFinite(y)) continue;
    const s = cellStr(r[col.no != null ? col.no : 0]);
    data.push({
      no: /^\d+$/.test(s) ? +s : null,
      global_coordinate_1: x,
      global_coordinate_2: y,
      global_coordinate_3: col.z != null ? parseFloat(String(r[col.z])) || 0 : 0,
    });
  }
  return data.length ? { data } : null;
}
