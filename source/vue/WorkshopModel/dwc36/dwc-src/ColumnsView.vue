<template>
	<div class="mo-columns-view" :class="densityClass(density)">
		<div class="mo-columns-help">{{ t('columns_help') }}</div>
		<div class="mo-columns-bar">
			<nav class="mo-columns-crumbs" :aria-label="t('crumbs_label')">
				<span v-for="(c, i) in crumbs" :key="'k:' + c.path" class="mo-columns-crumb-step">
					<v-icon v-if="i" x-small class="mo-columns-icon">mdi-chevron-right</v-icon>
					<button type="button" class="mo-columns-crumb" :aria-current="c.path === current ? 'location' : null" @click="choose(c.path)">{{ c.label || t('crumb_root') }}</button>
				</span>
			</nav>
			<div v-if="current" class="mo-columns-actions">
				<favorite-star :path="current" :pinned="pinned" @pin="onPin" @unpin="onUnpin" />
				<v-btn x-small outlined :title="t('copy_path')" @click="copyPath">{{ copied ? t('copied') : t('copy') }}</v-btn>
				<v-btn x-small outlined @click="toggleWatch"><v-icon x-small left>{{ isWatched ? 'mdi-eye-off-outline' : 'mdi-eye-outline' }}</v-icon>{{ isWatched ? t('watch_remove') : t('watch_add') }}</v-btn>
				<v-btn x-small text :title="t('topic_open_row', { path: current })" @click="$emit('open', current)">{{ t('open_in_tree') }}</v-btn>
			</div>
		</div>
		<div ref="strip" class="mo-columns-strip" @keydown="onKey">
			<div v-for="col in shown" :key="'c:' + col.path" class="mo-columns-col" role="listbox" :aria-label="col.path || t('crumb_root')">
				<button
					v-for="it in col.rows" :key="it.path" type="button" class="mo-columns-item" :class="{ 'mo-columns-open': it.key === col.active, 'mo-columns-current': it.path === current, 'mo-columns-changed': recent.has(it.path) }"
					role="option" :aria-selected="it.path === current ? 'true' : 'false'" :tabindex="it.path === focusPath ? 0 : -1" :data-path="it.path" :title="it.path" @click="choose(it.path)"
				>
					<kind-chip :info="it.info" icon-only />
					<span class="mo-columns-key">{{ it.label }}</span>
					<span v-if="it.branch" class="mo-columns-count">{{ it.count }}</span>
					<span v-else class="mo-columns-value">{{ it.text }}</span>
					<v-icon v-if="it.branch" small class="mo-columns-icon">mdi-chevron-right</v-icon>
				</button>
				<v-btn v-if="col.more" x-small text class="ma-1" @click="showMore(col.path)">{{ t('flat_more', { n: Math.min(col.more, FLAT_PAGE) }) }}</v-btn>
				<div v-if="col.truncated" class="mo-columns-note">{{ t('columns_truncated', { n: col.total }) }}</div>
				<div v-if="!col.items.length" class="mo-columns-note">{{ t('columns_empty') }}</div>
			</div>
			<div v-if="leaf" class="mo-columns-col mo-columns-leaf">
				<kind-chip :info="leaf.info" />
				<div class="mo-columns-leaf-value">{{ leaf.text }}</div>
				<div v-if="leaf.human" class="mo-columns-leaf-human">
					<span v-if="leaf.human.color" class="mo-columns-swatch" :style="{ background: leaf.human.color }" aria-hidden="true"></span>{{ t(leaf.human.key, leaf.human.params) }}
				</div>
			</div>
			<div v-if="missing" class="mo-columns-col mo-columns-leaf mo-columns-note">{{ t('columns_missing', { path: current }) }}</div>
		</div>
	</div>
</template>

<script>
'use strict'

// The Columns view (VIEW-CONTRACT.md), like a file browser: the keys of the model in the first column, and every key picked opens
// its keys in the next one; a value shows itself in a last column. The arrows move (up and down in a column, left to the parent,
// right into a branch), the breadcrumb jumps back, and the bar above acts on the selected path (favourite, copy, watch, open in
// the technical tree). The columns are rebuilt from the live model on every tick (columns-state.js); keys that changed in the last
// second flash (changeTimes).
import i18n from '../../i18n'
import { liveModel } from './model-host.js'
import KindChip from './KindChip.vue'
import FavoriteStar from './FavoriteStar.vue'
import { columnsFor, visibleItems, leafOf, stepColumns } from './columns-state.js'
import { crumbsOf } from './browse-state.js'
import { densityClass } from './density.js'
import { FLAT_PAGE } from './flat-list.js'
import { getAtPath } from './model-path.js'
import { copyText } from './copy-text.js'

const FLASH_MS = 1100

export default {
	components: { KindChip, FavoriteStar },
	props: { tick: { type: Number, default: 0 }, model: { type: Object, default: null }, leaves: { type: Array, default: () => [] }, truncated: { type: Boolean, default: false }, changes: { type: Array, default: () => [] }, changeTimes: { type: Map, default: () => new Map() }, selected: { type: String, default: '' }, watched: { type: Array, default: () => [] }, pinned: { type: Array, default: () => [] }, density: { type: String, default: 'comfortable' }, paused: { type: Boolean, default: false }, globalsOk: { type: Boolean, default: true }, tier: { type: Object, default: () => ({ sbc: false, extras: false }) } },
	data() {
		return { current: this.selected, pages: {}, copied: false, FLAT_PAGE }
	},
	computed: {
		columns() {
			void this.tick
			return columnsFor(this.root(), this.current)
		},
		shown() {
			return this.columns.map(col => Object.assign({}, col, visibleItems(col, this.pages[col.path])))
		},
		leaf() {
			void this.tick
			return leafOf(this.root(), this.current)
		},
		missing() {
			void this.tick
			return !!this.current && getAtPath(this.root(), this.current) === undefined
		},
		crumbs() {
			return crumbsOf(this.current)
		},
		isWatched() {
			return this.watched.indexOf(this.current) >= 0
		},
		focusPath() {
			const all = [].concat(...this.shown.map(c => c.rows))
			return all.some(it => it.path === this.current) ? this.current : (all.length ? all[0].path : '')
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
		selected(p) {
			this.current = p
		}
	},
	beforeDestroy() {
		clearTimeout(this.copiedTimer)
	},
	methods: {
		t(k, p) {
			return i18n.t('plugins.WorkshopModel.model.' + k, p)
		},
		densityClass,
		root() {
			return this.model || liveModel()
		},
		choose(path) {
			this.current = path
			this.$emit('select', path)
			this.$nextTick(() => { if (this.$refs.strip) this.$refs.strip.scrollLeft = this.$refs.strip.scrollWidth })
		},
		showMore(path) {
			this.pages = Object.assign({}, this.pages, { [path]: (this.pages[path] || 1) + 1 })
		},
		focusItem(path) {
			this.$nextTick(() => {
				const strip = this.$refs.strip
				const el = strip && Array.from(strip.querySelectorAll('[data-path]')).find(b => b.getAttribute('data-path') === path)
				if (el) el.focus()
			})
		},
		onKey(e) {
			const to = stepColumns(this.columns, this.current, e.key)
			if (to === null) return
			e.preventDefault()
			this.choose(to)
			this.focusItem(to)
		},
		async copyPath() {
			this.copied = await copyText(this.current)
			clearTimeout(this.copiedTimer)
			this.copiedTimer = setTimeout(() => { this.copied = false }, 1500)
		},
		toggleWatch() {
			this.$emit(this.isWatched ? 'unwatch' : 'watch', this.current)
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
/* ColumnsView: the density sets the row height, padding and font size; the strip scrolls sideways, each column on its own */
.mo-page .mo-columns-view { --mo-columns-row: 40px; --mo-columns-pad: 6px 12px; --mo-columns-font: 13px; --mo-columns-width: 260px; display: flex; flex-direction: column; gap: 8px; }
.mo-page .mo-columns-view.mo-density-compact { --mo-columns-row: 32px; --mo-columns-pad: 2px 8px; --mo-columns-font: 12px; --mo-columns-width: 220px; }
@media (pointer: coarse) { .mo-page .mo-columns-view { --mo-columns-row: 48px; } .mo-page .mo-columns-view.mo-density-compact { --mo-columns-row: 40px; } }
.mo-page .mo-columns-help, .mo-page .mo-columns-note { color: var(--tp-faint); font-size: 12px; }
.mo-page .mo-columns-note { padding: 6px 12px; }
.mo-page .mo-columns-bar { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px; }
.mo-page .mo-columns-crumbs { display: flex; flex-wrap: wrap; align-items: center; min-width: 0; }
.mo-page .mo-columns-crumb-step { display: inline-flex; align-items: center; }
.mo-page .mo-columns-crumb { min-height: 32px; padding: 2px 6px; border: 0; border-radius: 4px; background: transparent; color: inherit; font-family: var(--tp-font-mono, monospace); font-size: 12px; cursor: pointer; }
.mo-page .mo-columns-crumb[aria-current] { font-weight: 600; }
.mo-page .mo-columns-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
.mo-page .mo-columns-strip { display: flex; align-items: stretch; overflow-x: auto; border: 1px solid var(--wf-line); border-radius: 8px; scroll-snap-type: x proximity; }
.mo-page .mo-columns-col { flex: 0 0 var(--mo-columns-width); max-height: 65vh; overflow-y: auto; padding: 4px 0; border-right: 1px solid var(--wf-line); scroll-snap-align: start; }
.mo-page .mo-columns-item { display: flex; align-items: center; gap: 6px; width: 100%; min-height: var(--mo-columns-row); padding: var(--mo-columns-pad); border: 0; background: transparent; color: inherit; font: inherit; font-size: var(--mo-columns-font); text-align: left; cursor: pointer; }
.mo-page .mo-columns-item:hover { background: rgba(128, 128, 128, 0.12); }
.mo-page .mo-columns-item:focus-visible, .mo-page .mo-columns-crumb:focus-visible { outline: 2px solid var(--wf-accent); outline-offset: -2px; }
.mo-page .mo-columns-open { background: rgba(128, 128, 128, 0.16); }
.mo-page .mo-columns-current { background: color-mix(in srgb, var(--wf-accent) 16%, transparent); box-shadow: inset 3px 0 0 var(--wf-accent); }
.mo-page .mo-columns-changed { animation: mo-columns-flash 1s ease-out; }
@keyframes mo-columns-flash { from { background: color-mix(in srgb, var(--wf-armed) 40%, transparent); } to { background: transparent; } }
@media (prefers-reduced-motion: reduce) { .mo-page .mo-columns-changed { animation: none; background: color-mix(in srgb, var(--wf-armed) 20%, transparent); } }
.mo-page .mo-columns-key { font-family: var(--tp-font-mono, monospace); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.mo-page .mo-columns-value { margin-left: auto; max-width: 55%; font-family: var(--tp-font-mono, monospace); font-size: 12px; color: var(--tp-faint2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.mo-page .mo-columns-count { margin-left: auto; font-family: var(--tp-font-mono, monospace); font-size: 11px; color: var(--tp-faint); }
.mo-page .mo-columns-icon { color: var(--wf-icon); flex: none; }
.mo-page .mo-columns-leaf { flex: 1 0 var(--mo-columns-width); padding: 10px 14px; }
.mo-page .mo-columns-leaf-value { margin: 8px 0 4px; font-family: var(--tp-font-mono, monospace); font-size: 14px; word-break: break-all; }
.mo-page .mo-columns-leaf-human { display: flex; align-items: center; gap: 6px; font-size: 13px; }
.mo-page .mo-columns-swatch { width: 16px; height: 16px; border: 1px solid rgba(128, 128, 128, 0.5); border-radius: 4px; }
@media (max-width: 600px) { .mo-page .mo-columns-col { flex-basis: 85%; } }
</style>
