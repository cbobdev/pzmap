import { $ } from '../dom';
import { state, emit, fmt } from '../state';
import { t } from '../i18n';
import { compOf, qtyLabel, unitOf, seriesVals } from '../model/quantity';
import { niceStep, utilColor } from '../model/scale';
import {
  baseRows,
  classOfState,
  inWin,
  valDec,
  winLo,
  winHi,
  recolor,
  utilizationActive,
} from '../derive';
import { utilization } from '../model/utilization';

export function setWin(lo: number | null, hi: number | null): void {
  if (lo != null) state.win.lo = lo;
  if (hi != null) state.win.hi = hi;
  if (state.win.lo != null && state.win.hi != null && state.win.lo > state.win.hi) {
    const tmp = state.win.lo;
    state.win.lo = state.win.hi;
    state.win.hi = tmp;
  }
  state.off.clear();
  recolor();
  emit();
}

export function resetWin(): void {
  state.win = { lo: null, hi: null };
  state.off.clear();
  recolor();
  emit();
}

const UTIL_BANDS = [0, 0.25, 0.5, 0.75, 1, Infinity];

export function drawLegend(): void {
  const legend = $('#legend');
  const rng = $('#rng');
  if (!state.nodes.length || state.pointsOnly) {
    legend.classList.add('hidden');
    return;
  }
  legend.classList.remove('hidden');

  if (utilizationActive()) {
    rng.style.display = 'none';
    $('#legTitle').textContent =
      `${t('legUtil')} · ${qtyLabel(state.qty)} / ${fmt(state.capacity!, valDec())} ${unitOf(state.qty, state.un)}`;
    const rows = baseRows();
    const counts = new Array(UTIL_BANDS.length - 1).fill(0);
    for (const r of rows) {
      const u = utilization(r, state.qty, state.uf, state.capacity!);
      for (let i = 0; i < UTIL_BANDS.length - 1; i++)
        if (u >= UTIL_BANDS[i]! && u < UTIL_BANDS[i + 1]!) {
          counts[i]++;
          break;
        }
    }
    const cmax = Math.max(...counts, 1);
    let h = '';
    for (let i = UTIL_BANDS.length - 2; i >= 0; i--) {
      const lo = UTIL_BANDS[i]! * 100,
        hi = UTIL_BANDS[i + 1]!;
      const lab = hi === Infinity ? `> 100%` : `${lo.toFixed(0)}–${(hi * 100).toFixed(0)}%`;
      h += `<div class="lrow"><span class="sw" style="background:${utilColor(Math.min(0.999, UTIL_BANDS[i]! + 0.12))}"></span>
        <span class="rg">${lab}</span>
        <span class="hb"><i style="width:${(100 * counts[i]) / cmax}%"></i></span>
        <span class="ct">${counts[i] || ''}</span></div>`;
    }
    $('#legBody').innerHTML = h;
    return;
  }

  rng.style.display = '';
  const b = state.breaks;
  const rows = baseRows();
  const counts = new Array(b.length - 1).fill(0);
  for (const r of rows)
    for (const v of seriesVals(r, state.qty, state.uf, state.pair))
      if (inWin(v)) counts[classOfState(v)]++;
  const cmax = Math.max(...counts, 1);
  const d = valDec();
  const c = compOf(state.qty);
  $('#legTitle').textContent =
    (state.pair ? `${c} max / min` : qtyLabel(state.qty)) + ` [${unitOf(state.qty, state.un)}]`;

  let h = '';
  for (let i = b.length - 2; i >= 0; i--) {
    const zero = b[i + 1] === 0 ? '<div class="lzero"></div>' : '';
    h +=
      zero +
      `<div class="lrow${state.off.has(i) ? ' off' : ''}" data-c="${i}">
        <span class="sw" style="background:${state.colors[i]}"></span>
        <span class="rg">${fmt(b[i]!, d)}…${fmt(b[i + 1]!, d)}</span>
        <span class="hb"><i style="width:${(100 * counts[i]) / cmax}%"></i></span>
        <span class="ct">${counts[i] || ''}</span></div>`;
  }
  const body = $('#legBody');
  body.innerHTML = h;
  body.querySelectorAll<HTMLElement>('.lrow').forEach((e) => {
    e.onclick = (): void => {
      const cc = +e.dataset.c!;
      if (state.off.has(cc)) state.off.delete(cc);
      else state.off.add(cc);
      emit();
    };
  });
}

/* --- range slider --- */
function trackValue(clientX: number): number {
  const tr = $('#rTrack').getBoundingClientRect();
  const u = Math.max(0, Math.min(1, (clientX - tr.left) / tr.width));
  const v = state.ext.lo + u * (state.ext.hi - state.ext.lo);
  const snap = niceStep((state.ext.hi - state.ext.lo) / 120);
  return Math.round(v / snap) * snap;
}

export function updateRange(): void {
  const lo = winLo(),
    hi = winHi(),
    e = state.ext,
    d = valDec();
  const u = (v: number): number => (100 * (v - e.lo)) / (e.hi - e.lo || 1);
  const a = Math.max(0, Math.min(100, u(lo))),
    b = Math.max(0, Math.min(100, u(hi)));
  ($('#rH0') as HTMLElement).style.left = a + '%';
  ($('#rH1') as HTMLElement).style.left = b + '%';
  const fill = $('#rFill') as HTMLElement;
  fill.style.left = a + '%';
  fill.style.width = Math.max(0, b - a) + '%';
  const rLo = $('#rLo') as HTMLInputElement,
    rHi = $('#rHi') as HTMLInputElement;
  if (document.activeElement !== rLo) rLo.value = fmt(lo, d);
  if (document.activeElement !== rHi) rHi.value = fmt(hi, d);
  ($('#rReset') as HTMLElement).style.visibility =
    state.win.lo == null && state.win.hi == null ? 'hidden' : 'visible';
}

export function initRange(): void {
  for (const id of ['rH0', 'rH1']) {
    const h = $('#' + id) as HTMLElement;
    let on = false;
    h.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      h.setPointerCapture(e.pointerId);
      on = true;
    });
    h.addEventListener('pointermove', (e) => {
      if (!on) return;
      const v = trackValue(e.clientX);
      if (id === 'rH0') setWin(v, null);
      else setWin(null, v);
    });
    h.addEventListener('pointerup', () => (on = false));
  }
  const parse = (s: string): number | null => {
    const v = parseFloat(String(s).replace(/\./g, '').replace(',', '.'));
    return Number.isFinite(v) ? v : null;
  };
  ($('#rLo') as HTMLInputElement).onchange = (e): void => {
    const v = parse((e.target as HTMLInputElement).value);
    if (v != null) setWin(v, null);
    else updateRange();
  };
  ($('#rHi') as HTMLInputElement).onchange = (e): void => {
    const v = parse((e.target as HTMLInputElement).value);
    if (v != null) setWin(null, v);
    else updateRange();
  };
  ($('#rReset') as HTMLElement).onclick = resetWin;
}
