import { $ } from '../dom';
import { state, emit, fmt } from '../state';
import { t } from '../i18n';
import { cellValue } from '../model/filter';
import { columns, visibleRows, valDec, utilizationActive } from '../derive';
import { utilization, isOverloaded } from '../model/utilization';
import type { NodeRecord } from '../types';

export function buildHead(): void {
  const cols = columns();
  const th = $<HTMLTableElement>('#tbl').tHead!;
  th.innerHTML =
    '<tr>' +
    cols.map((c) => `<th data-k="${c.k}">${c.t}<span class="ar"></span></th>`).join('') +
    '</tr>' +
    '<tr class="frow">' +
    cols
      .map(
        (c) =>
          `<th><input data-k="${c.k}" placeholder="${c.n ? '>0' : '…'}" value="${state.filters[c.k] || ''}"></th>`,
      )
      .join('') +
    '</tr>';
  th.querySelectorAll<HTMLElement>('th[data-k]').forEach((e) => {
    e.onclick = (): void => {
      const k = e.dataset.k!;
      state.sort = state.sort.col === k ? { col: k, dir: -state.sort.dir } : { col: k, dir: 1 };
      emit();
    };
  });
  th.querySelectorAll<HTMLInputElement>('input').forEach((inp) => {
    inp.oninput = (): void => {
      state.filters[inp.dataset.k!] = inp.value;
      emit();
    };
    inp.onclick = (ev): void => ev.stopPropagation();
  });
}

export function drawTable(): NodeRecord[] {
  const cols = columns();
  let rows = visibleRows();
  if (state.sort.col) {
    const k = state.sort.col,
      dir = state.sort.dir;
    rows = rows.slice().sort((a, b) => {
      const va = cellValue(a, k, state.uf),
        vb = cellValue(b, k, state.uf);
      return typeof va === 'number' && typeof vb === 'number'
        ? (va - vb) * dir
        : String(va).localeCompare(String(vb), 'it') * dir;
    });
  }
  $<HTMLTableElement>('#tbl')
    .tHead!.querySelectorAll<HTMLElement>('th[data-k] .ar')
    .forEach((e) => {
      e.textContent =
        state.sort.col === (e.parentNode as HTMLElement).dataset.k
          ? state.sort.dir > 0
            ? ' ▲'
            : ' ▼'
          : '';
    });
  const d = valDec();
  const util = utilizationActive();
  const html = rows
    .map((r) => {
      const over = util && isOverloaded(utilization(r, state.qty, state.uf, state.capacity!));
      const tds = cols
        .map((c) => {
          const v = cellValue(r, c.k, state.uf);
          if (!c.n) return `<td class="txt">${v || '—'}</td>`;
          const dec = c.k === 'no' ? 0 : c.k === 'x' || c.k === 'y' || c.k === 'z' ? 2 : d;
          const isCoord = c.k === 'no' || c.k === 'x' || c.k === 'y' || c.k === 'z';
          const active = c.k === state.qty;
          const cls =
            (active ? 'q ' : '') +
            (active && over ? 'over ' : '') +
            (!isCoord && typeof v === 'number' && v < 0 ? 'neg' : '');
          return `<td class="${cls.trim()}">${fmt(v, dec)}</td>`;
        })
        .join('');
      return `<tr data-no="${r.no}" class="${state.sel === r.no ? 'sel' : ''}">${tds}</tr>`;
    })
    .join('');
  const tbody = $<HTMLTableElement>('#tbl').tBodies[0]!;
  tbody.innerHTML = html;
  tbody.querySelectorAll<HTMLElement>('tr').forEach((tr) => {
    tr.onclick = (): void => {
      const no = +tr.dataset.no!;
      state.sel = state.sel === no ? null : no;
      emit();
    };
  });
  $('#rowCount').textContent = `${rows.length} / ${state.nodes.length} ${t('rows')}`;
  return rows;
}
