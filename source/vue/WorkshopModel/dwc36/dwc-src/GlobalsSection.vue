<template>
	<div :class="'mo-density-' + density">
		<v-card class="mb-3">
			<v-card-text>
				<div class="mo-part"><v-icon :size="20" class="mr-1">mdi-variable</v-icon>{{ t('globals_title') }}</div>
				<div class="mo-faint mb-2">{{ t('globals_help') }}</div>
				<div v-if="!support.ok" class="mo-off" role="status">{{ offText }}</div>
				<template v-else>
					<div class="mo-toolbar">
						<v-text-field v-model="query" dense outlined hide-details clearable prepend-inner-icon="mdi-magnify" class="mo-search" :label="t('flat_filter')" :placeholder="t('flat_filter_hint')" />
						<v-select v-model="sort" :items="sortItems" item-text="title" item-value="value" dense outlined hide-details class="mo-field-type" :label="t(S.sort.label)" :title="t(S.sort.what)" />
						<v-btn v-if="canEdit" small depressed color="primary" @click="creating = true"><v-icon small left>mdi-plus</v-icon>{{ t('globals_create') }}</v-btn>
					</div>
					<div class="mo-flat-filters" role="group" :aria-label="t('flat_types')">
						<button v-for="g in KIND_GROUPS" :key="g.id" type="button" class="wf-cat" :aria-pressed="groups.indexOf(g.id) >= 0 ? 'true' : 'false'" @click="toggleGroup(g.id)">{{ t('group_' + g.id) }}</button>
						<v-switch v-model="onlyPersistent" dense color="primary" hide-details :label="t(S.persistent.label)" :title="t(S.persistent.what)" />
						<v-switch v-model="onlyChanged" dense color="primary" hide-details :label="t(S.changed.label)" :title="t(S.changed.what)" />
						<v-switch v-model="onlyWatched" dense color="primary" hide-details :label="t(S.watched.label)" :title="t(S.watched.what)" />
					</div>
					<choice-help v-if="canEdit" :choice="S.quick" :title="t(S.quick.label)" class="mb-2" />
					<div v-if="!total" class="mo-faint">{{ t('globals_none') }}</div>
					<div v-else-if="!shown.length" class="mo-faint">{{ t('globals_none_match') }}</div>
					<section v-for="g in grouped" :key="g.id" class="mo-ggroup">
						<button type="button" class="mo-ggroup-head" :aria-expanded="folded.indexOf(g.id) >= 0 ? 'false' : 'true'" @click="fold(g.id)">
							<v-icon small>{{ folded.indexOf(g.id) >= 0 ? 'mdi-chevron-right' : 'mdi-chevron-down' }}</v-icon>{{ t('globals_group', { name: g.id === OTHER ? t('globals_other') : g.id, n: g.items.length }) }}
						</button>
						<template v-if="folded.indexOf(g.id) < 0">
							<global-row
								v-for="it in g.items" :key="it.name" :item="it" :pinned="pinned" :can-edit="canEdit" :globals-ok="support.ok"
								@select="onSelect" @watch="onWatch" @unwatch="onUnwatch" @pin="pin" @unpin="unpin" @persist="onPersist"
							/>
						</template>
					</section>
					<div v-if="!canEdit" class="mo-faint mt-2">{{ t('read_only') }}</div>
				</template>
			</v-card-text>
		</v-card>
		<persist-panel v-if="support.ok" :persist="persist" :config-includes="configIncludes" :attention="attention" :can-edit="canEdit" @update-persist="$emit('update-persist')" />
		<v-dialog v-model="creating" max-width="640">
			<v-card>
				<v-card-text>
					<div class="mo-part"><v-icon :size="20" class="mr-1">mdi-plus-box-outline</v-icon>{{ t('globals_create') }}</div>
					<div class="mo-faint mb-2">{{ t('create_help') }}</div>
					<global-editor name="" :exists="false" :value="null" :can-edit="canEdit" :globals-ok="support.ok" :persistent="false" :show-persist="false" />
					<div class="mo-actions"><v-btn small text @click="creating = false">{{ t('close') }}</v-btn></div>
				</v-card-text>
			</v-card>
		</v-dialog>
	</div>
</template>

<script>
'use strict'

// The globals of the machine (design items 1, 5, 6, 10), reworked: a search, filters (kind, kept, changed in the last minute,
// watched) and a sort (globals-filter.js), groups by the start of the name that fold and are remembered (globals-groups.js), one clean
// row per global with a quick edit and one menu (GlobalRow.vue), creation in a dialog with the typed editor, and the persistence macro
// as a panel that opens by itself only when it needs the person (PersistPanel.vue). Density and favourites are the ones of the Model
// section (density.js, pins.js). On a board older than RRF 3.4 the card says why it is off and offers nothing (rrf-version.js).
import i18n from '../../i18n'
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

function storage() {
	return typeof localStorage === 'undefined' ? null : localStorage
}

export default {
	components: { GlobalEditor, GlobalRow, PersistPanel, ChoiceHelp },
	props: {
		tick: { type: Number, default: 0 },
		support: { type: Object, default: () => ({ ok: false, known: false }) },
		canEdit: { type: Boolean, default: true },
		persist: { type: Array, default: null },
		configIncludes: { type: Boolean, default: null },
		watched: { type: Array, default: () => [] },
		changeTimes: { type: Map, default: () => new Map() },
		usageCache: { type: Map, default: () => new Map() }
	},
	data() {
		return {
			query: '', sort: 'name', groups: [], onlyPersistent: false, onlyChanged: false, onlyWatched: false, creating: false,
			folded: readFolded(storage()), pinned: loadPins(storage()), density: loadDensity(storage()), S: GLOBALS_SETTINGS, KIND_GROUPS, OTHER
		}
	},
	computed: {
		offText() {
			return this.support.known ? this.t('globals_off_rrf', { version: this.support.version, minimum: this.support.minimum }) : this.t('globals_off_unknown')
		},
		sortItems() {
			return GLOBAL_SORTS.map(v => ({ value: v, title: this.t('globals_sort_' + v) }))
		},
		used() {
			return usageCounts(this.usageCache)
		},
		items() {
			void this.tick
			return globalItems(this.liveGlobals(), { persistent: (this.persist || []).map(e => e.name), watched: this.watched, pinned: this.pinned, times: this.changeTimes, used: this.used.size ? this.used : null })
		},
		total() {
			return this.items.length
		},
		shown() {
			return sortGlobals(filterGlobals(this.items, { query: this.query, groups: this.groups, onlyPersistent: this.onlyPersistent, onlyChanged: this.onlyChanged, onlyWatched: this.onlyWatched, now: Date.now() }), this.sort)
		},
		grouped() {
			const byName = new Map(this.shown.map(it => [it.name, it]))
			return groupNames(this.shown.map(it => it.name)).map(g => ({ id: g.id, items: g.names.map(n => byName.get(n)) }))
		},
		attention() {
			void this.tick
			return persistAttention(this.persist || [], this.liveGlobals(), this.configIncludes)
		}
	},
	methods: {
		t(k, p) {
			return i18n.t('plugins.WorkshopModel.model.' + k, p)
		},
		liveGlobals() {
			const m = liveModel()
			return m && m.global
		},
		toggleGroup(id) {
			this.groups = this.groups.indexOf(id) >= 0 ? this.groups.filter(g => g !== id) : this.groups.concat([id])
		},
		fold(id) {
			this.folded = toggleFolded(this.folded, id)
			saveFolded(storage(), this.folded)
		},
		pin(path) {
			this.pinned = addPin(this.pinned, path)
			savePins(storage(), this.pinned)
		},
		unpin(path) {
			this.pinned = removePin(this.pinned, path)
			savePins(storage(), this.pinned)
		},
		onSelect(path) {
			this.$emit('select', path)
		},
		onWatch(path) {
			this.$emit('watch', path)
		},
		onUnwatch(path) {
			this.$emit('unwatch', path)
		},
		onPersist(name, literal) {
			this.$emit('persist', name, literal)
		}
	}
}
</script>
