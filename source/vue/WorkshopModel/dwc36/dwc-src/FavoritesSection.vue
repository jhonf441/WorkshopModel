<template>
	<v-card class="mb-3">
		<v-card-text>
			<div class="mo-head">
				<span class="mo-head-icon"><v-icon>mdi-star-outline</v-icon></span>
				<div class="mo-head-text">
					<h2 class="mo-head-title">{{ t('pins_title') }}</h2>
					<p class="mo-head-lead">{{ t('look_favorites_lead') }}</p>
				</div>
			</div>
			<pinned-strip :pinned="pinned" :tick="tick" class="mb-2" @select="$emit('select', $event)" @open="$emit('select', $event)" @unpin="unpin" />
			<choice-guide :choice="PINS_ROW" :title="t(PINS_ROW.label)" class="mb-2" />
		</v-card-text>
	</v-card>
</template>

<script>
'use strict'

// The favourites in their own section of the side bar (2026-11-03: the strip is not repeated on top of the Model and Globals sections any
// more): every starred path of any section, with its live value, one tap to open it in the tree, a cross to remove it. The list is the one of
// pins.js (kept in the browser); the stars stay on the rows of the other sections.
import i18n from '../../i18n'
import PinnedStrip from './PinnedStrip.vue'
import ChoiceGuide from './ChoiceGuide.vue'
import { loadPins, savePins, removePin, PINS_ROW } from './pins.js'

const storage = () => (typeof localStorage === 'undefined' ? null : localStorage)

export default {
	components: { PinnedStrip, ChoiceGuide },
	props: {
		tick: { type: Number, default: 0 }
	},
	data() {
		return { pinned: loadPins(storage()), PINS_ROW }
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
