<template>
	<div class="mo-browse-view" :class="densityClass(density)">
		<div class="mo-browse-help">{{ t('browse_help') }}</div>
		<div class="mo-browse-bar">
			<v-btn small outlined :disabled="!canBack" :title="canBack ? t('browse_back_to', { path: backPath || t('crumb_root') }) : t('browse_back_none')" @click="back"><v-icon small left>mdi-arrow-left</v-icon>{{ t('browse_back') }}</v-btn>
			<v-btn small text :disabled="!state.path" :title="state.path ? t('browse_up_help') : t('browse_up_none')" @click="up"><v-icon small left>mdi-arrow-up</v-icon>{{ t('browse_up') }}</v-btn>
			<nav class="mo-browse-crumbs" :aria-label="t('crumbs_label')">
				<span v-for="(c, i) in crumbs" :key="'k:' + c.path" class="mo-browse-crumb-step">
					<v-icon v-if="i" x-small class="mo-browse-icon">mdi-chevron-right</v-icon>
					<button type="button" class="mo-browse-crumb" :aria-current="c.path === state.path ? 'location' : null" @click="enter(c.path)">{{ c.label || t('crumb_root') }}</button>
				</span>
			</nav>
		</div>
		<div class="mo-browse-tools">
			<v-text-field v-model="query" dense outlined hide-details clearable prepend-inner-icon="mdi-magnify" class="mo-browse-filter" :label="t('flat_filter')" :placeholder="t('browse_filter_hint')" />
			<div class="mo-browse-sort" role="group" :aria-label="t('browse_sort')">
				<button v-for="s in sortChoices" :key="s.id" type="button" class="mo-browse-sort-btn" :class="{ 'mo-browse-sort-on': sort === s.id }" :aria-pressed="sort === s.id ? 'true' : 'false'" :title="t(s.what)" @click="sort = s.id">{{ t(s.label) }}</button>
			</div>
		</div>
		<div class="mo-browse-note" role="status">{{ countText }}</div>
		<div v-if="!level.exists" class="mo-browse-note">{{ t('browse_gone', { path: state.path }) }}</div>
		<div v-else-if="rows.length" class="mo-browse-list" @keydown="onKey">
			<div v-for="it in rows" :key="it.path" class="mo-browse-row" :class="{ 'mo-browse-current': it.path === selected, 'mo-browse-changed': recent.has(it.path) }">
				<button type="button" class="mo-browse-go" :data-path="it.path" :title="it.branch ? t('browse_open', { path: it.path }) : it.path" @click="pick(it)">
					<kind-chip :info="it.info" />
					<span class="mo-browse-key">{{ it.label }}</span>
					<span v-if="it.branch" class="mo-browse-count">{{ t('children_n', { n: it.count }) }}</span>
					<span v-else class="mo-browse-value">{{ it.text }}</span>
					<v-icon v-if="it.branch" small class="mo-browse-icon">mdi-chevron-right</v-icon>
				</button>
				<favorite-star :path="it.path" :pinned="pinned" @pin="onPin" @unpin="onUnpin" />
			</div>
		</div>
		<v-btn v-if="more" x-small text @click="pages++">{{ t('flat_more', { n: Math.min(more, FLAT_PAGE) }) }}</v-btn>
		<div v-if="level.truncated" class="mo-browse-note">{{ t('browse_truncated', { n: level.total }) }}</div>
	</div>
</template>

<script>
'use strict'

// The Browse view (VIEW-CONTRACT.md): one level of the model at a time, like the folders of a phone. A branch opens its level, a
// value is selected (the section shows its detail beside the view), the breadcrumb jumps to any level above, Back returns to where
// you were and Up to the level above; the filter and the sort work on the keys of the level (browse-state.js). A path selected
// elsewhere (the favourites, another view) opens the level that holds it.
import i18n from '../../i18n'
import { liveModel } from './model-host.js'
import KindChip from './KindChip.vue'
import FavoriteStar from './FavoriteStar.vue'
import { SORT_CHOICES, crumbsOf, levelOf, levelForPath, filterItems, sortItems, browseState, openLevel, canGoBack, goBack, goUp } from './browse-state.js'
import { densityClass } from './density.js'
import { pageOf, FLAT_PAGE } from './flat-list.js'

const FLASH_MS = 1100

export default {
	components: { KindChip, FavoriteStar },
	props: { tick: { type: Number, default: 0 }, model: { type: Object, default: null }, leaves: { type: Array, default: () => [] }, truncated: { type: Boolean, default: false }, changes: { type: Array, default: () => [] }, changeTimes: { type: Map, default: () => new Map() }, selected: { type: String, default: '' }, watched: { type: Array, default: () => [] }, pinned: { type: Array, default: () => [] }, density: { type: String, default: 'comfortable' }, paused: { type: Boolean, default: false }, globalsOk: { type: Boolean, default: true }, tier: { type: Object, default: () => ({ sbc: false, extras: false }) } },
	data() {
		return { state: browseState(levelForPath(this.model || liveModel(), this.selected)), query: '', sort: 'model', pages: 1, sortChoices: SORT_CHOICES, FLAT_PAGE }
	},
	computed: {
		level() {
			void this.tick
			return levelOf(this.root(), this.state.path)
		},
		listed() {
			return sortItems(filterItems(this.level.items, this.query), this.sort)
		},
		page() {
			return pageOf(this.listed, this.pages, FLAT_PAGE)
		},
		rows() {
			return this.page.rows
		},
		more() {
			return this.page.more
		},
		crumbs() {
			return crumbsOf(this.state.path)
		},
		canBack() {
			return canGoBack(this.state)
		},
		backPath() {
			return this.state.history[this.state.history.length - 1] || ''
		},
		countText() {
			return this.query ? this.t('browse_filtered', { n: this.listed.length, total: this.level.items.length }) : this.t('browse_count', { n: this.level.total })
		},
		recent() {
			void this.tick
			const since = Date.now() - FLASH_MS
			const out = new Set()
			this.changeTimes.forEach((ms, path) => { if (ms >= since) out.add(path) })
			return out
		}
	},
	watch: {
		// a path chosen elsewhere opens the level that holds it
		selected(p) {
			if (p) this.enter(levelForPath(this.root(), p))
		},
		'state.path'() {
			this.pages = 1
		}
	},
	methods: {
		t(k, p) {
			return i18n.t('plugins.WorkshopModel.model.' + k, p)
		},
		densityClass,
		root() {
			return this.model || liveModel()
		},
		enter(path) {
			this.state = openLevel(this.state, path)
		},
		back() {
			this.state = goBack(this.state)
		},
		up() {
			this.state = goUp(this.state)
		},
		pick(it) {
			if (it.branch) this.enter(it.path)
			this.$emit('select', it.path)
		},
		// Left goes up a level, Right opens the branch under the focus
		onKey(e) {
			const path = e.target && e.target.getAttribute ? e.target.getAttribute('data-path') : null
			const it = this.rows.find(r => r.path === path)
			if (e.key === 'ArrowLeft' && this.state.path) this.up()
			else if (e.key === 'ArrowRight' && it && it.branch) this.pick(it)
			else return
			e.preventDefault()
		},
		onPin(path) {
			this.$emit('pin', path)
		},
		onUnpin(path) {
			this.$emit('unpin', path)
		}
	}
}
</script>

<style>
/* BrowseView: the density sets the row height, padding and font size of the list */
.mo-page .mo-browse-view { --mo-browse-row: 40px; --mo-browse-pad: 6px 10px; --mo-browse-font: 13px; display: flex; flex-direction: column; gap: 8px; min-width: 0; }
.mo-page .mo-browse-view.mo-density-compact { --mo-browse-row: 32px; --mo-browse-pad: 2px 8px; --mo-browse-font: 12px; }
@media (pointer: coarse) { .mo-page .mo-browse-view { --mo-browse-row: 48px; } .mo-page .mo-browse-view.mo-density-compact { --mo-browse-row: 40px; } }
.mo-page .mo-browse-help, .mo-page .mo-browse-note { color: var(--tp-faint); font-size: 12px; }
.mo-page .mo-browse-bar, .mo-page .mo-browse-tools { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.mo-page .mo-browse-crumbs { display: flex; flex-wrap: wrap; align-items: center; min-width: 0; }
.mo-page .mo-browse-crumb-step { display: inline-flex; align-items: center; }
.mo-page .mo-browse-crumb { min-height: 32px; padding: 2px 6px; border: 0; border-radius: 4px; background: transparent; color: inherit; font-family: var(--tp-font-mono, monospace); font-size: 12px; cursor: pointer; }
.mo-page .mo-browse-crumb[aria-current] { font-weight: 600; }
.mo-page .mo-browse-filter { flex: 1 1 200px; max-width: 360px; }
.mo-page .mo-browse-sort { display: inline-flex; flex-wrap: wrap; border: 1px solid var(--wf-line); border-radius: 6px; overflow: hidden; }
.mo-page .mo-browse-sort-btn { min-height: 32px; padding: 4px 10px; border: 0; background: transparent; color: inherit; font: inherit; font-size: 13px; cursor: pointer; }
.mo-page .mo-browse-sort-btn + .mo-browse-sort-btn { border-left: 1px solid var(--wf-line); }
.mo-page .mo-browse-sort-on { background: color-mix(in srgb, var(--wf-accent) 16%, transparent); font-weight: 600; }
.mo-page .mo-browse-list { display: flex; flex-direction: column; max-height: 65vh; overflow-y: auto; padding: 4px 0; border: 1px solid var(--wf-line); border-radius: 8px; }
.mo-page .mo-browse-row { display: flex; align-items: center; padding-right: 4px; border-bottom: 1px solid rgba(128, 128, 128, 0.12); }
.mo-page .mo-browse-row:last-child { border-bottom: 0; }
.mo-page .mo-browse-go { display: flex; flex: 1 1 auto; align-items: center; gap: 8px; min-width: 0; min-height: var(--mo-browse-row); padding: var(--mo-browse-pad); border: 0; background: transparent; color: inherit; font: inherit; font-size: var(--mo-browse-font); text-align: left; cursor: pointer; }
.mo-page .mo-browse-go:hover { background: rgba(128, 128, 128, 0.12); }
.mo-page .mo-browse-go:focus-visible, .mo-page .mo-browse-crumb:focus-visible, .mo-page .mo-browse-sort-btn:focus-visible { outline: 2px solid var(--wf-accent); outline-offset: -2px; }
.mo-page .mo-browse-current { background: color-mix(in srgb, var(--wf-accent) 16%, transparent); box-shadow: inset 3px 0 0 var(--wf-accent); }
.mo-page .mo-browse-changed { animation: mo-browse-flash 1s ease-out; }
@keyframes mo-browse-flash { from { background: color-mix(in srgb, var(--wf-armed) 40%, transparent); } to { background: transparent; } }
@media (prefers-reduced-motion: reduce) { .mo-page .mo-browse-changed { animation: none; background: color-mix(in srgb, var(--wf-armed) 20%, transparent); } }
.mo-page .mo-browse-key { font-family: var(--tp-font-mono, monospace); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.mo-page .mo-browse-value { margin-left: auto; max-width: 60%; font-family: var(--tp-font-mono, monospace); font-size: 12px; color: var(--tp-faint2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.mo-page .mo-browse-count { margin-left: auto; font-size: 12px; color: var(--tp-faint); white-space: nowrap; }
.mo-page .mo-browse-icon { color: var(--wf-icon); flex: none; }
</style>
