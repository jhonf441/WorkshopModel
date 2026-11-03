<template>
	<div>
		<v-card class="mb-3">
			<v-card-text>
				<div class="mo-part"><v-icon :size="20" class="mr-1">mdi-file-search-outline</v-icon>{{ t('usage_title') }}</div>
				<div class="mo-faint mb-2">{{ t('usage_help') }}</div>
				<div v-if="!support.ok" class="mo-off" role="status">{{ offText }}</div>
				<template v-else>
					<usage-scope :scope="scope" :folders="folders" @update:scope="setScope" />
					<div class="mo-faint mt-2">{{ t('usage_budget', { files: budget.files, kb: Math.round(budget.bytesPerFile / 1024) }) }} <span v-if="!tier.extras">{{ t('usage_budget_standalone') }}</span></div>
					<div class="mo-faint">{{ tier.extras ? t('usage_cache_sbc') : t('usage_cache_browser') }}</div>
					<div class="mo-actions">
						<v-btn small depressed color="primary" :disabled="scanning" @click="scan">{{ scanning ? t('usage_scanning', { i: done, n: total }) : t('usage_scan') }}</v-btn>
						<v-btn v-if="scanning" small text @click="cancel = true">{{ t('cancel') }}</v-btn>
					</div>
					<v-progress-linear v-if="scanning" :value="pct" color="primary" height="6" rounded :aria-label="t('usage_progress', { done, total })" />
					<error-notice :error="problem" class="mt-2" />
					<div v-if="result" class="mo-faint mt-2" role="status">{{ t('usage_result', { read: result.read, cached: result.fromCache, skipped: result.skipped }) }}</div>
				</template>
			</v-card-text>
		</v-card>
		<v-card v-if="support.ok && result" class="mb-3">
			<v-card-text>
				<div class="mo-part"><v-icon :size="20" class="mr-1">mdi-alert-circle-outline</v-icon>{{ t('usage_results_title') }}</div>
				<usage-results :refs="result.refs" :live-names="liveNames" :complete="result.defsComplete && !result.unscanned.length" :unscanned="result.unscanned" @select="onSelect" @scan-folder="scanFolder" />
			</v-card-text>
		</v-card>
		<v-card v-if="support.ok && result" class="mb-3">
			<v-card-text>
				<div class="mo-part"><v-icon :size="20" class="mr-1">mdi-file-document-outline</v-icon>{{ t('usage_byfile_title') }}</div>
				<div class="mo-faint mb-2">{{ t('usage_byfile_help') }}</div>
				<usage-by-file :refs="result.refs" :live-names="liveNames" @select="onSelect" />
			</v-card-text>
		</v-card>
	</div>
</template>

<script>
'use strict'

// Usage finder (design item 7, reworked): what to read is the person's choice (UsageScope.vue, usage-scope.js: the M98 chain of
// config.g and the top of 0:/macros by default), one run reads it within the budget of the tier and skips the files that did not
// change since the last run (usage-runner.js and the cache the page keeps), with a progress bar; the result opens on the real
// problems (UsageResults.vue) and can be read by file (UsageByFile.vue).
import i18n from '../../i18n'
import { liveModel, listDir, readText } from './model-host.js'
import ErrorNotice from './ErrorNotice.vue'
import UsageScope from './UsageScope.vue'
import UsageResults from './UsageResults.vue'
import UsageByFile from './UsageByFile.vue'
import { childrenOf } from './model-tree.js'
import { scanBudget } from './tier.js'
import { readScope, saveScope, cleanScope } from './usage-scope.js'
import { runScan } from './usage-runner.js'

function storage() {
	return typeof localStorage === 'undefined' ? null : localStorage
}

export default {
	components: { ErrorNotice, UsageScope, UsageResults, UsageByFile },
	props: {
		tick: { type: Number, default: 0 },
		tier: { type: Object, default: () => ({ extras: false }) },
		support: { type: Object, default: () => ({ ok: false, known: false }) },
		cache: { type: Map, default: () => new Map() }
	},
	data() {
		// result is kept out of Vue's observation (Object.freeze): it can hold thousands of references
		return { scope: readScope(storage()), folders: [], scanning: false, cancel: false, done: 0, total: 0, result: null, problem: null }
	},
	computed: {
		budget() {
			return scanBudget(this.tier)
		},
		offText() {
			return this.support.known ? this.t('globals_off_rrf', { version: this.support.version, minimum: this.support.minimum }) : this.t('globals_off_unknown')
		},
		pct() {
			return this.total ? Math.round((this.done / this.total) * 100) : 0
		},
		liveNames() {
			void this.tick
			const m = liveModel()
			return childrenOf(m && m.global).map(c => c.key)
		}
	},
	methods: {
		t(k, p) {
			return i18n.t('plugins.WorkshopModel.model.' + k, p)
		},
		onSelect(path) {
			this.$emit('select', path)
		},
		setScope(next) {
			this.scope = next
			saveScope(storage(), next)
		},
		// a folder that was not read: switch it on (deep enough to reach it) and read again
		scanFolder(f) {
			this.setScope(cleanScope(Object.assign({}, this.scope, { dirs: Object.assign({}, this.scope.dirs, { [f.dir]: true }), depth: Math.max(this.scope.depth, f.depth) })))
			this.scan()
		},
		pluginIds() {
			const m = liveModel()
			return childrenOf(m && m.plugins).map(c => c.key)
		},
		async scan() {
			this.scanning = true
			this.cancel = false
			this.problem = null
			this.done = 0
			this.total = 0
			try {
				const r = await runScan({ listDir, readText }, {
					scope: this.scope, budget: this.budget, pluginIds: this.pluginIds(), cache: this.cache,
					onProgress: (d, n) => { this.done = d; this.total = n },
					cancelled: () => this.cancel
				})
				this.folders = r.folders
				this.result = Object.freeze(r)
				this.$emit('update:cache', r.cache)
			} catch (e) {
				this.problem = e
			} finally {
				this.scanning = false
			}
		}
	}
}
</script>
