<template>
	<div class="mo-topics">
		<div v-if="!cards.length" class="mo-faint" role="status">{{ t('topics_none') }}</div>
		<diagnosis-card v-if="model" :card="diagnosis" @open="emit('open', $event)" />
		<topic-card v-for="c in cards" :key="c.id" :card="c" :change-times="changeTimes" :now="now" @open="emit('open', $event)" />
	</div>
</template>

<script setup>
// The Topics view (the default of the Model section): one card per area of the machine, built from what the live model has
// (topic-catalog.js). A view of VIEW-CONTRACT.md: it declares every prop of the contract and emits only its events. The cards get the
// change times so a value that just changed glows.
import { computed } from 'vue'
import { i18n } from './dwc-host.js'
import TopicCard from './TopicCard.vue'
import DiagnosisCard from './DiagnosisCard.vue'
import { topicsOf, diagnosisTopic } from './topic-catalog.js'

const props = defineProps({
	tick: { type: Number, default: 0 },
	model: { type: Object, default: null },
	leaves: { type: Array, default: () => [] },
	truncated: { type: Boolean, default: false },
	changes: { type: Array, default: () => [] },
	changeTimes: { type: Map, default: () => new Map() },
	selected: { type: String, default: '' },
	watched: { type: Array, default: () => [] },
	pinned: { type: Array, default: () => [] },
	density: { type: String, default: 'comfortable' },
	paused: { type: Boolean, default: false },
	globalsOk: { type: Boolean, default: true },
	tier: { type: Object, default: () => ({ sbc: false, extras: false }) }
})
const emit = defineEmits(['select', 'open', 'watch', 'unwatch', 'pin', 'unpin', 'clear-changes'])

const t = (k, p) => i18n.t('plugins.WorkshopModel.model.' + k, p)

const now = computed(() => {
	void props.tick
	return Date.now()
})
const diagnosis = computed(() => {
	void props.tick
	return diagnosisTopic(props.model, { tier: props.tier })
})
const cards = computed(() => {
	void props.tick
	return topicsOf(props.model, { globalsOk: props.globalsOk, tier: props.tier })
})
</script>
