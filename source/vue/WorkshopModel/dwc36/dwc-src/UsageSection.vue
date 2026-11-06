<template>
	<div class="mo-usage">
		<v-card class="mb-3">
			<v-card-text>
				<div class="mo-part"><v-icon :size="20" class="mr-1">mdi-file-search-outline</v-icon>{{ t('usage_title') }}</div>
				<div class="mo-faint mb-2">{{ t('usage_help') }}</div>
				<div v-if="!support.ok" class="mo-off" role="status">{{ offText }}</div>
				<div v-else>
					<usage-scan-bar :scanning="scanning" :done="done" :total="total" :current="current" :result="result" @scan="scan" @cancel="cancel = true" />
					<error-notice :error="problem" class="mt-2" />
					<usage-options :kinds="kinds" :file="file" :scope="scope" :folders="folders" :files="files" :budget="budget" :tier="tier" @update:scope="setScope" @update:kinds="kinds = $event" @update:file="file = $event" />
				</div>
			</v-card-text>
		</v-card>
		<div v-if="support.ok && result">
			<usage-banner :unscanned="result.unscanned" @scan-folders="scanFolders" />
			<usage-cards :counts="counts" :card="card" @pick="card = $event" />
			<v-card class="mb-3">
				<v-card-text>
					<div class="mo-toolbar">
						<!-- MO-1: the box suggests what exists (the live globals, the ones the macros name, the files), and still searches any text typed -->
						<v-combobox v-model="query" :search-input.sync="query" :items="suggestions" hide-no-data dense outlined hide-details clearable prepend-inner-icon="mdi-magnify" class="mo-search" :label="t('usage_search')" :placeholder="t('usage_search_hint')" />
					</div>
					<usage-legend />
					<view-tabs :choices="TABS" :current="tab" :label="t('usage_tabs_label')" @pick="tab = $event" />
					<div :key="tab" class="mo-utab mo-ufade">
						<usage-results v-if="tab === 'global'" :rows="rows" :card="card" :query="query || ''" :kinds="kinds" :file="file" @select="onSelect" @reset="resetFilters" />
						<usage-by-file v-else-if="tab === 'file'" :refs="result.refs" :rows="rows" :live-names="liveNames" :query="query || ''" @select="onSelect" />
						<usage-macro-map v-else :files="result.cache" :query="query || ''" :can-edit="canEdit" />
					</div>
				</v-card-text>
			</v-card>
		</div>
	</div>
</template>

<script>
'use strict'

// Usage finder (design item 7, redesigned): the button that reads the files with its progress (UsageScanBar.vue), the technical side
// folded in Options (UsageOptions.vue: what to read, kinds, one file), one banner for the folders not read (UsageBanner.vue), three
// summary cards that sort the globals (UsageCards.vue), one search box and three tabs next to each other: by global
// (UsageResults.vue), by file (UsageByFile.vue) and by macro (UsageMacroMap.vue). One run reads what the scope says within the budget of
// the tier and skips the files that did not change (usage-runner.js and the cache the page keeps). This holds the state and runs the scan.
import i18n from '../../i18n'
import { liveModel, listDir, readText } from './model-host.js'
import ErrorNotice from './ErrorNotice.vue'
import ViewTabs from './ViewTabs.vue'
import UsageScanBar from './UsageScanBar.vue'
import UsageOptions from './UsageOptions.vue'
import UsageBanner from './UsageBanner.vue'
import UsageCards from './UsageCards.vue'
import UsageLegend from './UsageLegend.vue'
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

function storage() {
	return typeof localStorage === 'undefined' ? null : localStorage
}

export default {
	components: { UsageLegend, ErrorNotice, ViewTabs, UsageScanBar, UsageOptions, UsageBanner, UsageCards, UsageResults, UsageByFile, UsageMacroMap },
	props: {
		tick: { type: Number, default: 0 },
		tier: { type: Object, default: () => ({ extras: false }) },
		support: { type: Object, default: () => ({ ok: false, known: false }) },
		cache: { type: Map, default: () => new Map() },
		autoScan: { type: Boolean, default: false }, // opened from "Buscar dónde se usa": the search starts when the page opens
		canEdit: { type: Boolean, default: false } // may send commands (the macro map offers to send a call)
	},
	mounted() {
		if (this.autoScan && !this.scanning) this.scan()
	},
	data() {
		// result is kept out of Vue's observation (Object.freeze): it can hold thousands of references
		return { TABS, scope: readScope(storage()), folders: [], scanning: false, cancel: false, done: 0, total: 0, current: '', result: null, problem: null, tab: 'global', card: 'all', query: '', kinds: [], file: '' }
	},
	computed: {
		budget() {
			return scanBudget(this.tier)
		},
		offText() {
			return this.support.known ? this.t('globals_off_rrf', { version: this.support.version, minimum: this.support.minimum }) : this.t('globals_off_unknown')
		},
		liveNames() {
			void this.tick
			const m = liveModel()
			return childrenOf(m && m.global).map(c => c.key)
		},
		rows() {
			return this.result ? globalRows(this.result.refs, this.liveNames, { complete: this.result.defsComplete && !this.result.unscanned.length }) : []
		},
		counts() {
			return cardCounts(this.rows)
		},
		files() {
			return this.result ? filesOf(this.result.refs) : []
		},
		// what the search box offers: the globals of the live model, the ones the macros name (they may not exist now) and the files that name them
		suggestions() {
			const names = this.liveNames.concat(this.rows.map(r => r.name), this.files)
			return Array.from(new Set(names.filter(n => typeof n === 'string' && n))).sort((a, b) => a.localeCompare(b))
		}
	},
	watch: {
		// a new result opens on the card that matters; a search or one file means "look at everything" (clearing them goes back)
		result() {
			if (this.file && this.files.indexOf(this.file) < 0) this.file = ''
			this.card = cardAfterFilter({ query: this.query, file: this.file }, this.counts)
		},
		query() {
			this.card = cardAfterFilter({ query: this.query, file: this.file }, this.counts)
		},
		file() {
			this.card = cardAfterFilter({ query: this.query, file: this.file }, this.counts)
		}
	},
	methods: {
		t(k, p) {
			return i18n.t('plugins.WorkshopModel.model.' + k, p)
		},
		onSelect(path) {
			this.$emit('select', path)
		},
		resetFilters() {
			this.query = ''
			this.file = ''
			this.card = 'all'
		},
		setScope(next) {
			this.scope = next
			saveScope(storage(), next)
		},
		// the folders that were not read: switch them all on (deep enough to reach them) and read again
		scanFolders(list) {
			const dirs = Object.assign({}, this.scope.dirs)
			for (const f of list) dirs[f.dir] = true
			const depth = list.reduce((d, f) => Math.max(d, f.depth), this.scope.depth)
			this.setScope(cleanScope(Object.assign({}, this.scope, { dirs, depth: Math.min(depth, DEPTH_MAX) })))
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
			this.current = ''
			try {
				const r = await runScan({ listDir, readText }, {
					scope: this.scope, budget: this.budget, pluginIds: this.pluginIds(), cache: this.cache, needMap: true,
					onProgress: (d, n, path) => { this.done = d; this.total = n; this.current = path || '' },
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
