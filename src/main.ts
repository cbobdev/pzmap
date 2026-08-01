import './styles/classical.css';
import './styles/app.css';
import { $, $$ } from './dom';
import { state, subscribe, emit, activeQty, type Lang, type Extreme } from './state';
import { COMPS, type Comp, type Meta, type NodeRecord } from './types';
import { t } from './i18n';
import { renderLayout, applyLang } from './ui/layout';
import { buildHead, drawTable, initTable } from './view/table';
import { drawMap, initMap, fitMap, zoomMap } from './view/map';
import { drawLegend, initLegend } from './view/legend';
import { drawGroups, createGroupFromSelection, syncGroupIds } from './view/groups';
import { drawStatus } from './view/statusbar';
import { exportCsv, exportPng, stamp } from './view/exporters';
import { tableOf, isNodeTable, isForceTable, buildNodes } from './parse/rfemJson';
import { readXlsx, xlsxForces, xlsxNodes } from './parse/xlsx';
import { buildProject, parseProject, applyView, type PersistedView } from './parse/project';

const field = (r: NodeRecord, k: string): number => (r as unknown as Record<string, number>)[k] ?? 0;

/* ---------------- toast ---------------- */
let toastTimer: number | undefined;
function toast(msg: string, kind?: 'err'): void {
  const el = $('#toast');
  el.textContent = msg;
  el.className = 'toast on' + (kind ? ' ' + kind : '');
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => (el.className = 'toast' + (kind ? ' ' + kind : '')), kind === 'err' ? 9000 : 4000);
}

/* ---------------- render ---------------- */
function render(): void {
  $('#work').style.gridTemplateColumns = state.tableOpen
    ? '224px minmax(360px,1fr) minmax(560px,620px)'
    : '224px minmax(360px,1fr) 0';
  $('#tableCol').style.display = state.tableOpen ? 'grid' : 'none';
  paintControls();
  if (!state.nodes.length) {
    drawMap();
    drawLegend();
    drawGroups();
    drawStatus();
    return;
  }
  drawMap();
  drawLegend();
  drawGroups();
  buildHead();
  drawTable();
  drawStatus();
}

/* active-state paint for the rail + toggles */
function paintControls(): void {
  $$('#qBtns .rbtn').forEach((b) => b.classList.toggle('on', (b as HTMLElement).dataset.q === state.q));
  $('#extMax').classList.toggle('on', state.ext === 'max');
  $('#extMin').classList.toggle('on', state.ext === 'min');
  ($('#lblVal') as HTMLInputElement).checked = state.lblVal;
  ($('#lblIds') as HTMLInputElement).checked = state.lblIds;
  ($('#cPair') as HTMLInputElement).checked = state.pair;
  ($('#cUniform') as HTMLInputElement).checked = state.sizeUniform;
  ($('#extMax') as HTMLButtonElement).disabled = state.pair;
  ($('#extMin') as HTMLButtonElement).disabled = state.pair;

  const bt = $('#bTable');
  bt.textContent = state.tableOpen ? `${t('hideTable')}  T` : `${t('showTable')}  T`;
  bt.classList.toggle('on', state.tableOpen);
}

/* ---------------- install ---------------- */
const hasComp = (c: string): boolean => state.comps.includes(c as Comp);

function buildQtyButtons(): void {
  const host = $('#qBtns');
  host.innerHTML = COMPS.map(
    (c) => `<button class="rbtn" data-q="${c}"${state.comps.includes(c) ? '' : ' disabled'}>${c}</button>`,
  ).join('');
  host.querySelectorAll<HTMLElement>('.rbtn').forEach((b) => {
    b.onclick = (): void => setQuantity(b.dataset.q as Comp);
  });
}

function install(nodes: NodeRecord[], meta: Meta, warn: string[] = [], view?: PersistedView): void {
  if (!nodes.length) {
    toast(t('toNoNodes'), 'err');
    return;
  }
  state.nodes = nodes;
  state.meta = meta;
  state.comps = COMPS.filter((c) => nodes.some((r) => field(r, `${c}_max`) !== 0 || field(r, `${c}_min`) !== 0));
  if (!state.comps.length) state.comps = ['Pz'];
  if (!state.comps.includes(state.q)) state.q = state.comps.includes('Pz') ? 'Pz' : state.comps[0]!;

  state.colF = {};
  state.win = { lo: null, hi: null };
  state.sel = [];
  state.groups = [];
  state.isolate = null;
  state.colorByGroup = false;
  state.sortKey = activeQty();
  state.sortDir = -1;

  if (view) applyView(state, view, hasComp);
  syncGroupIds();
  buildQtyButtons();
  $('#empty').classList.add('hide');
  emit();
  if (warn.length) toast(warn.join(' · '), 'err');
}

/* ---------------- control actions ---------------- */
function setQuantity(c: Comp): void {
  if (!state.comps.includes(c)) return;
  state.q = c;
  state.sortKey = activeQty();
  state.sortDir = -1;
  state.win = { lo: null, hi: null };
  emit();
}
function setExtreme(ext: Extreme): void {
  state.ext = ext;
  state.sortKey = activeQty();
  state.sortDir = -1;
  state.win = { lo: null, hi: null };
  emit();
}

/* ---------------- file loading ---------------- */
async function readFiles(files: File[]): Promise<void> {
  const list = files.filter((f) => /\.(json|xlsx)$/i.test(f.name));
  if (!list.length) return toast(t('toNeedFiles'), 'err');
  let nodeT = null,
    forceT = null,
    model: string | null = null;
  for (const file of list) {
    const mm = file.name.match(/^(\d+)/);
    if (mm) model = model || mm[1]!;
    try {
      if (/\.json$/i.test(file.name)) {
        const tbl = tableOf(JSON.parse(await file.text()));
        if (tbl) {
          if (isNodeTable(tbl)) nodeT = tbl;
          else if (isForceTable(tbl)) forceT = tbl;
          model = model || tbl.model || null;
        }
      } else {
        const rows = await readXlsx(file);
        const ft = xlsxForces(rows);
        if (ft) {
          forceT = ft;
          continue;
        }
        const nt = xlsxNodes(rows);
        if (nt) nodeT = nt;
      }
    } catch (err) {
      toast(`${file.name}: ${(err as Error).message}`, 'err');
    }
  }
  if (!nodeT && !forceT) return toast(t('toNoTable'), 'err');
  if (!nodeT) return toast(t('toNoNodes'), 'err');
  const res = buildNodes(nodeT, forceT);
  if (res.error) return toast(res.error, 'err');
  install(res.nodes!, { model: model || '—', pool: res.pool }, res.warn);
  toast(t('toLoaded', { n: res.nodes!.length }));
}

async function openProject(f: File): Promise<void> {
  try {
    const proj = parseProject(await f.text());
    install(proj.nodes, proj.meta, [], proj.view);
    applyLang();
  } catch {
    toast(t('toProjBad'), 'err');
  }
}

function saveProject(): void {
  if (!state.nodes.length) return;
  const blob = new Blob([JSON.stringify(buildProject())], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${stamp()}.pzmap`;
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
  $$('#langSeg input').forEach((i) => ((i as HTMLInputElement).checked = (i as HTMLInputElement).value === l));
  render();
}

/* ---------------- wiring ---------------- */
function wire(): void {
  $('#extMax').onclick = (): void => setExtreme('max');
  $('#extMin').onclick = (): void => setExtreme('min');
  ($('#lblVal') as HTMLInputElement).onchange = (e): void => {
    state.lblVal = (e.target as HTMLInputElement).checked;
    drawMap();
  };
  ($('#lblIds') as HTMLInputElement).onchange = (e): void => {
    state.lblIds = (e.target as HTMLInputElement).checked;
    drawMap();
  };
  ($('#cPair') as HTMLInputElement).onchange = (e): void => {
    state.pair = (e.target as HTMLInputElement).checked;
    emit();
  };
  ($('#cUniform') as HTMLInputElement).onchange = (e): void => {
    state.sizeUniform = (e.target as HTMLInputElement).checked;
    drawMap();
  };
  $('#bFit').onclick = fitMap;
  $('#bZoomIn').onclick = (): void => zoomMap(1.3);
  $('#bZoomOut').onclick = (): void => zoomMap(1 / 1.3);
  $('#legClose').onclick = (): void => {
    state.legendHidden = true;
    emit();
  };
  $('#groupCreate').onclick = (): void => createGroupFromSelection();
  ($('#cGroupColor') as HTMLInputElement).onchange = (e): void => {
    state.colorByGroup = (e.target as HTMLInputElement).checked;
    emit();
  };
  const toggleTable = (): void => {
    state.tableOpen = !state.tableOpen;
    emit();
  };
  $('#bTable').onclick = toggleTable;
  $('#exCsv').onclick = exportCsv;
  $('#exPng').onclick = exportPng;

  const fileInput = $('#file') as HTMLInputElement;
  $('#bLoad').onclick = (): void => fileInput.click();
  ($('#bLoad2') as HTMLElement).onclick = (): void => fileInput.click();
  fileInput.onchange = (e): void => {
    void readFiles([...((e.target as HTMLInputElement).files ?? [])]);
    fileInput.value = '';
  };

  const menu = $('#projMenu');
  $('#bProject').onclick = (e): void => {
    e.stopPropagation();
    menu.classList.toggle('open');
  };
  document.addEventListener('click', () => menu.classList.remove('open'));
  const projInput = $('#projFile') as HTMLInputElement;
  $('#projOpen').onclick = (): void => projInput.click();
  $('#projSave').onclick = saveProject;
  projInput.onchange = (e): void => {
    const f = (e.target as HTMLInputElement).files?.[0];
    if (f) void openProject(f);
    projInput.value = '';
  };

  $$('#langSeg input').forEach((i) => {
    (i as HTMLInputElement).onchange = (): void => setLang((i as HTMLInputElement).value as Lang);
  });

  window.addEventListener('dragover', (e) => {
    e.preventDefault();
    $('#drop').classList.add('on');
  });
  window.addEventListener('dragleave', (e) => {
    if ((e as DragEvent).clientX === 0 && (e as DragEvent).clientY === 0) $('#drop').classList.remove('on');
  });
  window.addEventListener('drop', (e) => {
    e.preventDefault();
    $('#drop').classList.remove('on');
    const files = [...((e as DragEvent).dataTransfer?.files ?? [])];
    if (files.some((f) => /\.pzmap$/i.test(f.name))) void openProject(files[0]!);
    else void readFiles(files);
  });

  window.addEventListener('resize', () => state.nodes.length && drawMap());
  window.addEventListener('keydown', (e) => {
    const typing = /^(INPUT|SELECT|TEXTAREA)$/.test((e.target as HTMLElement).tagName || '');
    if (typing) return;
    if (e.key === 'Escape' && state.sel.length) {
      state.sel = [];
      emit();
    }
    if (e.key === 't' || e.key === 'T') toggleTable();
  });
}

/* ---------------- boot ---------------- */
function boot(): void {
  renderLayout();
  let lang: Lang = 'it';
  try {
    lang = (localStorage.getItem('pzmap.lang') as Lang) || ((navigator.language || 'it').slice(0, 2) as Lang);
  } catch {
    /* ignore */
  }
  state.lang = lang === 'en' ? 'en' : 'it';
  document.documentElement.lang = state.lang;
  applyLang();
  $$('#langSeg input').forEach((i) => ((i as HTMLInputElement).checked = (i as HTMLInputElement).value === state.lang));
  initMap();
  initLegend();
  initTable();
  wire();
  subscribe(render);
  paintControls();
  $('#empty').classList.remove('hide');
}

boot();
