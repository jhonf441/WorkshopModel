<template>
	<div class="mo-tree-view">
		<div class="mo-toolbar">
			<v-text-field v-model="query" dense outlined hide-details clearable prepend-inner-icon="mdi-magnify" class="mo-search" :label="t('search_label')" :placeholder="t('search_hint')" />
			<v-btn small text :disabled="!openCount" @click="collapseAll">{{ t('collapse_all') }}</v-btn>
		</div>
		<div v-if="query" class="mo-faint mb-2" role="status">{{ results.length ? t('search_results', { n: results.length }) : t('search_none') }} <span v-if="results.length >= SEARCH_LIMIT">{{ t('search_more') }}</span></div>
		<div class="mo-tree">
			<div v-if="query" class="mo-rows">
				<button v-for="r in results" :key="r.path" type="button" class="mo-row mo-result" :class="{ 'mo-selected': r.path === selected }" :title="r.path" @click="choose(r.path)">
					<span class="mo-key">{{ r.path }}</span><span class="mo-value">{{ r.text }}</span>
				</button>
			</div>
			<model-tree v-else :rows="rows" :selected="selected" :changed="changed" @toggle="toggle" @select="choose" />
			<div v-if="truncatedRows && !query" class="mo-faint mt-1">{{ t('tree_truncated', { n: rows.length }) }}</div>
		</div>
	</div>
</template>

<script>
'use strict'

// The technical view (design item 1): the rows of the expanded nodes come from model-tree.js on every tick, the search runs over
// the whole model, and the rows whose value changed since the last tick flash (change-diff.js). A path selected or opened anywhere
// (another view, the globals, watch and usage sections) unfolds the tree down to it, and a branch opened from elsewhere unfolds
// itself too. A view of VIEW-CONTRACT.md.
import i18n from '../../i18n'
import ModelTree from './ModelTree.vue'
import { visibleRows, searchModel, ancestorsOf, SEARCH_LIMIT } from './model-tree.js'
import { getAtPath } from './model-path.js'
import { isBranch } from './value-format.js'
import { diffTexts, textMap } from './change-diff.js'

export default {
	components: { ModelTree },
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
		return { query: '', expanded: {}, changed: new Set(), SEARCH_LIMIT }
	},
	computed: {
		expandedSet() {
			return new Set(Object.keys(this.expanded))
		},
		openCount() {
			return Object.keys(this.expanded).length
		},
		tree() {
			void this.tick
			return visibleRows(this.model, this.expandedSet)
		},
		rows() {
			return this.tree.rows
		},
		truncatedRows() {
			return this.tree.truncated
		},
		results() {
			void this.tick
			return searchModel(this.model, this.query)
		}
	},
	watch: {
		rows(next) {
			const m = textMap(next)
			this.changed = new Set(this.previous ? diffTexts(this.previous, m).map(c => c.path) : [])
			this.previous = m
		},
		// the selected path unfolds the tree down to it; a selected branch unfolds too (See all of the Topics view)
		selected: {
			immediate: true,
			handler(p) {
				for (const a of ancestorsOf(p)) this.$set(this.expanded, a, true)
				if (p && isBranch(getAtPath(this.model, p))) this.$set(this.expanded, p, true)
			}
		}
	},
	methods: {
		t(k, p) {
			return i18n.t('plugins.WorkshopModel.model.' + k, p)
		},
		toggle(path) {
			if (this.expanded[path]) this.$delete(this.expanded, path)
			else this.$set(this.expanded, path, true)
		},
		choose(path) {
			this.$emit('select', path)
			if (this.query) this.query = ''
		},
		collapseAll() {
			this.expanded = {}
		}
	}
}
</script>
