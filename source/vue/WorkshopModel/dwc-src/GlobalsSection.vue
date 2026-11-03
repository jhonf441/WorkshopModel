<template>
	<div :class="'mo-density-' + density">
		<v-card class="mb-3">
			<v-card-text>
				<div class="mo-part"><v-icon size="20" class="mr-1">mdi-variable</v-icon>{{ t('globals_title') }}</div>
				<div class="mo-faint mb-2">{{ t('globals_help') }}</div>
				<div v-if="!support.ok" class="mo-off" role="status">{{ offText }}</div>
				<template v-else>
					<div class="mo-toolbar">
						<v-text-field v-model="query" density="compact" variant="outlined" hide-details clearable prepend-inner-icon="mdi-magnify" class="mo-search" :label="t('flat_filter')" :placeholder="t('flat_filter_hint')" />
						<v-select v-model="sort" :items="sortItems" item-title="title" item-value="value" density="compact" variant="outlined" hide-details class="mo-field-type" :label="t(S.sort.label)" :title="t(S.sort.what)" />
						<v-btn v-if="canEdit" size="small" variant="flat" color="primary" @click="creating = true"><v-icon size="small" start>mdi-plus</v-icon>{{ t('globals_create') }}</v-btn>
					</div>
					<div class="mo-flat-filters" role="group" :aria-label="t('flat_types')">
						<button v-for="g in KIND_GROUPS" :key="g.id" type="button" class="wf-cat" :aria-pressed="groups.indexOf(g.id) >= 0 ? 'true' : 'false'" @click="toggleGroup(g.id)">{{ t('group_' + g.id) }}</button>
						<v-switch v-model="onlyPersistent" density="compact" color="primary" hide-details :label="t(S.persistent.label)" :title="t(S.persistent.what)" />
						<v-switch v-model="onlyChanged" density="compact" color="primary" hide-details :label="t(S.changed.label)" :title="t(S.changed.what)" />
						<v-switch v-model="onlyWatched" density="compact" color="primary" hide-details :label="t(S.watched.label)" :title="t(S.watched.what)" />
					</div>
					<choice-help v-if="canEdit" :choice="S.quick" :title="t(S.quick.label)" class="mb-2" />
					<div v-if="!total" class="mo-faint">{{ t('globals_none') }}</div>
					<div v-else-if="!shown.length" class="mo-faint">{{ t('globals_none_match') }}</div>
					<section v-for="g in grouped" :key="g.id" class="mo-ggroup">
						<button type="button" class="mo-ggroup-head" :aria-expanded="folded.indexOf(g.id) >= 0 ? 'false' : 'true'" @click="fold(g.id)">
							<v-icon size="small">{{ folded.indexOf(g.id) >= 0 ? 'mdi-chevron-right' : 'mdi-chevron-down' }}</v-icon>{{ t('globals_group', { name: g.id === OTHER ? t('globals_other') : g.id, n: g.items.length }) }}
						</button>
						<template v-if="folded.indexOf(g.id) < 0">
							<global-row
								v-for="it in g.items" :key="it.name" :item="it" :pinned="pinned" :can-edit="canEdit" :globals-ok="support.ok"
								@select="emit('select', $event)" @watch="emit('watch', $event)" @unwatch="emit('unwatch', $event)" @pin="pin" @unpin="unpin" @persist="(n, l) => emit('persist', n, l)"
							/>
						</template>
					</section>
					<div v-if="!canEdit" class="mo-faint mt-2">{{ t('read_only') }}</div>
				</template>
			</v-card-text>
		</v-card>
		<persist-panel v-if="support.ok" :persist="persist" :config-includes="configIncludes" :attention="attention" :can-edit="canEdit" @update-persist="emit('update-persist')" />
		<v-dialog v-model="creating" max-width="640">
			<v-card>
				<v-card-text>
					<div class="mo-part"><v-icon size="20" class="mr-1">mdi-plus-box-outline</v-icon>{{ t('globals_create') }}</div>
					<div class="mo-faint mb-2">{{ t('create_help') }}</div>
					<global-editor name="" :exists="false" :value="null" :can-edit="canEdit" :globals-ok="support.ok" :persistent="false" :show-persist="false" />
					<div class="mo-actions"><v-btn size="small" variant="text" @click="creating = false">{{ t('close') }}</v-btn></div>
				</v-card-text>
			</v-card>
		</v-dialog>
	</div>
</template>

<script setup>
// The globals of the machine (design items 1, 5, 6, 10), reworked: a search, filters (kind, kept, changed in the last minute,
// watched) and a sort (globals-filter.js), groups by the start of the name that fold and are remembered (globals-groups.js), one clean
// row per global with a quick edit and one menu (GlobalRow.vue), creation in a dialog with the typed editor, and the persistence macro
// as a panel that opens by itself only when it needs the person (PersistPanel.vue). Density and favourites are the ones of the Model
// section (density.js, pins.js). On a board older than RRF 3.4 the card says why it is off and offers nothing (rrf-version.js).
import { computed, ref } from 'vue'
import { i18n } from './dwc-host.js'
import { liveModel } from './model-host.js'
import GlobalEditor from './GlobalEditor.vue'
import GlobalRow from './GlobalRow.vue'
import PersistPanel from './PersistPanel.vue'
import ChoiceHelp from './ChoiceHelp.vue'
import { KIND_GROUPS } from './flat-list.js'
import { GLOBALS_SETTINGS, GLOBAL_SORTS, globalItems, filterGlobals, sortGlobals } from './globals-filter.js'
import { OTHER, groupNames, readFolded, saveFolded, toggleFolded } from './globals-groups.js'
import { persistAttention } from './persist-macro.js'
import { usageCounts } from './usage-view.js'
import { loadPins, savePins, addPin, removePin } from './pins.js'
import { loadDensity } from './density.js'

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
const onlyPersistent = ref(false)
const onlyChanged = ref(false)
const onlyWatched = ref(false)
const creating = ref(false)
const folded = ref(readFolded(storage()))
const pinned = ref(loadPins(storage()))
const density = loadDensity(storage())

const offText = computed(() => (props.support.known ? t('globals_off_rrf', { version: props.support.version, minimum: props.support.minimum }) : t('globals_off_unknown')))
const sortItems = computed(() => GLOBAL_SORTS.map(v => ({ value: v, title: t('globals_sort_' + v) })))
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
const shown = computed(() => sortGlobals(filterGlobals(items.value, { query: query.value, groups: groups.value, onlyPersistent: onlyPersistent.value, onlyChanged: onlyChanged.value, onlyWatched: onlyWatched.value, now: Date.now() }), sort.value))
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
