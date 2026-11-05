<template>
	<div class="mo-changes-view" :class="densityClass(density)">
		<div class="mo-changes-help">{{ t('changes_view_help') }}</div>
		<div class="wf-tabs" role="tablist" :aria-label="t('changes_since_label')">
			<button v-for="m in moments" :key="m.id" type="button" class="wf-tab" role="tab" :aria-selected="moment === m.id ? 'true' : 'false'" :title="t(m.what)" @click="pickMoment(m.id)">{{ t(m.label) }}</button>
		</div>
		<div class="mo-changes-bar">
			<span class="mo-changes-since" role="status">{{ sinceText }}</span>
			<v-btn small depressed color="primary" :disabled="!sampled" :title="sampled ? t('changes_mark_help') : t('changes_waiting')" @click="mark"><v-icon small left>mdi-flag-variant-outline</v-icon>{{ t('changes_mark') }}</v-btn>
			<v-btn small outlined :title="t(frozen ? 'changes_resume_help' : 'changes_freeze_help')" :aria-pressed="frozen ? 'true' : 'false'" @click="toggleFreeze"><v-icon small left>{{ frozen ? 'mdi-play' : 'mdi-pause' }}</v-icon>{{ t(frozen ? 'changes_resume' : 'changes_freeze') }}</v-btn>
			<v-btn small text :title="t('changes_clear_help')" @click="clear">{{ t('changes_clear') }}</v-btn>
		</div>
		<div class="mo-changes-tools">
			<v-text-field v-model="query" dense outlined hide-details clearable prepend-inner-icon="mdi-magnify" class="mo-changes-filter" :label="t('flat_filter')" :placeholder="t('flat_filter_hint')" />
			<div class="mo-changes-cats" role="group" :aria-label="t('changes_status_label')">
				<button v-for="s in statusChoices" :key="s.id" type="button" class="wf-cat" :class="'mo-changes-cat-' + s.id" :aria-pressed="statuses.indexOf(s.id) >= 0 ? 'true' : 'false'" :title="t(s.what)" @click="toggleStatus(s.id)">{{ t(s.label) }} {{ counts[s.id] }}</button>
			</div>
			<v-switch :input-value="hideFrequent" dense color="primary" hide-details :label="t(frequentChoice.label)" :title="t(frequentChoice.what)" @change="hideFrequent = !!$event" />
			<button v-if="filtered.noise || !hideNoise" type="button" class="wf-cat" :aria-pressed="hideNoise ? 'false' : 'true'" :title="t(noiseChoice.what)" @click="hideNoise = !hideNoise">{{ hideNoise ? t('changes_noise_hidden', { n: filtered.noise }) : t('changes_noise_shown') }}</button>
		</div>
		<div class="mo-changes-note" role="status">{{ countText }}</div>
		<div v-if="paused" class="mo-changes-note">{{ t('changes_paused') }}</div>
		<div v-if="frozen" class="mo-changes-note" role="status">{{ t('changes_frozen') }}</div>
		<div v-if="!rows.length" class="mo-changes-note">{{ emptyText }}</div>
		<div v-else class="mo-changes-scroll">
			<table class="mo-changes-table">
				<thead><tr><th class="mo-col-when">{{ t('when') }}</th><th>{{ t('detail_path') }}</th><th>{{ t('before') }}</th><th>{{ t('after') }}</th><th class="mo-col-trend">{{ t('changes_col_trend') }}</th><th class="mo-col-actions">{{ t('changes_col_actions') }}</th></tr></thead>
				<tbody>
					<tr v-for="c in rows" :key="c.path">
						<td class="mo-changes-mono">{{ c.last ? clockOf(c.last) : '-' }}</td>
						<td class="mo-changes-pathcell">
							<button type="button" class="mo-changes-path" :title="t('topic_open_row', { path: c.path })" @click="$emit('open', c.path)">{{ pathText(c.path) }}</button>
							<v-btn x-small text class="mo-changes-copy" :title="t('copy_path')" :aria-label="t('copy_path')" @click="copyText(c.path)"><v-icon x-small>mdi-content-copy</v-icon></v-btn>
							<span class="wf-state" :class="STATE_CLASS[c.status]">{{ t('changes_status_' + c.status) }}</span>
						</td>
						<td class="mo-changes-mono mo-changes-before"><span v-if="c.before === ''" class="mo-chg-faint" :title="t('chg_empty_tip')">{{ t('chg_empty') }}</span><template v-else>{{ c.before === null ? t('changes_absent') : c.before }}</template></td>
						<td class="mo-changes-mono"><span v-if="c.after === ''" class="mo-chg-faint" :title="t('chg_empty_tip')">{{ t('chg_empty') }}</span><template v-else>{{ c.after === null ? t('changes_absent') : c.after }}</template></td>
						<td class="mo-changes-trend">
							<sparkline v-if="c.numeric" :series="c.series" :width="80" :height="20" />
							<span class="mo-changes-mono">{{ c.count ? t('changes_times', { n: c.count }) : t('changes_times_unknown') }}</span>
							<span v-if="c.numeric" class="mo-changes-range">{{ t('changes_range', { min: num(c.stats.min, 3), max: num(c.stats.max, 3) }) }}</span>
						</td>
						<td class="mo-changes-actions">
							<favorite-star :path="c.path" :pinned="pinned" @pin="onPin" @unpin="onUnpin" />
							<v-btn x-small text :title="watchLabel(c.path)" :aria-label="watchLabel(c.path)" @click="toggleWatch(c.path)"><v-icon small>{{ watched.indexOf(c.path) >= 0 ? 'mdi-eye-off-outline' : 'mdi-eye-outline' }}</v-icon></v-btn>
						</td>
					</tr>
				</tbody>
			</table>
		</div>
		<v-btn v-if="more" x-small text @click="pages++">{{ t('flat_more', { n: Math.min(more, FLAT_PAGE) }) }}</v-btn>
	</div>
</template>

<script>
'use strict'

// The Changes view (VIEW-CONTRACT.md): only what changed since a moment you pick (a mark you set, the moment the view opened, the
// last 10 seconds, minute or 5 minutes), with the value at that moment and the value now, how many times it changed and, for a
// number, its line with min and max. Every new sample of the page (`leaves`) goes into the feed (changes-feed.js), which starts
// with the changes the page already recorded (`changes`); a value that keeps changing (an uptime, a live reading) can be hidden.
// Clear forgets what this view and the section recorded (clear-changes). The feed is kept out of Vue's reactivity (this.feed is
// made on the first sample); `version` says when it moved.
import i18n from '../../i18n'
import FavoriteStar from './FavoriteStar.vue'
import Sparkline from './Sparkline.vue'
import { MOMENTS, STATUS_CHOICES, STATUSES, FREQUENT_CHOICE, NOISE_CHOICE, createFeed, feedTick, setMark, clearFeed, momentOf, changesSince, stableOrder, filterChanges, shortPath, clockOf, agoOf } from './changes-feed.js'
import { copyText } from './copy-text.js'
import { densityClass } from './density.js'
import { pageOf, FLAT_PAGE } from './flat-list.js'
import { num } from './value-human.js'

// the dot of each status (DESIGN.md section 3: a state is a dot and the word)
const STATE_CLASS = { changed: 'info', added: 'ok', removed: 'warn', back: '' }

export default {
	components: { FavoriteStar, Sparkline },
	props: { tick: { type: Number, default: 0 }, model: { type: Object, default: null }, leaves: { type: Array, default: () => [] }, truncated: { type: Boolean, default: false }, changes: { type: Array, default: () => [] }, changeTimes: { type: Map, default: () => new Map() }, selected: { type: String, default: '' }, watched: { type: Array, default: () => [] }, pinned: { type: Array, default: () => [] }, density: { type: String, default: 'comfortable' }, paused: { type: Boolean, default: false }, globalsOk: { type: Boolean, default: true }, tier: { type: Object, default: () => ({ sbc: false, extras: false }) } },
	data() {
		return { version: 0, frozen: null, moment: 'open', query: '', statuses: [], hideFrequent: true, hideNoise: true, pages: 1, moments: MOMENTS, statusChoices: STATUS_CHOICES, frequentChoice: FREQUENT_CHOICE, noiseChoice: NOISE_CHOICE, STATE_CLASS, FLAT_PAGE }
	},
	computed: {
		sampled() {
			return this.version > 0 && this.feedOf().ticks > 0
		},
		span() {
			void this.version
			void this.tick
			return this.frozen ? this.frozen.span : momentOf(this.feedOf(), this.moment, Date.now())
		},
		all() {
			void this.version
			void this.tick
			return this.frozen ? this.frozen.list : stableOrder(changesSince(this.feedOf(), this.moment, Date.now()), this.ranksOf()) // a calm order: a path keeps its place; frozen: the list as it was
		},
		filtered() {
			return filterChanges(this.all, { query: this.query, statuses: this.statuses, hideFrequent: this.hideFrequent, hideNoise: this.hideNoise, since: this.span.since, now: this.frozen ? this.frozen.now : Date.now() })
		},
		counts() {
			const out = {}
			for (const id of STATUSES) out[id] = this.all.filter(c => c.status === id).length
			return out
		},
		page() {
			return pageOf(this.filtered.list, this.pages, FLAT_PAGE)
		},
		rows() {
			return this.page.rows
		},
		more() {
			return this.page.more
		},
		sinceText() {
			void this.version
			if (this.moment === 'mark' && this.feedOf().mark === null) return this.t('changes_mark_none')
			const a = agoOf(Date.now(), this.span.since)
			return this.t('changes_since_at', { time: clockOf(this.span.since), ago: this.t(a.key, { n: a.n }) })
		},
		countText() {
			const n = this.filtered.list.length
			return this.filtered.hidden ? this.t('changes_count_hidden', { n, hidden: this.filtered.hidden }) : this.t('changes_count', { n })
		},
		emptyText() {
			return this.sampled ? this.t('changes_none_since') : this.t('changes_waiting')
		}
	},
	watch: {
		leaves: {
			immediate: true,
			handler(leaves) {
				if (!leaves || !leaves.length) return
				feedTick(this.feedOf(), leaves, this.truncated, Date.now())
				this.version++
			}
		},
		moment() {
			this.pages = 1
		},
		query() {
			this.pages = 1
		},
		statuses() {
			this.pages = 1
		},
		hideFrequent() {
			this.pages = 1
		},
		hideNoise() {
			this.pages = 1
		}
	},
	methods: {
		t(k, p) {
			return i18n.t('plugins.WorkshopModel.model.' + k, p)
		},
		densityClass,
		clockOf,
		copyText,
		// the last two segments of a long path (the whole path is in the title and the copy button)
		pathText(path) {
			const s = shortPath(path, 2)
			return s.cut ? '...' + s.text : s.text
		},
		num,
		// the feed of this view, made once (outside data: not reactive), with the changes the page recorded so far
		feedOf() {
			if (!this.feed) this.feed = createFeed(Date.now(), this.changes)
			return this.feed
		},
		// the places of the rows (stable-order): made again when the set of changes is another one
			ranksOf() {
				if (!this.ranks) this.ranks = new Map()
				return this.ranks
			},
			// stops the list so one row can be read; the changes keep being recorded and show when it goes on
			toggleFreeze() {
				this.frozen = this.frozen ? null : { list: this.all, span: this.span, now: Date.now() }
			},
			pickMoment(id) {
				this.ranks = null
			this.moment = id
		},
		mark() {
			setMark(this.feedOf(), Date.now())
			this.ranks = null
				this.moment = 'mark'
			this.version++
		},
		clear() {
			clearFeed(this.feedOf(), Date.now())
				this.ranks = null
				this.frozen = null
			this.version++
			this.$emit('clear-changes')
		},
		toggleStatus(id) {
			const s = this.statuses
			this.statuses = s.indexOf(id) >= 0 ? s.filter(x => x !== id) : s.concat([id])
		},
		watchLabel(path) {
			return this.watched.indexOf(path) >= 0 ? this.t('watch_remove') + ': ' + path : this.t('watch_add') + ': ' + path
		},
		toggleWatch(path) {
			this.$emit(this.watched.indexOf(path) >= 0 ? 'unwatch' : 'watch', path)
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
/* ChangesView: the density sets the cell padding and font size; statuses are the family's dots, the status filters its .wf-cat pills */
.mo-page .mo-changes-view { --mo-changes-pad: 6px 10px; --mo-changes-font: 13px; display: flex; flex-direction: column; gap: 8px; min-width: 0; }
.mo-page .mo-changes-view.mo-density-compact { --mo-changes-pad: 2px 8px; --mo-changes-font: 12px; }
.mo-page .mo-changes-help, .mo-page .mo-changes-note { color: var(--tp-faint); font-size: 12px; }
.mo-page .mo-changes-bar, .mo-page .mo-changes-tools, .mo-page .mo-changes-cats { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.mo-page .mo-changes-since { font-size: 13px; margin-right: auto; }
.mo-page .mo-changes-filter { flex: 1 1 200px; max-width: 360px; }
.mo-page .mo-changes-cat-changed { --wf-cat: var(--wf-info); }
.mo-page .mo-changes-cat-added { --wf-cat: var(--wf-ok); }
.mo-page .mo-changes-cat-removed { --wf-cat: var(--wf-warn); }
.mo-page .mo-changes-cat-back { --wf-cat: rgba(128, 128, 128, 0.8); }
.mo-page .mo-changes-scroll { max-height: 65vh; overflow: auto; border: 1px solid var(--wf-line); border-radius: 8px; }
/* fixed layout: the columns never change width when the values do (a list redrawn every second must not shift); the flexible ones share what is left */
.mo-page .mo-changes-table { width: 100%; min-width: 820px; table-layout: fixed; border-collapse: collapse; font-size: var(--mo-changes-font); }
.mo-page .mo-changes-table .mo-col-when { width: 84px; }
.mo-page .mo-changes-table .mo-col-trend { width: 190px; }
.mo-page .mo-changes-table .mo-col-actions { width: 96px; }
.mo-page .mo-changes-table td { overflow-wrap: anywhere; }
.mo-page .mo-changes-table th { position: sticky; top: 0; z-index: 1; background: var(--wf-surface); padding: 6px 10px; border-bottom: 1px solid var(--wf-line); text-align: left; font-size: 11px; font-weight: 600; text-transform: uppercase; }
.mo-page .mo-changes-table td { padding: var(--mo-changes-pad); border-bottom: 1px solid rgba(128, 128, 128, 0.15); vertical-align: middle; }
.mo-page .mo-changes-mono { font-family: var(--tp-font-mono, monospace); font-size: 12px; word-break: break-all; }
.mo-page .mo-changes-before { color: var(--tp-faint2); }
.mo-page .mo-changes-path { margin-right: 8px; padding: 0; border: 0; background: transparent; color: inherit; font-family: var(--tp-font-mono, monospace); font-size: 12px; text-align: left; text-decoration: underline; text-decoration-color: rgba(128, 128, 128, 0.5); word-break: break-all; cursor: pointer; }
.mo-page .mo-changes-path:focus-visible { outline: 2px solid var(--wf-accent); outline-offset: 1px; }
.mo-page .mo-changes-table td.mo-changes-pathcell { min-width: 220px; }
.mo-page .mo-changes-copy { min-width: 24px; vertical-align: middle; }
.mo-page .mo-changes-trend { white-space: nowrap; }
.mo-page .mo-changes-trend .mo-spark { color: var(--wf-info); vertical-align: middle; margin-right: 6px; }
.mo-page .mo-changes-range { display: block; color: var(--tp-faint); font-size: 11px; }
.mo-page .mo-changes-actions { white-space: nowrap; }
.mo-page .mo-chg-faint { color: var(--tp-faint); font-style: italic; }
</style>
