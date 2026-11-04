<template>
	<v-container fluid class="pa-0 workshop-theme mo-page" :style="pageStyle">
		<page-header icon="mdi-file-tree" :title="t('common.title')" :lead="t('common.lead')" :badge="BADGE" :reasons="headerReasons" :loading="!connected">
			<v-chip small outlined :title="t('model.rrf_chip_help')">{{ rrfText }}</v-chip>
			<v-chip small outlined :title="tierHelp">{{ tierText }}</v-chip>
			<template #startup><startup-panel plugin="WorkshopModel" :defs="rowsStartup" :service-row="false" :recheck="refreshPersist" /></template>
		</page-header>
		<div class="st-layout">
			<side-tabs v-model="section" :items="sections" />
			<div class="st-body">
				<error-notice :error="problem" class="mb-2" />
				<alert-banner :items="alertBannerItems()" @dismiss="dismissAlert" />
				<div v-if="tierNotice" class="mo-note mb-2" role="status"><v-icon small>mdi-information-outline</v-icon><span class="mo-note-text">{{ tierHelp }}</span></div>
				<tree-section
					v-if="section === 'tree'" :selected="selectedPath" :tick="tick" :paused="paused" :globals-ok="globals.ok" :can-edit="canEdit" :watched="watchedPaths" :persistent="persistentNames"
					:tracker="tracker" :tier="tier" :focus="treeFocus"
					@update:selected="selectedPath = $event" @update:paused="paused = $event" @watch="addWatch" @unwatch="removeWatch" @persist="setPersist"
					@clear-changes="clearModelChanges" @focused="treeFocus = ''" @test="openTester"
				/>
				<globals-section
					v-if="section === 'globals'" :tick="tick" :support="globals" :can-edit="canEdit" :persist="persistEntries" :config-includes="configIncludes" :watched="watchedPaths" :change-times="tracker.times" :usage-cache="usageCache"
					@select="openInTree" @watch="addWatch" @unwatch="removeWatch" @persist="setPersist" @update-persist="updatePersistValues" @scan-usage="openUsageScan"
				/>
				<favorites-section v-if="section === 'favorites'" :tick="tick" @select="openInTree" />
				<watch-section
					v-if="section === 'watch'" :tick="tick" :entries="watchEntries" :changes="changes" :track="trackChanges" :storage="watchStorage"
					@unwatch="removeWatch" @select="openInTree" @update:track="trackChanges = $event" @clear="changes = []"
				/>
				<presets-section v-if="section === 'presets'" :tick="tick" :support="globals" :can-edit="canEdit" />
				<usage-section v-if="section === 'usage'" :tick="tick" :tier="tier" :support="globals" :can-edit="canEdit" :cache="usageCache" :auto-scan="autoScan" @select="openInTree" @update:cache="setUsageCache" />
				<snapshots-section v-if="section === 'snapshots'" :tick="tick" :tier="tier" :can-edit="canEdit" :selected="selectedPath" @select="openInTree" />
				<alerts-section v-if="section === 'alerts'" :monitor="monitor" :watched="watchedPaths" @update-rules="setAlertRules" @update-sound="setAlertSound" @clear-events="clearAlertEvents" />
				<report-section v-if="section === 'report'" :tick="tick" />
				<tester-section v-if="section === 'tester'" :tick="tick" :connected="connected" :prefill="testerPrefill" />
			</div>
		</div>
	</v-container>
</template>

<script>
'use strict'

// The Model Explorer page (docs-internal/MODEL-EDITOR-DESIGN.md), DWC 3.6 line. It owns what the sections share: the tick (one
// sample per second of the model, paused on request; DWC 3.6 keeps the globals in a Map that Vue 2 does not observe, so the tick is
// what refreshes the screen), the selected path, the watch list with its samples, the recent changes, the persistence macro and
// the two run-time checks that switch functions on and off without any setting: the firmware version (rrf-version.js: globals
// need RRF 3.4) and the SBC tier (tier.js: model.sbc and the DSF version).
import i18n from '../../i18n'
import { liveModel, isConnected, readText, writeText } from './model-host.js'
import { scrollToPageTop } from './page-scroll.js'
import PageHeader from './PageHeader.vue' // header of every page (vue/_shared36)
import SideTabs from './SideTabs.vue' // sections in the side bar (vue/_shared36)
import StartupPanel from './StartupPanel.vue' // start-up card (vue/_shared36)
import ErrorNotice from './ErrorNotice.vue' // vue/_shared36
import TreeSection from './TreeSection.vue'
import GlobalsSection from './GlobalsSection.vue'
import WatchSection from './WatchSection.vue'
import FavoritesSection from './FavoritesSection.vue'
import { loadPins } from './pins.js'
import PresetsSection from './PresetsSection.vue'
import UsageSection from './UsageSection.vue'
import SnapshotsSection from './SnapshotsSection.vue'
import TesterSection from './TesterSection.vue'
import { roleMixin } from './role-mixin.js' // what the role may do (vue/_shared36)
import { sectionColor } from './section-colors.js'
import { navItems } from './look-nav.js'
import { rowsModel } from './startup-rows.js'
import { firmwareVersionOf, globalsSupport } from './rrf-version.js'
import { detectTier, WATCH_FILE } from './tier.js'
import { getAtPath } from './model-path.js'
import { childrenOf, childCount } from './model-tree.js'
import { formatValue, toPlain } from './value-format.js'
import { watchEntry, pushSample, serializeWatch, parseWatch, mergeWatch } from './watch-series.js'
import { watchFileText, readWatchFile } from './watch-file.js'
import { diffTexts, recordChanges } from './change-diff.js'
import { trackerState, trackTick, clearChanges } from './model-changes.js'
import { readMonitor, saveMonitor, monitorTick, setRules, setSound, dismiss, clearEvents, visibleBanner } from './alert-monitor.js'
import { shouldBeep, beep } from './alert-sound.js'
import AlertsSection from './AlertsSection.vue'
import AlertBanner from './AlertBanner.vue'
import ReportSection from './ReportSection.vue'
import { PERSIST_MACRO, parsePersistMacro, generatePersistMacro, configIncludes as macroIncluded, withEntry } from './persist-macro.js'
import { rrfLiteral } from './globals-typing.js'

const TICK_MS = 1000
const LOCAL_KEY = 'workshopModelWatch'
const CONFIG_FILE = '0:/sys/config.g'
// the badge color of this plugin (blue grey, 7:1 with the white icon); the same value belongs in vue/_shared/plugin-colors.js
const BADGE = '#455a64'

function globalTexts(model) {
	const m = new Map()
	for (const c of childrenOf(model && model.global)) m.set('global.' + c.key, formatValue(c.value))
	return m
}

export default {
	components: { PageHeader, SideTabs, StartupPanel, ErrorNotice, TreeSection, GlobalsSection, WatchSection, FavoritesSection, PresetsSection, UsageSection, SnapshotsSection, TesterSection, AlertsSection, AlertBanner, ReportSection },
	mixins: [roleMixin],
	data() {
		return {
			section: 'tree', autoScan: false, tick: 0, paused: false, selectedPath: '', watchEntries: [], changes: [], trackChanges: true,
			persistEntries: null, configIncludes: null, problem: null, BADGE, treeFocus: '', testerPrefill: ''
		}
	},
	computed: {
		pageStyle() {
			return { '--wf-badge': BADGE, '--wf-sec': sectionColor(this.section) }
		},
		// ---- what the run time decides (no settings) ----
		connected() {
			void this.tick
			return isConnected()
		},
		firmware() {
			void this.tick
			return firmwareVersionOf(liveModel())
		},
		globals() {
			return globalsSupport(this.firmware)
		},
		tier() {
			void this.tick
			return detectTier(liveModel())
		},
		canEdit() {
			return this.atLeast('technician')
		},
		// the side bar (look-nav.js): the sections in short groups, a hint each and a count where it helps
		sections() {
			void this.tick
			const m = liveModel()
			return navItems(k => this.t('model.' + k), { globals: childCount(m && m.global), watched: this.watchEntries.length, alerts: this.alertBannerItems().length, favorites: this.favoriteCount() })
		},
		watchedPaths() {
			return this.watchEntries.map(e => e.path)
		},
		persistentNames() {
			return (this.persistEntries || []).map(e => e.name)
		},
		watchStorage() {
			return this.tier.extras ? 'sbc' : 'browser'
		},
		rrfText() {
			return this.firmware ? this.t('model.rrf_chip', { version: this.firmware }) : this.t('model.rrf_unknown')
		},
		// the chip says what the page does by itself (SBC mode, its extras on or off); the word companion is kept for the plugin of the Pi
		tierText() {
			return this.tier.sbc ? this.t(this.tier.extras ? 'model.tier_sbc' : 'model.tier_sbc_off') : this.t('model.tier_standalone')
		},
		tierHelp() {
			const tr = this.tier
			if (tr.extras) return this.t('model.tier_help_on', { version: tr.dsfVersion }) + (tr.companion.running ? ' ' + this.t('model.companion_running') : '')
			return this.t('model.tier_off_' + tr.reason, { version: tr.dsfVersion || '-', minimum: tr.minimum })
		},
		// a standalone Duet is the normal case and says nothing in the body (the chip in the bar is enough); an SBC with its extras off has
		// something the person can act on, so it gets a line
		tierNotice() {
			return !this.tier.extras && this.tier.sbc
		},
		headerReasons() {
			const g = this.globals
			return g.known && !g.ok ? [{ level: 'warn', text: this.t('model.reason_globals_off', { version: g.version, minimum: g.minimum }) }] : []
		},
		rowsStartup() {
			return rowsModel({
				connected: this.connected, firmware: this.firmware, globalsOk: this.globals.ok,
				persistCount: (this.persistEntries || []).length, configIncludes: this.configIncludes, sbc: this.tier.sbc, extras: this.tier.extras,
				companion: this.tier.companion
			})
		}
	},
	watch: {
		connected(on) {
			if (on) this.refreshPersist()
		},
		'globals.ok'(ok) {
			if (ok) this.refreshPersist()
		},
		'tier.extras'(on) {
			if (on) this.loadWatchFile()
		}
	},
	created() {
		this.prevGlobals = null
		// the whole model, flattened once per sample, with its changes (model-changes.js); not reactive on purpose: the tick refreshes the views
		this.tracker = trackerState()
		// what the usage finder already read (usage-runner.js); in the watch file with the SBC tier only; not reactive on purpose
		this.usageCache = new Map()
		// the in-page alerts (alert-monitor.js): only while the page is open; not reactive on purpose, the tick refreshes the views
		this.monitor = readMonitor(typeof localStorage === 'undefined' ? null : localStorage)
		this.timer = null
		this.fileLoaded = false
	},
	mounted() {
		this.loadWatchLocal()
		this.timer = setInterval(this.onTick, TICK_MS)
		this.refreshPersist()
		if (this.tier.extras) this.loadWatchFile()
	},
	beforeDestroy() {
		clearInterval(this.timer)
		this.saveWatchLocal()
	},
	methods: {
		t(k, p) {
			return i18n.t('plugins.WorkshopModel.' + k, p)
		},
		// ---- the tick: samples of the watched paths and the changes of the globals ----
		sample() {
			const model = liveModel()
			const now = Date.now()
			let found = []
			for (const e of this.watchEntries) {
				const before = e.text
				pushSample(e, now, getAtPath(model, e.path))
				if (before !== '' && before !== e.text) found.push({ path: e.path, before, after: e.text })
			}
			const g = globalTexts(model)
			if (this.prevGlobals) found = found.concat(diffTexts(this.prevGlobals, g).filter(c => !found.some(f => f.path === c.path)))
			this.prevGlobals = g
			if (this.trackChanges && found.length) this.changes = recordChanges(this.changes, found, now)
			this.tracker = trackTick(this.tracker, model, now)
			this.runAlerts(model, now)
			if (this.tick % 5 === 0) this.saveWatchLocal()
			if (this.tick % 30 === 0 && this.tier.extras && this.watchEntries.length) this.saveWatchFile()
		},
		// ---- the in-page alerts: evaluated every sample, whichever section is open ----
		runAlerts(model, now) {
			this.monitor = monitorTick(this.monitor, model, now)
			if (shouldBeep(this.monitor) && typeof window !== 'undefined') beep(window)
		},
		alertBannerItems() {
			return visibleBanner(this.monitor)
		},
		keepMonitor(next) {
			this.monitor = next
			saveMonitor(typeof localStorage === 'undefined' ? null : localStorage, next)
			this.$forceUpdate()
		},
		setAlertRules(rules) {
			this.keepMonitor(setRules(this.monitor, rules))
		},
		setAlertSound(on) {
			this.keepMonitor(setSound(this.monitor, on))
		},
		dismissAlert(id) {
			this.monitor = dismiss(this.monitor, id)
			this.$forceUpdate()
		},
		clearAlertEvents() {
			this.monitor = clearEvents(this.monitor)
			this.$forceUpdate()
		},
		onTick() {
			this.tick++
			if (!this.paused) this.sample()
		},
		// ---- watch list storage: this browser always; the machine file as well with the SBC tier ----
		saveWatchLocal() {
			try {
				localStorage.setItem(LOCAL_KEY, JSON.stringify(serializeWatch(this.watchEntries)))
			} catch (e) {
				/* no storage: the list lives while the page is open */
			}
		},
		loadWatchLocal() {
			try {
				this.watchEntries = parseWatch(localStorage.getItem(LOCAL_KEY) || '')
			} catch (e) {
				this.watchEntries = []
			}
		},
		async saveWatchFile() {
			try {
				await writeText(WATCH_FILE, watchFileText(this.watchEntries, this.usageCache))
			} catch (e) {
				this.problem = e
			}
		},
		async loadWatchFile() {
			if (this.fileLoaded) return
			this.fileLoaded = true
			try {
				const text = await readText(WATCH_FILE)
				if (!text) return
				const saved = readWatchFile(text)
				this.watchEntries = mergeWatch(this.watchEntries, saved.entries)
				if (!this.usageCache.size) this.usageCache = saved.usageCache
			} catch (e) {
				this.problem = e
			}
		},
		setUsageCache(cache) {
			this.usageCache = cache
			if (this.tier.extras) this.saveWatchFile()
		},
		addWatch(path) {
			if (!path || this.watchedPaths.indexOf(path) >= 0) return
			const e = watchEntry(path)
			pushSample(e, Date.now(), getAtPath(liveModel(), path))
			this.watchEntries = this.watchEntries.concat([e])
			this.saveWatchLocal()
		},
		removeWatch(path) {
			this.watchEntries = this.watchEntries.filter(e => e.path !== path)
			this.saveWatchLocal()
		},
		// ---- the persistence macro (persist-macro.js) ----
		async refreshPersist() {
			if (!this.connected || !this.globals.ok) return
			try {
				const text = await readText(PERSIST_MACRO)
				this.persistEntries = text === null ? [] : parsePersistMacro(text)
				const cfg = await readText(CONFIG_FILE)
				this.configIncludes = cfg === null ? null : macroIncluded(cfg)
			} catch (e) {
				this.problem = e
			}
		},
		async writePersist(entries) {
			try {
				await writeText(PERSIST_MACRO, generatePersistMacro(entries))
				this.persistEntries = entries
			} catch (e) {
				this.problem = e
			}
		},
		setPersist(name, literal) {
			return this.writePersist(withEntry(this.persistEntries || [], name, literal))
		},
		// the saved values of every persistent global become the live ones
		updatePersistValues() {
			const g = liveModel().global
			const next = (this.persistEntries || []).map(e => {
				const v = getAtPath(g, e.name)
				return v === undefined ? e : { name: e.name, literal: rrfLiteral(toPlain(v)) }
			})
			return this.writePersist(next)
		},
		// "Buscar dónde se usa" on a global card: the usage page opens and the search starts by itself
		// how many paths are starred (the count next to Favoritos in the side bar; the list is the one of pins.js)
		favoriteCount() {
			return loadPins(typeof localStorage === 'undefined' ? null : localStorage).length
		},
		openUsageScan() {
			this.autoScan = true
			this.section = 'usage'
			this.$nextTick(() => scrollToPageTop())
		},
		openInTree(path) {
			this.selectedPath = path
			this.treeFocus = path
			this.section = 'tree'
			this.$nextTick(() => scrollToPageTop())
		},
		openTester(path) {
			this.testerPrefill = path
			this.section = 'tester'
		},
		clearModelChanges() {
			this.tracker = clearChanges(this.tracker)
		}
	}
}
</script>

<style>
/* Only the content of this plugin (prefix mo-): the bar, the menu, the cards and the buttons are design/family.css. */
.mo-page { scroll-margin-top: 72px; }
.mo-page .mo-part { font-size: 14px; font-weight: 600; margin-bottom: 4px; display: flex; align-items: center; }
.mo-page .mo-faint { color: var(--tp-faint); font-size: 12px; }
.mo-page .mo-error { color: var(--tp-red-bright, #ef9a9a); font-size: 13px; margin: 4px 0; }
.mo-page .mo-warn { font-size: 13px; }
.mo-page .mo-ok { font-size: 13px; }
.mo-page .mo-off { border: 1px solid var(--tp-orange-bright, #ffb74d); border-radius: 10px; padding: 8px 12px; font-size: 13px; }
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
.mo-page .mo-row.mo-revealed { animation: mo-reveal 1.5s ease-out; }
@keyframes mo-reveal { 0% { outline: 2px solid var(--v-primary-base, #1976d2); outline-offset: -2px; } 100% { outline: 2px solid transparent; outline-offset: -2px; } }
@media (prefers-reduced-motion: reduce) { .mo-page .mo-row.mo-revealed { animation: none; outline: 2px solid var(--v-primary-base, #1976d2); outline-offset: -2px; } }
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
.mo-page .mo-result-bad { color: var(--tp-red-bright, #ef9a9a); }
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
.mo-page .mo-usage-row { border-bottom: 1px solid rgba(128, 128, 128, 0.15); }
.mo-page .mo-usage-line { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 12px; width: 100%; min-height: 36px; padding: 4px 6px; border: 0; background: transparent; color: inherit; font: inherit; text-align: left; cursor: pointer; }
.mo-page .mo-usage-line:hover { background: rgba(128, 128, 128, 0.1); }
.mo-page .mo-usage-name { font-weight: 600; }
.mo-page .mo-usage-refs { margin: 4px 0 8px 28px; }
.mo-page .mo-ucards { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; margin-bottom: 8px; }
.mo-page .mo-ucard { --mo-tone: var(--wf-info); display: flex; flex-direction: column; align-items: flex-start; gap: 2px; padding: 14px 16px; text-align: left; color: inherit; font: inherit; cursor: pointer; border: 2px solid rgba(128, 128, 128, 0.3); border-left: 6px solid var(--mo-tone); border-radius: 12px; background: rgba(128, 128, 128, 0.06); transition: transform 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease, border-color 0.15s ease; }
.mo-page .mo-ucard.tone-err { --mo-tone: var(--wf-err); }
.mo-page .mo-ucard.tone-warn { --mo-tone: var(--wf-warn); }
.mo-page .mo-ucard.tone-ok { --mo-tone: var(--wf-ok); }
.mo-page .mo-ucard:hover { transform: translateY(-2px); box-shadow: 0 4px 14px rgba(0, 0, 0, 0.18); }
.mo-page .mo-ucard:focus-visible, .mo-page .mo-uline:focus-visible, .mo-page .mo-ufile:focus-visible, .mo-page .mo-uline-chip:focus-visible { outline: 3px solid var(--mo-tone, var(--wf-info)); outline-offset: 2px; }
.mo-page .mo-ucard[aria-pressed="true"] { border-color: var(--mo-tone); background: color-mix(in srgb, var(--mo-tone) 14%, transparent); }
.mo-page .mo-ucard-top { display: flex; align-items: center; gap: 6px; font-weight: 600; }
.mo-page .mo-ucard-top .v-icon { color: var(--mo-tone); }
.mo-page .mo-ucard-n { font-size: 40px; font-weight: 700; line-height: 1.1; color: var(--mo-tone); }
.mo-page .mo-ucard-say { font-size: 12px; color: var(--tp-faint); }
.mo-page .mo-uline { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 12px; width: 100%; min-height: 44px; padding: 6px 8px; border: 0; border-radius: 6px; background: transparent; color: inherit; font: inherit; text-align: left; cursor: pointer; transition: background-color 0.12s ease; }
.mo-page .mo-uline:hover { background: rgba(128, 128, 128, 0.12); }
.mo-page .mo-urow { border-bottom: 1px solid rgba(128, 128, 128, 0.15); }
.mo-page .mo-uchips { display: inline-flex; gap: 8px; }
.mo-page .mo-uchip { display: inline-flex; flex-direction: column; gap: 2px; min-width: 78px; font-size: 11px; }
.mo-page .mo-uchip.zero { opacity: 0.45; }
.mo-page .mo-uchip-track { display: block; height: 5px; border-radius: 3px; background: rgba(128, 128, 128, 0.2); overflow: hidden; }
.mo-page .mo-uchip-bar { display: block; height: 100%; border-radius: 3px; transform-origin: left; animation: mo-ugrow 0.5s ease-out; }
.mo-page .mo-uchip.k-define .mo-uchip-bar, .mo-page .mo-uline-chip.k-define { background: rgba(46, 160, 67, 0.75); }
.mo-page .mo-uchip.k-set .mo-uchip-bar, .mo-page .mo-uline-chip.k-set { background: rgba(255, 143, 0, 0.75); }
.mo-page .mo-uchip.k-read .mo-uchip-bar, .mo-page .mo-uline-chip.k-read { background: rgba(25, 118, 210, 0.75); }
.mo-page .mo-usage-phrase { flex: 1 1 220px; }
.mo-page .mo-udetail { margin: 2px 8px 10px 28px; }
.mo-page .mo-udetail-head { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 6px 12px; margin-bottom: 6px; }
.mo-page .mo-udetail-actions { display: inline-flex; flex-wrap: wrap; gap: 6px; }
.mo-page .mo-udetail-file { margin-bottom: 8px; }
.mo-page .mo-udetail-lines { display: inline-flex; flex-wrap: wrap; gap: 4px 6px; }
.mo-page .mo-uline-chip { padding: 2px 10px; border: 0; border-radius: 12px; color: inherit; font: inherit; font-size: 12px; cursor: pointer; transition: transform 0.12s ease, filter 0.12s ease; }
.mo-page .mo-uline-chip:hover { transform: translateY(-1px); filter: brightness(1.15); }
.mo-page .mo-ubanner { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 14px; margin-bottom: 12px; padding: 12px 14px; border: 1px solid var(--wf-warn); border-left-width: 6px; border-radius: 12px; background: rgba(255, 143, 0, 0.08); }
.mo-page .mo-ubanner-icon { color: var(--wf-warn); }
.mo-page .mo-ubanner-text { flex: 1 1 260px; min-width: 0; }
.mo-page .mo-ubanner-title { font-weight: 600; }
.mo-page .mo-uempty { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 28px 12px; text-align: center; }
.mo-page .mo-uempty-title { font-size: 18px; font-weight: 600; }
.mo-page .mo-uclear-icon { color: var(--wf-ok); animation: mo-upop 0.5s ease-out; }
.mo-page .mo-ubyfile { display: grid; grid-template-columns: minmax(220px, 1fr) minmax(0, 2fr); gap: 14px; margin-top: 8px; }
.mo-page .mo-ufiles { display: flex; flex-direction: column; gap: 4px; max-height: 60vh; overflow: auto; }
.mo-page .mo-ufile { display: flex; flex-direction: column; align-items: flex-start; gap: 2px; padding: 6px 10px; border: 1px solid rgba(128, 128, 128, 0.25); border-radius: 8px; background: transparent; color: inherit; font: inherit; text-align: left; cursor: pointer; transition: background-color 0.12s ease, border-color 0.12s ease; }
.mo-page .mo-ufile:hover { background: rgba(128, 128, 128, 0.12); }
.mo-page .mo-ufile[aria-pressed="true"] { border-color: var(--wf-info); background: color-mix(in srgb, var(--wf-info) 14%, transparent); }
.mo-page .mo-ufilerow { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 12px; padding: 6px 0; border-bottom: 1px solid rgba(128, 128, 128, 0.15); }
.mo-page .mo-uoptions { margin-top: 10px; }
.mo-page .mo-uopt-block { margin-top: 10px; padding: 10px 12px; border-radius: 8px; background: rgba(128, 128, 128, 0.07); opacity: 1; }
.mo-page .mo-uprogress { margin-top: 10px; }
.mo-page .mo-uprogress-file { margin-top: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.mo-page .mo-utab { margin-top: 10px; }
.mo-page .mo-ufade { animation: mo-ufade 0.22s ease-out; }
@keyframes mo-ufade { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }
@keyframes mo-ugrow { from { transform: scaleX(0); } to { transform: scaleX(1); } }
@keyframes mo-upop { 0% { transform: scale(0.4); opacity: 0; } 70% { transform: scale(1.15); } 100% { transform: scale(1); opacity: 1; } }
@media (prefers-reduced-motion: reduce) { .mo-page .mo-ucard, .mo-page .mo-uline, .mo-page .mo-ufile, .mo-page .mo-uline-chip { transition: none; } .mo-page .mo-ucard:hover, .mo-page .mo-uline-chip:hover { transform: none; } .mo-page .mo-ufade, .mo-page .mo-uchip-bar, .mo-page .mo-uclear-icon { animation: none; } }
@media (max-width: 900px) { .mo-page .mo-ubyfile { grid-template-columns: minmax(0, 1fr); } .mo-page .mo-udetail { margin-left: 8px; } }
.mo-page .mo-sort { display: inline-flex; align-items: center; gap: 4px; padding: 0; border: 0; background: transparent; color: inherit; font: inherit; text-transform: inherit; letter-spacing: inherit; cursor: pointer; }
@media (max-width: 900px) { .mo-page .mo-split { grid-template-columns: minmax(0, 1fr); } .mo-page .mo-tree { max-height: 45vh; } }
@media (pointer: coarse) { .mo-page .mo-row { min-height: 40px; } }
</style>
