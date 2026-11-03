<template>
	<div class="mo-topics">
		<div v-if="!cards.length" class="mo-faint" role="status">{{ t('topics_none') }}</div>
		<topic-card v-for="c in cards" :key="c.id" :card="c" @open="$emit('open', $event)" />
	</div>
</template>

<script>
'use strict'

// The Topics view (the default of the Model section): one card per area of the machine, built from what the live model has
// (topic-catalog.js). A view of VIEW-CONTRACT.md: it declares every prop of the contract and emits only its events.
import i18n from '../../i18n'
import TopicCard from './TopicCard.vue'
import { topicsOf } from './topic-catalog.js'

export default {
	components: { TopicCard },
	props: {
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
	},
	computed: {
		cards() {
			void this.tick
			return topicsOf(this.model, { globalsOk: this.globalsOk, tier: this.tier })
		}
	},
	methods: {
		t(k, p) {
			return i18n.t('plugins.WorkshopModel.model.' + k, p)
		}
	}
}
</script>
