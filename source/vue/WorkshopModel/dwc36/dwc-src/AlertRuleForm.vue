<template>
	<div class="mo-rule-form">
		<div class="mo-form mo-alert-form">
			<wf-field :id="uid + '-path'" class="mo-field" :label="t(S.path.label)" :message="touched.path && problem === 'path' ? t('alerts_problem_path') : ''" level="error">
				<template #help><info-tip :choice="S.path" :title="t(S.path.label)" /></template>
				<path-select :id="uid + '-path'" :value="draft.path" :numeric="numeric" :watched="watched" :tick="tick" :aria-label="t(S.path.label)" :error="touched.path && problem === 'path'" @input="draft.path = $event" @blur="touched.path = true" />
			</wf-field>
			<v-btn outlined class="mo-field-find" :title="t('alerts_find_path_help')" @click="pickOpen = true"><v-icon small left>mdi-magnify</v-icon>{{ t('alerts_find_path') }}</v-btn>
		</div>
		<div class="mo-form mo-alert-form">
			<wf-field :id="uid + '-op'" class="mo-field-type" :label="t(S.op.label)">
				<template #help><info-tip :choice="S.op" :title="t(S.op.label)" /></template>
				<v-select :id="uid + '-op'" v-model="draft.op" :items="opItems" item-text="title" item-value="value" dense outlined hide-details :aria-label="t(S.op.label)" />
			</wf-field>
			<wf-field :id="uid + '-value'" class="mo-field" :label="valueLabel" :message="touched.value && (problem === 'number' || problem === 'text') ? t('alerts_problem_' + problem) : ''" level="error">
				<template #help><info-tip :choice="S.value" :title="valueLabel" /></template>
				<v-text-field :id="uid + '-value'" v-model="draft.value" :type="numeric ? 'number' : 'text'" :step="numeric ? 'any' : undefined" :suffix="unitText" dense outlined hide-details spellcheck="false" :aria-label="valueLabel" :error="touched.value && (problem === 'number' || problem === 'text')" @blur="touched.value = true" />
			</wf-field>
		</div>
		<div class="mo-form mo-alert-form">
			<wf-field v-if="numeric" :id="uid + '-hysteresis'" class="mo-field-type" :label="t(S.hysteresis.label)">
				<template #help><info-tip :choice="S.hysteresis" :title="t(S.hysteresis.label)" /></template>
				<v-text-field :id="uid + '-hysteresis'" v-model="draft.hysteresis" type="number" min="0" dense outlined hide-details :aria-label="t(S.hysteresis.label)" />
			</wf-field>
			<wf-field :id="uid + '-cooldown'" class="mo-field-type" :label="t(S.cooldown.label)">
				<template #help><info-tip :choice="S.cooldown" :title="t(S.cooldown.label)" /></template>
				<v-text-field :id="uid + '-cooldown'" v-model="draft.cooldown" type="number" min="0" dense outlined hide-details :aria-label="t(S.cooldown.label)" />
			</wf-field>
			<wf-field :id="uid + '-alias'" class="mo-field" :label="t('alerts2_alias')" :message="t('alerts2_alias_hint')">
				<v-text-field :id="uid + '-alias'" v-model="draft.alias" :maxlength="ALIAS_MAX" counter dense outlined hide-details spellcheck="false" :aria-label="t('alerts2_alias')" />
			</wf-field>
		</div>
		<v-dialog v-model="pickOpen" max-width="760" scrollable content-class="workshop-theme mo-page">
			<v-card class="workshop-theme mo-page">
				<v-card-title class="d-flex align-center">{{ t('alerts_find_path_title') }}<v-spacer /><v-btn icon small :aria-label="t('close')" :title="t('close')" @click="pickOpen = false"><v-icon>mdi-close</v-icon></v-btn></v-card-title>
				<v-card-text><alert-path-finder :tick="tick" :numeric="numeric" @insert="usePath" /></v-card-text>
			</v-card>
		</v-dialog>
		<div class="mo-rule-form-actions">
			<v-btn depressed color="primary" :disabled="!!problem" @click="save">{{ saveLabel }}</v-btn>
			<v-btn v-if="editing" outlined @click="$emit('cancel')">{{ t('alerts2_cancel') }}</v-btn>
			<!-- the reason the button is grey is written next to it (a disabled button shows no tooltip on a touch screen) -->
			<span v-if="problem && !fieldSaysProblem" class="text-caption mo-faint">{{ t('alerts_problem_' + problem) }}</span>
		</div>
	</div>
</template>

<script>
'use strict'

// The form of ONE alert rule, to add a new one or to edit one in place (AlertsSection.vue): path (select with the guided finder), operator, limit, hysteresis,
// cooldown and the optional alias. It says which field is wrong once touched and keeps Save off until alert-rules.js ruleProblem has nothing to say.
// It never changes the rules: it hands the clean rule to the section ('save').
import i18n from '../../i18n'
import InfoTip from './InfoTip.vue'
import WfField from './WfField.vue' // vue/_shared36
import PathSelect from './PathSelect.vue'
import AlertPathFinder from './AlertPathFinder.vue'
import { ALERT_SETTINGS, ALIAS_MAX, OPS, COOLDOWN_DEFAULT_S, cleanRule, isNumericOp, ruleProblem } from './alert-rules.js'
import { describePath } from './path-dictionary.js'

let seq = 0

export default {
	components: { InfoTip, WfField, PathSelect, AlertPathFinder },
	props: {
		rule: { type: Object, default: null }, // the rule being edited; null for a new one
		watched: { type: Array, default: () => [] },
		tick: { type: Number, default: 0 } // the live model of the path finder
	},
	data() {
		const r = this.rule
		return {
			uid: 'al-form-' + (seq++),
			draft: r ? { path: r.path, alias: r.alias || '', op: r.op, value: String(r.value), hysteresis: r.hysteresis, cooldown: r.cooldown } : { path: '', alias: '', op: 'above', value: '', hysteresis: 0, cooldown: COOLDOWN_DEFAULT_S },
			touched: { path: false, value: false }, S: ALERT_SETTINGS, ALIAS_MAX, pickOpen: false
		}
	},
	computed: {
		editing() {
			return !!this.rule
		},
		saveLabel() {
			return this.t(this.editing ? 'alerts2_save' : 'alerts_add')
		},
		numeric() {
			return isNumericOp(this.draft.op)
		},
		// what is missing in the form now (alert-rules.js ruleProblem): Save is off while there is something
		problem() {
			return ruleProblem(this.draft)
		},
		// the problem is written ONCE: under the field once the person touched it, next to the button until then
		fieldSaysProblem() {
			const p = this.problem
			return (p === 'path' && this.touched.path) || ((p === 'number' || p === 'text') && this.touched.value)
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
		save() {
			if (this.problem) return
			const keep = this.rule ? { id: this.rule.id, enabled: this.rule.enabled } : {}
			const rule = cleanRule(Object.assign({}, this.draft, keep))
			if (!rule) return
			this.$emit('save', rule)
			if (!this.editing) {
				this.draft.value = ''
				this.draft.alias = ''
				this.touched = { path: false, value: false }
			}
		}
	}
}
</script>

<style>
.mo-page .mo-rule-form-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
</style>
