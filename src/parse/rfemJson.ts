import {
  COMPS,
  TAGKEY,
  type BuildResult,
  type NodeRecord,
  type RfemRow,
  type RfemTable,
} from '../types';

/** Normalize the various RFEM JSON export shapes to a single table. */
export function tableOf(json: unknown): RfemTable | null {
  if (json && typeof json === 'object') {
    const o = json as Record<string, unknown>;
    if (Array.isArray(o.tables) && o.tables.length) return o.tables[0] as RfemTable;
    if (Array.isArray(o.data)) return json as RfemTable;
  }
  if (Array.isArray(json)) return { data: json as RfemRow[] };
  return null;
}

const stripTag = (t: unknown): string =>
  String(t == null ? '' : t)
    .replace(/<[^>]*>/g, '')
    .trim();

export function isNodeTable(t: RfemTable): boolean {
  const r = t.data && t.data[0];
  return !!(r && ('global_coordinate_1' in r || 'coordinate_1' in r));
}

export function isForceTable(t: RfemTable): boolean {
  const r = t.data && t.data[0];
  return !!(r && ('p_z' in r || 'p_x' in r));
}

/** Split reaction rows into per-node blocks between empty-tag separators. */
function splitBlocks(rows: RfemRow[]): RfemRow[][] {
  const out: RfemRow[][] = [];
  let cur: RfemRow[] = [];
  for (const r of rows) {
    const tg = stripTag(r.tag);
    if (!tg) {
      if (cur.length) {
        out.push(cur);
        cur = [];
      }
      continue;
    }
    if (!/^[PM][xyz]$/i.test(tg)) {
      // "Valori max/min totali" header: end of the list.
      if (cur.length) {
        out.push(cur);
        cur = [];
      }
      break;
    }
    cur.push(r);
  }
  if (cur.length) out.push(cur);
  return out;
}

const num = (v: unknown): number => {
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : 0;
};

/**
 * Merge a Nodes coordinate table with a reactions table into typed node
 * records. Only nodes that carry reactions are emitted. Ported verbatim from
 * the original single-file tool.
 */
export function buildNodes(nodeTable: RfemTable | null, forceTable: RfemTable | null): BuildResult {
  const nds = nodeTable ? nodeTable.data : [];
  const blocks = forceTable ? splitBlocks(forceTable.data) : [];
  const warn: string[] = [];

  const byId = new Map<number, RfemRow>();
  for (const r of nds) if (r.no != null) byId.set(+r.no, r);
  const blockIds = blocks.map((b) => (b.length && b[0]!.node != null ? +b[0]!.node! : null));

  if (nds.length && blocks.length === nds.length + 1) {
    blocks.pop();
    blockIds.pop();
  }

  const haveIds = blockIds.length > 0 && blockIds.every((v) => v != null);
  const matchById = haveIds && byId.size > 0 && blockIds.every((v) => byId.has(v!));
  if (haveIds && byId.size > 0 && !matchById)
    warn.push("alcuni nodi con reazioni non sono nell'elenco coordinate: abbinamento per ordine");
  if (!haveIds && byId.size > 0 && blocks.length && blocks.length !== nds.length)
    return {
      error: `Il file delle reazioni non riporta i numeri dei nodi e l'elenco coordinate ne contiene ${nds.length} contro ${blocks.length} blocchi: le coordinate non sono abbinabili. Esporta le reazioni vincolari in XLSX, che i numeri li ha.`,
    };
  if (!haveIds && byId.size === 0)
    warn.push('numerazione provvisoria 1…N: nessuno dei due file riporta i numeri dei nodi');

  const n = blocks.length || nds.length;
  const out: NodeRecord[] = [];
  for (let i = 0; i < n; i++) {
    const blk = blocks[i] || [];
    const id =
      blockIds[i] != null ? blockIds[i]! : nds[i] && nds[i]!.no != null ? +nds[i]!.no! : i + 1;
    const nd = (matchById ? byId.get(id) : nds[i]) || ({} as RfemRow);
    const rec = {
      no: id,
      x: num(nd.global_coordinate_1 ?? nd.coordinate_1 ?? 0),
      y: num(nd.global_coordinate_2 ?? nd.coordinate_2 ?? 0),
      z: num(nd.global_coordinate_3 ?? nd.coordinate_3 ?? 0),
    } as NodeRecord;
    const rr = rec as unknown as Record<string, number | string>;

    const seen: Record<string, number> = {};
    for (const r of blk) {
      const c = stripTag(r.tag);
      const nm = COMPS.find((k) => k.toLowerCase() === c.toLowerCase());
      if (!nm) continue;
      const v = num(r[TAGKEY[nm]]);
      const sp = r.specification || '';
      if (!seen[nm]) {
        rr[`${nm}_max`] = v;
        rr[`${nm}_maxc`] = sp;
        seen[nm] = 1;
      } else if (seen[nm] === 1) {
        rr[`${nm}_min`] = v;
        rr[`${nm}_minc`] = sp;
        seen[nm] = 2;
      }
    }
    for (const c of COMPS) {
      if (rr[`${c}_max`] == null) {
        rr[`${c}_max`] = 0;
        rr[`${c}_maxc`] = '';
      }
      if (rr[`${c}_min`] == null) {
        rr[`${c}_min`] = 0;
        rr[`${c}_minc`] = '';
      }
    }
    out.push(rec);
  }
  return { nodes: out, warn, pool: nds.length };
}
