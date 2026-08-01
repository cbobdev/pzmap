import { $, $$ } from '../dom';
import { t } from '../i18n';

const div = 'var(--color-divider)';
const mut = 'color-mix(in srgb, var(--color-text) 55%, transparent)';

/** Inject the 4-row Classical shell into #app. Dynamic content is filled by the
 *  view modules; data-i18n text is filled by applyLang(). */
export function renderLayout(): void {
  $('#app').innerHTML = `
  <div style="height:100%;display:grid;grid-template-rows:auto minmax(0,1fr) auto;
       background:var(--color-bg);color:var(--color-text);font-family:var(--font-body);font-size:13px">

    <!-- Row 1 · command bar -->
    <div style="display:flex;align-items:center;gap:10px;padding:8px 16px;border-bottom:1px solid ${div}">
      <div style="font-family:var(--font-heading);font-weight:600;font-size:19px;letter-spacing:-0.01em">PzMap</div>
      <span class="muted" style="font-size:11px;margin-right:6px" data-i18n="brandSub"></span>

      <!-- file group -->
      <button class="btn btn-secondary" id="bLoad" style="font-size:12.5px;padding:5px 11px" data-i18n="bLoad"></button>
      <div class="menu" id="projMenu">
        <button class="btn btn-secondary" id="bProject" style="font-size:12.5px;padding:5px 11px" data-i18n="bProject"></button>
        <div class="items">
          <button id="projOpen" data-i18n="projOpen"></button>
          <button id="projSave" data-i18n="projSave"></button>
        </div>
      </div>

      <span style="margin-left:auto"></span>

      <!-- export group -->
      <div style="display:flex;align-items:center;gap:6px">
        <button class="btn btn-secondary" id="exCsv" style="font-size:12px;padding:5px 10px" data-i18n="csv"></button>
        <button class="btn btn-secondary" id="exPng" style="font-size:12px;padding:5px 10px" data-i18n="png"></button>
      </div>

      <div style="width:1px;height:20px;background:${div};margin:0 4px"></div>

      <!-- view group -->
      <button class="btn btn-secondary rbtn" id="bTable" style="font-size:12.5px;padding:5px 11px"></button>
      <div class="seg" id="langSeg">
        <label class="seg-opt"><input type="radio" name="lang" value="it">IT</label>
        <label class="seg-opt"><input type="radio" name="lang" value="en">EN</label>
      </div>
      <input type="file" id="file" accept=".json,.xlsx" multiple hidden />
      <input type="file" id="projFile" accept=".pzmap,.json" hidden />
    </div>

    <!-- Row 2 · work area -->
    <div id="work" style="display:grid;grid-template-columns:224px minmax(360px,1fr) minmax(560px,620px);min-height:0;overflow:hidden">

      <!-- rail -->
      <div style="border-right:1px solid ${div};overflow-y:auto;padding:12px 12px 20px;display:flex;flex-direction:column;gap:16px">
        <div>
          <div class="kick" data-i18n="secQuantity"></div>
          <div id="qBtns" style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:4px;font-size:13px"></div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;margin-top:6px;font-size:12px">
            <button class="rbtn" id="extMax" data-ext="max" data-i18n="extMax"></button>
            <button class="rbtn" id="extMin" data-ext="min" data-i18n="extMin"></button>
          </div>
          <label class="chk" style="margin-top:8px"><input type="checkbox" id="cPair"><span data-i18n="cPair"></span></label>
        </div>

        <div style="height:1px;background:${div}"></div>

        <div>
          <div class="kick" data-i18n="secLabels"></div>
          <label class="chk"><input type="checkbox" id="lblVal"><span data-i18n="lblVal"></span></label>
          <label class="chk"><input type="checkbox" id="lblIds"><span data-i18n="lblIds"></span></label>
          <label class="chk"><input type="checkbox" id="cUniform"><span data-i18n="cUniform"></span></label>
        </div>

        <div style="height:1px;background:${div}"></div>

        <div>
          <div class="kick" data-i18n="secGroups"></div>
          <button class="btn btn-secondary" id="groupCreate" style="width:100%;font-size:12px;padding:6px 8px" data-i18n="groupCreate"></button>
          <label class="chk" style="margin-top:6px"><input type="checkbox" id="cGroupColor"><span data-i18n="colorByGroup"></span></label>
          <div id="groupList" style="margin-top:8px;display:flex;flex-direction:column;gap:8px"></div>
        </div>
      </div>

      <!-- map -->
      <div style="min-width:0;min-height:0;border-right:1px solid ${div}">
        <div id="mapWrap" style="position:relative;height:100%;min-height:0;overflow:hidden">
          <svg id="map" viewBox="0 0 1000 720" preserveAspectRatio="xMidYMid meet"
               style="position:absolute;inset:0;width:100%;height:100%"></svg>
          <div id="mapOverlay" style="position:absolute;inset:0;pointer-events:none;font-feature-settings:'tnum'">
            <div style="position:absolute;left:12px;top:10px;pointer-events:auto">
              <div style="display:flex;gap:4px;margin-bottom:6px">
                <button class="btn btn-secondary" id="bFit" style="font-size:11.5px;padding:3px 8px" data-i18n="fit"></button>
                <button class="btn btn-secondary" id="bZoomIn" style="font-size:13px;padding:3px 8px;line-height:1">+</button>
                <button class="btn btn-secondary" id="bZoomOut" style="font-size:13px;padding:3px 8px;line-height:1">−</button>
              </div>
              <div class="muted" id="planLabel" style="font-size:11px;letter-spacing:0.08em;text-transform:uppercase"></div>
            </div>
            <div id="mapTR" style="position:absolute;right:12px;top:10px;display:flex;flex-direction:column;align-items:flex-end;gap:6px;pointer-events:auto"></div>
            <div id="scaleBar" style="position:absolute;bottom:12px;left:50%;transform:translateX(-50%);text-align:center;pointer-events:none">
              <div id="scaleBarLine" style="border-bottom:2px solid var(--color-text);height:5px;margin:0 auto"></div>
              <div id="scaleBarLabel" class="muted" style="font-size:10.5px;margin-top:1px;font-feature-settings:'tnum'"></div>
            </div>
            <div id="hoverCard" class="hovercard" style="display:none"></div>

            <!-- reference triad, pinned to the container's bottom-left corner -->
            <svg id="triad" width="66" height="66" viewBox="0 0 66 66"
                 style="position:absolute;left:10px;bottom:10px;overflow:visible;color:var(--color-text)">
              <g fill="none" stroke="currentColor" stroke-width="1.4">
                <line x1="16" y1="16" x2="46" y2="16"></line>
                <line x1="16" y1="16" x2="16" y2="46"></line>
                <circle cx="16" cy="16" r="5" fill="var(--color-bg)"></circle>
                <line x1="12.8" y1="12.8" x2="19.2" y2="19.2" stroke-width="1.1"></line>
                <line x1="12.8" y1="19.2" x2="19.2" y2="12.8" stroke-width="1.1"></line>
              </g>
              <path d="M46 16 L40 13 L40 19 Z" fill="currentColor"></path>
              <path d="M16 46 L13 40 L19 40 Z" fill="currentColor"></path>
              <text x="50" y="20" font-size="12" font-family="monospace" fill="currentColor">X</text>
              <text x="16" y="60" font-size="12" font-family="monospace" fill="currentColor" text-anchor="middle">Y</text>
              <text x="6" y="11" font-size="12" font-family="monospace" fill="currentColor" text-anchor="end">Z</text>
            </svg>

            <!-- legend + display-limits slider -->
            <div id="legend" style="position:absolute;right:12px;bottom:12px;background:#f3f2f2;
                 border:1px solid ${div};border-radius:var(--radius-md);box-shadow:var(--shadow-md);
                 padding:10px 11px;min-width:252px;max-width:300px;pointer-events:auto;z-index:20">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:7px">
                <div id="legTitle" style="font-family:var(--font-heading);font-weight:600;font-size:12px;flex:1">—</div>
                <button class="btn btn-ghost" id="legClose" style="font-size:14px;line-height:1;padding:0 4px" data-i18n-title="legClose">×</button>
              </div>
              <div id="legScale">
                <div id="legGrad" style="height:10px;border-radius:3px;border:1px solid ${div}"></div>
                <div class="track" id="legTrack">
                  <div class="fill" id="legFill"></div>
                  <div class="hnd" id="legH0" tabindex="0"></div>
                  <div class="hnd" id="legH1" tabindex="0"></div>
                </div>
                <div style="display:flex;align-items:center;gap:6px;margin-top:2px">
                  <input class="numin" id="legLo" /><span class="muted">…</span><input class="numin" id="legHi" />
                  <button class="btn btn-ghost" id="legReset" style="font-size:12px;padding:2px 6px" data-i18n-title="legReset">↺</button>
                </div>
              </div>
              <div id="legGroups" style="display:none;flex-direction:column;gap:3px"></div>
            </div>
          </div>
          <div class="empty" id="empty">
            <div class="big" data-i18n="emptyTitle"></div>
            <div class="msg" data-i18n-html="emptyMsg"></div>
            <button class="btn btn-primary" id="bLoad2" data-i18n="bLoad"></button>
          </div>
        </div>
      </div>

      <!-- ranked table + inspector -->
      <div id="tableCol" style="display:grid;grid-template-rows:minmax(0,1fr);min-width:0;min-height:0">
        <div id="tableScroll" style="overflow:auto;min-height:0">
          <table id="tbl"><thead></thead><tbody></tbody></table>
        </div>
      </div>
    </div>

    <!-- Row 4 · status bar -->
    <div style="display:flex;align-items:center;gap:0;padding:6px 16px;border-top:1px solid ${div};
         font-feature-settings:'tnum';font-size:12px">
      <div id="statusScope" style="display:flex;align-items:center;gap:14px"></div>
      <span style="margin-left:auto"></span>
      <span class="muted" id="statusRight" style="font-size:11.5px"></span>
    </div>
  </div>

  <div id="drop" data-i18n="dropMsg">RFEM</div>
  <div class="toast" id="toast"></div>
  `;
  void mut;
}

/** Fill text/title/html for elements carrying data-i18n attributes. */
export function applyLang(): void {
  $$('[data-i18n]').forEach((e) => (e.textContent = t(e.getAttribute('data-i18n')!)));
  $$('[data-i18n-html]').forEach((e) => (e.innerHTML = t(e.getAttribute('data-i18n-html')!)));
  $$('[data-i18n-title]').forEach(
    (e) => ((e as HTMLElement).title = t(e.getAttribute('data-i18n-title')!)),
  );
}
