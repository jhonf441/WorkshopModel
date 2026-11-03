<template>
	<div>
		<v-card class="mb-3">
			<v-card-text>
				<div class="mo-part"><v-icon :size="20" class="mr-1">mdi-eye-outline</v-icon>{{ t('watch_title') }}</div>
				<div class="mo-faint mb-2">{{ t('watch_help') }}</div>
				<div class="mo-actions">
					<v-switch v-model="markers" dense color="primary" hide-details :label="t(MARKERS_SETTING.label)" />
				</div>
				<choice-help :choice="MARKERS_SETTING" :title="t(MARKERS_SETTING.label)" class="mb-2" />
				<div v-if="!rows.length" class="mo-faint">{{ t('watch_none') }}</div>
				<table v-else class="mo-table">
					<thead><tr><th>{{ t('detail_path') }}</th><th>{{ t('watch_last') }}</th><th>{{ t('watch_min') }}</th><th>{{ t('watch_max') }}</th><th>{{ t('watch_col_graph') }}</th><th></th></tr></thead>
					<tbody>
						<template v-for="r in rows">
							<tr :key="r.path">
								<td class="mo-key"><button type="button" class="mo-link" :title="t('open_in_tree')" @click="$emit('select', r.path)">{{ r.path }}</button></td>
								<td class="mo-value">{{ r.text }}</td>
								<td class="mo-value">{{ r.min }}</td>
								<td class="mo-value">{{ r.max }}</td>
								<td>
									<sparkline v-if="r.mode === 'sparkline'" :series="r.series" :width="160" :height="28" :marks="r.marks" />
									<watch-bands v-else-if="r.mode !== 'inner'" :events="r.events" :onoff="r.mode === 'onoff'" :tick="tick" />
									<span v-else class="mo-faint">{{ t('watch_inner_n', { n: r.changeCount }) }}</span>
									<span v-if="r.marks.length" class="mo-faint"> {{ t('watch_jumps', { n: r.marks.length }) }}</span>
								</td>
								<td class="mo-row-actions">
									<v-btn x-small text :aria-expanded="open.indexOf(r.path) >= 0 ? 'true' : 'false'" @click="toggle(r.path)">{{ open.indexOf(r.path) >= 0 ? t('watch_changes_hide') : t('watch_changes_show', { n: r.changeCount }) }}</v-btn>
									<v-btn x-small text :title="t('watch_remove')" :aria-label="t('watch_remove')" @click="$emit('unwatch', r.path)"><v-icon small>mdi-close</v-icon></v-btn>
								</td>
							</tr>
							<tr v-if="open.indexOf(r.path) >= 0" :key="r.path + '-more'" class="mo-watch-more">
								<td colspan="6"><watch-events :events="r.events" :tick="tick" /></td>
							</tr>
						</template>
					</tbody>
				</table>
				<div class="mo-faint mt-2">{{ storage === 'sbc' ? t('watch_saved_sbc') : t('watch_saved_browser') }}</div>
			</v-card-text>
		</v-card>
		<v-card class="mb-3">
			<v-card-text>
				<div class="mo-part"><v-icon :size="20" class="mr-1">mdi-history</v-icon>{{ t('changes_title') }}</div>
				<div class="mo-faint mb-2">{{ t('changes_help') }}</div>
				<div class="mo-actions">
					<v-switch :input-value="track" dense color="primary" hide-details :label="t('changes_track')" @change="onTrack" />
					<v-btn small text :disabled="!changes.length" @click="$emit('clear')">{{ t('changes_clear') }}</v-btn>
				</div>
				<div v-if="!changes.length" class="mo-faint">{{ t('changes_none') }}</div>
				<table v-else class="mo-table">
					<thead><tr><th>{{ t('when') }}</th><th>{{ t('detail_path') }}</th><th>{{ t('before') }}</th><th>{{ t('after') }}</th></tr></thead>
					<tbody>
						<tr v-for="(c, i) in changes" :key="c.t + c.path + i">
							<td class="mo-value">{{ clock(c.t) }}</td>
							<td class="mo-key"><button type="button" class="mo-link" :title="t('open_in_tree')" @click="$emit('select', c.path)">{{ c.path }}</button></td>
							<td class="mo-value">{{ c.before }}</td>
							<td class="mo-value">{{ c.after }}</td>
						</tr>
					</tbody>
				</table>
			</v-card-text>
		</v-card>
	</div>
</template>

<script>
'use strict'

// The watch list (design item 2: live value, min and max of every pinned path) drawn by the kind of the value (watch-render.js): a
// number as a sparkline (with a dot on each sudden jump when asked), a text as coloured bands, a boolean as on / off, an array or an
// object as the count of its changes; every row opens the table of its changes (WatchEvents.vue). Then the recent changes with
// before and after (design item 3). The samples and the changes are collected by the page every tick (watch-series.js, change-diff.js).
import i18n from '../../i18n'
import Sparkline from './Sparkline.vue'
import WatchBands from './WatchBands.vue'
import WatchEvents from './WatchEvents.vue'
import ChoiceHelp from './ChoiceHelp.vue'
import { seriesStats } from './watch-series.js'
import { MARKERS_SETTING, rendererFor, jumpMarkers } from './watch-render.js'

function fmt(v) {
	return Number.isInteger(v) ? String(v) : String(Math.round(v * 1000) / 1000)
}

export default {
	components: { Sparkline, WatchBands, WatchEvents, ChoiceHelp },
	props: {
		tick: { type: Number, default: 0 },
		entries: { type: Array, default: () => [] },
		changes: { type: Array, default: () => [] },
		track: { type: Boolean, default: true },
		storage: { type: String, default: 'browser' }
	},
	data() {
		return { markers: false, open: [], MARKERS_SETTING }
	},
	computed: {
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
