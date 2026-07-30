import { $ } from '../dom';
import { state, emit, fmt } from '../state';
import { t } from '../i18n';
import { qtyLabel, unitOf } from '../model/quantity';
import { qtyStats, componentSum, resultant } from '../model/stats';
import { valDec } from '../derive';
import type { NodeRecord } from '../types';

const box = (label: string, value: string, cls = ''): string =>
  `<div class="stat"><span class="lab">${label}</span><b class="${cls}">${value}</b></div>`;

export function drawStats(rows: NodeRecord[]): void {
  if (!state.nodes.length) {
    $('#stats').innerHTML = '';
    return;
  }
  const s = qtyStats(rows, state.qty, state.uf);
  const d = valDec();
  const u = unitOf(state.qty, state.un);
  let html =
    box(`${t('stSum')} ${qtyLabel(state.qty)}`, `${fmt(s.sum, d)} ${u}`) +
    box(t('stAvg'), fmt(s.mean, d)) +
    box(t('stMin'), fmt(s.min, d)) +
    box(t('stMax'), fmt(s.max, d)) +
    (s.neg ? box(t('stNeg'), `${s.neg} ${t('rows')}`, 'neg') : '');
  const fu = state.un;
  if (state.comps.includes('Px'))
    html += box(t('stResX'), `${fmt(componentSum(rows, 'Px', state.uf), d)} ${fu}`);
  if (state.comps.includes('Py'))
    html += box(t('stResY'), `${fmt(componentSum(rows, 'Py', state.uf), d)} ${fu}`);
  if (state.comps.includes('Pz'))
    html += box(t('stResZ'), `${fmt(componentSum(rows, 'Pz', state.uf), d)} ${fu}`);
  $('#stats').innerHTML = html;
}

export function drawSelection(): void {
  const el = $('#selbox');
  if (!state.region || !state.region.size) {
    el.classList.remove('on');
    el.innerHTML = '';
    return;
  }
  const rows = state.nodes.filter((r) => state.region!.has(r.no));
  const r = resultant(rows, state.uf);
  const d = valDec();
  const fu = state.un;
  el.innerHTML =
    `<h4>${t('selTitle')} · ${r.count} ${t('rows')}</h4>` +
    `<div class="row"><span>${t('stResX')}</span><b>${fmt(r.sumX, d)} ${fu}</b></div>` +
    `<div class="row"><span>${t('stResY')}</span><b>${fmt(r.sumY, d)} ${fu}</b></div>` +
    `<div class="row"><span>${t('stResZ')}</span><b>${fmt(r.sumZ, d)} ${fu}</b></div>` +
    (r.centroid
      ? `<div class="row"><span>${t('selCentroid')}</span><b>${fmt(r.centroid.x, 2)}, ${fmt(r.centroid.y, 2)} m</b></div>`
      : '') +
    `<button id="selClear">${t('selClear')}</button>`;
  el.classList.add('on');
  ($('#selClear') as HTMLElement).onclick = (): void => {
    state.region = null;
    emit();
  };
}
