<template>
	<div>
		<v-card class="mb-3">
			<v-card-text>
				<div class="mo-part"><v-icon size="20" class="mr-1">mdi-file-search-outline</v-icon>{{ t('usage_title') }}</div>
				<div class="mo-faint mb-2">{{ t('usage_help') }}</div>
				<div v-if="!support.ok" class="mo-off" role="status">{{ offText }}</div>
				<template v-else>
					<usage-scope :scope="scope" :folders="folders" @update:scope="setScope" />
					<div class="mo-faint mt-2">{{ t('usage_budget', { files: budget.files, kb: Math.round(budget.bytesPerFile / 1024) }) }} <span v-if="!tier.extras">{{ t('usage_budget_standalone') }}</span></div>
					<div class="mo-faint">{{ tier.extras ? t('usage_cache_sbc') : t('usage_cache_browser') }}</div>
					<div class="mo-actions">
						<v-btn size="small" variant="flat" color="primary" :disabled="scanning" @click="scan">{{ scanning ? t('usage_scanning', { i: done, n: total }) : t('usage_scan') }}</v-btn>
						<v-btn v-if="scanning" size="small" variant="text" @click="cancel = true">{{ t('cancel') }}</v-btn>
					</div>
					<v-progress-linear v-if="scanning" :model-value="pct" color="primary" height="6" rounded :aria-label="t('usage_progress', { done, total })" />
					<error-notice :error="problem" class="mt-2" />
					<div v-if="result" class="mo-faint mt-2" role="status">{{ t('usage_result', { read: result.read, cached: result.fromCache, skipped: result.skipped }) }}</div>
				</template>
			</v-card-text>
		</v-card>
		<v-card v-if="support.ok && result" class="mb-3">
			<v-card-text>
				<div class="mo-part"><v-icon size="20" class="mr-1">mdi-alert-circle-outline</v-icon>{{ t('usage_results_title') }}</div>
				<usage-results :refs="result.refs" :live-names="liveNames" :complete="result.defsComplete && !result.unscanned.length" :unscanned="result.unscanned" @select="emit('select', $event)" @scan-folder="scanFolder" />
			</v-card-text>
		</v-card>
		<v-card v-if="support.ok && result" class="mb-3">
			<v-card-text>
				<div class="mo-part"><v-icon size="20" class="mr-1">mdi-file-document-outline</v-icon>{{ t('usage_byfile_title') }}</div>
				<div class="mo-faint mb-2">{{ t('usage_byfile_help') }}</div>
				<usage-by-file :refs="result.refs" :live-names="liveNames" @select="emit('select', $event)" />
			</v-card-text>
		</v-card>
	</div>
</template>

<script setup>
// Usage finder (design item 7, reworked): what to read is the person's choice (UsageScope.vue, usage-scope.js: the M98 chain of
// config.g and the top of 0:/macros by default), one run reads it within the budget of the tier and skips the files that did not
// change since the last run (usage-runner.js and the cache the page keeps), with a progress bar; the result opens on the real
// problems (UsageResults.vue) and can be read by file (UsageByFile.vue).
import { computed, ref } from 'vue'
import { i18n } from './dwc-host.js'
import { liveModel, listDir, readText } from './model-host.js'
import ErrorNotice from './ErrorNotice.vue'
import UsageScope from './UsageScope.vue'
import UsageResults from './UsageResults.vue'
import UsageByFile from './UsageByFile.vue'
import { childrenOf } from './model-tree.js'
import { scanBudget } from './tier.js'
import { readScope, saveScope, cleanScope } from './usage-scope.js'
import { runScan } from './usage-runner.js'

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
const result = ref(null)
const problem = ref(null)

const budget = computed(() => scanBudget(props.tier))
const offText = computed(() => (props.support.known ? t('globals_off_rrf', { version: props.support.version, minimum: props.support.minimum }) : t('globals_off_unknown')))
const pct = computed(() => (total.value ? Math.round((done.value / total.value) * 100) : 0))
const liveNames = computed(() => {
	void props.tick
	const m = liveModel()
	return childrenOf(m && m.global).map(c => c.key)
})

function setScope(next) {
	scope.value = next
	saveScope(storage(), next)
}

// a folder that was not read: switch it on (deep enough to reach it) and read again
function scanFolder(f) {
	setScope(cleanScope(Object.assign({}, scope.value, { dirs: Object.assign({}, scope.value.dirs, { [f.dir]: true }), depth: Math.max(scope.value.depth, f.depth) })))
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
	try {
		const r = await runScan({ listDir, readText }, {
			scope: scope.value, budget: budget.value, pluginIds: pluginIds(), cache: props.cache,
			onProgress: (d, n) => { done.value = d; total.value = n },
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
