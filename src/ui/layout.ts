import { $, $$ } from '../dom';
import { t } from '../i18n';

/** Inject the static app chrome into #app. Dynamic parts (options, table,
 *  legend, plot) are populated by the view modules. Text marked with
 *  data-i18n / data-i18n-html / data-i18n-title is filled by applyLang(). */
export function renderLayout(): void {
  const app = $('#app');
  app.innerHTML = `
  <header class="appbar">
    <div class="brand">
      <span class="logo">PzMap</span>
      <span class="tag" data-i18n="tagline"></span>
    </div>
    <div class="spacer"></div>
    <div class="meta" id="titleSub"></div>
    <div class="actions">
      <button class="primary" id="bLoad" data-i18n="bLoad"></button>
      <button id="bProjOpen" data-i18n="bProjOpen"></button>
      <button id="bProjSave" data-i18n="bProjSave"></button>
      <div class="menu" id="exportMenu">
        <button id="bExport" data-i18n="bExport"></button>
        <div class="items">
          <button id="exCsv" data-i18n="exCsv"></button>
          <button id="exPng" data-i18n="exPng"></button>
        </div>
      </div>
      <button class="chip on" id="bTable" data-i18n="colToggle"></button>
      <div class="seg" id="langSeg">
        <button data-lang="it">IT</button><button data-lang="en">EN</button>
      </div>
    </div>
    <input type="file" id="file" accept=".json,.xlsx" multiple hidden />
    <input type="file" id="projFile" accept=".pzmap,.json" hidden />
  </header>

  <div class="workspace" id="workspace">
    <aside class="sidebar">
      <div class="section">
        <h3 data-i18n="secQuantity"></h3>
        <div class="field"><label data-i18n="lQty"></label><select id="qty"></select></div>
        <div class="field"><label data-i18n="lUnit"></label>
          <select id="unit">
            <option value="0.001|kN">kN · kNm</option>
            <option value="1|N">N · Nm</option>
            <option value="0.000001|MN">MN · MNm</option>
          </select>
        </div>
        <div class="field"><label data-i18n="lClasses"></label>
          <select id="nclass">
            <option value="5">5</option><option value="6">6</option>
            <option value="7" selected>7</option><option value="8">8</option>
            <option value="10">10</option><option value="12">12</option>
          </select>
        </div>
        <label class="chk"><input type="checkbox" id="cPair" /><span data-i18n="cPair"></span></label>
        <label class="chk"><input type="checkbox" id="cComb" /><span data-i18n="cComb"></span></label>
      </div>

      <div class="section">
        <h3 data-i18n="secDisplay"></h3>
        <label class="chk"><input type="checkbox" id="cLab" /><span data-i18n="cLab"></span></label>
        <label class="chk"><input type="checkbox" id="cVal" /><span data-i18n="cVal"></span></label>
        <label class="chk"><input type="checkbox" id="cPoints" /><span data-i18n="cPoints"></span></label>
      </div>

      <div class="section">
        <h3 data-i18n="secCapacity"></h3>
        <div class="field">
          <label data-i18n="lCapacity"></label>
          <input type="number" id="capacity" min="0" step="any" placeholder="—" />
        </div>
        <div class="hint" style="font-size:10.5px;color:var(--ink-3)" data-i18n="capHint"></div>
      </div>
    </aside>

    <section class="plotwrap">
      <div class="viewport" id="vp">
        <svg id="plot" xmlns="http://www.w3.org/2000/svg"></svg>
        <div class="vtools">
          <button id="bFit">Fit</button>
          <button id="bIn">+</button>
          <button id="bOut">−</button>
        </div>
        <div class="scalebar" id="sbar"><span></span><div class="bar"></div></div>
        <div class="legend" id="legend">
          <h2 id="legTitle">—</h2>
          <div class="hint" data-i18n="legRangeHint"></div>
          <div class="rng" id="rng">
            <div class="rhead">
              <input id="rLo" /><span class="sep">…</span><input id="rHi" />
              <button id="rReset" class="ghost" data-i18n-title="legReset">↺</button>
            </div>
            <div class="track" id="rTrack">
              <div class="fill" id="rFill"></div>
              <div class="hnd" id="rH0" tabindex="0"></div>
              <div class="hnd" id="rH1" tabindex="0"></div>
            </div>
          </div>
          <div id="legBody"></div>
        </div>
        <div class="selbox" id="selbox"></div>
        <div class="empty hide" id="empty">
          <div class="big" data-i18n="emptyTitle"></div>
          <div class="msg" data-i18n-html="emptyMsg"></div>
          <button class="primary" id="bLoad2" data-i18n="bLoad"></button>
        </div>
      </div>
      <div class="stats" id="stats"></div>
    </section>

    <aside class="panel" id="panel">
      <div class="pbar">
        <span class="lab" id="rowCount">—</span>
        <label class="chk"><input type="checkbox" id="cCols" /><span data-i18n="cCols"></span></label>
        <button id="bClear" class="ghost" data-i18n="bClear"></button>
        <span class="spacer" style="flex:1"></span>
        <span class="lab" id="filterHint" data-i18n="filterHint"></span>
      </div>
      <div class="tablewrap"><table id="tbl"><thead></thead><tbody></tbody></table></div>
    </aside>
  </div>

  <div id="drop" data-i18n="dropMsg"></div>
  <div class="toast" id="toast"></div>
  `;
}

/** Fill text/title/html for elements carrying data-i18n attributes. */
export function applyLang(): void {
  $$('[data-i18n]').forEach((e) => (e.textContent = t(e.getAttribute('data-i18n')!)));
  $$('[data-i18n-html]').forEach((e) => (e.innerHTML = t(e.getAttribute('data-i18n-html')!)));
  $$('[data-i18n-title]').forEach(
    (e) => ((e as HTMLElement).title = t(e.getAttribute('data-i18n-title')!)),
  );
}
