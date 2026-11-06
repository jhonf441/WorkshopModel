<template>
	<div>
		<v-card class="mb-3">
			<v-card-text>
				<div class="mo-head">
					<span class="mo-head-icon"><v-icon>mdi-bell-outline</v-icon></span>
					<div class="mo-head-text">
						<div class="wf-section-head"><h2 class="mo-head-title">{{ t('alerts_title') }}</h2><help-tip :title="t('alerts_title')"><p>{{ t('alerts_help') }}</p></help-tip></div>
						<p class="mo-head-lead">{{ t('look_alerts_lead') }}</p>
					</div>
					<div v-if="monitor.rules.length" class="mo-head-right"><span class="mo-pill mo-pill-dot" :class="rules.some(r => r.firing) ? 'err' : 'ok'">{{ t('look_alerts_count', { n: monitor.rules.length }) }}</span></div>
				</div>
				<div class="mo-note warn mb-2" role="note"><v-icon small>mdi-web</v-icon><span class="mo-note-text">{{ t('alerts_scope') }}</span></div>
				<div class="help-tip-row mb-2">
					<v-switch :input-value="monitor.sound" dense color="primary" hide-details :label="t(S.sound.label)" @change="$emit('update-sound', !!$event)" />
					<info-tip :choice="S.sound" :title="t(S.sound.label)" />
				</div>
				<div class="mo-part">{{ t('alerts_rules') }}</div>
				<div v-if="!monitor.rules.length" class="mo-empty mo-empty-small"><v-icon class="mo-empty-icon">mdi-bell-plus-outline</v-icon><div class="mo-empty-text">{{ t('alerts_none') }}</div></div>
				<table v-else class="mo-table">
					<tbody>
						<tr v-for="r in rules" :key="r.id">
							<td><v-switch :input-value="r.enabled" dense color="primary" hide-details :aria-label="t('alerts_on')" @change="toggle(r.id, !!$event)" /></td>
							<td class="mo-key">{{ r.text }}<div class="mo-faint">{{ r.detail }}</div></td>
							<td><span class="wf-state" :class="r.firing ? 'err' : 'ok'">{{ r.firing ? t('alerts_state_firing') : t('alerts_state_ok') }}</span></td>
							<td class="mo-row-actions"><v-btn x-small text :title="t('alerts_remove')" :aria-label="t('alerts_remove')" @click="remove(r.id)"><v-icon small>mdi-close</v-icon></v-btn></td>
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
					<wf-field id="al-path" class="mo-field" :label="t(S.path.label)" :message="touched.path && problem === 'path' ? t('alerts_problem_path') : ''" level="error">
						<template #help><info-tip :choice="S.path" :title="t(S.path.label)" /></template>
						<v-text-field id="al-path" v-model="draft.path" dense outlined hide-details spellcheck="false" :aria-label="t(S.path.label)" :error="touched.path && problem === 'path'" @blur="touched.path = true" />
					</wf-field>
					<wf-field v-if="watched.length" id="al-watched" class="mo-field" :label="t('alerts_pick_watched')">
						<v-select id="al-watched" :value="null" :items="watched" dense outlined hide-details :aria-label="t('alerts_pick_watched')" @change="draft.path = $event" />
					</wf-field>
					<v-btn small outlined class="mo-field-find" :title="t('alerts_find_path_help')" @click="pickOpen = true"><v-icon small left>mdi-magnify</v-icon>{{ t('alerts_find_path') }}</v-btn>
				</div>
				<div class="mo-form">
					<wf-field id="al-op" class="mo-field-type" :label="t(S.op.label)">
						<template #help><info-tip :choice="S.op" :title="t(S.op.label)" /></template>
						<v-select id="al-op" v-model="draft.op" :items="opItems" item-text="title" item-value="value" dense outlined hide-details :aria-label="t(S.op.label)" />
					</wf-field>
					<wf-field id="al-value" class="mo-field" :label="valueLabel" :message="touched.value && (problem === 'number' || problem === 'text') ? t('alerts_problem_' + problem) : ''" level="error">
						<template #help><info-tip :choice="S.value" :title="valueLabel" /></template>
						<v-text-field id="al-value" v-model="draft.value" :type="numeric ? 'number' : 'text'" :step="numeric ? 'any' : undefined" :suffix="unitText" dense outlined hide-details spellcheck="false" :aria-label="valueLabel" :error="touched.value && (problem === 'number' || problem === 'text')" @blur="touched.value = true" />
					</wf-field>
				</div>
				<div class="mo-form">
					<wf-field v-if="numeric" id="al-hysteresis" class="mo-field-type" :label="t(S.hysteresis.label)">
						<template #help><info-tip :choice="S.hysteresis" :title="t(S.hysteresis.label)" /></template>
						<v-text-field id="al-hysteresis" v-model="draft.hysteresis" type="number" min="0" dense outlined hide-details :aria-label="t(S.hysteresis.label)" />
					</wf-field>
					<wf-field id="al-cooldown" class="mo-field-type" :label="t(S.cooldown.label)">
						<template #help><info-tip :choice="S.cooldown" :title="t(S.cooldown.label)" /></template>
						<v-text-field id="al-cooldown" v-model="draft.cooldown" type="number" min="0" dense outlined hide-details :aria-label="t(S.cooldown.label)" />
					</wf-field>
				</div>
				<v-dialog v-model="pickOpen" max-width="760" scrollable content-class="workshop-theme mo-page">
					<v-card class="workshop-theme mo-page">
						<v-card-title class="d-flex align-center">{{ t('alerts_find_path_title') }}<v-spacer /><v-btn icon small :aria-label="t('close')" :title="t('close')" @click="pickOpen = false"><v-icon>mdi-close</v-icon></v-btn></v-card-title>
						<v-card-text><path-picker :tick="tick" :wanted="numeric ? 'number' : ''" :hole-name="t(S.path.label)" @insert="usePath" /></v-card-text>
					</v-card>
				</v-dialog>
				<div class="d-flex align-center flex-wrap" style="gap:8px">
					<v-btn small depressed color="primary" :disabled="!!problem" @click="add">{{ t('alerts_add') }}</v-btn>
					<!-- the reason the button is grey is written next to it (a disabled button shows no tooltip on a touch screen) -->
					<span v-if="problem" class="text-caption mo-faint">{{ t('alerts_problem_' + problem) }}</span>
				</div>
				<div v-if="added" class="mo-note ok mt-2" role="status"><v-icon small>mdi-check-circle-outline</v-icon><span class="mo-note-text">{{ added }}</span></div>
			</v-card-text>
		</v-card>
		<v-card class="mb-3">
			<v-card-text>
				<div class="mo-head">
					<span class="mo-head-icon"><v-icon>mdi-history</v-icon></span>
					<div class="mo-head-text"><h2 class="mo-head-title">{{ t('alerts_events_title') }}</h2></div>
					<div class="mo-head-right"><v-btn small text :disabled="!monitor.events.length" @click="$emit('clear-events')">{{ t('alerts_events_clear') }}</v-btn></div>
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

<script>
'use strict'

// The in-page alerts (alert-rules.js, alert-monitor.js): the rules, a form to add one, the recent events and the sound switch. The
// page owns the monitor and evaluates it every sample, so the alerts keep running while another section is open; this section only
// edits the rules. They work only while the page is open: nothing on the Pi, no notice to a phone.
import i18n from '../../i18n'
import InfoTip from './InfoTip.vue'
import HelpTip from './HelpTip.vue' // vue/_shared36
import WfField from './WfField.vue' // vue/_shared36
import PathPicker from './PathPicker.vue'
import { ALERT_SETTINGS, OPS, COOLDOWN_DEFAULT_S, cleanRule, isNumericOp, ruleProblem } from './alert-rules.js'
import { describePath } from './path-dictionary.js'
import { isActive, EVENTS_KEPT } from './alert-monitor.js'

export default {
	components: { InfoTip, HelpTip, WfField, PathPicker },
	props: {
		monitor: { type: Object, required: true },
		watched: { type: Array, default: () => [] },
		tick: { type: Number, default: 0 } // the live model of the path finder
	},
	data() {
		return { draft: { path: '', op: 'above', value: '', hysteresis: 0, cooldown: COOLDOWN_DEFAULT_S }, touched: { path: false, value: false }, added: '', S: ALERT_SETTINGS, pickOpen: false }
	},
	computed: {
		numeric() {
			return isNumericOp(this.draft.op)
		},
		// what is missing in the form now (alert-rules.js ruleProblem): the Add button is off while there is something
		problem() {
			return ruleProblem(this.draft)
		},
		// the field of the limit says what it is for each operator, and a number is a number input with the unit of the path when the dictionary knows it
		valueLabel() {
			return this.t('alerts_value_' + this.draft.op)
		},
		unitText() {
			const d = this.numeric ? describePath(String(this.draft.path || '').trim()) : null
			return d && d.unitKey && d.unitKey !== 'dict_unit_bool' ? this.t(d.unitKey) : undefined
		},
		opItems() {
			return OPS.map(op => ({ title: this.t('alerts_op_' + op), value: op }))
		},
		rules() {
			return this.monitor.rules.map(r => ({
				id: r.id, enabled: r.enabled, firing: isActive(this.monitor, r.id),
				text: this.t('alerts_rule_line', { path: r.path, op: this.t('alerts_op_' + r.op), limit: r.value }),
				detail: this.t('alerts_rule_detail', { hysteresis: r.hysteresis, cooldown: r.cooldown })
			}))
		},
		events() {
			return this.monitor.events.slice(0, EVENTS_KEPT).map(e => ({
				t: e.t, id: e.id, type: e.type, clock: new Date(e.t).toTimeString().slice(0, 8),
				text: this.t('alerts_event_' + e.type, { path: e.path, op: this.t('alerts_op_' + e.op), limit: e.limit, value: e.value })
			}))
		}
	},
	methods: {
		t(k, p) {
			return i18n.t('plugins.WorkshopModel.model.' + k, p)
		},
		// a path chosen in the finder goes into the field of the rule and the finder closes
		usePath(path) {
			this.draft.path = path
			this.pickOpen = false
		},
		add() {
			const rule = cleanRule(Object.assign({}, this.draft))
			if (!rule || this.problem) return
			this.$emit('update-rules', this.monitor.rules.concat([rule]))
			// say what was saved and where (A8): the rule line as the list shows it, and that it is kept in this browser
			this.added = this.t('alerts_added', { rule: this.t('alerts_rule_line', { path: rule.path, op: this.t('alerts_op_' + rule.op), limit: rule.value }) })
			this.draft.value = ''
			this.touched = { path: false, value: false }
		},
		toggle(id, enabled) {
			this.$emit('update-rules', this.monitor.rules.map(r => (r.id === id ? Object.assign({}, r, { enabled }) : r)))
		},
		remove(id) {
			this.$emit('update-rules', this.monitor.rules.filter(r => r.id !== id))
		}
	}
}
</script>
