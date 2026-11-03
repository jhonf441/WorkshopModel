<template>
	<div class="mo-xb-live">
		<div class="mo-part">{{ t('live_title') }}</div>
		<div class="mo-faint">{{ t('live_help') }}</div>
		<div class="mo-xb-live-row">
			<label class="mo-faint" for="mo-xb-every">{{ t('live_interval') }}</label>
			<select id="mo-xb-every" v-model.number="seconds" class="mo-xb-select" :disabled="live.on">
				<option v-for="s in budget.seconds" :key="s" :value="s">{{ t('live_every', { n: s }) }}</option>
			</select>
			<span v-if="!live.on" :title="!canStart && disabledTitle ? disabledTitle : null"><v-btn small depressed color="primary" :disabled="!canStart" @click="$emit('start', seconds)">{{ t('live_start') }}</v-btn></span>
			<v-btn v-else small depressed @click="$emit('stop')">{{ t('live_stop') }}</v-btn>
		</div>
		<div v-if="live.on" class="mo-faint" role="status">{{ live.runs ? t('live_running', { runs: live.runs, max: budget.runs, n: live.every }) : t('live_waiting') }}</div>
		<div v-else-if="live.stopped" class="mo-faint" role="status">{{ t('live_stopped_' + live.stopped, { max: budget.runs }) }}</div>
		<div class="mo-faint">{{ t(tier.extras ? 'live_limit_extras' : 'live_limit_standalone') }}</div>
	</div>
</template>

<script>
'use strict'

// The controls of the live preview (expression-live.js): how often, start and stop, and what the tier allows. The section owns the
// state and does the evaluating; this only asks. Emits `start` with the seconds and `stop`. `disabledTitle` is the tooltip of
// Start while it cannot start (a blank left in the expression).
import i18n from '../../i18n'
import { liveBudget } from './expression-live.js'

export default {
	props: {
		live: { type: Object, required: true },
		tier: { type: Object, default: () => ({ sbc: false, extras: false }) },
		canStart: { type: Boolean, default: false },
		disabledTitle: { type: String, default: '' }
	},
	data() {
		return { seconds: liveBudget(this.tier).seconds[1] }
	},
	computed: {
		budget() {
			return liveBudget(this.tier)
		}
	},
	methods: {
		t(k, p) {
			return i18n.t('plugins.WorkshopModel.model.' + k, p)
		}
	}
}
</script>
