<template>
	<div class="mo-bpick">
		<div v-if="chips.length" class="mo-bpick-chips" role="group" :aria-label="t('look_scope_chips')">
			<button v-for="c in chips" :key="c.path" type="button" class="mo-gchip" :class="'mo-bpick-' + c.kind" :aria-pressed="c.path === path ? 'true' : 'false'" :title="chipTitle(c)" @click="$emit('pick', c.path)">
				<v-icon small>{{ CHIP_ICONS[c.kind] }}</v-icon>{{ c.kind === 'selected' ? t('look_scope_chip_selected', { path: c.path }) : c.path }}
			</button>
		</div>
		<v-text-field v-model="query" dense outlined hide-details clearable spellcheck="false" prepend-inner-icon="mdi-magnify" class="mo-search mt-2" :label="t('look_scope_search')" :placeholder="t('look_scope_search_hint')" />
		<div v-if="query && !found.length" class="mo-faint mt-1">{{ t('look_scope_search_none') }}</div>
		<div v-else-if="found.length" class="mo-bpick-found" role="listbox" :aria-label="t('look_scope_search')">
			<button v-for="r in found" :key="r.path" type="button" class="mo-bpick-row" role="option" :aria-selected="r.path === path ? 'true' : 'false'" @click="$emit('pick', r.path)">
				<v-icon small>mdi-source-branch</v-icon><span class="mo-key">{{ r.path }}</span><span class="mo-faint">{{ t('children_n', { n: r.count }) }}</span>
			</button>
		</div>
	</div>
</template>

<script>
'use strict'

// The picker of the part of the model a snapshot covers (snapshot-scope.js): one-tap chips (what is selected in the Model section,
// the favourite branches, the parts used before, the roots of the model) and a search over the branches by name. Emits `pick` with
// the path; the section keeps the choice.
import i18n from '../../i18n'
import { scopeChips, searchBranches } from './snapshot-scope.js'

const CHIP_ICONS = { selected: 'mdi-cursor-default-click-outline', favorite: 'mdi-star', recent: 'mdi-history', root: 'mdi-source-branch' }

export default {
	props: {
		model: { type: Object, default: null },
		path: { type: String, default: '' },
		selected: { type: String, default: '' },
		pinned: { type: Array, default: () => [] },
		recent: { type: Array, default: () => [] },
		tick: { type: Number, default: 0 }
	},
	data() {
		return { query: '', CHIP_ICONS }
	},
	computed: {
		chips() {
			void this.tick
			return scopeChips(this.model, { selected: this.selected, pinned: this.pinned, recent: this.recent })
		},
		found() {
			void this.tick
			return searchBranches(this.model, this.query)
		}
	},
	methods: {
		t(k, p) {
			return i18n.t('plugins.WorkshopModel.model.' + k, p)
		},
		chipTitle(c) {
			return this.t('look_scope_chip_' + c.kind + '_help', { path: c.path })
		}
	}
}
</script>

<style>
/* BranchPicker: the chips wrap; the search results are a short list of rows, never a table */
.mo-page .mo-bpick-chips { display: flex; flex-wrap: wrap; gap: 6px 8px; }
.mo-page .mo-bpick-chips .mo-gchip { font-family: var(--tp-font-mono, monospace); }
.mo-page .mo-bpick-selected { font-family: inherit !important; }
.mo-page .mo-bpick-found { display: flex; flex-direction: column; max-height: 40vh; overflow: auto; margin-top: 4px; border: 1px solid rgba(128, 128, 128, 0.25); border-radius: 8px; }
.mo-page .mo-bpick-row { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 10px; width: 100%; min-height: 40px; padding: 4px 10px; border: 0; border-bottom: 1px solid rgba(128, 128, 128, 0.15); background: transparent; color: inherit; font: inherit; text-align: left; cursor: pointer; }
.mo-page .mo-bpick-row:hover { background: rgba(128, 128, 128, 0.12); }
.mo-page .mo-bpick-row[aria-selected='true'] { background: rgba(25, 118, 210, 0.14); }
.mo-page .mo-bpick-row .v-icon { color: var(--wf-icon); }
.mo-page .mo-bpick-row:focus-visible { outline: 2px solid var(--wf-accent); outline-offset: -2px; }
@media (pointer: coarse) { .mo-page .mo-bpick-row { min-height: 44px; } }
</style>
