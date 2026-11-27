<template>
	<div class="wf-group mb-3">
			<card-head icon="mdi-star-outline" :title="t('pins_title')" />
			<pinned-strip :pinned="pinned" :tick="tick" class="mb-2" @select="$emit('select', $event)" @open="$emit('select', $event)" @unpin="unpin" />
			<help-fold :what="t('look_favorites_lead')" :items="helpBlocks" />
	</div>
</template>

<script>
'use strict'

// The favourites in their own section of the side bar (2026-11-03: the strip is not repeated on top of the Model and Globals sections any
// more): every starred path of any section, with its live value, one tap to open it in the tree, a cross to remove it. The list is the one of
// pins.js (kept in the browser); the stars stay on the rows of the other sections.
import i18n from '../../i18n'
import PinnedStrip from './PinnedStrip.vue'
import CardHead from './CardHead.vue' // vue/_shared36
import HelpFold from './HelpFold.vue' // vue/_shared36
import { helpItems } from './section-help.js'
import { loadPins, savePins, removePin, PINS_ROW } from './pins.js'

const storage = () => (typeof localStorage === 'undefined' ? null : localStorage)

export default {
	components: { PinnedStrip, CardHead, HelpFold },
	props: {
		tick: { type: Number, default: 0 }
	},
	data() {
		return { pinned: loadPins(storage()), PINS_ROW }
	},
	computed: {
		// the one fold at the foot of the card (redesign 2026-11-23): the lead that sat under the title and how the favourites work
		helpBlocks() {
			return helpItems(k => this.t(k), [[PINS_ROW, this.t(PINS_ROW.label)]])
		}
	},
	methods: {
		t(k, p) {
			return i18n.t('plugins.WorkshopModel.model.' + k, p)
		},
		unpin(path) {
			this.pinned = removePin(this.pinned, path)
			savePins(storage(), this.pinned)
		}
	}
}
</script>
