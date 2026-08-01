import { $, sel, cssVar } from '../dom';
import { state, emit, fmt, activeQty } from '../state';
import { t } from '../i18n';
import { qtyLabel } from '../model/quantity';
import { valueColor, CRITICAL, type SignDomain } from '../model/color';
import {
  activeVal,
  signDomain,
  keyDomain,
  radiusFor,
  radiusClamp,
  isUplift,
  filteredRows,
  groupOf,
  hiddenByGroup,
  decimals,
} from '../derive';
import { projector, screenParams, VB_H, type Projector } from './project';
import type { NodeRecord } from '../types';

const DIM = 'rgba(32,31,29,0.06)';
const STROKE = 'rgba(32,31,29,0.45)';
const GREY = '#c3c0b9'; // ungrouped fill in colour-by-group mode

const field = (r: NodeRecord, k: string): number => (r as unknown as Record<string, number>)[k] ?? 0;

/* base viewBox coords (post-projector) transformed by the pan/zoom view */
const tvx = (bx: number): number => bx * state.view.k + state.view.tx;
const tvy = (by: number): number => by * state.view.k + state.view.ty;

function fillFor(r: NodeRecord, shown: boolean, dom: SignDomain): string {
  if (!shown) return DIM;
  if (state.colorByGroup) return groupOf(r.no)?.color ?? GREY;
  return valueColor(activeVal(r), dom);
}

export function drawMap(): void {
  const svg = $<SVGSVGElement>('#map');
  while (svg.firstChild) svg.removeChild(svg.firstChild);
  clearLabels();
  if (!state.nodes.length) {
    $('#planLabel').textContent = '';
    $('#scaleBarLabel').textContent = '';
    ($('#scaleBarLine') as HTMLElement).style.width = '0';
    mapTR();
    return;
  }

  const P = projector();
  const dom = signDomain();
  const shown = new Set(filteredRows().map((r) => r.no));
  const upliftActive = state.q === 'Pz';

  drawGrid(svg);

  const g = sel('g');
  const half = (cx: number, cy: number, r: number, up: boolean): string =>
    `M ${cx - r} ${cy} A ${r} ${r} 0 0 ${up ? 1 : 0} ${cx + r} ${cy} Z`;

  if (state.pair) drawPair(g, P, shown, half);
  else drawSingle(g, P, dom, shown, upliftActive);
  svg.appendChild(g);
  drawSelectionMarkers(svg, P);

  // scale bar (HTML overlay, bottom-center); triad overlay is static in layout
  drawScaleBar(P);

  $('#planLabel').textContent = state.pair
    ? `${t('planLabel')} · ${state.q} max / min`
    : `${t('planLabel')} · ${qtyLabel(activeQty())}`;
  drawLabels(P, shown);
  mapTR();
}

/* single-value symbols */
function drawSingle(
  g: SVGElement,
  P: Projector,
  dom: SignDomain,
  shown: Set<number>,
  upliftActive: boolean,
): void {
  const ord = state.nodes.slice().sort((a, b) => Math.abs(activeVal(b)) - Math.abs(activeVal(a)));
  for (const r of ord) {
    if (hiddenByGroup(r)) continue; // group switched off → not drawn at all
    const isShown = shown.has(r.no);
    const v = activeVal(r);
    const cx = tvx(P.vbx(r.x)),
      cy = tvy(P.vby(r.y));
    const c = sel('circle', { cx, cy, r: radiusFor(Math.abs(v)), fill: fillFor(r, isShown, dom) });
    strokeFor(c, r, isShown, upliftActive);
    c.dataset.no = String(r.no);
    (c as SVGElement).style.cursor = 'pointer';
    g.appendChild(c);
  }
}

/* split-circle max/min, independent scales per half */
function drawPair(
  g: SVGElement,
  P: Projector,
  shown: Set<number>,
  half: (cx: number, cy: number, r: number, up: boolean) => string,
): void {
  const sd = signDomain();
  const domMax = keyDomain(`${state.q}_max`),
    domMin = keyDomain(`${state.q}_min`);
  const rOf = (val: number, dm: { min: number; max: number }): number =>
    radiusClamp(Math.abs(val), dm.min, dm.max);
  const ord = state.nodes
    .slice()
    .sort((a, b) => Math.abs(field(b, `${state.q}_max`)) - Math.abs(field(a, `${state.q}_max`)));
  for (const r of ord) {
    if (hiddenByGroup(r)) continue;
    const isShown = shown.has(r.no);
    const cx = tvx(P.vbx(r.x)),
      cy = tvy(P.vby(r.y));
    const vu = field(r, `${state.q}_max`) * state.uf,
      vd = field(r, `${state.q}_min`) * state.uf;
    const ru = rOf(vu, domMax),
      rd = rOf(vd, domMin);
    for (const [v, rr, up] of [
      [vu, ru, true],
      [vd, rd, false],
    ] as [number, number, boolean][]) {
      const p = sel('path', {
        d: half(cx, cy, rr, up),
        fill: !isShown ? DIM : state.colorByGroup ? (groupOf(r.no)?.color ?? GREY) : valueColor(v, sd),
        stroke: STROKE,
        'stroke-width': 0.8,
      });
      p.dataset.no = String(r.no);
      (p as SVGElement).style.cursor = 'pointer';
      g.appendChild(p);
    }
    g.appendChild(
      sel('line', { x1: cx - Math.max(ru, rd), y1: cy, x2: cx + Math.max(ru, rd), y2: cy, stroke: STROKE, 'stroke-width': 0.6 }),
    );
  }
}

function strokeFor(c: SVGElement, r: NodeRecord, isShown: boolean, upliftActive: boolean): void {
  if (upliftActive && isUplift(r) && isShown) {
    c.setAttribute('stroke', CRITICAL);
    c.setAttribute('stroke-width', '1.6');
    c.setAttribute('stroke-dasharray', '3 2');
  } else {
    c.setAttribute('stroke', STROKE);
    c.setAttribute('stroke-width', '0.8');
  }
}

/* strong in-place marker for selected nodes: double ring + (single) crosshair + number */
function drawSelectionMarkers(svg: SVGSVGElement, P: Projector): void {
  if (!state.sel.length) return;
  const accent = cssVar('--color-accent') || '#2f5488';
  const gsel = sel('g');
  const single = state.sel.length === 1;
  for (const no of state.sel) {
    const r = state.nodes.find((n) => n.no === no);
    if (!r || hiddenByGroup(r)) continue;
    const cx = tvx(P.vbx(r.x)),
      cy = tvy(P.vby(r.y));
    const rad = radiusFor(Math.abs(activeVal(r))) + 6;
    gsel.appendChild(sel('circle', { cx, cy, r: rad, fill: 'none', stroke: '#ffffff', 'stroke-width': 4 }));
    gsel.appendChild(sel('circle', { cx, cy, r: rad, fill: 'none', stroke: accent, 'stroke-width': 2.2 }));
    if (single) {
      const L = rad + 12;
      for (const [x1, y1, x2, y2] of [
        [cx - L, cy, cx - rad - 2, cy],
        [cx + rad + 2, cy, cx + L, cy],
        [cx, cy - L, cx, cy - rad - 2],
        [cx, cy + rad + 2, cx, cy + L],
      ] as number[][])
        gsel.appendChild(sel('line', { x1: x1!, y1: y1!, x2: x2!, y2: y2!, stroke: accent, 'stroke-width': 1.6 }));
      const tx = sel('text', {
        x: cx,
        y: cy - rad - 14,
        'text-anchor': 'middle',
        'font-size': 13,
        'font-family': 'monospace',
        'font-weight': 600,
        fill: accent,
        stroke: '#ffffff',
        'stroke-width': 3,
        'paint-order': 'stroke',
      });
      tx.textContent = `#${r.no}`;
      gsel.appendChild(tx);
    }
  }
  svg.appendChild(gsel);
}

/* ---- faint technical grid (world/base coords, pans & zooms) ---- */
function drawGrid(svg: SVGSVGElement): void {
  const G = 50; // base-viewBox spacing at zoom 1
  const { k, tx, ty } = state.view;
  const grid = sel('g');
  const stroke = 'rgba(32,31,29,0.06)';
  const start = (v: number): number => Math.floor(v / G) * G;
  for (let b = start((0 - tx) / k); b <= (1000 - tx) / k; b += G) {
    const x = b * k + tx;
    grid.appendChild(sel('line', { x1: x, y1: 0, x2: x, y2: VB_H, stroke, 'stroke-width': 0.6 }));
  }
  for (let b = start((0 - ty) / k); b <= (VB_H - ty) / k; b += G) {
    const y = b * k + ty;
    grid.appendChild(sel('line', { x1: 0, y1: y, x2: 1000, y2: y, stroke, 'stroke-width': 0.6 }));
  }
  svg.appendChild(grid);
}


/* ---- scale bar: HTML overlay pinned bottom-center (never overlaps corners) ---- */
function drawScaleBar(P: Projector): void {
  const wrap = $('#mapWrap');
  const sp = screenParams(wrap.clientWidth || 1, wrap.clientHeight || 1);
  const px = 100 * sp.scale; // 100 base-viewBox units in screen px
  const metres = 100 / (P.k * state.view.k);
  ($('#scaleBarLine') as HTMLElement).style.width = `${px}px`;
  $('#scaleBarLabel').textContent = `${fmt(metres, metres < 1 ? 2 : metres < 10 ? 1 : 0)} m`;
}

/* ---- HTML-overlay labels ---- */
function labelsBox(): HTMLElement {
  let c = document.getElementById('mapLabels');
  if (!c) {
    c = document.createElement('div');
    c.id = 'mapLabels';
    c.style.cssText = 'position:absolute;inset:0;pointer-events:none';
    $('#mapOverlay').appendChild(c);
  }
  return c;
}
function clearLabels(): void {
  labelsBox().innerHTML = '';
}

function drawLabels(P: Projector, shown: Set<number>): void {
  if (!state.lblVal && !state.lblIds) {
    clearLabels();
    return;
  }
  const wrap = $('#mapWrap');
  const w = wrap.clientWidth,
    h = wrap.clientHeight;
  if (!w || !h) return;
  const sp = screenParams(w, h);
  const S = (bx: number, by: number): { x: number; y: number } => ({
    x: sp.ox + tvx(bx) * sp.scale,
    y: sp.oy + tvy(by) * sp.scale,
  });
  const parts: string[] = [];
  const d = decimals();

  const put = (text: string, cx: number, cy: number, rPx: number): void => {
    const ly = cy - rPx - 10;
    if (cx < -20 || cx > w + 20 || ly < -20 || ly > h + 20) return; // off-screen only
    parts.push(`<div class="maplabel" style="left:${cx}px;top:${ly}px">${text}</div>`);
  };

  // label every visible support (zoom/pan to read where they crowd)
  for (const r of filteredRows()) {
    if (!shown.has(r.no)) continue;
    const p = S(P.vbx(r.x), P.vby(r.y));
    const rPx = radiusFor(Math.abs(activeVal(r))) * sp.scale;
    const text =
      (state.lblIds ? `#${r.no}` : '') +
      (state.lblIds && state.lblVal ? ' ' : '') +
      (state.lblVal ? fmt(activeVal(r), d) : '');
    if (text) put(text, p.x, p.y, rPx);
  }
  labelsBox().innerHTML = parts.join('');
}

/* ---- top-right controls ---- */
function mapTR(): void {
  const tr = $('#mapTR');
  tr.innerHTML = '';
  const btn = (label: string, onClick: () => void): void => {
    const b = document.createElement('button');
    b.className = 'btn btn-secondary';
    b.style.cssText = 'font-size:11.5px;padding:4px 9px';
    b.textContent = label;
    b.onclick = onClick;
    tr.appendChild(b);
  };
  if (state.sel.length) btn(t('clearSel'), () => ((state.sel = []), emit()));
  if (state.legendHidden) btn(t('legendChip'), () => ((state.legendHidden = false), emit()));
  if (!state.tableOpen) btn(t('showTable'), () => ((state.tableOpen = true), emit()));
}

/* ---- interactions: pan / zoom / click / shift-drag region ---- */
type Drag =
  | { mode: 'pan'; x: number; y: number; tx: number; ty: number; moved: boolean }
  | { mode: 'region'; x0: number; y0: number };

let drag: Drag | null = null;

export function fitMap(): void {
  state.view = { k: 1, tx: 0, ty: 0 };
  drawMap();
}
export function zoomMap(f: number): void {
  const wrap = $('#mapWrap');
  const w = wrap.clientWidth,
    h = wrap.clientHeight;
  zoomAround(w / 2, h / 2, f);
}
function zoomAround(px: number, py: number, f: number): void {
  const wrap = $('#mapWrap');
  const sp = screenParams(wrap.clientWidth, wrap.clientHeight);
  // base-viewBox point under the cursor
  const vb = { x: (px - sp.ox) / sp.scale, y: (py - sp.oy) / sp.scale };
  const bx = (vb.x - state.view.tx) / state.view.k,
    by = (vb.y - state.view.ty) / state.view.k;
  state.view.k *= f;
  state.view.tx = vb.x - bx * state.view.k;
  state.view.ty = vb.y - by * state.view.k;
  drawMap();
}

function regionSelect(x0: number, y0: number, x1: number, y1: number): void {
  const wrap = $('#mapWrap');
  const sp = screenParams(wrap.clientWidth, wrap.clientHeight);
  const P = projector();
  const lo = { x: Math.min(x0, x1), y: Math.min(y0, y1) },
    hi = { x: Math.max(x0, x1), y: Math.max(y0, y1) };
  const ids: number[] = [];
  for (const r of filteredRows()) {
    const px = sp.ox + tvx(P.vbx(r.x)) * sp.scale,
      py = sp.oy + tvy(P.vby(r.y)) * sp.scale;
    if (px >= lo.x && px <= hi.x && py >= lo.y && py <= hi.y) ids.push(r.no);
  }
  state.sel = ids;
  emit();
}

export function initMap(): void {
  const svg = $<SVGSVGElement>('#map');

  svg.addEventListener('pointerdown', (e) => {
    svg.setPointerCapture(e.pointerId);
    const r = $('#mapWrap').getBoundingClientRect();
    if (e.shiftKey) {
      const x0 = e.clientX - r.left,
        y0 = e.clientY - r.top;
      drag = { mode: 'region', x0, y0 };
      regionRectEl(x0, y0);
    } else {
      svg.classList.add('drag');
      drag = { mode: 'pan', x: e.clientX, y: e.clientY, tx: state.view.tx, ty: state.view.ty, moved: false };
    }
  });

  svg.addEventListener('pointermove', (e) => {
    if (!drag) {
      hover(e);
      return;
    }
    const r = $('#mapWrap').getBoundingClientRect();
    if (drag.mode === 'pan') {
      const sp = screenParams(r.width, r.height);
      const dx = (e.clientX - drag.x) / sp.scale,
        dy = (e.clientY - drag.y) / sp.scale;
      if (Math.abs(e.clientX - drag.x) + Math.abs(e.clientY - drag.y) > 3) drag.moved = true;
      state.view.tx = drag.tx + dx;
      state.view.ty = drag.ty + dy;
      drawMap();
    } else {
      updateRegionRect(drag.x0, drag.y0, e.clientX - r.left, e.clientY - r.top);
    }
  });

  svg.addEventListener('pointerup', (e) => {
    svg.classList.remove('drag');
    const r = $('#mapWrap').getBoundingClientRect();
    if (drag?.mode === 'region') {
      regionSelect(drag.x0, drag.y0, e.clientX - r.left, e.clientY - r.top);
      removeRegionRect();
    } else if (drag?.mode === 'pan' && !drag.moved) {
      // pointer capture retargets pointerup to the <svg>, so hit-test the dot
      // actually under the cursor instead of using e.target
      const hit = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
      const no = hit?.dataset?.no;
      if (no) {
        const n = +no;
        if (e.ctrlKey || e.metaKey) state.sel = state.sel.includes(n) ? state.sel.filter((x) => x !== n) : [...state.sel, n];
        else state.sel = state.sel.length === 1 && state.sel[0] === n ? [] : [n];
        emit();
        // bring the picked node's row into view + highlight it
        requestAnimationFrame(() => {
          document
            .querySelector(`#tbl tr[data-no="${n}"]`)
            ?.scrollIntoView({ block: 'center', behavior: 'smooth' });
        });
      } else if (state.sel.length) {
        state.sel = [];
        emit();
      }
    }
    drag = null;
  });

  svg.addEventListener('wheel', (e) => {
    e.preventDefault();
    const r = $('#mapWrap').getBoundingClientRect();
    zoomAround(e.clientX - r.left, e.clientY - r.top, Math.exp(-e.deltaY * 0.0015));
  }, { passive: false });

  svg.addEventListener('pointerleave', () => ($('#hoverCard').style.display = 'none'));
}

/* screen-space region rectangle in the overlay */
function regionRectEl(x: number, y: number): HTMLElement {
  let el = document.getElementById('regionRect');
  if (!el) {
    el = document.createElement('div');
    el.id = 'regionRect';
    el.style.cssText =
      'position:absolute;border:1px solid var(--color-accent);background:rgba(47,84,136,.10);pointer-events:none';
    $('#mapOverlay').appendChild(el);
  }
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  el.style.width = '0';
  el.style.height = '0';
  el.style.display = 'block';
  return el;
}
function updateRegionRect(x0: number, y0: number, x1: number, y1: number): void {
  const el = document.getElementById('regionRect');
  if (!el) return;
  el.style.left = `${Math.min(x0, x1)}px`;
  el.style.top = `${Math.min(y0, y1)}px`;
  el.style.width = `${Math.abs(x1 - x0)}px`;
  el.style.height = `${Math.abs(y1 - y0)}px`;
}
function removeRegionRect(): void {
  document.getElementById('regionRect')?.remove();
}

function hover(e: PointerEvent): void {
  const card = $('#hoverCard');
  const no = (e.target as HTMLElement)?.dataset?.no;
  if (!no) {
    card.style.display = 'none';
    return;
  }
  const r = state.nodes.find((n) => n.no === +no);
  if (!r) return;
  const d = decimals();
  const uf = state.uf;
  const rowsHtml = state.comps
    .map((c) => {
      const mx = field(r, `${c}_max`) * uf,
        mn = field(r, `${c}_min`) * uf;
      const unit = /^M/.test(c) ? state.un + 'm' : state.un;
      return (
        `<div class="hc-row${c === state.q ? ' on' : ''}">` +
        `<span class="hc-k">${c}</span>` +
        `<span class="hc-v">${fmt(mx, d)}<span class="hc-sep">/</span>` +
        `<span class="${mn < 0 ? 'neg' : ''}">${fmt(mn, d)}</span></span>` +
        `<span class="hc-u">${unit}</span></div>`
      );
    })
    .join('');
  const grp = groupOf(r.no);
  const grpLine = grp
    ? `<div class="hc-foot" style="display:flex;align-items:center;gap:5px"><span style="width:9px;height:9px;border-radius:2px;background:${grp.color}"></span>${grp.name}${grp.description ? ' · ' + grp.description : ''}</div>`
    : '';
  card.innerHTML =
    `<div class="hc-head">${state.lang === 'it' ? 'Nodo' : 'Node'} ${r.no}</div>` +
    `<div class="hc-grid">${rowsHtml}</div>` +
    grpLine +
    `<div class="hc-foot">x ${fmt(r.x, 2)} · y ${fmt(r.y, 2)} m</div>`;
  const wrap = $('#mapWrap').getBoundingClientRect();
  card.style.display = 'block';
  let x = e.clientX - wrap.left + 14,
    y = e.clientY - wrap.top + 14;
  x = Math.min(x, wrap.width - card.offsetWidth - 6);
  y = Math.min(y, wrap.height - card.offsetHeight - 6);
  card.style.left = `${x}px`;
  card.style.top = `${y}px`;
}
