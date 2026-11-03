<template>
	<div class="mo-flat">
		<div class="mo-toolbar">
			<v-text-field v-model="query" density="compact" variant="outlined" hide-details clearable prepend-inner-icon="mdi-magnify" class="mo-search" :label="t('flat_filter')" :placeholder="t('flat_filter_hint')" />
		</div>
		<div class="mo-flat-filters" role="group" :aria-label="t('flat_types')">
			<button v-for="g in KIND_GROUPS" :key="g.id" type="button" class="wf-cat" :aria-pressed="groups.indexOf(g.id) >= 0 ? 'true' : 'false'" @click="toggleGroup(g.id)">{{ t('group_' + g.id) }}</button>
			<v-switch v-model="onlyChanged" density="compact" color="primary" hide-details :label="t('flat_changed')" />
			<v-switch v-model="onlyWatched" density="compact" color="primary" hide-details :label="t('flat_watched')" />
			<v-btn v-if="filtered" size="x-small" variant="text" @click="clearFilters">{{ t('flat_clear') }}</v-btn>
		</div>
		<div class="mo-faint mb-1" role="status">{{ t('flat_count', { n: shown.length, total: leaves.length }) }} <span v-if="truncated">{{ t('flat_truncated', { n: leaves.length }) }}</span></div>
		<div class="mo-flat-scroll">
			<table class="mo-table mo-flat-table">
				<thead>
					<tr>
						<th v-for="c in COLUMNS" :key="c.id" :aria-sort="sortKey === c.id ? (desc ? 'descending' : 'ascending') : 'none'">
							<button type="button" class="mo-sort" :title="t('flat_sort_by', { col: t(c.label) })" @click="sortBy(c.id)">{{ t(c.label) }}<v-icon v-if="sortKey === c.id" size="small">{{ desc ? 'mdi-sort-descending' : 'mdi-sort-ascending' }}</v-icon></button>
						</th>
					</tr>
				</thead>
				<tbody>
					<tr v-for="l in page.rows" :key="l.path" :class="{ 'mo-selected': l.path === selected }">
						<td class="mo-key"><favorite-star :path="l.path" :pinned="pinned" @pin="emit('pin', $event)" @unpin="emit('unpin', $event)" /><button type="button" class="mo-link" @click="emit('select', l.path)">{{ l.path }}</button><v-icon v-if="watchedSet.has(l.path)" size="x-small" class="ml-1" :title="t('flat_watched_mark')">mdi-eye-outline</v-icon></td>
						<td class="mo-value">{{ l.text }}<span v-if="humanText(l)" class="mo-faint"> ({{ humanText(l) }})</span></td>
						<td><kind-chip :info="leafInfo(l)" /></td>
						<td class="mo-value">{{ agoText(l.path) }}</td>
					</tr>
				</tbody>
			</table>
		</div>
		<div v-if="!shown.length" class="mo-faint mt-1">{{ t('flat_none') }}</div>
		<v-btn v-if="page.more" size="small" variant="outlined" class="mt-2" @click="pages++">{{ t('flat_more', { n: Math.min(page.more, FLAT_PAGE) }) }}</v-btn>
	</div>
</template>

<script setup>
// The Flat list view: every leaf of the model in one table (flat-list.js), filtered by text, by kind group, by "changed in the
// last minute" (changeTimes) and by "only watched", sorted by any column, shown FLAT_PAGE rows at a time. A tap on a path selects
// it (the detail is beside the view); the type is a chip (KindChip.vue) and the star pins a path. A view of VIEW-CONTRACT.md.
import { computed, ref, watch } from 'vue'
import { i18n } from './dwc-host.js'
import { KIND_GROUPS, FLAT_PAGE, RECENT_MS, filterLeaves, sortLeaves, pageOf } from './flat-list.js'
import { humanize } from './value-human.js'
import { leafInfo } from './value-kind.js'
import KindChip from './KindChip.vue'
import FavoriteStar from './FavoriteStar.vue'

const props = defineProps({
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
})
const emit = defineEmits(['select', 'open', 'watch', 'unwatch', 'pin', 'unpin', 'clear-changes'])

const COLUMNS = [{ id: 'path', label: 'detail_path' }, { id: 'value', label: 'value' }, { id: 'type', label: 'type' }, { id: 'changed', label: 'flat_col_changed' }]
const t = (k, p) => i18n.t('plugins.WorkshopModel.model.' + k, p)

const query = ref('')
const groups = ref([])
const onlyChanged = ref(false)
const onlyWatched = ref(false)
const sortKey = ref('path')
const desc = ref(false)
const pages = ref(1)

const watchedSet = computed(() => new Set(props.watched))
const filtered = computed(() => !!(query.value || groups.value.length || onlyChanged.value || onlyWatched.value))
const shown = computed(() => {
	void props.tick
	const now = Date.now()
	const list = filterLeaves(props.leaves, { query: query.value, groups: groups.value, onlyChanged: onlyChanged.value, onlyWatched: onlyWatched.value, times: props.changeTimes, watched: props.watched, now, recentMs: RECENT_MS })
	return sortLeaves(list, sortKey.value, desc.value, props.changeTimes)
})
const page = computed(() => pageOf(shown.value, pages.value, FLAT_PAGE))

watch([query, groups, onlyChanged, onlyWatched], () => { pages.value = 1 })

function toggleGroup(id) {
	groups.value = groups.value.indexOf(id) >= 0 ? groups.value.filter(g => g !== id) : groups.value.concat([id])
}
function clearFilters() {
	query.value = ''
	groups.value = []
	onlyChanged.value = false
	onlyWatched.value = false
}
function sortBy(id) {
	if (sortKey.value === id) desc.value = !desc.value
	else {
		sortKey.value = id
		desc.value = false
	}
}
function humanText(l) {
	const h = humanize(l.path, l.value)
	return h && h.hint !== 'color' ? t(h.key, h.params) : ''
}
function agoText(path) {
	const at = props.changeTimes.get(path)
	if (!at) return t('unit_none')
	return t('flat_ago', { s: Math.max(0, Math.round((Date.now() - at) / 1000)) })
}
</script>
