import { $, sel, NS } from '../dom';
import { state, fmt, activeQty } from '../state';
import { t } from '../i18n';
import { cellValue } from '../model/filter';
import { sortedRows, signDomain, metricRange, decimals, groupOf } from '../derive';
import { qtyLabel, unitOf } from '../model/quantity';
import { valueColor } from '../model/color';
import { VB_H } from './project';
import { columns } from './table';
import { drawMap } from './map';

const FNT = 'Inter, sans-serif';

/** Export file stem with today's date, e.g. `pzmap_260801`. */
export function stamp(): string {
  const d = new Date();
  const p = (x: number): string => String(x).padStart(2, '0');
  return `pzmap_${String(d.getFullYear()).slice(2)}${p(d.getMonth() + 1)}${p(d.getDate())}`;
}

/** Legend baked into the PNG (bottom-left, viewBox coords): value gradient, or
 *  the group legend when colour-by-group is active. */
function legendGroup(): SVGElement {
  const g = sel('g');
  const x = 24;
  const title = (yy: number, s: string): void => {
    const e = sel('text', { x, y: yy, 'font-family': FNT, 'font-size': 14, 'font-weight': 600, fill: '#201f1d' });
    e.textContent = s;
    g.appendChild(e);
  };

  if (state.colorByGroup) {
    const gs = state.groups;
    const rowH = 18,
      w = 240,
      padTop = 24, // room so the "Gruppi" title doesn't touch the card edge
      boxH = padTop + gs.length * rowH + 10,
      boxTop = VB_H - 24 - boxH;
    g.appendChild(sel('rect', { x: x - 10, y: boxTop, width: w + 20, height: boxH, rx: 6, fill: '#ffffff', stroke: 'rgba(32,31,29,0.25)', 'stroke-width': 1 }));
    title(boxTop + 16, t('secGroups'));
    gs.forEach((grp, i) => {
      const yy = boxTop + padTop + 8 + i * rowH;
      g.appendChild(sel('rect', { x, y: yy - 9, width: 12, height: 12, rx: 2, fill: grp.color, stroke: 'rgba(0,0,0,.15)', 'stroke-width': 1 }));
      const lbl = sel('text', { x: x + 18, y: yy, 'font-family': FNT, 'font-size': 11, fill: '#201f1d' });
      lbl.textContent = `${grp.name}${grp.description ? ' · ' + grp.description : ''}  ·  n° ${grp.nodes.length}`;
      g.appendChild(lbl);
    });
    return g;
  }

  const y = VB_H - 92,
    w = 232,
    barH = 12;
  const dom = signDomain();
  const ext = metricRange();
  g.appendChild(sel('rect', { x: x - 10, y: y - 8, width: w + 20, height: 66, rx: 6, fill: '#ffffff', stroke: 'rgba(32,31,29,0.25)', 'stroke-width': 1 }));
  title(y + 4, `${qtyLabel(activeQty())} · ${unitOf(activeQty(), state.un)}`);
  const n = 40;
  for (let i = 0; i < n; i++) {
    const frac = i / (n - 1);
    const fill = valueColor(ext.min + (ext.max - ext.min) * frac, dom);
    g.appendChild(sel('rect', { x: x + (w * i) / n, y: y + 12, width: w / n + 0.6, height: barH, fill }));
  }
  const d = decimals();
  const tick = (tx: number, val: string, anchor: string): void => {
    const e = sel('text', { x: tx, y: y + 40, 'font-family': FNT, 'font-size': 10.5, fill: '#55524e', 'text-anchor': anchor });
    e.textContent = val;
    g.appendChild(e);
  };
  tick(x, fmt(ext.min, d), 'start');
  tick(x + w / 2, fmt((ext.min + ext.max) / 2, d), 'middle');
  tick(x + w, fmt(ext.max, d), 'end');
  return g;
}

function download(blob: Blob, name: string): void {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

export function exportCsv(): void {
  const cols = columns(),
    rows = sortedRows();
  const nf = (v: number | string): string =>
    typeof v === 'number' ? String(v).replace('.', ',') : String(v ?? '');
  const csvSafe = (s: string): string => (/[;\r\n"]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
  const header = cols.map((c) => c.label).concat(t('csvGroup'), t('csvGroupDesc')).join(';');
  const csv = [header]
    .concat(
      rows.map((r) => {
        const g = groupOf(r.no);
        return cols
          .map((c) => nf(cellValue(r, c.k, state.uf)))
          .concat(csvSafe(g?.name ?? ''), csvSafe(g?.description ?? ''))
          .join(';');
      }),
    )
    .join('\r\n');
  download(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }), `${stamp()}.csv`);
}

export function exportPng(): void {
  const svg = $<SVGSVGElement>('#map');
  const W = svg.clientWidth,
    H = svg.clientHeight,
    scale = 2;
  // render a fresh fit-to-content view for the export (centered), then restore
  const savedView = { ...state.view };
  state.view = { k: 1, tx: 0, ty: 0 };
  drawMap();
  const clone = svg.cloneNode(true) as SVGSVGElement;
  state.view = savedView;
  drawMap();
  clone.setAttribute('xmlns', NS);
  clone.setAttribute('width', String(W));
  clone.setAttribute('height', String(H));
  const bg = sel('rect', { x: 0, y: 0, width: 1000, height: 720, fill: '#f3f2f2' });
  clone.insertBefore(bg, clone.firstChild);
  clone.appendChild(legendGroup());
  const src =
    'data:image/svg+xml;base64,' +
    btoa(unescape(encodeURIComponent(new XMLSerializer().serializeToString(clone))));
  const img = new Image();
  img.onload = (): void => {
    const cv = document.createElement('canvas');
    cv.width = W * scale;
    cv.height = H * scale;
    const cx = cv.getContext('2d')!;
    cx.fillStyle = '#f3f2f2';
    cx.fillRect(0, 0, cv.width, cv.height);
    cx.drawImage(img, 0, 0, cv.width, cv.height);
    cv.toBlob((b) => b && download(b, `${stamp()}.png`));
  };
  img.src = src;
}
