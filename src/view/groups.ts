import { $ } from '../dom';
import { state, emit, type Group } from '../state';
import { t } from '../i18n';
import { groupOf } from '../derive';

const PALETTE = ['#2f5488', '#b4342a', '#1b7f4b', '#7d5411', '#6d3f8f', '#0f6e7e', '#c2570f', '#824d2b'];
let nextId = 1;

/** Create a group from the current selection — groups are disjoint, so nodes
 *  already in a group are skipped (only ungrouped ones are added). */
export function createGroupFromSelection(): void {
  const nodes = state.sel.filter((no) => !groupOf(no));
  if (!nodes.length) return;
  const color = PALETTE[state.groups.length % PALETTE.length]!;
  const g: Group = {
    id: nextId++,
    name: `${t('groupNew')} ${state.groups.length + 1}`,
    color,
    description: '',
    nodes,
    visible: true,
  };
  state.groups.push(g);
  state.sel = [];
  emit();
}

const esc = (s: string): string => s.replace(/"/g, '&quot;');

export function drawGroups(): void {
  const host = $('#groupList');
  $('#groupCreate').toggleAttribute('disabled', state.sel.length === 0);
  ($('#cGroupColor') as HTMLInputElement).checked = state.colorByGroup;
  if (!state.groups.length) {
    host.innerHTML = '';
    return;
  }
  host.innerHTML = state.groups
    .map(
      (g) => `
      <div class="groupcard" data-id="${g.id}">
        <div class="ghead">
          <span class="gname">${esc(g.name)}</span>
          <span class="muted gcount">n° ${g.nodes.length}</span>
        </div>
        <div class="grouprow">
          <input type="checkbox" ${g.visible ? 'checked' : ''} data-act="vis" title="${esc(g.name)}">
          <input type="color" class="gcolor" data-act="color" value="${g.color}">
          <span style="flex:1"></span>
          <button class="quick${state.isolate === g.id ? ' on' : ''}" data-act="only" style="font-size:10.5px;padding:1px 8px">${t('groupOnly')}</button>
          <button class="btn btn-ghost" data-act="del" style="font-size:13px;padding:1px 6px">×</button>
        </div>
        <input class="gdesc" data-act="desc" placeholder="${t('groupDescPh')}" value="${esc(g.description)}">
      </div>`,
    )
    .join('');

  host.querySelectorAll<HTMLElement>('.groupcard').forEach((row) => {
    const id = +row.dataset.id!;
    const g = state.groups.find((x) => x.id === id)!;
    row.querySelector<HTMLInputElement>('[data-act=vis]')!.onchange = (e): void => {
      g.visible = (e.target as HTMLInputElement).checked;
      emit();
    };
    row.querySelector<HTMLInputElement>('[data-act=color]')!.oninput = (e): void => {
      g.color = (e.target as HTMLInputElement).value;
      emit();
    };
    row.querySelector<HTMLInputElement>('[data-act=desc]')!.onchange = (e): void => {
      g.description = (e.target as HTMLInputElement).value;
    };
    row.querySelector<HTMLElement>('[data-act=only]')!.onclick = (): void => {
      state.isolate = state.isolate === id ? null : id;
      emit();
    };
    row.querySelector<HTMLElement>('[data-act=del]')!.onclick = (): void => {
      state.groups = state.groups.filter((x) => x.id !== id);
      if (state.isolate === id) state.isolate = null;
      emit();
    };
  });
}

/** Seed the id counter after loading a project. */
export function syncGroupIds(): void {
  nextId = Math.max(0, ...state.groups.map((g) => g.id)) + 1;
}
