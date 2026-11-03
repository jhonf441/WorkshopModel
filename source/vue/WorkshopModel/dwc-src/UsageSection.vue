<template>
	<div class="mo-usage">
		<v-card class="mb-3">
			<v-card-text>
				<div class="mo-part"><v-icon size="20" class="mr-1">mdi-file-search-outline</v-icon>{{ t('usage_title') }}</div>
				<div class="mo-faint mb-2">{{ t('usage_help') }}</div>
				<div v-if="!support.ok" class="mo-off" role="status">{{ offText }}</div>
				<template v-else>
					<usage-scan-bar :scanning="scanning" :done="done" :total="total" :current="current" :result="result" @scan="scan" @cancel="cancel = true" />
					<error-notice :error="problem" class="mt-2" />
					<usage-options :kinds="kinds" :file="file" :scope="scope" :folders="folders" :files="files" :budget="budget" :tier="tier" @update:scope="setScope" @update:kinds="kinds = $event" @update:file="file = $event" />
				</template>
			</v-card-text>
		</v-card>
		<template v-if="support.ok && result">
			<usage-banner :unscanned="result.unscanned" @scan-folders="scanFolders" />
			<usage-cards :counts="counts" :card="card" @pick="card = $event" />
			<v-card class="mb-3">
				<v-card-text>
					<div class="mo-toolbar">
						<v-text-field v-model="query" density="compact" variant="outlined" hide-details clearable prepend-inner-icon="mdi-magnify" class="mo-search" :label="t('usage_search')" :placeholder="t('usage_search_hint')" />
					</div>
					<view-tabs :choices="TABS" :current="tab" :label="t('usage_tabs_label')" @pick="tab = $event" />
					<div class="mo-utab mo-ufade" :key="tab">
						<usage-results v-if="tab === 'global'" :rows="rows" :card="card" :query="query || ''" :kinds="kinds" :file="file" @select="emit('select', $event)" @reset="resetFilters" />
						<usage-by-file v-else-if="tab === 'file'" :refs="result.refs" :rows="rows" :live-names="liveNames" :query="query || ''" @select="emit('select', $event)" />
						<usage-macro-map v-else :files="result.cache" :query="query || ''" />
					</div>
				</v-card-text>
			</v-card>
		</template>
	</div>
</template>

<script setup>
// Usage finder (design item 7, redesigned): the button that reads the files with its progress (UsageScanBar.vue), the technical side
// folded in Options (UsageOptions.vue: what to read, kinds, one file), one banner for the folders not read (UsageBanner.vue), three
// summary cards that sort the globals (UsageCards.vue), one search box and three tabs next to each other: by global
// (UsageResults.vue), by file (UsageByFile.vue) and by macro (UsageMacroMap.vue). One run reads what the scope says within the budget of
// the tier and skips the files that did not change (usage-runner.js and the cache the page keeps). This holds the state and runs the scan.
import { computed, ref, watch } from 'vue'
import { i18n } from './dwc-host.js'
import { liveModel, listDir, readText } from './model-host.js'
import ErrorNotice from './ErrorNotice.vue'
import ViewTabs from './ViewTabs.vue'
import UsageScanBar from './UsageScanBar.vue'
import UsageOptions from './UsageOptions.vue'
import UsageBanner from './UsageBanner.vue'
import UsageCards from './UsageCards.vue'
import UsageResults from './UsageResults.vue'
import UsageByFile from './UsageByFile.vue'
import UsageMacroMap from './UsageMacroMap.vue'
import { childrenOf } from './model-tree.js'
import { scanBudget } from './tier.js'
import { readScope, saveScope, cleanScope, DEPTH_MAX } from './usage-scope.js'
import { runScan } from './usage-runner.js'
import { globalRows, cardCounts, cardAfterFilter, filesOf } from './usage-view.js'

const TABS = [
	{ id: 'global', icon: 'mdi-variable', label: 'usage_tab_global' },
	{ id: 'file', icon: 'mdi-file-document-outline', label: 'usage_tab_file' },
	{ id: 'macro', icon: 'mdi-sitemap-outline', label: 'usage_tab_macro' }
]

const props = defineProps({
	tick: { type: Number, default: 0 },
	tier: { type: Object, default: () => ({ extras: false }) },
	support: { type: Object, default: () => ({ ok: false, known: false }) },
	cache: { type: Map, default: () => new Map() }
})
const emit = defineEmits(['select', 'update:cache'])

const t = (k, p) => i18n.t('plugins.WorkshopModel.model.' + k, p)
const storage = () => (typeof localStorage === 'undefined' ? null : localStorage)

const scope = ref(readScope(storage()))
const folders = ref([])
const scanning = ref(false)
const cancel = ref(false)
const done = ref(0)
const total = ref(0)
const current = ref('')
const result = ref(null)
const problem = ref(null)
const tab = ref('global')
const card = ref('all')
const query = ref('')
const kinds = ref([])
const file = ref('')

const budget = computed(() => scanBudget(props.tier))
const offText = computed(() => (props.support.known ? t('globals_off_rrf', { version: props.support.version, minimum: props.support.minimum }) : t('globals_off_unknown')))
const liveNames = computed(() => {
	void props.tick
	const m = liveModel()
	return childrenOf(m && m.global).map(c => c.key)
})
const rows = computed(() => (result.value ? globalRows(result.value.refs, liveNames.value, { complete: result.value.defsComplete && !result.value.unscanned.length }) : []))
const counts = computed(() => cardCounts(rows.value))
const files = computed(() => (result.value ? filesOf(result.value.refs) : []))

// a new result opens on the card that matters; a search or one file means "look at everything" (clearing them goes back)
watch(result, () => {
	if (file.value && files.value.indexOf(file.value) < 0) file.value = ''
	card.value = cardAfterFilter({ query: query.value, file: file.value }, counts.value)
})
watch([query, file], () => {
	card.value = cardAfterFilter({ query: query.value, file: file.value }, counts.value)
})

function resetFilters() {
	query.value = ''
	file.value = ''
	card.value = 'all'
}

function setScope(next) {
	scope.value = next
	saveScope(storage(), next)
}

// the folders that were not read: switch them all on (deep enough to reach them) and read again
function scanFolders(list) {
	const dirs = Object.assign({}, scope.value.dirs)
	for (const f of list) dirs[f.dir] = true
	const depth = list.reduce((d, f) => Math.max(d, f.depth), scope.value.depth)
	setScope(cleanScope(Object.assign({}, scope.value, { dirs, depth: Math.min(depth, DEPTH_MAX) })))
	scan()
}

function pluginIds() {
	const m = liveModel()
	return childrenOf(m && m.plugins).map(c => c.key)
}

async function scan() {
	scanning.value = true
	cancel.value = false
	problem.value = null
	done.value = 0
	total.value = 0
	current.value = ''
	try {
		const r = await runScan({ listDir, readText }, {
			scope: scope.value, budget: budget.value, pluginIds: pluginIds(), cache: props.cache, needMap: true,
			onProgress: (d, n, path) => { done.value = d; total.value = n; current.value = path || '' },
			cancelled: () => cancel.value
		})
		folders.value = r.folders
		result.value = r
		emit('update:cache', r.cache)
	} catch (e) {
		problem.value = e
	} finally {
		scanning.value = false
	}
}
</script>
