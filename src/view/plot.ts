import { $, sel, cssVar } from '../dom';
import { state, emit, fmt } from '../state';
import { t } from '../i18n';
import { val, seriesVals, compOf } from '../model/quantity';
import { niceStep } from '../model/scale';
import { classOfState, valDec, visibleRows, inWin, utilizationActive } from '../derive';
import { utilization, utilFill, isOverloaded } from '../model/utilization';
import type { NodeRecord } from '../types';

const svg = (): SVGSVGElement => $<SVGSVGElement>('#plot');

const SX = (x: number): number => x * state.view.k + state.view.tx;
const SY = (y: number): number => y * state.view.k + state.view.ty;

function bbox(): { x0: number; x1: number; y0: number; y1: number } {
  const xs = state.nodes.map((r) => r.x),
    ys = state.nodes.map((r) => r.y);
  return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
}

export function fit(): void {
  if (!state.nodes.length) return;
  const b = bbox(),
    el = svg(),
    W = el.clientWidth || 900,
    H = el.clientHeight || 600,
    pad = 64;
  const w = Math.max(b.x1 - b.x0, 1e-6),
    h = Math.max(b.y1 - b.y0, 1e-6);
  state.view.k = Math.min((W - 2 * pad) / w, (H - 2 * pad) / h);
  state.view.tx = W / 2 - ((b.x0 + b.x1) / 2) * state.view.k;
  state.view.ty = H / 2 - ((b.y0 + b.y1) / 2) * state.view.k;
  drawPlot();
}

export function zoom(f: number): void {
  const el = svg(),
    W = el.clientWidth / 2,
    H = el.clientHeight / 2;
  state.view.tx = W - (W - state.view.tx) * f;
  state.view.ty = H - (H - state.view.ty) * f;
  state.view.k *= f;
  drawPlot();
}

export function restoreCamera(cam?: { kw: number; cx: number; cy: number }): void {
  const el = svg(),
    W = el.clientWidth || 900,
    H = el.clientHeight || 600;
  if (!cam || !cam.kw) {
    fit();
    return;
  }
  state.view.k = cam.kw * W;
  state.view.tx = W / 2 - cam.cx * state.view.k;
  state.view.ty = H / 2 - cam.cy * state.view.k;
  drawPlot();
}

const size = (r: NodeRecord): number =>
  Math.max(...seriesVals(r, state.qty, state.uf, state.pair).map(Math.abs));

/** Fill color for a value in the current mode (utilization vs class). */
function fillFor(r: NodeRecord, v: number): string {
  if (state.pointsOnly) return cssVar('--accent');
  if (utilizationActive()) return utilFill(utilization(r, state.qty, state.uf, state.capacity!));
  return inWin(v) ? state.colors[classOfState(v)] || '#999' : cssVar('--ghost');
}

export function drawPlot(): void {
  const el = svg();
  const W = el.clientWidth || 900,
    H = el.clientHeight || 600;
  el.setAttribute('viewBox', `0 0 ${W} ${H}`);
  while (el.firstChild) el.removeChild(el.firstChild);
  if (!state.nodes.length) return;

  const rows = visibleRows(),
    shown = new Set(rows.map((r) => r.no));
  let vmax = 1e-9;
  for (const r of state.nodes)
    for (const v of seriesVals(r, state.qty, state.uf, state.pair))
      vmax = Math.max(vmax, Math.abs(v));
  const rad = (v: number): number =>
    state.pointsOnly ? 3.6 : 3.4 + 17 * Math.sqrt(Math.abs(v) / vmax);

  const GRID = cssVar('--grid'),
    AXIS = cssVar('--grid-axis'),
    LAB = cssVar('--plot-lab'),
    HALO = cssVar('--halo'),
    INK = cssVar('--ink'),
    INK2 = cssVar('--ink-2'),
    ACCENT = cssVar('--accent'),
    GHOST = cssVar('--ghost'),
    DANGER = cssVar('--danger'),
    OUTLINE = 'rgba(27,34,48,.42)',
    NEGLINE = '#12305a';

  /* metric grid */
  const g = sel('g');
  const step = niceStep(180 / state.view.k);
  const mx0 = Math.floor((0 - state.view.tx) / state.view.k / step) * step,
    mx1 = (W - state.view.tx) / state.view.k;
  const my0 = Math.floor(-state.view.ty / state.view.k / step) * step,
    my1 = (H - state.view.ty) / state.view.k;
  for (let x = mx0; x <= mx1; x += step) {
    g.appendChild(
      sel('line', {
        x1: SX(x),
        y1: 0,
        x2: SX(x),
        y2: H,
        stroke: x === 0 ? AXIS : GRID,
        'stroke-width': x === 0 ? 1.2 : 0.6,
      }),
    );
    const tx = sel('text', {
      x: SX(x) + 3,
      y: H - 6,
      fill: LAB,
      'font-size': 9.5,
      'font-family': 'monospace',
    });
    tx.textContent = fmt(x, step < 1 ? 1 : 0);
    g.appendChild(tx);
  }
  for (let y = my0; y <= my1; y += step) {
    g.appendChild(
      sel('line', {
        x1: 0,
        y1: SY(y),
        x2: W,
        y2: SY(y),
        stroke: y === 0 ? AXIS : GRID,
        'stroke-width': y === 0 ? 1.2 : 0.6,
      }),
    );
    const ty = sel('text', {
      x: 5,
      y: SY(y) - 4,
      fill: LAB,
      'font-size': 9.5,
      'font-family': 'monospace',
    });
    ty.textContent = fmt(y, step < 1 ? 1 : 0);
    g.appendChild(ty);
  }
  el.appendChild(g);

  /* excluded nodes as geometric context */
  const gh = sel('g');
  for (const r of state.nodes)
    if (!shown.has(r.no))
      gh.appendChild(sel('circle', { cx: SX(r.x), cy: SY(r.y), r: 2, fill: GHOST }));
  el.appendChild(gh);

  /* active nodes, largest first */
  const gn = sel('g');
  const ord = rows.slice().sort((a, b) => size(b) - size(a));
  const half = (cx: number, cy: number, r: number, up: boolean): string =>
    `M ${cx - r} ${cy} A ${r} ${r} 0 0 ${up ? 1 : 0} ${cx + r} ${cy} Z`;

  for (const r of ord) {
    const cx = SX(r.x),
      cy = SY(r.y);
    const over =
      utilizationActive() && isOverloaded(utilization(r, state.qty, state.uf, state.capacity!));
    if (state.pair && !state.pointsOnly) {
      const c = compOf(state.qty),
        vu = (r as unknown as Record<string, number>)[`${c}_max`]! * state.uf,
        vd = (r as unknown as Record<string, number>)[`${c}_min`]! * state.uf;
      for (const [v, up] of [
        [vu, true],
        [vd, false],
      ] as [number, boolean][]) {
        const p = sel('path', {
          d: half(cx, cy, rad(v), up),
          fill: fillFor(r, v),
          stroke: v < 0 ? NEGLINE : OUTLINE,
          'stroke-width': v < 0 ? 1.4 : 0.7,
        });
        p.dataset.no = String(r.no);
        p.style.cursor = 'pointer';
        gn.appendChild(p);
      }
      gn.appendChild(
        sel('line', {
          x1: cx - rad(Math.max(Math.abs(vu), Math.abs(vd))),
          y1: cy,
          x2: cx + rad(Math.max(Math.abs(vu), Math.abs(vd))),
          y2: cy,
          stroke: OUTLINE,
          'stroke-width': 0.7,
        }),
      );
    } else {
      const v = val(r, state.qty, state.uf);
      const c = sel('circle', {
        cx,
        cy,
        r: rad(v),
        fill: fillFor(r, v),
        stroke: over ? DANGER : v < 0 && !state.pointsOnly ? NEGLINE : OUTLINE,
        'stroke-width': over ? 2 : v < 0 && !state.pointsOnly ? 1.6 : 0.7,
      });
      c.dataset.no = String(r.no);
      c.style.cursor = 'pointer';
      gn.appendChild(c);
    }
    if (state.region?.has(r.no))
      gn.appendChild(
        sel('circle', {
          cx,
          cy,
          r: rad(size(r)) + 3.5,
          fill: 'none',
          stroke: ACCENT,
          'stroke-width': 1.6,
        }),
      );
    if (state.sel === r.no)
      gn.appendChild(
        sel('circle', {
          cx,
          cy,
          r: rad(size(r)) + 6,
          fill: 'none',
          stroke: DANGER,
          'stroke-width': 2,
        }),
      );
  }
  el.appendChild(gn);

  /* labels */
  if (state.showLab || state.showVal) {
    const gt = sel('g');
    const d = valDec();
    const txt = (x: number, y: number, s: string, anchor = 'middle'): void => {
      const e = sel('text', {
        x,
        y,
        'text-anchor': anchor,
        'font-size': 10,
        'font-family': 'monospace',
        fill: INK,
        stroke: HALO,
        'stroke-width': 2.6,
        'paint-order': 'stroke',
      });
      e.textContent = s;
      gt.appendChild(e);
    };
    for (const r of ord) {
      const cx = SX(r.x),
        cy = SY(r.y);
      const v = val(r, state.qty, state.uf),
        rr = rad(v);
      const label =
        (state.showLab ? String(r.no) : '') +
        (state.showLab && state.showVal ? ' · ' : '') +
        (state.showVal ? fmt(v, d) : '');
      if (label) txt(cx, cy - rr - 4, label);
    }
    el.appendChild(gt);
  }

  /* reference triad */
  const ga = sel('g'),
    ax = W - 88,
    ay = 32,
    L = 30;
  const arrow = (x2: number, y2: number): void => {
    ga.appendChild(sel('line', { x1: ax, y1: ay, x2, y2, stroke: INK2, 'stroke-width': 1.3 }));
    const dx = Math.sign(x2 - ax),
      dy = Math.sign(y2 - ay);
    ga.appendChild(
      sel('path', {
        d: `M ${x2} ${y2} L ${x2 - dx * 6 - dy * 3} ${y2 - dy * 6 - dx * 3} L ${x2 - dx * 6 + dy * 3} ${y2 - dy * 6 + dx * 3} Z`,
        fill: INK2,
      }),
    );
  };
  arrow(ax + L, ay);
  arrow(ax, ay + L);
  ga.appendChild(
    sel('circle', { cx: ax, cy: ay, r: 5, fill: HALO, stroke: INK2, 'stroke-width': 1.3 }),
  );
  for (const s of [
    [-3.2, -3.2, 3.2, 3.2],
    [-3.2, 3.2, 3.2, -3.2],
  ])
    ga.appendChild(
      sel('line', {
        x1: ax + s[0]!,
        y1: ay + s[1]!,
        x2: ax + s[2]!,
        y2: ay + s[3]!,
        stroke: INK2,
        'stroke-width': 1.1,
      }),
    );
  const alab = (x: number, y: number, s: string, anchor: string): void => {
    const e = sel('text', {
      x,
      y,
      'text-anchor': anchor,
      'font-size': 10.5,
      'font-family': 'monospace',
      fill: INK2,
      stroke: HALO,
      'stroke-width': 2.4,
      'paint-order': 'stroke',
    });
    e.textContent = s;
    ga.appendChild(e);
  };
  alab(ax + L + 5, ay + 4, 'X', 'start');
  alab(ax, ay + L + 12, 'Y', 'middle');
  alab(ax - 9, ay - 8, 'Z', 'end');
  el.appendChild(ga);

  const sb = niceStep(120 / state.view.k);
  ($('#sbar span') as HTMLElement).textContent = fmt(sb, sb < 1 ? 1 : 0) + ' m';
  ($('#sbar .bar') as HTMLElement).style.width = sb * state.view.k + 'px';
}

/* --------------------------------------------------------------
   Interactions: pan / zoom / click-select / shift-drag region
   -------------------------------------------------------------- */
type Drag =
  | { mode: 'pan'; x: number; y: number; tx: number; ty: number; moved: boolean }
  | { mode: 'region'; x0: number; y0: number; rect: SVGElement };

let drag: Drag | null = null;

function nodesInRect(x0: number, y0: number, x1: number, y1: number): Set<number> {
  const lo = { x: Math.min(x0, x1), y: Math.min(y0, y1) },
    hi = { x: Math.max(x0, x1), y: Math.max(y0, y1) };
  const set = new Set<number>();
  for (const r of visibleRows()) {
    const cx = SX(r.x),
      cy = SY(r.y);
    if (cx >= lo.x && cx <= hi.x && cy >= lo.y && cy <= hi.y) set.add(r.no);
  }
  return set;
}

export function initPlot(): void {
  const el = svg();

  el.addEventListener('pointerdown', (e) => {
    el.setPointerCapture(e.pointerId);
    const r = el.getBoundingClientRect();
    if (e.shiftKey) {
      const rect = sel('rect', {
        x: e.clientX - r.left,
        y: e.clientY - r.top,
        width: 0,
        height: 0,
        fill: 'rgba(59,77,168,.12)',
        stroke: cssVar('--accent'),
        'stroke-width': 1,
        'stroke-dasharray': '4 3',
      });
      el.appendChild(rect);
      el.classList.add('select');
      drag = { mode: 'region', x0: e.clientX - r.left, y0: e.clientY - r.top, rect };
    } else {
      el.classList.add('drag');
      drag = {
        mode: 'pan',
        x: e.clientX,
        y: e.clientY,
        tx: state.view.tx,
        ty: state.view.ty,
        moved: false,
      };
    }
  });

  el.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const r = el.getBoundingClientRect();
    if (drag.mode === 'pan') {
      const dx = e.clientX - drag.x,
        dy = e.clientY - drag.y;
      if (Math.abs(dx) + Math.abs(dy) > 3) drag.moved = true;
      state.view.tx = drag.tx + dx;
      state.view.ty = drag.ty + dy;
      drawPlot();
    } else {
      const x = e.clientX - r.left,
        y = e.clientY - r.top;
      drag.rect.setAttribute('x', String(Math.min(drag.x0, x)));
      drag.rect.setAttribute('y', String(Math.min(drag.y0, y)));
      drag.rect.setAttribute('width', String(Math.abs(x - drag.x0)));
      drag.rect.setAttribute('height', String(Math.abs(y - drag.y0)));
    }
  });

  el.addEventListener('pointerup', (e) => {
    el.classList.remove('drag', 'select');
    if (drag?.mode === 'region') {
      const r = el.getBoundingClientRect();
      const set = nodesInRect(drag.x0, drag.y0, e.clientX - r.left, e.clientY - r.top);
      state.region = set.size ? set : null;
      emit();
    } else if (drag?.mode === 'pan' && !drag.moved) {
      const target = (document.elementFromPoint(e.clientX, e.clientY) || e.target) as HTMLElement;
      const no = target?.dataset?.no;
      if (no) {
        const n = +no;
        state.sel = state.sel === n ? null : n;
        emit();
        const tr = document.querySelector(`#tbl tr[data-no="${n}"]`);
        tr?.scrollIntoView({ block: 'center' });
      } else if (state.sel !== null) {
        state.sel = null;
        emit();
      }
    }
    drag = null;
  });

  el.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      const r = el.getBoundingClientRect(),
        mx = e.clientX - r.left,
        my = e.clientY - r.top;
      const f = Math.exp(-e.deltaY * 0.0015);
      state.view.tx = mx - (mx - state.view.tx) * f;
      state.view.ty = my - (my - state.view.ty) * f;
      state.view.k *= f;
      drawPlot();
    },
    { passive: false },
  );

  el.addEventListener('pointerleave', () => hideTip());
  el.addEventListener('pointermove', hoverTip);
}

/* lightweight tooltip reused from the original */
let tipEl: HTMLDivElement | null = null;
function tip(): HTMLDivElement {
  if (!tipEl) {
    tipEl = document.createElement('div');
    tipEl.id = 'tip';
    Object.assign(tipEl.style, {
      position: 'fixed',
      pointerEvents: 'none',
      zIndex: '50',
      background: 'rgba(27,34,48,.95)',
      color: '#fff',
      borderRadius: '6px',
      padding: '8px 10px',
      fontSize: '11.5px',
      maxWidth: '300px',
      opacity: '0',
      transition: 'opacity .09s',
      boxShadow: '0 6px 18px rgba(0,0,0,.28)',
      fontFamily: 'var(--mono)',
    } as CSSStyleDeclaration);
    document.body.appendChild(tipEl);
  }
  return tipEl;
}
function hideTip(): void {
  if (tipEl) tipEl.style.opacity = '0';
}
function hoverTip(e: PointerEvent): void {
  if (drag) return;
  const target = e.target as HTMLElement;
  const no = target?.dataset?.no;
  if (!no) return hideTip();
  const r = state.nodes.find((n) => n.no === +no);
  if (!r) return;
  const d = valDec();
  const rr = r as unknown as Record<string, number | string>;
  let h = `<b>${t('rows') === 'nodes' ? 'Node' : 'Nodo'} ${r.no}</b><br>X·Y ${fmt(r.x, 3)} · ${fmt(r.y, 3)} m`;
  for (const c of state.comps) {
    const u = /^M/.test(c) ? state.un + 'm' : state.un;
    h += `<br>${c} ${fmt((rr[`${c}_max`] as number) * state.uf, d)} / ${fmt((rr[`${c}_min`] as number) * state.uf, d)} ${u}`;
  }
  const tp = tip();
  tp.innerHTML = h;
  tp.style.opacity = '1';
  const w = tp.offsetWidth,
    ht = tp.offsetHeight;
  tp.style.left = Math.min(e.clientX + 16, window.innerWidth - w - 8) + 'px';
  tp.style.top = Math.min(Math.max(8, e.clientY - ht / 2), window.innerHeight - ht - 8) + 'px';
}
