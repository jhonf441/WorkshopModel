<template>
	<div class="mo-tree-view">
		<div class="mo-toolbar">
			<v-text-field v-model="query" density="compact" variant="outlined" hide-details clearable prepend-inner-icon="mdi-magnify" class="mo-search" :label="t('search_label')" :placeholder="t('search_hint')" />
			<v-btn size="small" variant="text" :disabled="!openCount" @click="collapseAll">{{ t('collapse_all') }}</v-btn>
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

<script setup>
// The technical view (design item 1): the rows of the expanded nodes come from model-tree.js on every tick, the search runs over
// the whole model, and the rows whose value changed since the last tick flash (change-diff.js). A path selected or opened anywhere
// (another view, the globals, watch and usage sections) unfolds the tree down to it, and a branch opened from elsewhere unfolds
// itself too. A view of VIEW-CONTRACT.md.
import { computed, ref, watch } from 'vue'
import { i18n } from './dwc-host.js'
import ModelTree from './ModelTree.vue'
import { visibleRows, searchModel, ancestorsOf, SEARCH_LIMIT } from './model-tree.js'
import { getAtPath } from './model-path.js'
import { isBranch } from './value-format.js'
import { diffTexts, textMap } from './change-diff.js'

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

const t = (k, p) => i18n.t('plugins.WorkshopModel.model.' + k, p)

const query = ref('')
const expanded = ref({}) // path -> true (an object, not a Set: the 3.6 line keeps the same shape)
const changed = ref(new Set())
let previous = null

const expandedSet = computed(() => new Set(Object.keys(expanded.value)))
const openCount = computed(() => Object.keys(expanded.value).length)
const tree = computed(() => {
	void props.tick
	return visibleRows(props.model, expandedSet.value)
})
const rows = computed(() => tree.value.rows)
const truncatedRows = computed(() => tree.value.truncated)
const results = computed(() => {
	void props.tick
	return searchModel(props.model, query.value)
})

watch(rows, next => {
	const m = textMap(next)
	changed.value = new Set(previous ? diffTexts(previous, m).map(c => c.path) : [])
	previous = m
})

// the selected path unfolds the tree down to it; a selected branch unfolds too (See all of the Topics view)
watch(() => props.selected, p => {
	for (const a of ancestorsOf(p)) expanded.value[a] = true
	if (p && isBranch(getAtPath(props.model, p))) expanded.value[p] = true
}, { immediate: true })

function toggle(path) {
	if (expanded.value[path]) delete expanded.value[path]
	else expanded.value[path] = true
}
function choose(path) {
	emit('select', path)
	if (query.value) query.value = ''
}
function collapseAll() {
	expanded.value = {}
}
</script>
