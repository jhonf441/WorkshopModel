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
			<pinned-strip :pinned="pinned" :tick="tick" class="mb-2" @select="emit('select', $event)" @open="emit('select', $event)" @unpin="unpin" />
			<choice-help :choice="PINS_ROW" :title="t(PINS_ROW.label)" class="mb-2" />
		</v-card-text>
	</v-card>
</template>

<script setup>
// The favourites in their own section of the side bar (2026-11-03: the strip is not repeated on top of the Model and Globals sections any
// more): every starred path of any section, with its live value, one tap to open it in the tree, a cross to remove it. The list is the one of
// pins.js (kept in the browser); the stars stay on the rows of the other sections.
import { ref } from 'vue'
import { i18n } from './dwc-host.js'
import PinnedStrip from './PinnedStrip.vue'
import ChoiceHelp from './ChoiceHelp.vue'
import { loadPins, savePins, removePin, PINS_ROW } from './pins.js'

defineProps({
	tick: { type: Number, default: 0 }
})
const emit = defineEmits(['select'])

const storage = () => (typeof localStorage === 'undefined' ? null : localStorage)
const t = (k, p) => i18n.t('plugins.WorkshopModel.model.' + k, p)
const pinned = ref(loadPins(storage()))

function unpin(path) {
	pinned.value = removePin(pinned.value, path)
	savePins(storage(), pinned.value)
}
</script>
