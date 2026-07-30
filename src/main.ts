import './styles/app.css';
import { $, $$ } from './dom';
import { state, subscribe, emit, fmt, type Lang } from './state';
import { COMPS, type Meta, type NodeRecord } from './types';
import { t } from './i18n';
import { renderLayout, applyLang } from './ui/layout';
import { recolor } from './derive';
import { buildHead, drawTable } from './view/table';
import { drawLegend, updateRange, initRange } from './view/legend';
import { drawStats, drawSelection } from './view/stats';
import { drawPlot, initPlot, fit, zoom, restoreCamera } from './view/plot';
import { exportCsv, exportPng } from './view/exporters';
import { tableOf, isNodeTable, isForceTable, buildNodes } from './parse/rfemJson';
import { readXlsx, xlsxForces, xlsxNodes } from './parse/xlsx';
import { buildProject, parseProject, applyView, type PersistedView } from './parse/project';

/* ---------------- toast ---------------- */
let toastTimer: number | undefined;
function toast(msg: string, kind?: 'err'): void {
  const el = $('#toast');
  el.textContent = msg;
  el.className = 'toast on' + (kind ? ' ' + kind : '');
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(
    () => (el.className = 'toast' + (kind ? ' ' + kind : '')),
    kind === 'err' ? 9000 : 4000,
  );
}

/* ---------------- render ---------------- */
function render(): void {
  applyTableVisibility();
  if (!state.nodes.length) {
    drawPlot();
    drawStats([]);
    return;
  }
  updateRange();
  drawLegend();
  const rows = drawTable();
  drawPlot();
  drawStats(rows);
  drawSelection();
}

function applyTableVisibility(): void {
  $('#workspace').classList.toggle('no-table', state.tableHidden);
}

/* ---------------- dataset install ---------------- */
const field = (r: NodeRecord, k: string): number =>
  (r as unknown as Record<string, number>)[k] ?? 0;
const hasQty = (q: string): boolean =>
  $$('#qty option').some((o) => (o as HTMLOptionElement).value === q);

function buildQtyOptions(): void {
  const opts: [string, string][] = [];
  for (const c of state.comps) {
    opts.push([`${c}_max`, `${c} max`]);
    opts.push([`${c}_min`, `${c} min`]);
  }
  for (const c of state.comps) opts.push([`|${c}|`, `|${c}| max abs`]);
  ($('#qty') as HTMLSelectElement).innerHTML = opts
    .map(([v, l]) => `<option value="${v}">${l}</option>`)
    .join('');
  state.qty = opts.some((o) => o[0] === 'Pz_max') ? 'Pz_max' : opts[0]![0];
}

function titleMeta(): void {
  const n = state.nodes;
  const zs = n.map((r) => r.z),
    z0 = Math.min(...zs),
    z1 = Math.max(...zs);
  const ns = n.map((r) => r.no);
  const pool = state.meta.pool && state.meta.pool > n.length ? `/${state.meta.pool}` : '';
  const zt = z0 === z1 ? `${fmt(z0, 3)} m` : `${fmt(z0, 2)}…${fmt(z1, 2)} m`;
  $('#titleSub').textContent =
    `mod. ${state.meta.model || '—'} · ${n.length}${pool} ${t('rows')} (n. ${Math.min(...ns)}–${Math.max(...ns)}) · Z ${zt} ↓`;
}

function install(nodes: NodeRecord[], meta: Meta, warn: string[] = [], view?: PersistedView): void {
  if (!nodes.length) {
    toast(t('toNoNodes'), 'err');
    return;
  }
  state.nodes = nodes;
  state.meta = meta;
  state.comps = COMPS.filter((c) =>
    nodes.some((r) => field(r, `${c}_max`) !== 0 || field(r, `${c}_min`) !== 0),
  );
  if (!state.comps.length) state.comps = ['Pz'];

  buildQtyOptions();
  state.filters = {};
  state.off.clear();
  state.sel = null;
  state.region = null;
  state.sort = { col: null, dir: 1 };
  state.win = { lo: null, hi: null };
  state.pair = false;

  if (view) applyView(state, view, hasQty);
  syncControls();
  buildHead();
  recolor();
  titleMeta();
  $('#empty').classList.add('hide');
  emit();
  requestAnimationFrame(() => restoreCamera(view?.camera));
  if (warn.length) toast(warn.join(' · '), 'err');
}

/* ---------------- control sync ---------------- */
function syncControls(): void {
  ($('#qty') as HTMLSelectElement).value = state.qty;
  ($('#unit') as HTMLSelectElement).value = `${state.uf}|${state.un}`;
  ($('#nclass') as HTMLSelectElement).value = String(state.nClass);
  ($('#cLab') as HTMLInputElement).checked = state.showLab;
  ($('#cVal') as HTMLInputElement).checked = state.showVal;
  ($('#cComb') as HTMLInputElement).checked = state.showComb;
  ($('#cCols') as HTMLInputElement).checked = state.allCols;
  ($('#cPoints') as HTMLInputElement).checked = state.pointsOnly;
  const cPair = $('#cPair') as HTMLInputElement;
  cPair.checked = state.pair;
  cPair.disabled = state.qty[0] === '|';
  ($('#capacity') as HTMLInputElement).value = state.capacity != null ? String(state.capacity) : '';
  $('#bTable').classList.toggle('on', !state.tableHidden);
  applyTableVisibility();
  $$(`#langSeg button`).forEach((b) =>
    b.classList.toggle('on', (b as HTMLElement).dataset.lang === state.lang),
  );
}

/* ---------------- file loading ---------------- */
async function readFiles(files: File[]): Promise<void> {
  const list = files.filter((f) => /\.(json|xlsx)$/i.test(f.name));
  if (!list.length) {
    toast(t('toNeedFiles'), 'err');
    return;
  }
  let nodeT = null,
    forceT = null,
    model: string | null = null;
  for (const f of list) {
    const mm = f.name.match(/^(\d+)/);
    if (mm) model = model || mm[1]!;
    try {
      if (/\.json$/i.test(f.name)) {
        const tbl = tableOf(JSON.parse(await f.text()));
        if (tbl) {
          if (isNodeTable(tbl)) nodeT = tbl;
          else if (isForceTable(tbl)) forceT = tbl;
          model = model || tbl.model || null;
        }
      } else {
        const rows = await readXlsx(f);
        const ft = xlsxForces(rows);
        if (ft) {
          forceT = ft;
          continue;
        }
        const nt = xlsxNodes(rows);
        if (nt) nodeT = nt;
        else toast(t('toBadSheet', { name: f.name }), 'err');
      }
    } catch (err) {
      toast(`${f.name}: ${(err as Error).message}`, 'err');
    }
  }
  if (!nodeT && !forceT) {
    toast(t('toNoTable'), 'err');
    return;
  }
  if (!nodeT) {
    toast(t('toNoNodes'), 'err');
    return;
  }
  const res = buildNodes(nodeT, forceT);
  if (res.error) {
    toast(res.error, 'err');
    return;
  }
  install(res.nodes!, { model: model || '—', pool: res.pool }, res.warn);
  toast(t('toLoaded', { n: res.nodes!.length }));
}

async function openProject(f: File): Promise<void> {
  try {
    const proj = parseProject(await f.text());
    install(proj.nodes, proj.meta, [], proj.view);
    if (proj.view.lang) setLang(proj.view.lang as Lang);
  } catch {
    toast(t('toProjBad'), 'err');
  }
}

function saveProject(): void {
  if (!state.nodes.length) return;
  const svg = $<SVGSVGElement>('#plot');
  const proj = buildProject(svg.clientWidth || 900, svg.clientHeight || 600);
  const blob = new Blob([JSON.stringify(proj)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  const d = new Date(),
    p = (x: number): string => String(x).padStart(2, '0');
  a.download = `pzmap_${state.meta.model || 'x'}_${p(d.getDate())}${p(d.getMonth() + 1)}.pzmap`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  toast(t('toProjSaved'));
}

/* ---------------- language ---------------- */
function setLang(l: Lang): void {
  state.lang = l;
  try {
    localStorage.setItem('pzmap.lang', l);
  } catch {
    /* ignore */
  }
  document.documentElement.lang = l;
  applyLang();
  syncControls();
  if (state.nodes.length) render();
}

/* ---------------- wiring ---------------- */
function wire(): void {
  ($('#qty') as HTMLSelectElement).onchange = (e): void => {
    state.qty = (e.target as HTMLSelectElement).value;
    state.off.clear();
    state.win = { lo: null, hi: null };
    if (state.qty[0] === '|') {
      state.pair = false;
      ($('#cPair') as HTMLInputElement).checked = false;
    }
    ($('#cPair') as HTMLInputElement).disabled = state.qty[0] === '|';
    buildHead();
    recolor();
    emit();
  };
  ($('#cPair') as HTMLInputElement).onchange = (e): void => {
    state.pair = (e.target as HTMLInputElement).checked;
    state.off.clear();
    state.win = { lo: null, hi: null };
    buildHead();
    recolor();
    emit();
  };
  ($('#unit') as HTMLSelectElement).onchange = (e): void => {
    const [f, n] = (e.target as HTMLSelectElement).value.split('|');
    state.uf = +f!;
    state.un = n!;
    state.win = { lo: null, hi: null };
    buildHead();
    recolor();
    emit();
  };
  ($('#nclass') as HTMLSelectElement).onchange = (e): void => {
    state.nClass = +(e.target as HTMLSelectElement).value;
    state.off.clear();
    recolor();
    emit();
  };
  ($('#cLab') as HTMLInputElement).onchange = (e): void => {
    state.showLab = (e.target as HTMLInputElement).checked;
    drawPlot();
  };
  ($('#cVal') as HTMLInputElement).onchange = (e): void => {
    state.showVal = (e.target as HTMLInputElement).checked;
    drawPlot();
  };
  ($('#cPoints') as HTMLInputElement).onchange = (e): void => {
    state.pointsOnly = (e.target as HTMLInputElement).checked;
    emit();
  };
  ($('#cComb') as HTMLInputElement).onchange = (e): void => {
    state.showComb = (e.target as HTMLInputElement).checked;
    buildHead();
    emit();
  };
  ($('#cCols') as HTMLInputElement).onchange = (e): void => {
    state.allCols = (e.target as HTMLInputElement).checked;
    buildHead();
    emit();
  };
  ($('#capacity') as HTMLInputElement).oninput = (e): void => {
    const v = parseFloat((e.target as HTMLInputElement).value);
    state.capacity = Number.isFinite(v) && v > 0 ? v : null;
    emit();
  };
  ($('#bClear') as HTMLElement).onclick = (): void => {
    state.filters = {};
    state.off.clear();
    state.sel = null;
    state.region = null;
    state.win = { lo: null, hi: null };
    buildHead();
    recolor();
    emit();
  };

  $('#bFit').onclick = fit;
  $('#bIn').onclick = (): void => zoom(1.3);
  $('#bOut').onclick = (): void => zoom(1 / 1.3);

  const fileInput = $('#file') as HTMLInputElement;
  $('#bLoad').onclick = (): void => fileInput.click();
  ($('#bLoad2') as HTMLElement).onclick = (): void => fileInput.click();
  fileInput.onchange = (e): void => {
    void readFiles([...((e.target as HTMLInputElement).files ?? [])]);
    fileInput.value = '';
  };

  const projInput = $('#projFile') as HTMLInputElement;
  $('#bProjOpen').onclick = (): void => projInput.click();
  projInput.onchange = (e): void => {
    const f = (e.target as HTMLInputElement).files?.[0];
    if (f) void openProject(f);
    projInput.value = '';
  };
  $('#bProjSave').onclick = saveProject;

  // export menu
  const menu = $('#exportMenu');
  $('#bExport').onclick = (ev): void => {
    ev.stopPropagation();
    menu.classList.toggle('open');
  };
  document.addEventListener('click', () => menu.classList.remove('open'));
  $('#exCsv').onclick = (): void => {
    exportCsv();
    menu.classList.remove('open');
  };
  $('#exPng').onclick = (): void => {
    exportPng();
    menu.classList.remove('open');
  };

  ($('#bTable') as HTMLElement).onclick = (): void => {
    state.tableHidden = !state.tableHidden;
    $('#bTable').classList.toggle('on', !state.tableHidden);
    applyTableVisibility();
    if (state.nodes.length) requestAnimationFrame(drawPlot);
  };

  // language segmented control
  $$('#langSeg button').forEach((b) => {
    (b as HTMLElement).onclick = (): void => setLang((b as HTMLElement).dataset.lang as Lang);
  });

  // drag & drop
  window.addEventListener('dragover', (e) => {
    e.preventDefault();
    $('#drop').classList.add('on');
  });
  window.addEventListener('dragleave', (e) => {
    if ((e as DragEvent).clientX === 0 && (e as DragEvent).clientY === 0)
      $('#drop').classList.remove('on');
  });
  window.addEventListener('drop', (e) => {
    e.preventDefault();
    $('#drop').classList.remove('on');
    const files = [...((e as DragEvent).dataTransfer?.files ?? [])];
    if (files.some((f) => /\.pzmap$/i.test(f.name))) void openProject(files[0]!);
    else void readFiles(files);
  });

  window.addEventListener('resize', () => state.nodes.length && drawPlot());
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      state.sel = null;
      state.region = null;
      emit();
    }
  });
}

/* ---------------- boot ---------------- */
function boot(): void {
  renderLayout();
  let lang: Lang = 'it';
  try {
    lang =
      (localStorage.getItem('pzmap.lang') as Lang) ||
      ((navigator.language || 'it').slice(0, 2) as Lang);
  } catch {
    /* ignore */
  }
  state.lang = lang === 'en' ? 'en' : 'it';
  document.documentElement.lang = state.lang;
  applyLang();
  initPlot();
  initRange();
  wire();
  syncControls();
  subscribe(render);
  $('#empty').classList.remove('hide');
}

boot();
