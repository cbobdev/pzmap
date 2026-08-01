import { $ } from '../dom';
import { state, fmt } from '../state';
import { t } from '../i18n';
import { qtyLabel } from '../model/quantity';
import { activeQty } from '../state';
import { scope, filteredRows, decimals } from '../derive';

const grp = (label: string, value: string, bold = false): string =>
  `<span><span class="muted" style="font-size:10px;letter-spacing:0.06em;text-transform:uppercase;color:var(--color-accent-700)">${label}</span> <span style="${bold ? 'font-weight:600' : 'color:color-mix(in srgb,var(--color-text) 60%,transparent)'}">${value}</span></span>`;

export function drawStatus(): void {
  if (!state.nodes.length) {
    $('#statusScope').innerHTML = '';
    $('#statusRight').textContent = '';
    return;
  }
  const filtered = filteredRows();
  const selecting = state.sel.length > 0;
  const rows = selecting ? state.nodes.filter((r) => state.sel.includes(r.no)) : filtered;
  const s = scope(rows);
  const d = decimals();
  const heading = selecting ? t('selection') : t('filteredSet');

  $('#statusScope').innerHTML =
    grp(heading, `${s.n} ${t('scSupports')}`, true) +
    grp('Σ ' + qtyLabel(activeQty()), fmt(s.sum, d)) +
    grp(t('scMax'), fmt(s.max, d)) +
    grp(t('scMin'), fmt(s.min, d));

  $('#statusRight').textContent = 'kN · kNm';
}
