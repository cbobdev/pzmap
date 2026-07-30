# PzMap

Visualizzatore delle **reazioni vincolari** (support reactions) da modelli RFEM 6.
Web app professionale in **TypeScript + Vite**, senza librerie a runtime: il parsing
XLSX (ZIP + XML) e il disegno SVG sono scritti a mano. I dati restano nel tuo browser —
nulla viene caricato online.

**Live:** https://\<user\>.github.io/pzmap/

## Cosa fa / What it does

- Carica due export RFEM 6 (JSON o XLSX): **Nodi + coordinate** e **Reazioni vincolari**.
- Pianta dei nodi con reazioni a **scala di colore** (Pz, Px, Py, Mx…), pan / zoom / fit.
- **Legenda-istogramma** con finestra a cursori, **tabella** filtrabile e ordinabile,
  statistiche e risultanti Σ Fx / Fy / Fz.
- **Solo punti (geometria)**: nasconde il risultato a colori e mostra solo il layout.
- **Selezione ad area** (Shift + trascina): Σ Fx/Fy/Fz e baricentro del gruppo scelto.
- **Verifica di capacità**: inserisci la reazione ammissibile → colore per sfruttamento e
  segnalazione dei nodi oltre il 100%.
- Export **CSV** / **PNG**, salvataggio/apertura **progetto `.pzmap`** (dati + impostazioni).
- Interfaccia **IT / EN**.

## Export da RFEM

1. Tabella **Nodi** → export XLSX (`No.`, `X`, `Y`, `Z`).
2. Tabella **Reazioni nodali dei vincoli** → export XLSX (Px/Py/Pz/Mx/My/Mz, max/min).
3. Trascina entrambi i file nella finestra, oppure **Carica dati…**.

## Sviluppo

```bash
npm install
npm run dev        # server di sviluppo
npm run build      # typecheck + bundle in dist/
npm run preview    # anteprima del build
npm test           # unit test (Vitest)
npm run lint       # ESLint
npm run format     # Prettier
```

## Architettura

- `src/parse/` — lettura RFEM (JSON e XLSX) e file di progetto `.pzmap`.
- `src/model/` — logica pura: scala colori, filtri, statistiche, sfruttamento.
- `src/view/` — viste SVG/DOM: plot, legenda, tabella, statistiche, export.
- `src/state.ts` + `src/derive.ts` — stato applicativo e selettori derivati.
- `src/main.ts` — bootstrap e collegamento UI.

## Deploy

GitHub Actions:

- `ci.yml` — typecheck, lint e test su ogni push / PR.
- `pages.yml` — build e deploy su GitHub Pages ad ogni push su `main`.

Su GitHub: repo pubblico `pzmap`, **Settings → Pages → Source: GitHub Actions**.
Il `base` è `/pzmap/` (vedi `vite.config.ts`); per un dominio personalizzato imposta
`BASE_PATH=/`.
