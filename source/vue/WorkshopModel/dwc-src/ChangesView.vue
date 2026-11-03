<template>
	<div class="mo-changes-view" :class="densityClass(density)">
		<div class="mo-changes-help">{{ t('changes_view_help') }}</div>
		<div class="wf-tabs" role="tablist" :aria-label="t('changes_since_label')">
			<button v-for="m in moments" :key="m.id" type="button" class="wf-tab" role="tab" :aria-selected="moment === m.id ? 'true' : 'false'" :title="t(m.what)" @click="pickMoment(m.id)">{{ t(m.label) }}</button>
		</div>
		<div class="mo-changes-bar">
			<span class="mo-changes-since" role="status">{{ sinceText }}</span>
			<v-btn size="small" color="primary" :disabled="!sampled" :title="sampled ? t('changes_mark_help') : t('changes_waiting')" @click="mark"><v-icon size="small" start>mdi-flag-variant-outline</v-icon>{{ t('changes_mark') }}</v-btn>
			<v-btn size="small" variant="text" :title="t('changes_clear_help')" @click="clear">{{ t('changes_clear') }}</v-btn>
		</div>
		<div class="mo-changes-tools">
			<v-text-field v-model="query" density="compact" variant="outlined" hide-details clearable prepend-inner-icon="mdi-magnify" class="mo-changes-filter" :label="t('flat_filter')" :placeholder="t('flat_filter_hint')" />
			<div class="mo-changes-cats" role="group" :aria-label="t('changes_status_label')">
				<button v-for="s in statusChoices" :key="s.id" type="button" class="wf-cat" :class="'mo-changes-cat-' + s.id" :aria-pressed="statuses.indexOf(s.id) >= 0 ? 'true' : 'false'" :title="t(s.what)" @click="toggleStatus(s.id)">{{ t(s.label) }} {{ counts[s.id] }}</button>
			</div>
			<v-switch :model-value="hideFrequent" density="compact" color="primary" hide-details :label="t(frequentChoice.label)" :title="t(frequentChoice.what)" @update:model-value="hideFrequent = !!$event" />
			<button v-if="filtered.noise || !hideNoise" type="button" class="wf-cat" :aria-pressed="hideNoise ? 'false' : 'true'" :title="t(noiseChoice.what)" @click="hideNoise = !hideNoise">{{ hideNoise ? t('changes_noise_hidden', { n: filtered.noise }) : t('changes_noise_shown') }}</button>
		</div>
		<div class="mo-changes-note" role="status">{{ countText }}</div>
		<div v-if="paused" class="mo-changes-note">{{ t('changes_paused') }}</div>
		<div v-if="!rows.length" class="mo-changes-note">{{ emptyText }}</div>
		<div v-else class="mo-changes-scroll">
			<table class="mo-changes-table">
				<thead><tr><th>{{ t('when') }}</th><th>{{ t('detail_path') }}</th><th>{{ t('before') }}</th><th>{{ t('after') }}</th><th>{{ t('changes_col_trend') }}</th><th>{{ t('changes_col_actions') }}</th></tr></thead>
				<tbody>
					<tr v-for="c in rows" :key="c.path">
						<td class="mo-changes-mono">{{ c.last ? clockOf(c.last) : '-' }}</td>
						<td class="mo-changes-pathcell">
							<button type="button" class="mo-changes-path" :title="t('topic_open_row', { path: c.path })" @click="emit('open', c.path)">{{ pathText(c.path) }}</button>
							<v-btn size="x-small" variant="text" class="mo-changes-copy" :title="t('copy_path')" :aria-label="t('copy_path')" @click="copyText(c.path)"><v-icon size="x-small">mdi-content-copy</v-icon></v-btn>
							<span class="wf-state" :class="STATE_CLASS[c.status]">{{ t('changes_status_' + c.status) }}</span>
						</td>
						<td class="mo-changes-mono mo-changes-before">{{ c.before === null ? t('changes_absent') : c.before }}</td>
						<td class="mo-changes-mono">{{ c.after === null ? t('changes_absent') : c.after }}</td>
						<td class="mo-changes-trend">
							<sparkline v-if="c.numeric" :series="c.series" :width="80" :height="20" />
							<span class="mo-changes-mono">{{ c.count ? t('changes_times', { n: c.count }) : t('changes_times_unknown') }}</span>
							<span v-if="c.numeric" class="mo-changes-range">{{ t('changes_range', { min: num(c.stats.min, 3), max: num(c.stats.max, 3) }) }}</span>
						</td>
						<td class="mo-changes-actions">
							<favorite-star :path="c.path" :pinned="pinned" @pin="emit('pin', $event)" @unpin="emit('unpin', $event)" />
							<v-btn size="x-small" variant="text" :title="watchLabel(c.path)" :aria-label="watchLabel(c.path)" @click="toggleWatch(c.path)"><v-icon size="small">{{ watched.indexOf(c.path) >= 0 ? 'mdi-eye-off-outline' : 'mdi-eye-outline' }}</v-icon></v-btn>
						</td>
					</tr>
				</tbody>
			</table>
		</div>
		<v-btn v-if="more" size="x-small" variant="text" @click="pages++">{{ t('flat_more', { n: Math.min(more, FLAT_PAGE) }) }}</v-btn>
	</div>
</template>

<script setup>
// The Changes view (VIEW-CONTRACT.md): only what changed since a moment you pick (a mark you set, the moment the view opened, the
// last 10 seconds, minute or 5 minutes), with the value at that moment and the value now, how many times it changed and, for a
// number, its line with min and max. Every new sample of the page (`leaves`) goes into the feed (changes-feed.js), which starts
// with the changes the page already recorded (`changes`); a value that keeps changing (an uptime, a live reading) can be hidden.
// Clear forgets what this view and the section recorded (clear-changes).
import { computed, ref, watch } from 'vue'
import { i18n } from './dwc-host.js'
import FavoriteStar from './FavoriteStar.vue'
import Sparkline from './Sparkline.vue'
import { MOMENTS, STATUS_CHOICES, STATUSES, FREQUENT_CHOICE, NOISE_CHOICE, createFeed, feedTick, setMark, clearFeed, momentOf, changesSince, filterChanges, shortPath, clockOf, agoOf } from './changes-feed.js'
import { copyText } from './copy-text.js'
import { densityClass } from './density.js'
import { pageOf, FLAT_PAGE } from './flat-list.js'
import { num } from './value-human.js'

// the dot of each status (DESIGN.md section 3: a state is a dot and the word)
const STATE_CLASS = { changed: 'info', added: 'ok', removed: 'warn', back: '' }

const props = defineProps({ tick: { type: Number, default: 0 }, model: { type: Object, default: null }, leaves: { type: Array, default: () => [] }, truncated: { type: Boolean, default: false }, changes: { type: Array, default: () => [] }, changeTimes: { type: Map, default: () => new Map() }, selected: { type: String, default: '' }, watched: { type: Array, default: () => [] }, pinned: { type: Array, default: () => [] }, density: { type: String, default: 'comfortable' }, paused: { type: Boolean, default: false }, globalsOk: { type: Boolean, default: true }, tier: { type: Object, default: () => ({ sbc: false, extras: false }) } })
const emit = defineEmits(['select', 'open', 'watch', 'unwatch', 'pin', 'unpin', 'clear-changes'])

const t = (k, p) => i18n.t('plugins.WorkshopModel.model.' + k, p)

const moments = MOMENTS
const statusChoices = STATUS_CHOICES
const frequentChoice = FREQUENT_CHOICE
const noiseChoice = NOISE_CHOICE
const feed = createFeed(Date.now(), props.changes) // a plain object: `version` says when it moved
const version = ref(0)
const moment = ref('open')
const query = ref('')
const statuses = ref([])
const hideFrequent = ref(true)
const hideNoise = ref(true) // the logs of other plugins (lastCommands) and stamps that move every second
const pages = ref(1)

watch(() => props.leaves, leaves => {
	if (!leaves || !leaves.length) return
	feedTick(feed, leaves, props.truncated, Date.now())
	version.value++
}, { immediate: true })

const sampled = computed(() => version.value > 0 && feed.ticks > 0)
const span = computed(() => {
	void version.value
	void props.tick
	return momentOf(feed, moment.value, Date.now())
})
const all = computed(() => {
	void version.value
	void props.tick
	return changesSince(feed, moment.value, Date.now())
})
const filtered = computed(() => filterChanges(all.value, { query: query.value, statuses: statuses.value, hideFrequent: hideFrequent.value, hideNoise: hideNoise.value, since: span.value.since, now: Date.now() }))
const counts = computed(() => Object.fromEntries(STATUSES.map(id => [id, all.value.filter(c => c.status === id).length])))
const page = computed(() => pageOf(filtered.value.list, pages.value, FLAT_PAGE))
const rows = computed(() => page.value.rows)
const more = computed(() => page.value.more)
const sinceText = computed(() => {
	void version.value
	if (moment.value === 'mark' && feed.mark === null) return t('changes_mark_none')
	const a = agoOf(Date.now(), span.value.since)
	return t('changes_since_at', { time: clockOf(span.value.since), ago: t(a.key, { n: a.n }) })
})
const countText = computed(() => {
	const n = filtered.value.list.length
	return filtered.value.hidden ? t('changes_count_hidden', { n, hidden: filtered.value.hidden }) : t('changes_count', { n })
})
const emptyText = computed(() => (sampled.value ? t('changes_none_since') : t('changes_waiting')))

watch([moment, query, statuses, hideFrequent, hideNoise], () => { pages.value = 1 })

// the last two segments of a long path (the whole path is in the title and the copy button)
function pathText(path) {
	const s = shortPath(path, 2)
	return s.cut ? '...' + s.text : s.text
}

function pickMoment(id) {
	moment.value = id
}
function mark() {
	setMark(feed, Date.now())
	moment.value = 'mark'
	version.value++
}
function clear() {
	clearFeed(feed, Date.now())
	version.value++
	emit('clear-changes')
}
function toggleStatus(id) {
	const s = statuses.value
	statuses.value = s.indexOf(id) >= 0 ? s.filter(x => x !== id) : s.concat([id])
}
function watchLabel(path) {
	return props.watched.indexOf(path) >= 0 ? t('watch_remove') + ': ' + path : t('watch_add') + ': ' + path
}
function toggleWatch(path) {
	emit(props.watched.indexOf(path) >= 0 ? 'unwatch' : 'watch', path)
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
.mo-page .mo-changes-table { width: 100%; border-collapse: collapse; font-size: var(--mo-changes-font); }
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
</style>
