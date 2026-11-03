<template>
	<div class="mo-xb-live">
		<div class="mo-part">{{ t('live_title') }}</div>
		<div class="mo-faint">{{ t('live_help') }}</div>
		<div class="mo-xb-live-row">
			<label class="mo-faint" :for="id">{{ t('live_interval') }}</label>
			<select :id="id" v-model.number="seconds" class="mo-xb-select" :disabled="live.on">
				<option v-for="s in budget.seconds" :key="s" :value="s">{{ t('live_every', { n: s }) }}</option>
			</select>
			<span v-if="!live.on" :title="!canStart && disabledTitle ? disabledTitle : null"><v-btn size="small" variant="flat" color="primary" :disabled="!canStart" @click="emit('start', seconds)">{{ t('live_start') }}</v-btn></span>
			<v-btn v-else size="small" variant="flat" @click="emit('stop')">{{ t('live_stop') }}</v-btn>
		</div>
		<div v-if="live.on" class="mo-faint" role="status">{{ live.runs ? t('live_running', { runs: live.runs, max: budget.runs, n: live.every }) : t('live_waiting') }}</div>
		<div v-else-if="live.stopped" class="mo-faint" role="status">{{ t('live_stopped_' + live.stopped, { max: budget.runs }) }}</div>
		<div class="mo-faint">{{ t(tier.extras ? 'live_limit_extras' : 'live_limit_standalone') }}</div>
	</div>
</template>

<script setup>
// The controls of the live preview (expression-live.js): how often, start and stop, and what the tier allows. The section owns the
// state and does the evaluating; this only asks. Emits `start` with the seconds and `stop`. `disabledTitle` is the tooltip of
// Start while it cannot start (a blank left in the expression).
import { computed, ref } from 'vue'
import { i18n } from './dwc-host.js'
import { liveBudget } from './expression-live.js'

const props = defineProps({
	live: { type: Object, required: true },
	tier: { type: Object, default: () => ({ sbc: false, extras: false }) },
	canStart: { type: Boolean, default: false },
	disabledTitle: { type: String, default: '' }
})
const emit = defineEmits(['start', 'stop'])

const t = (k, p) => i18n.t('plugins.WorkshopModel.model.' + k, p)

const id = 'mo-xb-every'
const budget = computed(() => liveBudget(props.tier))
const seconds = ref(liveBudget(props.tier).seconds[1])
</script>
