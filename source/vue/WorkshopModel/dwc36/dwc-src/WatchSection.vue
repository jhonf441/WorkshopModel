<template>
	<div>
		<div class="wf-group mb-3">
				<!-- redesign 2026-11-23 (FAMILIA-REDISENO.md 3): the head of the family (the count and where the list is kept as data chips of 24), the marks as a
				     row of 48 with its switch, ONE help at the foot (the lead and the help of the marks) -->
				<card-head icon="mdi-eye-outline" :title="t('watch_title')">
					<span v-if="rows.length" class="wf-chip">{{ t('look_watch_count', { n: rows.length }) }}</span>
					<span class="wf-chip" :title="storage === 'sbc' ? t('watch_saved_sbc') : t('watch_saved_browser')"><v-icon x-small>{{ storage === 'sbc' ? 'mdi-content-save-outline' : 'mdi-web' }}</v-icon>{{ t(storage === 'sbc' ? 'look_watch_store_sbc' : 'look_watch_store_browser') }}</span>
				</card-head>
				<action-row :title="t(MARKERS_SETTING.label)" :text="t(MARKERS_SETTING.what)">
					<v-switch v-model="markers" dense inset color="success" hide-details :aria-label="t(MARKERS_SETTING.label)" />
				</action-row>
				<div v-if="!rows.length" class="mo-empty mo-empty-small">
					<v-icon class="mo-empty-icon">mdi-eye-plus-outline</v-icon>
					<div class="mo-empty-title">{{ t('look_watch_empty_title') }}</div>
					<div class="mo-empty-text">{{ t('look_watch_empty_text') }}</div>
				</div>
				<div v-else class="mo-wrows">
					<div v-for="r in rows" :key="r.path" class="mo-wrow">
						<div class="mo-wrow-path"><button type="button" class="mo-link" :title="t('open_in_tree')" @click="$emit('select', r.path)">{{ r.path }}</button></div>
						<div class="mo-wrow-valuebox">
							<span class="mo-wrow-value" :title="r.text">{{ r.text }}</span>
							<span v-if="r.mode === 'sparkline'" class="mo-wrow-range">{{ t('changes_range', { min: r.min, max: r.max }) }}</span>
						</div>
						<span class="mo-wrow-graph">
							<sparkline v-if="r.mode === 'sparkline'" :series="r.series" :width="GRAPH.width" :height="GRAPH.height" :marks="r.marks" />
							<watch-bands v-else-if="r.mode !== 'inner'" :events="r.events" :onoff="r.mode === 'onoff'" :tick="tick" :width="GRAPH.width" :height="GRAPH.height" />
							<span v-else class="mo-faint">{{ t('watch_inner_n', { n: r.changeCount }) }}</span>
							<span v-if="r.marks.length" class="mo-faint">{{ t('watch_jumps', { n: r.marks.length }) }}</span>
						</span>
						<span class="mo-wrow-actions">
							<v-btn small text :aria-expanded="open.indexOf(r.path) >= 0 ? 'true' : 'false'" @click="toggle(r.path)">{{ open.indexOf(r.path) >= 0 ? t('watch_changes_hide') : t('watch_changes_show', { n: r.changeCount }) }}</v-btn>
							<v-btn small icon :title="t('watch_remove')" :aria-label="t('watch_remove')" @click="$emit('unwatch', r.path)"><v-icon small>mdi-close</v-icon></v-btn>
						</span>
						<div v-if="open.indexOf(r.path) >= 0" class="mo-wrow-more mo-fade-in"><watch-events :events="r.events" :tick="tick" /></div>
					</div>
				</div>
				<help-fold :what="t('look_watch_lead')" :items="helpBlocks" />
		</div>
		<div class="wf-group mb-3">
				<card-head icon="mdi-history" :title="t('changes_title')">
					<v-switch :input-value="track" dense inset color="success" hide-details :label="t('changes_track')" @change="onTrack" />
					<v-btn small text :disabled="!changes.length" @click="$emit('clear')">{{ t('changes_clear') }}</v-btn>
				</card-head>
				<div v-if="!changes.length" class="mo-empty mo-empty-small">
					<v-icon class="mo-empty-icon">mdi-history</v-icon>
					<div class="mo-empty-title">{{ t('look_changes_empty_title') }}</div>
					<div class="mo-empty-text">{{ t('look_changes_empty_text') }}</div>
				</div>
				<div v-else class="mo-crows">
					<div v-for="(c, i) in changes" :key="c.t + c.path + i" class="mo-crow">
						<span class="mo-crow-time">{{ clock(c.t) }}</span>
						<span class="mo-crow-path"><button type="button" class="mo-link" :title="t('open_in_tree')" @click="$emit('select', c.path)">{{ c.path }}</button></span>
						<span class="mo-crow-vals"><span>{{ c.before }}</span><v-icon x-small>mdi-arrow-right</v-icon><span class="mo-crow-after">{{ c.after }}</span></span>
					</div>
				</div>
				<help-fold :what="t('changes_help')" />
		</div>
		<watch-export :entries="entries" :changes="changes" :tick="tick" />
	</div>
</template>

<script>
'use strict'

// The watch list (design item 2: live value, min and max of every pinned path) drawn by the kind of the value (watch-render.js): a
// number as a sparkline (with a dot on each sudden jump when asked), a text as coloured bands, a boolean as on / off, an array or an
// object as the count of its changes; every graph has the same box (look-tokens.js WATCH_GRAPH) and the rows share one set of columns
// (look.css), so the graphs line up down the list. Every row opens the table of its changes (WatchEvents.vue). Rows wrap on a phone
// instead of scrolling sideways. Then the recent changes with before and after (design item 3). The samples and the changes are
// collected by the page every tick (watch-series.js, change-diff.js).
import i18n from '../../i18n'
import Sparkline from './Sparkline.vue'
import WatchBands from './WatchBands.vue'
import WatchEvents from './WatchEvents.vue'
import WatchExport from './WatchExport.vue'
import CardHead from './CardHead.vue' // vue/_shared36
import ActionRow from './ActionRow.vue' // vue/_shared36
import HelpFold from './HelpFold.vue' // vue/_shared36
import { helpItems } from './section-help.js'
import { seriesStats } from './watch-series.js'
import { MARKERS_SETTING, rendererFor, jumpMarkers } from './watch-render.js'
import { WATCH_GRAPH } from './look-tokens.js'

function fmt(v) {
	return Number.isInteger(v) ? String(v) : String(Math.round(v * 1000) / 1000)
}

export default {
	components: { Sparkline, WatchBands, WatchEvents, WatchExport, CardHead, ActionRow, HelpFold },
	props: {
		tick: { type: Number, default: 0 },
		entries: { type: Array, default: () => [] },
		changes: { type: Array, default: () => [] },
		track: { type: Boolean, default: true },
		storage: { type: String, default: 'browser' }
	},
	data() {
		return { markers: false, open: [], MARKERS_SETTING, GRAPH: WATCH_GRAPH }
	},
	computed: {
		// the one fold at the foot of the watch card (redesign 2026-11-23): the lead and the whole help of the marks (it was a "?" next to the switch)
		helpBlocks() {
			return helpItems(k => this.t(k), [MARKERS_SETTING])
		},
		rows() {
			void this.tick
			return this.entries.map(e => {
				const s = seriesStats(e.series)
				const mode = rendererFor(e)
				const events = e.events || []
				return {
					path: e.path, text: e.text, series: e.series, events, mode, changeCount: Math.max(0, events.length - 1),
					marks: mode === 'sparkline' && this.markers ? jumpMarkers(e.series) : [],
					min: mode === 'sparkline' && s.min !== null ? fmt(s.min) : '-', max: mode === 'sparkline' && s.max !== null ? fmt(s.max) : '-'
				}
			})
		}
	},
	methods: {
		t(k, p) {
			return i18n.t('plugins.WorkshopModel.model.' + k, p)
		},
		toggle(path) {
			this.open = this.open.indexOf(path) >= 0 ? this.open.filter(p => p !== path) : this.open.concat([path])
		},
		onTrack(v) {
			this.$emit('update:track', !!v)
		},
		clock(ts) {
			const d = new Date(ts)
			const p = n => String(n).padStart(2, '0')
			return p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds())
		}
	}
}
</script>
