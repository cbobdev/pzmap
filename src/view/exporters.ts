import { $, sel, cssVar, NS } from '../dom';
import { state } from '../state';
import { cellValue } from '../model/filter';
import { columns, visibleRows } from '../derive';

function download(blob: Blob, name: string): void {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

export function exportCsv(): void {
  const cols = columns(),
    rows = visibleRows();
  const nf = (v: number | string): string =>
    typeof v === 'number' ? String(v).replace('.', ',') : String(v ?? '');
  const csv = [cols.map((c) => c.t).join(';')]
    .concat(rows.map((r) => cols.map((c) => nf(cellValue(r, c.k, state.uf))).join(';')))
    .join('\r\n');
  download(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }), `reazioni_${state.qty}.csv`);
}

export function exportPng(): void {
  const svg = $<SVGSVGElement>('#plot');
  const W = svg.clientWidth,
    H = svg.clientHeight,
    scale = 2;
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute('xmlns', NS);
  clone.setAttribute('width', String(W));
  clone.setAttribute('height', String(H));
  const bg = sel('rect', { x: 0, y: 0, width: W, height: H, fill: cssVar('--panel') || '#fff' });
  clone.insertBefore(bg, clone.firstChild);
  const src =
    'data:image/svg+xml;base64,' +
    btoa(unescape(encodeURIComponent(new XMLSerializer().serializeToString(clone))));
  const img = new Image();
  img.onload = (): void => {
    const cv = document.createElement('canvas');
    cv.width = W * scale;
    cv.height = H * scale;
    const cx = cv.getContext('2d')!;
    cx.fillStyle = cssVar('--panel') || '#fff';
    cx.fillRect(0, 0, cv.width, cv.height);
    cx.drawImage(img, 0, 0, cv.width, cv.height);
    cv.toBlob((b) => b && download(b, `pianta_${state.qty}.png`));
  };
  img.src = src;
}
