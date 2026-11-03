<template>
	<div>
		<v-card class="mb-3">
			<v-card-text>
				<div class="mo-head">
					<span class="mo-head-icon"><v-icon>mdi-bell-outline</v-icon></span>
					<div class="mo-head-text">
						<h2 class="mo-head-title">{{ t('alerts_title') }}</h2>
						<p class="mo-head-lead">{{ t('look_alerts_lead') }}</p>
					</div>
					<div v-if="monitor.rules.length" class="mo-head-right"><span class="mo-pill mo-pill-dot" :class="rules.some(r => r.firing) ? 'err' : 'ok'">{{ t('look_alerts_count', { n: monitor.rules.length }) }}</span></div>
				</div>
				<div class="mo-note warn mb-2" role="note"><v-icon size="small">mdi-web</v-icon><span class="mo-note-text">{{ t('alerts_scope') }}</span></div>
				<details class="wf-more mb-2"><summary>{{ t('help_what') }}</summary><div>{{ t('alerts_help') }}</div></details>
				<v-switch :model-value="monitor.sound" density="compact" color="primary" hide-details :label="t(S.sound.label)" @update:model-value="emit('update-sound', !!$event)" />
				<choice-help :choice="S.sound" :title="t('help_how')" class="mb-2" />
				<div class="mo-part">{{ t('alerts_rules') }}</div>
				<div v-if="!monitor.rules.length" class="mo-empty mo-empty-small"><v-icon class="mo-empty-icon">mdi-bell-plus-outline</v-icon><div class="mo-empty-text">{{ t('alerts_none') }}</div></div>
				<table v-else class="mo-table">
					<tbody>
						<tr v-for="r in rules" :key="r.id">
							<td><v-switch :model-value="r.enabled" density="compact" color="primary" hide-details :aria-label="t('alerts_on')" @update:model-value="toggle(r.id, !!$event)" /></td>
							<td class="mo-key">{{ r.text }}<div class="mo-faint">{{ r.detail }}</div></td>
							<td><span class="wf-state" :class="r.firing ? 'err' : 'ok'">{{ r.firing ? t('alerts_state_firing') : t('alerts_state_ok') }}</span></td>
							<td class="mo-row-actions"><v-btn size="x-small" variant="text" :title="t('alerts_remove')" :aria-label="t('alerts_remove')" @click="remove(r.id)"><v-icon size="small">mdi-close</v-icon></v-btn></td>
						</tr>
					</tbody>
				</table>
			</v-card-text>
		</v-card>
		<v-card class="mb-3">
			<v-card-text>
				<div class="mo-head">
					<span class="mo-head-icon"><v-icon>mdi-plus-circle-outline</v-icon></span>
					<div class="mo-head-text"><h2 class="mo-head-title">{{ t('alerts_add_title') }}</h2></div>
				</div>
				<div class="mo-form">
					<v-text-field v-model="draft.path" density="compact" variant="outlined" hide-details class="mo-field" spellcheck="false" :label="t(S.path.label)" />
					<v-select v-if="watched.length" :model-value="null" :items="watched" density="compact" variant="outlined" hide-details class="mo-field" :label="t('alerts_pick_watched')" @update:model-value="draft.path = $event" />
				</div>
				<choice-help :choice="S.path" :title="t('help_how')" class="mb-2" />
				<div class="mo-form">
					<v-select v-model="draft.op" :items="opItems" item-title="title" item-value="value" density="compact" variant="outlined" hide-details class="mo-field-type" :label="t(S.op.label)" />
					<v-text-field v-model="draft.value" density="compact" variant="outlined" hide-details class="mo-field" spellcheck="false" :label="t(S.value.label)" />
				</div>
				<choice-help :choice="S.op" :title="t('help_how')" />
				<choice-help :choice="S.value" :title="t('help_how')" class="mb-2" />
				<div class="mo-form">
					<v-text-field v-if="numeric" v-model="draft.hysteresis" type="number" min="0" density="compact" variant="outlined" hide-details class="mo-field-type" :label="t(S.hysteresis.label)" />
					<v-text-field v-model="draft.cooldown" type="number" min="0" density="compact" variant="outlined" hide-details class="mo-field-type" :label="t(S.cooldown.label)" />
				</div>
				<choice-help v-if="numeric" :choice="S.hysteresis" :title="t('help_how')" />
				<choice-help :choice="S.cooldown" :title="t('help_how')" class="mb-2" />
				<div v-if="invalid" class="mo-error" role="alert">{{ t('alerts_invalid') }}</div>
				<v-btn size="small" variant="flat" color="primary" @click="add">{{ t('alerts_add') }}</v-btn>
			</v-card-text>
		</v-card>
		<v-card class="mb-3">
			<v-card-text>
				<div class="mo-head">
					<span class="mo-head-icon"><v-icon>mdi-history</v-icon></span>
					<div class="mo-head-text"><h2 class="mo-head-title">{{ t('alerts_events_title') }}</h2></div>
					<div class="mo-head-right"><v-btn size="small" variant="text" :disabled="!monitor.events.length" @click="emit('clear-events')">{{ t('alerts_events_clear') }}</v-btn></div>
				</div>
				<div v-if="!monitor.events.length" class="mo-empty mo-empty-small"><v-icon class="mo-empty-icon">mdi-bell-sleep-outline</v-icon><div class="mo-empty-text">{{ t('alerts_events_none') }}</div></div>
				<table v-else class="mo-table">
					<tbody>
						<tr v-for="(e, i) in events" :key="e.t + e.id + i">
							<td class="mo-value">{{ e.clock }}</td>
							<td><span class="wf-state" :class="e.type === 'fire' ? 'err' : 'ok'">{{ e.type === 'fire' ? t('alerts_state_firing') : t('alerts_state_ok') }}</span></td>
							<td class="mo-key">{{ e.text }}</td>
						</tr>
					</tbody>
				</table>
			</v-card-text>
		</v-card>
	</div>
</template>

<script setup>
// The in-page alerts (alert-rules.js, alert-monitor.js): the rules, a form to add one, the recent events and the sound switch. The
// page owns the monitor and evaluates it every sample, so the alerts keep running while another section is open; this section only
// edits the rules. They work only while the page is open: nothing on the Pi, no notice to a phone.
import { computed, reactive, ref } from 'vue'
import { i18n } from './dwc-host.js'
import ChoiceHelp from './ChoiceHelp.vue'
import { ALERT_SETTINGS as S, OPS, COOLDOWN_DEFAULT_S, cleanRule, isNumericOp } from './alert-rules.js'
import { isActive, EVENTS_KEPT } from './alert-monitor.js'

const props = defineProps({
	monitor: { type: Object, required: true },
	watched: { type: Array, default: () => [] }
})
const emit = defineEmits(['update-rules', 'update-sound', 'clear-events'])

const t = (k, p) => i18n.t('plugins.WorkshopModel.model.' + k, p)

const draft = reactive({ path: '', op: 'above', value: '', hysteresis: 0, cooldown: COOLDOWN_DEFAULT_S })
const invalid = ref(false)

const numeric = computed(() => isNumericOp(draft.op))
const opItems = computed(() => OPS.map(op => ({ title: t('alerts_op_' + op), value: op })))

const opText = op => t('alerts_op_' + op)
const clock = ts => new Date(ts).toTimeString().slice(0, 8)

const rules = computed(() => props.monitor.rules.map(r => ({
	id: r.id, enabled: r.enabled, firing: isActive(props.monitor, r.id),
	text: t('alerts_rule_line', { path: r.path, op: opText(r.op), limit: r.value }),
	detail: t('alerts_rule_detail', { hysteresis: r.hysteresis, cooldown: r.cooldown })
})))
const events = computed(() => props.monitor.events.slice(0, EVENTS_KEPT).map(e => ({
	t: e.t, id: e.id, type: e.type, clock: clock(e.t),
	text: t('alerts_event_' + e.type, { path: e.path, op: opText(e.op), limit: e.limit, value: e.value })
})))

function add() {
	const rule = cleanRule(Object.assign({}, draft, { value: draft.value }))
	invalid.value = !rule
	if (!rule) return
	emit('update-rules', props.monitor.rules.concat([rule]))
	draft.value = ''
}

function toggle(id, enabled) {
	emit('update-rules', props.monitor.rules.map(r => (r.id === id ? Object.assign({}, r, { enabled }) : r)))
}

function remove(id) {
	emit('update-rules', props.monitor.rules.filter(r => r.id !== id))
}
</script>
