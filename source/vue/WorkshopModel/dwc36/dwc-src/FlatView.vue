<template>
	<div class="mo-flat">
		<div class="mo-flat-filters" role="group" :aria-label="t('vs_title')">
			<span class="mo-faint">{{ t('vs_title') }}</span>
			<button v-for="m in VALUE_MODES" :key="m" type="button" class="wf-cat" :aria-pressed="mode === m ? 'true' : 'false'" :title="t('vs_mode_help')" @click="mode = m">{{ t('vs_mode_' + m) }}</button>
		</div>
		<choice-help :choice="VALUE_SEARCH_HELP" :title="t('vs_title')" class="mb-1" />
		<div class="mo-toolbar">
			<v-text-field v-model="query" dense outlined hide-details clearable prepend-inner-icon="mdi-magnify" class="mo-search" :label="mode === 'values' ? t('vs_label') : t('flat_filter')" :placeholder="mode === 'values' ? t('vs_hint') : t('flat_filter_hint')" />
		</div>
		<div v-if="reading" :class="['mo-faint', 'mb-1', { 'wf-state warn': reading.invalid }]" role="status">{{ t(reading.key, reading.params) }}</div>
		<div class="mo-flat-filters" role="group" :aria-label="t('flat_types')">
			<button v-for="g in KIND_GROUPS" :key="g.id" type="button" class="wf-cat" :aria-pressed="groups.indexOf(g.id) >= 0 ? 'true' : 'false'" @click="toggleGroup(g.id)">{{ t('group_' + g.id) }}</button>
			<v-switch v-model="onlyChanged" dense color="primary" hide-details :label="t('flat_changed')" />
			<v-switch v-model="onlyWatched" dense color="primary" hide-details :label="t('flat_watched')" />
			<v-btn v-if="filtered" x-small text @click="clearFilters">{{ t('flat_clear') }}</v-btn>
		</div>
		<div class="mo-faint mb-1" role="status">{{ t('flat_count', { n: shown.length, total: leaves.length }) }} <span v-if="truncated">{{ t('flat_truncated', { n: leaves.length }) }}</span></div>
		<div class="mo-flat-scroll">
			<table class="mo-table mo-flat-table">
				<thead>
					<tr>
						<th v-for="c in COLUMNS" :key="c.id" :aria-sort="sortKey === c.id ? (desc ? 'descending' : 'ascending') : 'none'">
							<button type="button" class="mo-sort" :title="t('flat_sort_by', { col: t(c.label) })" @click="sortBy(c.id)">{{ t(c.label) }}<v-icon v-if="sortKey === c.id" small>{{ desc ? 'mdi-sort-descending' : 'mdi-sort-ascending' }}</v-icon></button>
						</th>
					</tr>
				</thead>
				<tbody>
					<tr v-for="l in page.rows" :key="l.path" :class="{ 'mo-selected': l.path === selected }">
						<td class="mo-key"><favorite-star :path="l.path" :pinned="pinned" @pin="$emit('pin', $event)" @unpin="$emit('unpin', $event)" /><button type="button" class="mo-link" @click="$emit('select', l.path)">{{ l.path }}</button><v-icon v-if="watchedSet.has(l.path)" x-small class="ml-1" :title="t('flat_watched_mark')">mdi-eye-outline</v-icon></td>
						<td class="mo-value">{{ l.text }}<span v-if="humanText(l)" class="mo-faint"> ({{ humanText(l) }})</span></td>
						<td><kind-chip :info="leafInfo(l)" /></td>
						<td class="mo-value">{{ agoText(l.path) }}</td>
					</tr>
				</tbody>
			</table>
		</div>
		<div v-if="!shown.length" class="mo-faint mt-1">{{ t('flat_none') }}</div>
		<v-btn v-if="page.more" small outlined class="mt-2" @click="pages++">{{ t('flat_more', { n: Math.min(page.more, FLAT_PAGE) }) }}</v-btn>
	</div>
</template>

<script>
'use strict'

// The Flat list view: every leaf of the model in one table (flat-list.js), filtered by text, by kind group, by "changed in the
// last minute" (changeTimes) and by "only watched", sorted by any column, shown FLAT_PAGE rows at a time. A tap on a path selects
// it (the detail is beside the view); the type is a chip (KindChip.vue) and the star pins a path. A view of VIEW-CONTRACT.md.
import i18n from '../../i18n'
import { KIND_GROUPS, FLAT_PAGE, RECENT_MS, filterLeaves, sortLeaves, pageOf } from './flat-list.js'
import { humanize } from './value-human.js'
import { leafInfo } from './value-kind.js'
import KindChip from './KindChip.vue'
import FavoriteStar from './FavoriteStar.vue'
import ChoiceHelp from './ChoiceHelp.vue'
import { VALUE_MODES, VALUE_SEARCH_HELP, parseValueQuery, searchValues, describeQuery } from './value-search.js'

const COLUMNS = [{ id: 'path', label: 'detail_path' }, { id: 'value', label: 'value' }, { id: 'type', label: 'type' }, { id: 'changed', label: 'flat_col_changed' }]

export default {
	components: { KindChip, FavoriteStar, ChoiceHelp },
	props: {
		tick: { type: Number, default: 0 },
		model: { type: Object, default: null },
		leaves: { type: Array, default: () => [] },
		truncated: { type: Boolean, default: false },
		changes: { type: Array, default: () => [] },
		changeTimes: { type: Map, default: () => new Map() },
		selected: { type: String, default: '' },
		watched: { type: Array, default: () => [] },
		pinned: { type: Array, default: () => [] },
		density: { type: String, default: 'comfortable' },
		paused: { type: Boolean, default: false },
		globalsOk: { type: Boolean, default: true },
		tier: { type: Object, default: () => ({ sbc: false, extras: false }) }
	},
	data() {
		return { mode: 'names', VALUE_MODES, VALUE_SEARCH_HELP, query: '', groups: [], onlyChanged: false, onlyWatched: false, sortKey: 'path', desc: false, pages: 1, KIND_GROUPS, FLAT_PAGE, COLUMNS }
	},
	computed: {
		watchedSet() {
			return new Set(this.watched)
		},
		reading() {
			const q = this.mode === 'values' ? parseValueQuery(this.query) : null
			const d = describeQuery(q)
			return d ? Object.assign({ invalid: q.kind === 'invalid' }, d) : null
		},
		filtered() {
			return !!(this.query || this.groups.length || this.onlyChanged || this.onlyWatched)
		},
		shown() {
			void this.tick
			const byValue = this.mode === 'values'
			const base = byValue ? searchValues(this.leaves, this.query).leaves : this.leaves
			const list = filterLeaves(base, { query: byValue ? '' : this.query, groups: this.groups, onlyChanged: this.onlyChanged, onlyWatched: this.onlyWatched, times: this.changeTimes, watched: this.watched, now: Date.now(), recentMs: RECENT_MS })
			return sortLeaves(list, this.sortKey, this.desc, this.changeTimes)
		},
		page() {
			return pageOf(this.shown, this.pages, FLAT_PAGE)
		}
	},
	watch: {
		query() { this.pages = 1 },
		mode() { this.pages = 1 },
		groups() { this.pages = 1 },
		onlyChanged() { this.pages = 1 },
		onlyWatched() { this.pages = 1 }
	},
	methods: {
		t(k, p) {
			return i18n.t('plugins.WorkshopModel.model.' + k, p)
		},
		toggleGroup(id) {
			this.groups = this.groups.indexOf(id) >= 0 ? this.groups.filter(g => g !== id) : this.groups.concat([id])
		},
		clearFilters() {
			this.query = ''
			this.groups = []
			this.onlyChanged = false
			this.onlyWatched = false
		},
		sortBy(id) {
			if (this.sortKey === id) this.desc = !this.desc
			else {
				this.sortKey = id
				this.desc = false
			}
		},
		leafInfo(l) {
			return leafInfo(l)
		},
		humanText(l) {
			const h = humanize(l.path, l.value)
			return h && h.hint !== 'color' ? this.t(h.key, h.params) : ''
		},
		agoText(path) {
			const at = this.changeTimes.get(path)
			if (!at) return this.t('unit_none')
			return this.t('flat_ago', { s: Math.max(0, Math.round((Date.now() - at) / 1000)) })
		}
	}
}
</script>
