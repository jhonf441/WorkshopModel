<template>
	<div class="mo-topics">
		<div v-if="!cards.length" class="mo-faint" role="status">{{ t('topics_none') }}</div>
		<topic-card v-for="c in cards" :key="c.id" :card="c" @open="emit('open', $event)" />
	</div>
</template>

<script setup>
// The Topics view (the default of the Model section): one card per area of the machine, built from what the live model has
// (topic-catalog.js). A view of VIEW-CONTRACT.md: it declares every prop of the contract and emits only its events.
import { computed } from 'vue'
import { i18n } from './dwc-host.js'
import TopicCard from './TopicCard.vue'
import { topicsOf } from './topic-catalog.js'

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

const cards = computed(() => {
	void props.tick
	return topicsOf(props.model, { globalsOk: props.globalsOk, tier: props.tier })
})
</script>
