import { state, type Lang } from './state';

type Dict = Record<string, string>;

const it: Dict = {
  tagline: 'Reazioni vincolari · RFEM 6',
  // sidebar sections
  secQuantity: 'Grandezza',
  secDisplay: 'Visualizzazione',
  secCapacity: 'Verifica di capacità',
  lQty: 'Grandezza',
  lUnit: 'Unità',
  lClasses: 'Classi colore',
  cPair: 'Coppia max / min',
  cComb: 'Combinazioni',
  cLab: 'Numeri nodo',
  cVal: 'Valori',
  cPoints: 'Solo punti (geometria)',
  lCapacity: 'Reazione ammissibile',
  capHint: 'Colora i nodi per sfruttamento; segnala > 100%.',
  capOff: 'Nessuna (colore per valore)',
  // file / actions
  bLoad: 'Carica dati…',
  bProjOpen: 'Apri progetto',
  bProjSave: 'Salva progetto',
  bExport: 'Esporta',
  exCsv: 'Tabella CSV',
  exPng: 'Immagine PNG',
  // table
  colToggle: 'Tabella',
  cCols: 'Tutte le colonne',
  bClear: 'Azzera filtri',
  filterHint: 'filtri:  > 500   < 0   100..500   testo',
  rows: 'nodi',
  // stats
  stSum: 'Σ',
  stAvg: 'media',
  stMin: 'min',
  stMax: 'max',
  stNeg: 'negativi',
  stResX: 'Σ Fx',
  stResY: 'Σ Fy',
  stResZ: 'Σ Fz',
  // legend
  legRangeHint:
    'Trascina i cursori per restringere la finestra · clic su una classe per escluderla',
  legReset: 'Ripristina scala',
  legUtil: 'Sfruttamento',
  // region select
  selTitle: 'Selezione',
  selHint: 'Shift + trascina per selezionare un gruppo di nodi',
  selCentroid: 'baricentro',
  selClear: 'Deseleziona',
  // empty state
  emptyTitle: 'Carica i dati RFEM',
  emptyMsg:
    'Trascina qui la tabella <b>Nodi</b> (coordinate) e la tabella <b>Reazioni vincolari</b>, in formato JSON o XLSX. I dati restano nel tuo browser.',
  // toasts
  toLoaded: 'Caricati {n} nodi',
  toNoTable: 'Nessuna tabella RFEM riconosciuta',
  toNoNodes: 'Manca la tabella Nodi: senza coordinate non si disegna la pianta',
  toNeedFiles: 'Servono i file JSON o XLSX esportati da RFEM',
  toProjBad: 'File di progetto non valido',
  toProjSaved: 'Progetto salvato',
  toBadSheet: 'Foglio non riconosciuto: {name}',
  // misc
  view3d: 'X → destra · Y → basso · Z ↓ (entrante)',
};

const en: Dict = {
  tagline: 'Support reactions · RFEM 6',
  secQuantity: 'Quantity',
  secDisplay: 'Display',
  secCapacity: 'Capacity check',
  lQty: 'Quantity',
  lUnit: 'Unit',
  lClasses: 'Color classes',
  cPair: 'Max / min pair',
  cComb: 'Combinations',
  cLab: 'Node numbers',
  cVal: 'Values',
  cPoints: 'Points only (geometry)',
  lCapacity: 'Allowable reaction',
  capHint: 'Color nodes by utilization; flag > 100%.',
  capOff: 'None (color by value)',
  bLoad: 'Load data…',
  bProjOpen: 'Open project',
  bProjSave: 'Save project',
  bExport: 'Export',
  exCsv: 'Table CSV',
  exPng: 'Image PNG',
  colToggle: 'Table',
  cCols: 'All columns',
  bClear: 'Clear filters',
  filterHint: 'filters:  > 500   < 0   100..500   text',
  rows: 'nodes',
  stSum: 'Σ',
  stAvg: 'mean',
  stMin: 'min',
  stMax: 'max',
  stNeg: 'negative',
  stResX: 'Σ Fx',
  stResY: 'Σ Fy',
  stResZ: 'Σ Fz',
  legRangeHint: 'Drag the handles to narrow the window · click a class to exclude it',
  legReset: 'Reset scale',
  legUtil: 'Utilization',
  selTitle: 'Selection',
  selHint: 'Shift + drag to select a group of nodes',
  selCentroid: 'centroid',
  selClear: 'Clear selection',
  emptyTitle: 'Load RFEM data',
  emptyMsg:
    'Drop the <b>Nodes</b> table (coordinates) and the <b>Support reactions</b> table here, as JSON or XLSX. Data stays in your browser.',
  toLoaded: 'Loaded {n} nodes',
  toNoTable: 'No recognizable RFEM table',
  toNoNodes: 'Missing the Nodes table: without coordinates the plan cannot be drawn',
  toNeedFiles: 'Need the JSON or XLSX files exported from RFEM',
  toProjBad: 'Invalid project file',
  toProjSaved: 'Project saved',
  toBadSheet: 'Unrecognized sheet: {name}',
  view3d: 'X → right · Y → down · Z ↓ (into page)',
};

const DICTS: Record<Lang, Dict> = { it, en };

export function t(key: string, vars?: Record<string, string | number>): string {
  let s = DICTS[state.lang][key] ?? it[key] ?? key;
  if (vars) for (const k in vars) s = s.replace(`{${k}}`, String(vars[k]));
  return s;
}
