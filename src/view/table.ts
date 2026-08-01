import { $ } from '../dom';
import { state, emit, fmt, activeQty } from '../state';
import { t } from '../i18n';
import { cellValue } from '../model/filter';
import { sortedRows, decimals, activeVal } from '../derive';
import type { Comp, NodeRecord } from '../types';

interface Col {
  k: string;
  label: string;
  kind: 'id' | 'num' | 'coord';
  critNeg?: boolean;
}

const PRINCIPAL: Comp[] = ['Pz', 'Px', 'Py'];

export function columns(): Col[] {
  const q = state.q;
  const cols: Col[] = [
    { k: 'no', label: t('colNode'), kind: 'id' },
    { k: `${q}_max`, label: `${q} max`, kind: 'num' },
    { k: `${q}_min`, label: `${q} min`, kind: 'num', critNeg: true },
  ];
  for (const c of PRINCIPAL)
    if (c !== q && state.comps.includes(c)) cols.push({ k: `${c}_max`, label: `${c} max`, kind: 'num' });
  cols.push({ k: 'x', label: 'X', kind: 'coord' });
  cols.push({ k: 'y', label: 'Y', kind: 'coord' });
  return cols;
}

const placeholderFor = (c: Col): string =>
  c.kind === 'id' ? 'id' : c.k.endsWith('_min') ? '<0' : '>0';

export function buildHead(): void {
  const cols = columns();
  const aq = activeQty();
  const th = $<HTMLTableElement>('#tbl').tHead!;
  th.innerHTML =
    '<tr>' +
    cols
      .map((c) => {
        const active = c.k === aq;
        const arrow = state.sortKey === c.k ? (state.sortDir < 0 ? ' ▾' : ' ▴') : '';
        const cls = (c.kind === 'id' || c.kind === 'coord' ? 'left' : '') + (active ? ' active' : '');
        return `<th class="${cls.trim()}" data-k="${c.k}">${c.label}${arrow}</th>`;
      })
      .join('') +
    '</tr>' +
    '<tr class="frow">' +
    cols
      .map((c) => {
        const cls = c.kind === 'id' || c.kind === 'coord' ? 'left' : '';
        // no filter box on coordinate columns (X / Y)
        if (c.kind === 'coord') return `<th class="${cls}"></th>`;
        return `<th class="${cls}"><input data-k="${c.k}" placeholder="${placeholderFor(c)}" value="${state.colF[c.k] || ''}"></th>`;
      })
      .join('') +
    '</tr>';

  th.querySelectorAll<HTMLElement>('th[data-k]').forEach((e) => {
    if (e.parentElement!.classList.contains('frow')) return;
    e.onclick = (): void => {
      const k = e.dataset.k!;
      if (state.sortKey === k) state.sortDir = (state.sortDir * -1) as -1 | 1;
      else {
        state.sortKey = k;
        state.sortDir = -1;
      }
      emit();
    };
  });
  th.querySelectorAll<HTMLInputElement>('input').forEach((inp) => {
    inp.oninput = (): void => {
      state.colF[inp.dataset.k!] = inp.value;
      emit();
    };
  });
}

export function drawTable(): void {
  const cols = columns();
  const aq = activeQty();
  const rows = sortedRows();
  const d = decimals();
  const selSet = new Set(state.sel);

  const html = rows
    .map((r) => {
      const tds = cols
        .map((c) => {
          if (c.kind === 'id') return `<td class="left nodecell">${r.no}</td>`;
          if (c.kind === 'coord')
            return `<td class="coord">${fmt((r as unknown as Record<string, number>)[c.k]!, 2)}</td>`;
          const v = cellValue(r, c.k, state.uf) as number;
          const active = c.k === aq;
          const crit = c.critNeg && v < 0;
          const cls = (active ? 'active ' : '') + (crit ? 'crit' : '');
          return `<td class="${cls.trim()}">${fmt(v, d)}</td>`;
        })
        .join('');
      return `<tr class="${selSet.has(r.no) ? 'sel' : ''}" data-no="${r.no}">${tds}</tr>`;
    })
    .join('');

  const tbody = $<HTMLTableElement>('#tbl').tBodies[0]!;
  tbody.innerHTML = html;
}

/* Selection is wired ONCE on the stable scroll container (the tbody is
   replaced on every render, which would kill an in-progress drag). Uses the
   live sorted order so drag/Shift ranges stay correct. Drag or Shift-click =
   range; Ctrl/Meta-click = toggle; plain click = single. */
let anchor: number | null = null;
let dragged = false;

const rowNoAt = (target: EventTarget | null): number | null => {
  const tr = (target as HTMLElement)?.closest?.('tr') as HTMLElement | null;
  return tr && tr.dataset.no ? +tr.dataset.no : null;
};
const selectRange = (a: number, b: number): void => {
  const ids = sortedRows().map((r) => r.no);
  const i = ids.indexOf(a),
    j = ids.indexOf(b);
  if (i < 0 || j < 0) return;
  state.sel = ids.slice(Math.min(i, j), Math.max(i, j) + 1);
  emit();
};

export function initTable(): void {
  const scroll = $('#tableScroll');
  scroll.addEventListener('pointerdown', (e) => {
    const n = rowNoAt(e.target);
    if (n == null) return;
    if (e.shiftKey && state.sel.length) {
      selectRange(state.sel[0]!, n);
      anchor = null;
      return;
    }
    e.preventDefault();
    anchor = n;
    dragged = false;
  });
  scroll.addEventListener('pointermove', (e) => {
    if (anchor == null || (e.buttons & 1) === 0) return;
    const n = rowNoAt(document.elementFromPoint(e.clientX, e.clientY));
    if (n == null || n === anchor) return;
    dragged = true;
    selectRange(anchor, n);
  });
  scroll.addEventListener('pointerup', (e) => {
    if (anchor == null) return;
    const n = anchor;
    anchor = null;
    if (dragged) return;
    if (e.ctrlKey || e.metaKey)
      state.sel = state.sel.includes(n) ? state.sel.filter((x) => x !== n) : [...state.sel, n];
    else state.sel = state.sel.length === 1 && state.sel[0] === n ? [] : [n];
    emit();
  });
}

/** Rows for CSV/copy in current sort+filter order. */
export function currentRows(): NodeRecord[] {
  return sortedRows();
}

export const activeValExport = activeVal;
