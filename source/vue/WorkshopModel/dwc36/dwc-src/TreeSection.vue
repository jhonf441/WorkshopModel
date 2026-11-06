<template>
	<v-card class="mb-3 mo-views" :class="'mo-density-' + density">
		<v-card-text>
			<div class="mo-head">
				<span class="mo-head-icon"><v-icon>mdi-view-dashboard-outline</v-icon></span>
				<div class="mo-head-text">
					<h2 class="mo-head-title">{{ t('tree_title') }}</h2>
					<p class="mo-head-lead">{{ t('tree_help') }}</p>
				</div>
				<div class="mo-head-right">
					<span v-if="paused" class="mo-pill mo-pill-dot warn">{{ t('look_paused') }}</span>
					<span v-else class="mo-pill mo-pill-dot ok">{{ t('look_live') }}</span>
				</div>
			</div>
			<div class="mo-views-head">
				<view-tabs :choices="VIEW_CHOICES" :current="view" @pick="pickView" />
				<div class="mo-views-tools">
					<density-switch :current="density" @pick="pickDensity" />
					<v-btn small outlined @click="$emit('update:paused', !paused)"><v-icon small left>{{ paused ? 'mdi-play' : 'mdi-pause' }}</v-icon>{{ paused ? t('resume') : t('pause') }}</v-btn>
				</div>
			</div>
			<choice-guide :choice="choice" class="mb-2" />
			<div :class="{ 'mo-split': choice.layout === 'split' }">
				<div class="mo-view">
					<!-- Changes keeps its state (its feed, the moment, the filters) while another view is open: it used to be built again at every visit, started empty
					     ("no changes yet") and drew its table a moment later, which looked like a reload. Only this view is kept: the others would draw every second hidden. -->
					<keep-alive include="changes-view">
						<component
							:is="VIEW_COMPONENTS[view]" v-bind="viewProps"
							@select="select" @open="openTechnical" @watch="onWatch" @unwatch="onUnwatch" @pin="pin" @unpin="unpin" @clear-changes="$emit('clear-changes')"
						/>
					</keep-alive>
				</div>
				<node-detail
					v-if="choice.layout === 'split'" :path="selected" :tick="tick" :globals-ok="globalsOk" :can-edit="canEdit" :watched="watched.indexOf(selected) >= 0" :persistent="!!globalName && persistent.indexOf(globalName) >= 0" :pinned="pinned"
					@watch="onWatch" @unwatch="onUnwatch" @persist="onPersist" @select="select" @test="onTest" @pin="pin" @unpin="unpin"
				/>
			</div>
		</v-card-text>
	</v-card>
</template>

<script>
'use strict'

// The Model section: the selector of views (view-choices.js) over the same live model, the open view and, for a 'split' view, the
// detail of the selected path beside it. What every view receives and may emit is VIEW-CONTRACT.md: this file builds that set of
// props (viewProps) from the tracker of the page (model-changes.js) and the live model, and is the one place where a view is
// registered (components + VIEW_COMPONENTS). The chosen view, the density (density.js) and the favourites (pins.js, shown on top by
// PinnedStrip.vue) are remembered in this browser; "open" (See all of a card, a row of another section) shows the technical tree
// without changing the remembered choice.
import i18n from '../../i18n'
import { liveModel } from './model-host.js'
import { scrollToPageTop } from './page-scroll.js'
import ViewTabs from './ViewTabs.vue'
import ChoiceGuide from './ChoiceGuide.vue'
import NodeDetail from './NodeDetail.vue'
import TopicsView from './TopicsView.vue'
import FlatView from './FlatView.vue'
import TreeView from './TreeView.vue'
import ColumnsView from './ColumnsView.vue'
import BrowseView from './BrowseView.vue'
import ChangesView from './ChangesView.vue'
import DensitySwitch from './DensitySwitch.vue'
import { VIEW_CHOICES, TECHNICAL_VIEW, choiceOf, readView, saveView } from './view-choices.js'
import { loadDensity, saveDensity, normalizeDensity } from './density.js'
import { PINS_ROW, loadPins, savePins, addPin, removePin } from './pins.js'
import { globalNameOf } from './model-path.js'

// view id -> registered component name (the registration of VIEW-CONTRACT.md)
const VIEW_COMPONENTS = { topics: 'topics-view', flat: 'flat-view', columns: 'columns-view', browse: 'browse-view', changes: 'changes-view', tree: 'tree-view' }

function storage() {
	return typeof localStorage === 'undefined' ? null : localStorage
}

export default {
	components: { ViewTabs, ChoiceGuide, NodeDetail, TopicsView, FlatView, TreeView, ColumnsView, BrowseView, ChangesView, DensitySwitch },
	props: {
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
	},
	data() {
		return { view: readView(storage()), density: loadDensity(storage()), pinned: loadPins(storage()), VIEW_CHOICES, VIEW_COMPONENTS, PINS_ROW }
	},
	computed: {
		choice() {
			return choiceOf(VIEW_CHOICES, this.view) || VIEW_CHOICES[0]
		},
		globalName() {
			return globalNameOf(this.selected)
		},
		viewProps() {
			void this.tick
			const tr = this.tracker || {}
			return {
				tick: this.tick, model: liveModel(), leaves: tr.leaves || [], truncated: !!tr.truncated, changes: tr.changes || [], changeTimes: tr.times || new Map(),
				selected: this.selected, watched: this.watched, pinned: this.pinned, density: this.density, paused: this.paused, globalsOk: this.globalsOk, tier: this.tier
			}
		}
	},
	watch: {
		focus: {
			immediate: true,
			handler(p) {
				if (!p) return
				this.openTechnical(p)
				this.$emit('focused')
			}
		}
	},
	methods: {
		t(k, p) {
			return i18n.t('plugins.WorkshopModel.model.' + k, p)
		},
		pickView(id) {
			this.view = choiceOf(VIEW_CHOICES, id) ? id : this.view
			saveView(storage(), this.view)
		},
		pickDensity(id) {
			this.density = normalizeDensity(id)
			saveDensity(storage(), this.density)
		},
		pin(path) {
			this.pinned = addPin(this.pinned, path)
			savePins(storage(), this.pinned)
		},
		unpin(path) {
			this.pinned = removePin(this.pinned, path)
			savePins(storage(), this.pinned)
		},
		select(path) {
			this.$emit('update:selected', path)
		},
		// See all, a row of a topic, a row of another section: the technical tree, unfolded down to the path
		openTechnical(path) {
			this.view = TECHNICAL_VIEW
			this.$emit('update:selected', path)
			// the jump may land far from where the person is looking: back to the top of the page so the change is seen
			this.$nextTick(() => scrollToPageTop())
		},
		onWatch(path) {
			this.$emit('watch', path)
		},
		onUnwatch(path) {
			this.$emit('unwatch', path)
		},
		onTest(path) {
			this.$emit('test', path)
		},
		onPersist(name, literal) {
			this.$emit('persist', name, literal)
		}
	}
}
</script>
