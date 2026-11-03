<template>
	<div class="mo-topics">
		<div v-if="!cards.length" class="mo-faint" role="status">{{ t('topics_none') }}</div>
		<diagnosis-card v-if="model" :card="diagnosis" @open="$emit('open', $event)" />
		<topic-card v-for="c in cards" :key="c.id" :card="c" :change-times="changeTimes" :now="now" @open="$emit('open', $event)" />
	</div>
</template>

<script>
'use strict'

// The Topics view (the default of the Model section): one card per area of the machine, built from what the live model has
// (topic-catalog.js). A view of VIEW-CONTRACT.md: it declares every prop of the contract and emits only its events. The cards get the
// change times so a value that just changed glows.
import i18n from '../../i18n'
import TopicCard from './TopicCard.vue'
import DiagnosisCard from './DiagnosisCard.vue'
import { topicsOf, diagnosisTopic } from './topic-catalog.js'

export default {
	components: { TopicCard, DiagnosisCard },
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
		now() {
			void this.tick
			return Date.now()
		},
		diagnosis() {
			void this.tick
			return diagnosisTopic(this.model, { tier: this.tier })
		},
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
