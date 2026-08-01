import { $ } from '../dom';
import { state, emit, fmt, activeQty } from '../state';
import { t } from '../i18n';
import { qtyLabel, unitOf } from '../model/quantity';
import { valueGradient } from '../model/color';
import { metricRange, signDomain, winLo, winHi, winActive, decimals } from '../derive';

const clampPct = (n: number): number => Math.max(0, Math.min(100, n));

export function drawLegend(): void {
  const legend = $('#legend');
  if (!state.nodes.length || state.legendHidden) {
    legend.style.display = 'none';
    return;
  }
  legend.style.display = '';

  const byGroup = state.colorByGroup;
  ($('#legScale') as HTMLElement).style.display = byGroup ? 'none' : '';
  ($('#legGroups') as HTMLElement).style.display = byGroup ? 'flex' : 'none';

  if (byGroup) {
    $('#legTitle').textContent = t('secGroups');
    const rows = state.groups
      .map(
        (g) =>
          `<div style="display:grid;grid-template-columns:14px 1fr auto;align-items:center;gap:7px;font-size:11.5px">
            <span style="width:12px;height:12px;border-radius:3px;background:${g.color};border:1px solid rgba(0,0,0,.15)"></span>
            <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${g.name}${g.description ? ' · ' + g.description : ''}</span>
            <span class="muted num">n° ${g.nodes.length}</span>
          </div>`,
      )
      .join('');
    ($('#legGroups') as HTMLElement).innerHTML =
      rows ||
      `<div class="muted" style="font-size:11px">${state.lang === 'it' ? 'Nessun gruppo' : 'No groups'}</div>`;
    return;
  }

  $('#legTitle').textContent = `${qtyLabel(activeQty())} · ${unitOf(activeQty(), state.un)}`;
  ($('#legGrad') as HTMLElement).style.background = valueGradient(
    metricRange().min,
    metricRange().max,
    signDomain(),
  );
  updateSlider();
}

function updateSlider(): void {
  const e = metricRange();
  const lo = winLo(),
    hi = winHi();
  const u = (v: number): number => (100 * (v - e.min)) / (e.max - e.min || 1);
  const a = clampPct(u(lo)),
    b = clampPct(u(hi));
  ($('#legH0') as HTMLElement).style.left = `${a}%`;
  ($('#legH1') as HTMLElement).style.left = `${b}%`;
  const fill = $('#legFill') as HTMLElement;
  fill.style.left = `${a}%`;
  fill.style.width = `${Math.max(0, b - a)}%`;
  const d = decimals();
  const loI = $('#legLo') as HTMLInputElement,
    hiI = $('#legHi') as HTMLInputElement;
  if (document.activeElement !== loI) loI.value = fmt(lo, d);
  if (document.activeElement !== hiI) hiI.value = fmt(hi, d);
  ($('#legReset') as HTMLElement).style.visibility = winActive() ? 'visible' : 'hidden';
}

function setWin(lo: number | null, hi: number | null): void {
  if (lo != null) state.win.lo = lo;
  if (hi != null) state.win.hi = hi;
  if (state.win.lo != null && state.win.hi != null && state.win.lo > state.win.hi) {
    const t0 = state.win.lo;
    state.win.lo = state.win.hi;
    state.win.hi = t0;
  }
  emit();
}

function trackValue(clientX: number): number {
  const tr = $('#legTrack').getBoundingClientRect();
  const e = metricRange();
  const u = Math.max(0, Math.min(1, (clientX - tr.left) / tr.width));
  return e.min + u * (e.max - e.min);
}

export function initLegend(): void {
  for (const id of ['legH0', 'legH1']) {
    const h = $('#' + id) as HTMLElement;
    let on = false;
    h.addEventListener('pointerdown', (ev) => {
      ev.preventDefault();
      h.setPointerCapture(ev.pointerId);
      on = true;
    });
    h.addEventListener('pointermove', (ev) => {
      if (!on) return;
      const v = trackValue(ev.clientX);
      if (id === 'legH0') setWin(v, null);
      else setWin(null, v);
    });
    h.addEventListener('pointerup', () => (on = false));
  }
  const parse = (s: string): number | null => {
    const v = parseFloat(String(s).replace(/\s/g, '').replace(',', '.'));
    return Number.isFinite(v) ? v : null;
  };
  ($('#legLo') as HTMLInputElement).onchange = (e): void => {
    const v = parse((e.target as HTMLInputElement).value);
    if (v != null) setWin(v, null);
    else updateSlider();
  };
  ($('#legHi') as HTMLInputElement).onchange = (e): void => {
    const v = parse((e.target as HTMLInputElement).value);
    if (v != null) setWin(null, v);
    else updateSlider();
  };
  ($('#legReset') as HTMLElement).onclick = (): void => {
    state.win = { lo: null, hi: null };
    emit();
  };
}
