<template>
	<div :class="'mo-density-' + density">
		<v-card class="mb-3">
			<v-card-text>
				<div class="mo-head">
					<span class="mo-head-icon"><v-icon>mdi-variable</v-icon></span>
					<div class="mo-head-text">
						<h2 class="mo-head-title">{{ t('globals_title') }}</h2>
						<p class="mo-head-lead">{{ t('look_globals_lead') }}</p>
					</div>
					<div v-if="support.ok && total" class="mo-head-right">
						<span class="mo-pill">{{ t('look_globals_count', { n: stats.total }) }}</span>
						<span v-if="stats.kept" class="mo-pill mo-pill-dot ok" :title="t('persist_help')">{{ t('look_globals_kept_n', { n: stats.kept }) }}</span>
						<span v-if="stats.watched" class="mo-pill mo-pill-dot info">{{ t('look_globals_watched_n', { n: stats.watched }) }}</span>
					</div>
				</div>
				<div v-if="!support.ok" class="mo-empty" role="status">
					<v-icon class="mo-empty-icon">mdi-chip</v-icon>
					<div class="mo-empty-title">{{ t('look_globals_off_title') }}</div>
					<div class="mo-empty-text">{{ offText }}</div>
				</div>
				<template v-else>
					<div v-if="!total" class="mo-empty">
						<v-icon class="mo-empty-icon">mdi-variable</v-icon>
						<div class="mo-empty-title">{{ t('look_globals_empty_title') }}</div>
						<div class="mo-empty-text">{{ t('look_globals_empty_text') }}</div>
						<div class="mo-empty-actions">
							<v-btn v-if="canEdit" size="small" variant="flat" color="primary" @click="creating = true"><v-icon size="small" start>mdi-plus</v-icon>{{ t('look_globals_empty_action') }}</v-btn>
						</div>
						<div class="mo-empty-text mo-faint">{{ t('look_globals_empty_config') }}</div>
					</div>
					<template v-else>
						<pinned-strip v-if="starred.length" :pinned="pinned" :tick="tick" only="global." class="mb-2" @select="showOne" @open="emit('select', $event)" @unpin="unpin" />
						<div class="mo-gtools">
							<v-text-field v-model="query" density="compact" variant="outlined" hide-details clearable prepend-inner-icon="mdi-magnify" class="mo-search" :label="t('look_globals_search')" :placeholder="t('look_globals_search_hint')" />
							<v-btn v-if="canEdit" size="small" variant="flat" color="primary" @click="creating = true"><v-icon size="small" start>mdi-plus</v-icon>{{ t('look_globals_new') }}</v-btn>
						</div>
						<div class="mo-gchips" role="group" :aria-label="t('look_globals_filter_label')">
							<span class="mo-gchips-label">{{ t('look_globals_filter_label') }}</span>
							<button type="button" class="mo-gchip" :aria-pressed="filtered ? 'false' : 'true'" @click="clearFilters">{{ t('look_globals_all') }}</button>
							<button v-for="g in KIND_GROUPS" :key="g.id" type="button" class="wf-cat" :aria-pressed="groups.indexOf(g.id) >= 0 ? 'true' : 'false'" @click="toggleGroup(g.id)">{{ t('look_group_' + g.id) }}</button>
							<button v-for="s in STATE_CHIPS" :key="s" type="button" class="mo-gchip" :aria-pressed="state[s] ? 'true' : 'false'" :title="t(S[s].what)" @click="state[s] = !state[s]">
								<v-icon size="small">{{ STATE_ICONS[s] }}</v-icon>{{ t('look_chip_' + s) }}
							</button>
							<button type="button" class="mo-gchip mo-gchip-sort" :title="t('look_sort_help')" :aria-label="t('look_sort_help')" @click="sort = nextSort(sort)">
								<v-icon size="small">mdi-sort</v-icon>{{ t('look_sort_chip', { by: t('globals_sort_' + sort) }) }}
							</button>
						</div>
						<choice-help v-if="canEdit" :choice="S.quick" :title="t(S.quick.label)" class="mb-2" />
						<div v-if="!shown.length" class="mo-empty mo-empty-small" role="status">
							<div class="mo-empty-title">{{ t('look_globals_nomatch_title') }}</div>
							<div class="mo-empty-text">{{ t('look_globals_nomatch_text') }}</div>
							<div class="mo-empty-actions"><v-btn size="small" variant="outlined" @click="clearFilters">{{ t('look_filters_clear') }}</v-btn></div>
						</div>
						<section v-for="g in grouped" :key="g.id" class="mo-ggroup">
							<button type="button" class="mo-ggroup-head" :aria-expanded="folded.indexOf(g.id) >= 0 ? 'false' : 'true'" @click="fold(g.id)">
								<v-icon size="small">{{ folded.indexOf(g.id) >= 0 ? 'mdi-chevron-right' : 'mdi-chevron-down' }}</v-icon>
								<span class="mo-ggroup-name">{{ t('globals_group', { name: g.id === OTHER ? t('globals_other') : g.id, n: g.items.length }) }}</span>
							</button>
							<div v-if="folded.indexOf(g.id) < 0" class="mo-ggrid">
								<global-row
									v-for="it in g.items" :key="it.name" :item="it" :pinned="pinned" :can-edit="canEdit" :globals-ok="support.ok" :tick="tick" :usage-cache="usageCache"
									@select="emit('select', $event)" @watch="emit('watch', $event)" @unwatch="emit('unwatch', $event)" @pin="pin" @unpin="unpin" @persist="(n, l) => emit('persist', n, l)"
								/>
							</div>
						</section>
					</template>
					<div v-if="!canEdit" class="mo-note mt-2" role="status"><v-icon size="small">mdi-eye-outline</v-icon><span class="mo-note-text">{{ t('look_globals_readonly') }}</span></div>
				</template>
			</v-card-text>
		</v-card>
		<persist-panel v-if="support.ok" :persist="persist" :config-includes="configIncludes" :attention="attention" :can-edit="canEdit" @update-persist="emit('update-persist')" />
		<v-dialog v-model="creating" max-width="720" scrollable>
			<global-creator v-if="creating" :can-edit="canEdit" :globals-ok="support.ok" :existing="names" @close="creating = false" />
		</v-dialog>
	</div>
</template>

<script setup>
// The globals of the machine, friendly at first sight (2026-11-03): one head with the counts, one search and one New button, a row
// of chips (all, the kinds, kept across reboots, watched, changed recently, and the order that cycles on a tap: globals-filter.js,
// globals-quick.js), groups by the start of the name that fold and are remembered (globals-groups.js), one card per global with a
// big value and the quick edit in place (GlobalRow.vue; tidy rows in the compact density), an empty state that says what a global is
// and opens the guided creator (GlobalCreator.vue), and the persistence macro as a panel that opens by itself only when it needs the
// person (PersistPanel.vue). Density and favourites are the ones of the Model section (density.js, pins.js). On a board older than
// RRF 3.4 the card says why it is off and offers nothing (rrf-version.js).
import { computed, reactive, ref } from 'vue'
import { i18n } from './dwc-host.js'
import { liveModel } from './model-host.js'
import GlobalCreator from './GlobalCreator.vue'
import GlobalRow from './GlobalRow.vue'
import PersistPanel from './PersistPanel.vue'
import PinnedStrip from './PinnedStrip.vue'
import ChoiceHelp from './ChoiceHelp.vue'
import { KIND_GROUPS } from './flat-list.js'
import { GLOBALS_SETTINGS, globalItems, filterGlobals, sortGlobals } from './globals-filter.js'
import { OTHER, groupNames, readFolded, saveFolded, toggleFolded } from './globals-groups.js'
import { STATE_CHIPS, globalsStats, nextSort, activeFilters } from './globals-quick.js'
import { persistAttention } from './persist-macro.js'
import { usageCounts } from './usage-view.js'
import { loadPins, savePins, addPin, removePin } from './pins.js'
import { loadDensity } from './density.js'

const STATE_ICONS = { persistent: 'mdi-content-save-outline', watched: 'mdi-eye-outline', changed: 'mdi-clock-fast' }

const props = defineProps({
	tick: { type: Number, default: 0 },
	support: { type: Object, default: () => ({ ok: false, known: false }) },
	canEdit: { type: Boolean, default: true },
	persist: { type: Array, default: null },
	configIncludes: { type: Boolean, default: null },
	watched: { type: Array, default: () => [] },
	changeTimes: { type: Map, default: () => new Map() },
	usageCache: { type: Map, default: () => new Map() }
})
const emit = defineEmits(['select', 'watch', 'unwatch', 'persist', 'update-persist'])

const S = GLOBALS_SETTINGS
const t = (k, p) => i18n.t('plugins.WorkshopModel.model.' + k, p)
const storage = () => (typeof localStorage === 'undefined' ? null : localStorage)

const query = ref('')
const sort = ref('name')
const groups = ref([])
const state = reactive({ persistent: false, watched: false, changed: false })
const creating = ref(false)
const folded = ref(readFolded(storage()))
const pinned = ref(loadPins(storage()))
const density = loadDensity(storage())

const offText = computed(() => (props.support.known ? t('globals_off_rrf', { version: props.support.version, minimum: props.support.minimum }) : t('globals_off_unknown')))
const used = computed(() => usageCounts(props.usageCache))
const liveGlobals = () => {
	const m = liveModel()
	return m && m.global
}
const items = computed(() => {
	void props.tick
	return globalItems(liveGlobals(), { persistent: (props.persist || []).map(e => e.name), watched: props.watched, pinned: pinned.value, times: props.changeTimes, used: used.value.size ? used.value : null })
})
const total = computed(() => items.value.length)
const names = computed(() => items.value.map(it => it.name))
// the starred globals, shown on top in the same strip as the favourites of the Model section (one list, pins.js)
const starred = computed(() => pinned.value.filter(p => p.indexOf('global.') === 0))
const stats = computed(() => globalsStats(items.value, Date.now()))
const filtered = computed(() => activeFilters({ query: query.value, groups: groups.value, persistent: state.persistent, watched: state.watched, changed: state.changed }).length > 0)
const shown = computed(() => sortGlobals(filterGlobals(items.value, { query: query.value, groups: groups.value, onlyPersistent: state.persistent, onlyChanged: state.changed, onlyWatched: state.watched, now: Date.now() }), sort.value))
const grouped = computed(() => {
	const byName = new Map(shown.value.map(it => [it.name, it]))
	return groupNames(shown.value.map(it => it.name)).map(g => ({ id: g.id, items: g.names.map(n => byName.get(n)) }))
})
const attention = computed(() => {
	void props.tick
	return persistAttention(props.persist || [], liveGlobals(), props.configIncludes)
})

function toggleGroup(id) {
	groups.value = groups.value.indexOf(id) >= 0 ? groups.value.filter(g => g !== id) : groups.value.concat([id])
}
function clearFilters() {
	query.value = ''
	groups.value = []
	for (const s of STATE_CHIPS) state[s] = false
}
// a tap on a favourite global narrows the list to it
function showOne(path) {
	clearFilters()
	query.value = path.replace(/^global\./, '')
}
function fold(id) {
	folded.value = toggleFolded(folded.value, id)
	saveFolded(storage(), folded.value)
}
function pin(path) {
	pinned.value = addPin(pinned.value, path)
	savePins(storage(), pinned.value)
}
function unpin(path) {
	pinned.value = removePin(pinned.value, path)
	savePins(storage(), pinned.value)
}
</script>
