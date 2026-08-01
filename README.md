# PzMap

**Visualizzatore delle reazioni vincolari per modelli RFEM 6.**

PzMap prende gli inviluppi delle reazioni ai vincoli esportati da RFEM e li trasforma in una
pianta interattiva a scala di colore. È uno strumento di **post-analisi**: non modella e non
ricalcola nulla — serve a leggere in fretta i risultati e a portarli verso il progetto delle
fondazioni.

Nessuna installazione, nessun server: gira nel browser e **i dati restano sul tuo computer**
(niente viene caricato online).

**→ https://cbobdev.github.io/pzmap/**

---

## A cosa serve

A modello risolto, risponde in pochi secondi alle domande operative:

- **Quali vincoli sono più caricati** e dove si trovano in pianta.
- **Quali componenti governano** (Pz, Px, Py, Mx/My/Mz), in massimo o minimo.
- **Quali vincoli vanno in sollevamento** (Pz min in trazione).
- **Come raggrupparli per tipo di fondazione** e ricavarne uno schema esportabile.

## Cosa fa

**Pianta interattiva**
- Mappa in pianta di tutti i vincoli con pan, zoom e adatta-alla-vista.
- Scala cromatica per segno: compressione in gradazioni di rosso, trazione in blu.
- Dimensione dei pallini proporzionale al valore (soglie automatiche) oppure solo colore.
- Etichette dei valori sui nodi, numeri nodo, terna di riferimento e barra di scala.
- Vista **coppia max/min** sullo stesso pallino (metà e metà) ed evidenziazione del sollevamento.

**Selezione e tabella**
- Tabella dei vincoli ordinabile e filtrabile per colonna, sincronizzata con la mappa.
- Selezione singola, multipla (Ctrl-clic) o ad area (Shift-trascina); il clic evidenzia la riga.
- Finestra "limiti di visualizzazione" con cursori per isolare un intervallo di valori.

**Gruppi = tipi di fondazione**
- Raggruppa i vincoli selezionati (gruppi disgiunti), con colore e **descrizione** libera
  (es. *palo Ø400 L=12m*, *plinto 400×400*).
- Colora la mappa per gruppo, mostra/nascondi o isola un gruppo, con legenda dedicata.

**Esportazione**
- **CSV** della tabella filtrata, con colonne *Gruppo* e *Descrizione* — lo schema delle fondazioni.
- **PNG** della pianta (centrata, con legenda inclusa).
- **Progetto `.pzmap`**: salva e riapri dati e impostazioni.
- File nominati con la data (`pzmap_260801`). Interfaccia **IT / EN**.

## Dati di input

Due esportazioni da RFEM 6, in **XLSX** o **JSON**:

1. Tabella **Nodi** — coordinate (No., X, Y, Z).
2. Tabella **Reazioni nodali dei vincoli** — Px/Py/Pz/Mx/My/Mz, max/min per combinazione.

Trascina entrambi i file nella finestra, oppure usa *Carica dati*. Il file è un **inviluppo**
(max/min per componente): la combinazione governante non è più ricostruibile dai dati e viene
indicata come tale, senza inventarla.

## Sviluppo

TypeScript + Vite, **zero dipendenze a runtime** (lettura XLSX e disegno SVG scritti a mano).

```bash
npm install
npm run dev       # server di sviluppo
npm run build     # typecheck + bundle
npm test          # unit test
```

Deploy automatico su GitHub Pages ad ogni push su `main` (CI: typecheck, lint, test).
