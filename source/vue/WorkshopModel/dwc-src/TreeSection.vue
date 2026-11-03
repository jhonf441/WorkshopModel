<template>
	<v-card class="mb-3 mo-views" :class="'mo-density-' + density">
		<v-card-text>
			<div class="mo-part"><v-icon size="20" class="mr-1">mdi-file-tree</v-icon>{{ t('tree_title') }}</div>
			<div class="mo-faint mb-2">{{ t('tree_help') }}</div>
			<div class="mo-views-head">
				<view-tabs :choices="VIEW_CHOICES" :current="view" @pick="pickView" />
				<div class="mo-views-tools">
					<density-switch :current="density" @pick="pickDensity" />
					<v-btn size="small" variant="outlined" @click="emit('update:paused', !paused)"><v-icon size="small" start>{{ paused ? 'mdi-play' : 'mdi-pause' }}</v-icon>{{ paused ? t('resume') : t('pause') }}</v-btn>
				</div>
			</div>
			<pinned-strip :pinned="pinned" :tick="tick" :model="viewProps.model" class="mb-2" @select="select" @open="openTechnical" @unpin="unpin" />
			<choice-help v-if="!pinned.length" :choice="PINS_ROW" :title="t(PINS_ROW.label)" class="mb-2" />
			<choice-help :choice="choice" :title="t('view_how')" class="mb-2" />
			<div :class="{ 'mo-split': choice.layout === 'split' }">
				<div class="mo-view">
					<component
						:is="VIEW_COMPONENTS[view]" v-bind="viewProps"
						@select="select" @open="openTechnical" @watch="emit('watch', $event)" @unwatch="emit('unwatch', $event)" @pin="pin" @unpin="unpin" @clear-changes="emit('clear-changes')"
					/>
				</div>
				<node-detail
					v-if="choice.layout === 'split'" :path="selected" :tick="tick" :globals-ok="globalsOk" :can-edit="canEdit" :watched="watched.indexOf(selected) >= 0" :persistent="!!globalName && persistent.indexOf(globalName) >= 0" :pinned="pinned"
					@watch="emit('watch', $event)" @unwatch="emit('unwatch', $event)" @persist="(n, l) => emit('persist', n, l)" @select="select" @test="emit('test', $event)" @pin="pin" @unpin="unpin"
				/>
			</div>
		</v-card-text>
	</v-card>
</template>

<script setup>
// The Model section: the selector of views (view-choices.js) over the same live model, the open view and, for a 'split' view, the
// detail of the selected path beside it. What every view receives and may emit is VIEW-CONTRACT.md: this file builds that set of
// props (viewProps) from the tracker of the page (model-changes.js) and the live model, and is the one place where a view is
// registered (VIEW_COMPONENTS). The chosen view, the density (density.js) and the favourites (pins.js, shown on top by PinnedStrip.vue)
// are remembered in this browser; "open" (See all of a card, a row of another section) shows the technical tree without changing the
// remembered choice.
import { computed, ref, watch } from 'vue'
import { i18n } from './dwc-host.js'
import { liveModel } from './model-host.js'
import ViewTabs from './ViewTabs.vue'
import ChoiceHelp from './ChoiceHelp.vue'
import NodeDetail from './NodeDetail.vue'
import TopicsView from './TopicsView.vue'
import FlatView from './FlatView.vue'
import TreeView from './TreeView.vue'
import ColumnsView from './ColumnsView.vue'
import BrowseView from './BrowseView.vue'
import ChangesView from './ChangesView.vue'
import DensitySwitch from './DensitySwitch.vue'
import PinnedStrip from './PinnedStrip.vue'
import { VIEW_CHOICES, TECHNICAL_VIEW, choiceOf, readView, saveView } from './view-choices.js'
import { loadDensity, saveDensity, normalizeDensity } from './density.js'
import { PINS_ROW, loadPins, savePins, addPin, removePin } from './pins.js'
import { globalNameOf } from './model-path.js'

// view id -> component (the registration of VIEW-CONTRACT.md)
const VIEW_COMPONENTS = { topics: TopicsView, flat: FlatView, columns: ColumnsView, browse: BrowseView, changes: ChangesView, tree: TreeView }

const props = defineProps({
	tick: { type: Number, default: 0 },
	paused: { type: Boolean, default: false },
	selected: { type: String, default: '' },
	globalsOk: { type: Boolean, default: true },
	canEdit: { type: Boolean, default: true },
	watched: { type: Array, default: () => [] },
	persistent: { type: Array, default: () => [] },
	tracker: { type: Object, default: null },
	tier: { type: Object, default: () => ({ sbc: false, extras: false }) },
	focus: { type: String, default: '' }
})
const emit = defineEmits(['update:selected', 'update:paused', 'watch', 'unwatch', 'persist', 'clear-changes', 'focused', 'test'])

const t = (k, p) => i18n.t('plugins.WorkshopModel.model.' + k, p)
const storage = () => (typeof localStorage === 'undefined' ? null : localStorage)

const view = ref(readView(storage()))
const density = ref(loadDensity(storage()))
const pinned = ref(loadPins(storage()))

const choice = computed(() => choiceOf(VIEW_CHOICES, view.value) || VIEW_CHOICES[0])
const globalName = computed(() => globalNameOf(props.selected))
const viewProps = computed(() => {
	void props.tick
	const tr = props.tracker || {}
	return {
		tick: props.tick, model: liveModel(), leaves: tr.leaves || [], truncated: !!tr.truncated, changes: tr.changes || [], changeTimes: tr.times || new Map(),
		selected: props.selected, watched: props.watched, pinned: pinned.value, density: density.value, paused: props.paused, globalsOk: props.globalsOk, tier: props.tier
	}
})

function pickView(id) {
	view.value = choiceOf(VIEW_CHOICES, id) ? id : view.value
	saveView(storage(), view.value)
}
function pickDensity(id) {
	density.value = normalizeDensity(id)
	saveDensity(storage(), density.value)
}
function pin(path) {
	pinned.value = addPin(pinned.value, path)
	savePins(storage(), pinned.value)
}
function unpin(path) {
	pinned.value = removePin(pinned.value, path)
	savePins(storage(), pinned.value)
}
function select(path) {
	emit('update:selected', path)
}
// See all, a row of a topic, a row of another section: the technical tree, unfolded down to the path
function openTechnical(path) {
	view.value = TECHNICAL_VIEW
	emit('update:selected', path)
}
watch(() => props.focus, p => {
	if (!p) return
	openTechnical(p)
	emit('focused')
}, { immediate: true })
</script>
