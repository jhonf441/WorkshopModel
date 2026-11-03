<template>
	<v-container fluid class="pa-0 workshop-theme mo-page" :style="{ '--wf-badge': BADGE, '--wf-sec': sectionColor(section) }">
		<page-header icon="mdi-file-tree" :title="t('common.title')" :lead="t('common.lead')" :badge="BADGE" :reasons="headerReasons" :loading="!connected">
			<v-chip size="small" variant="outlined" :title="t('model.rrf_chip_help')">{{ rrfText }}</v-chip>
			<v-chip size="small" variant="outlined" :title="tierHelp">{{ tierText }}</v-chip>
			<template #startup><startup-panel plugin="WorkshopModel" :defs="rowsStartup" :service-row="false" :recheck="refreshPersist" /></template>
		</page-header>
		<div class="st-layout">
			<side-tabs v-model="section" :items="sections" />
			<div class="st-body">
				<error-notice :error="problem" class="mb-2" />
				<div v-if="!tier.extras" class="mo-faint mb-2" role="status">{{ tierHelp }}</div>
				<tree-section
					v-if="section === 'tree'" :selected="selectedPath" :tick="tick" :paused="paused" :globals-ok="globals.ok" :can-edit="canEdit" :watched="watchedPaths" :persistent="persistentNames"
					:tracker="tracker" :tier="tier" :focus="treeFocus"
					@update:selected="selectedPath = $event" @update:paused="paused = $event" @watch="addWatch" @unwatch="removeWatch" @persist="setPersist"
					@clear-changes="clearModelChanges" @focused="treeFocus = ''" @test="openTester"
				/>
				<globals-section
					v-if="section === 'globals'" :tick="tick" :support="globals" :can-edit="canEdit" :persist="persistEntries" :config-includes="configIncludes" :watched="watchedPaths" :change-times="tracker.times" :usage-cache="usageCache"
					@select="openInTree" @watch="addWatch" @unwatch="removeWatch" @persist="setPersist" @update-persist="updatePersistValues"
				/>
				<watch-section
					v-if="section === 'watch'" :tick="tick" :entries="watchEntries" :changes="changes" :track="trackChanges" :storage="watchStorage"
					@unwatch="removeWatch" @select="openInTree" @update:track="trackChanges = $event" @clear="changes = []"
				/>
				<presets-section v-if="section === 'presets'" :tick="tick" :support="globals" :can-edit="canEdit" />
				<usage-section v-if="section === 'usage'" :tick="tick" :tier="tier" :support="globals" :cache="usageCache" @select="openInTree" @update:cache="setUsageCache" />
				<snapshots-section v-if="section === 'snapshots'" :tick="tick" :tier="tier" :can-edit="canEdit" :selected="selectedPath" @select="openInTree" />
				<tester-section v-if="section === 'tester'" :tick="tick" :connected="connected" :prefill="testerPrefill" />
			</div>
		</div>
	</v-container>
</template>

<script setup>
// The Model Explorer page (docs-internal/MODEL-EDITOR-DESIGN.md). It owns what the sections share: the tick (one sample per
// second of the raw model, paused on request), the selected path, the watch list with its samples, the recent changes, the
// persistence macro and the two run-time checks that switch functions on and off without any setting: the firmware version
// (rrf-version.js: globals need RRF 3.4) and the SBC tier (tier.js: model.sbc and the DSF version).
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import { i18n } from './dwc-host.js'
import { liveModel, isConnected, readText, writeText } from './model-host.js'
import PageHeader from './PageHeader.vue' // header of every page (vue/_shared)
import SideTabs from './SideTabs.vue' // sections in the side bar (vue/_shared)
import StartupPanel from './StartupPanel.vue' // start-up card (vue/_shared)
import ErrorNotice from './ErrorNotice.vue' // vue/_shared
import TreeSection from './TreeSection.vue'
import GlobalsSection from './GlobalsSection.vue'
import WatchSection from './WatchSection.vue'
import PresetsSection from './PresetsSection.vue'
import UsageSection from './UsageSection.vue'
import SnapshotsSection from './SnapshotsSection.vue'
import TesterSection from './TesterSection.vue'
import { useRole } from './use-role.js' // what the role may do (vue/_shared)
import { sectionColor } from './section-colors.js'
import { rowsModel } from './startup-rows.js'
import { firmwareVersionOf, globalsSupport } from './rrf-version.js'
import { detectTier, WATCH_FILE } from './tier.js'
import { getAtPath } from './model-path.js'
import { childrenOf } from './model-tree.js'
import { formatValue } from './value-format.js'
import { watchEntry, pushSample, serializeWatch, parseWatch, mergeWatch } from './watch-series.js'
import { watchFileText, readWatchFile } from './watch-file.js'
import { diffTexts, recordChanges } from './change-diff.js'
import { trackerState, trackTick, clearChanges } from './model-changes.js'
import { PERSIST_MACRO, parsePersistMacro, generatePersistMacro, configIncludes as macroIncluded, withEntry } from './persist-macro.js'
import { rrfLiteral } from './globals-typing.js'
import { toPlain } from './value-format.js'

const TICK_MS = 1000
const LOCAL_KEY = 'workshopModelWatch'
const CONFIG_FILE = '0:/sys/config.g'
// the badge color of this plugin (blue grey, 7:1 with the white icon); the same value belongs in vue/_shared/plugin-colors.js
const BADGE = '#455a64'

const { atLeast } = useRole()
const t = (k, p) => i18n.t('plugins.WorkshopModel.' + k, p)

const section = ref('tree')
const tick = ref(0)
const paused = ref(false)
const selectedPath = ref('')
const watchEntries = ref([])
const changes = ref([])
const trackChanges = ref(true)
const persistEntries = ref(null) // null until the macro has been read
const configIncludes = ref(null)
const problem = ref(null)
const tracker = shallowRef(trackerState()) // the whole model, flattened once per sample, with its changes (model-changes.js)
const treeFocus = ref('') // a path another section asked to open in the technical tree
const testerPrefill = ref('') // a path the detail panel asked to test
const usageCache = shallowRef(new Map()) // what the usage finder already read (usage-runner.js); in the watch file with the SBC tier only
let prevGlobals = null
let timer = null
let fileLoaded = false

// ---- what the run time decides (no settings) ----
const connected = computed(() => {
	void tick.value
	return isConnected()
})
const firmware = computed(() => {
	void tick.value
	return firmwareVersionOf(liveModel())
})
const globals = computed(() => globalsSupport(firmware.value))
const tier = computed(() => {
	void tick.value
	return detectTier(liveModel())
})
const canEdit = computed(() => atLeast('technician'))

const sections = computed(() => [
	{ id: 'tree', icon: 'mdi-file-tree', label: t('model.nav_tree') },
	{ id: 'globals', icon: 'mdi-variable', label: t('model.nav_globals') },
	{ id: 'watch', icon: 'mdi-eye-outline', label: t('model.nav_watch') },
	{ id: 'presets', icon: 'mdi-bookmark-multiple-outline', label: t('model.nav_presets') },
	{ id: 'usage', icon: 'mdi-file-search-outline', label: t('model.nav_usage') },
	{ id: 'snapshots', icon: 'mdi-camera-outline', label: t('model.nav_snapshots') },
	{ id: 'tester', icon: 'mdi-flask-outline', label: t('model.nav_tester') }
])
const watchedPaths = computed(() => watchEntries.value.map(e => e.path))
const persistentNames = computed(() => (persistEntries.value || []).map(e => e.name))
const watchStorage = computed(() => (tier.value.extras ? 'sbc' : 'browser'))

const rrfText = computed(() => (firmware.value ? t('model.rrf_chip', { version: firmware.value }) : t('model.rrf_unknown')))
// the chip says what the page does by itself (SBC mode, its extras on or off); the word companion is kept for the plugin of the Pi
const tierText = computed(() => (tier.value.sbc ? t(tier.value.extras ? 'model.tier_sbc' : 'model.tier_sbc_off') : t('model.tier_standalone')))
const tierHelp = computed(() => {
	const tr = tier.value
	if (tr.extras) return t('model.tier_help_on', { version: tr.dsfVersion }) + (tr.companion.running ? ' ' + t('model.companion_running') : '')
	return t('model.tier_off_' + tr.reason, { version: tr.dsfVersion || '-', minimum: tr.minimum })
})
const headerReasons = computed(() => {
	const g = globals.value
	return g.known && !g.ok ? [{ level: 'warn', text: t('model.reason_globals_off', { version: g.version, minimum: g.minimum }) }] : []
})
const rowsStartup = computed(() => rowsModel({
	connected: connected.value, firmware: firmware.value, globalsOk: globals.value.ok,
	persistCount: (persistEntries.value || []).length, configIncludes: configIncludes.value, sbc: tier.value.sbc, extras: tier.value.extras,
	companion: tier.value.companion
}))

// ---- the tick: samples of the watched paths and the changes of the globals ----
function globalTexts(model) {
	const m = new Map()
	for (const c of childrenOf(model && model.global)) m.set('global.' + c.key, formatValue(c.value))
	return m
}
function sample() {
	const model = liveModel()
	const now = Date.now()
	let found = []
	for (const e of watchEntries.value) {
		const before = e.text
		pushSample(e, now, getAtPath(model, e.path))
		if (before !== '' && before !== e.text) found.push({ path: e.path, before, after: e.text })
	}
	const g = globalTexts(model)
	if (prevGlobals) found = found.concat(diffTexts(prevGlobals, g).filter(c => !found.some(f => f.path === c.path)))
	prevGlobals = g
	if (trackChanges.value && found.length) changes.value = recordChanges(changes.value, found, now)
	tracker.value = trackTick(tracker.value, model, now)
	if (tick.value % 5 === 0) saveWatchLocal()
	if (tick.value % 30 === 0 && tier.value.extras && watchEntries.value.length) saveWatchFile()
}
function onTick() {
	tick.value++
	if (!paused.value) sample()
}

// ---- watch list storage: this browser always; the machine file as well with the SBC tier ----
function saveWatchLocal() {
	try {
		localStorage.setItem(LOCAL_KEY, JSON.stringify(serializeWatch(watchEntries.value)))
	} catch (e) {
		/* no storage: the list lives while the page is open */
	}
}
function loadWatchLocal() {
	try {
		watchEntries.value = parseWatch(localStorage.getItem(LOCAL_KEY) || '')
	} catch (e) {
		watchEntries.value = []
	}
}
async function saveWatchFile() {
	try {
		await writeText(WATCH_FILE, watchFileText(watchEntries.value, usageCache.value))
	} catch (e) {
		problem.value = e
	}
}
async function loadWatchFile() {
	if (fileLoaded) return
	fileLoaded = true
	try {
		const text = await readText(WATCH_FILE)
		if (!text) return
		const saved = readWatchFile(text)
		watchEntries.value = mergeWatch(watchEntries.value, saved.entries)
		if (!usageCache.value.size) usageCache.value = saved.usageCache
	} catch (e) {
		problem.value = e
	}
}
function setUsageCache(cache) {
	usageCache.value = cache
	if (tier.value.extras) saveWatchFile()
}
function addWatch(path) {
	if (!path || watchedPaths.value.indexOf(path) >= 0) return
	const e = watchEntry(path)
	pushSample(e, Date.now(), getAtPath(liveModel(), path))
	watchEntries.value = watchEntries.value.concat([e])
	saveWatchLocal()
}
function removeWatch(path) {
	watchEntries.value = watchEntries.value.filter(e => e.path !== path)
	saveWatchLocal()
}

// ---- the persistence macro (persist-macro.js) ----
async function refreshPersist() {
	if (!connected.value || !globals.value.ok) return
	try {
		const text = await readText(PERSIST_MACRO)
		persistEntries.value = text === null ? [] : parsePersistMacro(text)
		const cfg = await readText(CONFIG_FILE)
		configIncludes.value = cfg === null ? null : macroIncluded(cfg)
	} catch (e) {
		problem.value = e
	}
}
async function writePersist(entries) {
	try {
		await writeText(PERSIST_MACRO, generatePersistMacro(entries))
		persistEntries.value = entries
	} catch (e) {
		problem.value = e
	}
}
function setPersist(name, literal) {
	return writePersist(withEntry(persistEntries.value || [], name, literal))
}
// the saved values of every persistent global become the live ones
function updatePersistValues() {
	const g = liveModel().global
	const next = (persistEntries.value || []).map(e => {
		const v = getAtPath(g, e.name)
		return v === undefined ? e : { name: e.name, literal: rrfLiteral(toPlain(v)) }
	})
	return writePersist(next)
}

function openInTree(path) {
	selectedPath.value = path
	treeFocus.value = path
	section.value = 'tree'
}
function openTester(path) {
	testerPrefill.value = path
	section.value = 'tester'
}
function clearModelChanges() {
	tracker.value = clearChanges(tracker.value)
}

watch(connected, on => { if (on) refreshPersist() })
watch(() => globals.value.ok, ok => { if (ok) refreshPersist() })
watch(() => tier.value.extras, on => { if (on) loadWatchFile() })

onMounted(() => {
	loadWatchLocal()
	timer = setInterval(onTick, TICK_MS)
	refreshPersist()
	if (tier.value.extras) loadWatchFile()
})
onBeforeUnmount(() => {
	clearInterval(timer)
	saveWatchLocal()
})
</script>

<style>
/* Only the content of this plugin (prefix mo-): the bar, the menu, the cards and the buttons are design/family.css. */
.mo-page .mo-part { font-size: 14px; font-weight: 600; margin-bottom: 4px; display: flex; align-items: center; }
.mo-page .mo-faint { color: var(--tp-faint); font-size: 12px; }
.mo-page .mo-error { color: rgb(var(--v-theme-error)); font-size: 13px; margin: 4px 0; }
.mo-page .mo-warn { font-size: 13px; }
.mo-page .mo-ok { font-size: 13px; }
.mo-page .mo-off { border: 1px solid rgb(var(--v-theme-warning)); border-radius: 10px; padding: 8px 12px; font-size: 13px; }
.mo-page .mo-sub { background: rgba(128, 128, 128, 0.07); border-radius: 8px; padding: 10px 12px; }
.mo-page .mo-toolbar { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-bottom: 8px; }
.mo-page .mo-search { flex: 1 1 240px; max-width: 420px; }
.mo-page .mo-split { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 14px; }
.mo-page .mo-tree { max-height: 70vh; overflow: auto; border: 1px solid rgba(128, 128, 128, 0.25); border-radius: 8px; padding: 4px 0; }
.mo-page .mo-rows { display: flex; flex-direction: column; }
.mo-page .mo-row { display: flex; align-items: center; gap: 6px; width: 100%; min-height: 28px; padding: 2px 8px; border: 0; background: transparent; color: inherit; font: inherit; text-align: left; cursor: pointer; border-radius: 4px; }
.mo-page .mo-row:hover { background: rgba(128, 128, 128, 0.12); }
.mo-page .mo-row.mo-selected, .mo-page tr.mo-selected td { background: rgba(25, 118, 210, 0.14); }
.mo-page .mo-row.mo-changed { animation: mo-flash 1s ease-out; }
@keyframes mo-flash { from { background: rgba(255, 143, 0, 0.45); } to { background: transparent; } }
@media (prefers-reduced-motion: reduce) { .mo-page .mo-row.mo-changed { animation: none; background: rgba(255, 143, 0, 0.25); } }
.mo-page .mo-twisty { flex: none; width: 20px; display: inline-flex; justify-content: center; }
.mo-page .mo-key { font-family: var(--tp-font-mono, monospace); font-size: 12px; white-space: nowrap; }
.mo-page .mo-value { font-family: var(--tp-font-mono, monospace); font-size: 12px; color: var(--tp-faint2); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.mo-page .mo-count { font-family: var(--tp-font-mono, monospace); font-size: 11px; color: var(--tp-faint); }
.mo-page .mo-result { flex-wrap: wrap; }
.mo-page .mo-detail { min-width: 0; }
.mo-page .mo-detail-head { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-bottom: 4px; }
.mo-page .mo-path { font-family: var(--tp-font-mono, monospace); font-size: 13px; word-break: break-all; }
.mo-page .mo-value-big { font-family: var(--tp-font-mono, monospace); font-size: 14px; word-break: break-all; margin: 6px 0; }
.mo-page .mo-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.mo-page .mo-table th { text-align: left; padding: 4px 8px; border-bottom: 1px solid rgba(128, 128, 128, 0.3); }
.mo-page .mo-table td { padding: 4px 8px; border-bottom: 1px solid rgba(128, 128, 128, 0.15); vertical-align: top; }
.mo-page .mo-table td.mo-value { max-width: 320px; }
.mo-page .mo-row-actions { white-space: nowrap; }
.mo-page .mo-files { font-size: 12px; word-break: break-all; }
.mo-page .mo-snippet { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; padding: 2px 0; }
.mo-page .mo-snippet-label { flex: 0 0 110px; }
.mo-page .mo-snippet-code { font-family: var(--tp-font-mono, monospace); font-size: 12px; word-break: break-all; }
.mo-page .mo-form { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-bottom: 8px; }
.mo-page .mo-field { flex: 1 1 200px; }
.mo-page .mo-field-type { flex: 0 1 160px; }
.mo-page .mo-actions { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; margin: 6px 0; }
.mo-page .mo-preview { margin-top: 8px; }
.mo-page .mo-code textarea { font-family: var(--tp-font-mono, monospace); font-size: 13px; }
.mo-page .mo-reply { font-size: 13px; margin-top: 4px; word-break: break-all; }
.mo-page .mo-list { margin: 4px 0 4px 18px; font-size: 12px; }
.mo-page .mo-link { border: 0; background: transparent; color: inherit; font: inherit; padding: 0; cursor: pointer; text-decoration: underline; text-decoration-color: rgba(128, 128, 128, 0.5); text-align: left; word-break: break-all; }
.mo-page .mo-spark { color: var(--tp-blue-bright, #1976d2); vertical-align: middle; }
.mo-page .mo-spark-mark { fill: var(--tp-amber, #ffb74d); stroke: none; }
.mo-page .mo-bands { display: inline-flex; flex-direction: column; gap: 2px; vertical-align: middle; }
.mo-page .mo-bands svg { border-radius: 4px; overflow: hidden; }
.mo-page .mo-bands-text { fill: #fff; font-size: 10px; font-family: var(--tp-font-mono, monospace); pointer-events: none; }
.mo-page .mo-bands-legend { display: flex; flex-wrap: wrap; gap: 2px 10px; font-size: 11px; }
.mo-page .mo-bands-item { display: inline-flex; align-items: center; gap: 4px; }
.mo-page .mo-bands-box { display: inline-block; width: 10px; height: 10px; border-radius: 2px; }
.mo-page tr.mo-watch-more td { background: rgba(128, 128, 128, 0.05); }
.mo-page tr.mo-state-differs td { background: rgba(255, 143, 0, 0.1); }
.mo-page tr.mo-state-missing td { background: rgba(128, 128, 128, 0.12); }
.mo-page tr.mo-state-same td { opacity: 0.8; }
/* the views of the Model section (TreeSection.vue, VIEW-CONTRACT.md) */
.mo-page .mo-views-head { display: flex; flex-wrap: wrap; align-items: flex-end; justify-content: space-between; gap: 8px 16px; margin-bottom: 8px; }
.mo-page .mo-view-tabs { flex: 1 1 auto; }
.mo-page .mo-view { min-width: 0; }
.mo-page .mo-help-list { display: grid; grid-template-columns: max-content minmax(0, 1fr); gap: 4px 12px; margin: 6px 0 0; font-size: 13px; }
.mo-page .mo-help-list dt { font-weight: 600; }
.mo-page .mo-help-list dd { margin: 0; }
.mo-page .mo-density-compact .mo-row { min-height: 24px; }
.mo-page .mo-views-tools { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.mo-page .mo-density-compact .mo-topic-row { min-height: 28px; padding: 2px 6px; }
.mo-page .mo-density-compact .mo-flat-table td { padding: 2px 8px; }
.mo-page .mo-topics { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 300px), 1fr)); gap: 12px; align-items: start; }
.mo-page .mo-topic { min-width: 0; padding: 10px 12px; border: 1px solid rgba(128, 128, 128, 0.25); border-radius: 8px; background: rgba(128, 128, 128, 0.07); }
.mo-page .mo-topic-head { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
.mo-page .mo-topic-head .v-icon { color: var(--wf-icon); }
.mo-page .mo-topic-title { flex: 1 1 auto; font-size: 14px; font-weight: 600; }
.mo-page .mo-topic-row { display: flex; align-items: center; gap: 10px; width: 100%; min-height: 36px; padding: 4px 6px; border: 0; border-top: 1px solid rgba(128, 128, 128, 0.15); border-radius: 0; background: transparent; color: inherit; font: inherit; text-align: left; cursor: pointer; }
.mo-page .mo-topic-row:hover { background: rgba(128, 128, 128, 0.12); }
.mo-page .mo-topic-main { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; }
.mo-page .mo-topic-label { font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.mo-page .mo-topic-sub { display: flex; flex-wrap: wrap; gap: 2px 10px; font-size: 12px; color: var(--tp-faint); }
.mo-page .mo-topic-value { flex: none; max-width: 55%; font-family: var(--tp-font-mono, monospace); font-size: 14px; font-weight: 600; text-align: right; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.mo-page .mo-flat-filters { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 12px; margin-bottom: 6px; }
.mo-page .mo-flat-scroll { max-height: 65vh; overflow: auto; border: 1px solid rgba(128, 128, 128, 0.25); border-radius: 8px; }
.mo-page .mo-flat-table thead th { position: sticky; top: 0; z-index: 1; background: var(--wf-surface); }
.mo-page .mo-swatch { display: inline-block; width: 14px; height: 14px; margin-right: 6px; vertical-align: -2px; border: 1px solid rgba(128, 128, 128, 0.5); border-radius: 3px; }
.mo-page .mo-swatch-big { width: 20px; height: 20px; vertical-align: -4px; }
.mo-page .mo-human { font-size: 13px; color: var(--tp-faint); }
.mo-page .mo-value-table { max-height: 50vh; overflow: auto; }
.mo-page .mo-diff-changed td { background: rgba(255, 143, 0, 0.1); }
.mo-page .mo-diff-removed td { background: rgba(128, 128, 128, 0.12); }
.mo-page .mo-diff-added td { font-weight: 500; }
.mo-page .mo-code-field input { font-family: var(--tp-font-mono, monospace); font-size: 13px; }
.mo-page .mo-code-btn { font-family: var(--tp-font-mono, monospace); text-transform: none; }
.mo-page .mo-result-text { margin: 0; max-height: 40vh; overflow: auto; font-family: var(--tp-font-mono, monospace); font-size: 12px; white-space: pre-wrap; word-break: break-all; }
.mo-page .mo-result-bad { color: rgb(var(--v-theme-error)); }
.mo-page .mo-ggroup { margin-bottom: 6px; }
.mo-page .mo-ggroup-head { display: flex; align-items: center; gap: 4px; width: 100%; min-height: 32px; padding: 2px 4px; border: 0; border-bottom: 1px solid rgba(128, 128, 128, 0.25); background: transparent; color: inherit; font: inherit; font-size: 13px; font-weight: 600; text-align: left; cursor: pointer; }
.mo-page .mo-grow { border-bottom: 1px solid rgba(128, 128, 128, 0.15); padding: 2px 0; }
.mo-page .mo-grow-line { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; min-height: 40px; }
.mo-page .mo-density-compact .mo-grow-line { min-height: 32px; }
.mo-page .mo-grow-name { font-weight: 600; }
.mo-page .mo-grow-value { max-width: 40ch; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.mo-page .mo-grow-icon { color: var(--wf-icon); }
.mo-page .mo-grow-spacer { flex: 1 1 auto; }
.mo-page .mo-grow-quick { flex: 0 0 auto; }
.mo-page .mo-grow-num { width: 120px; }
.mo-page .mo-grow-full, .mo-page .mo-grow-more { margin: 4px 0 6px 38px; }
.mo-page .mo-persist > summary { cursor: pointer; list-style: revert; }
.mo-page .mo-persist-stale code { text-decoration: underline wavy rgba(255, 143, 0, 0.8); }
.mo-page .mo-usage-set { margin-bottom: 6px; }
.mo-page .mo-usage-folders { display: flex; flex-wrap: wrap; gap: 0 16px; }
.mo-page .mo-usage-unscanned { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 8px; margin: 6px 0; }
.mo-page .mo-usage-row { border-bottom: 1px solid rgba(128, 128, 128, 0.15); }
.mo-page .mo-usage-line { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 12px; width: 100%; min-height: 36px; padding: 4px 6px; border: 0; background: transparent; color: inherit; font: inherit; text-align: left; cursor: pointer; }
.mo-page .mo-usage-line:hover { background: rgba(128, 128, 128, 0.1); }
.mo-page .mo-usage-name { font-weight: 600; }
.mo-page .mo-usage-refs { margin: 4px 0 8px 28px; }
.mo-page .mo-sort { display: inline-flex; align-items: center; gap: 4px; padding: 0; border: 0; background: transparent; color: inherit; font: inherit; text-transform: inherit; letter-spacing: inherit; cursor: pointer; }
@media (max-width: 900px) { .mo-page .mo-split { grid-template-columns: minmax(0, 1fr); } .mo-page .mo-tree { max-height: 45vh; } }
@media (pointer: coarse) { .mo-page .mo-row { min-height: 40px; } }
</style>
