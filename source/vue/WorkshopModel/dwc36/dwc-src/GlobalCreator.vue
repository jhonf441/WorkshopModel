<template>
	<v-card class="mo-creator">
		<v-card-text>
			<div class="mo-head">
				<span class="mo-head-icon"><v-icon>mdi-plus-box-outline</v-icon></span>
				<div class="mo-head-text">
					<h2 class="mo-head-title">{{ t('look_creator_title') }}</h2>
					<p class="mo-head-lead">{{ t('look_creator_lead') }}</p>
				</div>
			</div>
			<div v-if="!globalsOk" class="mo-note warn" role="status"><v-icon small>mdi-alert-outline</v-icon><span class="mo-note-text">{{ t('globals_off_short') }}</span></div>
			<div v-else-if="!canEdit" class="mo-note" role="status"><v-icon small>mdi-eye-outline</v-icon><span class="mo-note-text">{{ t('look_globals_readonly') }}</span></div>
			<template v-else-if="done">
				<div class="mo-creator-done" role="status"><v-icon>mdi-check-circle-outline</v-icon>{{ t('look_creator_done', { name: done }) }}</div>
				<div class="mo-faint">{{ t('look_creator_keep_hint') }}</div>
				<div class="mo-actions">
					<v-btn small depressed color="primary" @click="again">{{ t('look_creator_another') }}</v-btn>
					<v-btn small text @click="$emit('close')">{{ t('close') }}</v-btn>
				</div>
			</template>
			<template v-else>
				<ol class="mo-creator-steps" :aria-label="t('look_creator_title')">
					<li v-for="(s, i) in CREATOR_STEPS" :key="s" class="mo-creator-step" :class="{ on: i === step, done: i < step }" :aria-current="i === step ? 'step' : null">
						<span class="mo-creator-n">{{ i < step ? '' : i + 1 }}<v-icon v-if="i < step" x-small>mdi-check</v-icon></span>{{ t('look_creator_step_' + s) }}
					</li>
				</ol>
				<template v-if="step === 0">
					<v-text-field :value="name" dense outlined hide-details autofocus spellcheck="false" class="mo-creator-field" :label="t('create_name')" :placeholder="t('create_name_hint')" @input="typeName($event)" @keydown.enter="next" />
					<div :class="nameFeedback.level === 'error' ? 'mo-error' : 'mo-faint'" :role="nameFeedback.level === 'error' ? 'alert' : 'status'">{{ nameText }}</div>
				</template>
				<template v-else-if="step === 1">
					<div class="mo-faint">{{ t('look_creator_type_pick') }}</div>
					<div class="mo-creator-types" role="group" :aria-label="t('look_creator_type_pick')">
						<button v-for="c in CREATOR_TYPES" :key="c.id" type="button" class="mo-creator-type" :aria-pressed="type === c.id ? 'true' : 'false'" @click="type = c.id">
							<v-icon small>{{ c.icon }}</v-icon>
							<span class="mo-creator-type-name">{{ t(c.label) }}</span>
							<span class="mo-creator-type-say">{{ t(c.what) }}</span>
						</button>
					</div>
					<choice-help :choice="typeChoice" :title="t(typeChoice.label)" />
				</template>
				<template v-else>
					<label v-if="type === 'bool'" class="mo-gcard-switch mo-creator-field">
						<v-switch :input-value="text === 'true'" dense inset color="success" hide-details :aria-label="t('look_creator_value_label', { name })" @change="typeValue($event ? 'true' : 'false')" />
						<span class="mo-gcard-value">{{ text === 'true' ? t('look_card_on') : t('look_card_off') }}</span>
					</label>
					<v-text-field v-else :value="text" dense outlined hide-details autofocus spellcheck="false" class="mo-creator-field" :inputmode="type === 'number' ? 'decimal' : 'text'" :label="t('look_creator_value_label', { name })" :placeholder="t('edit_value_hint_' + kind)" @input="typeValue($event)" />
					<div v-if="valueFeedback.level === 'error'" class="mo-error" role="alert">{{ t(valueFeedback.key) }}</div>
					<div v-else-if="valueFeedback.level === 'hint'" class="mo-faint" role="status">{{ t(valueFeedback.key) }}</div>
					<div class="mo-part mt-2">{{ t('look_creator_command') }}</div>
					<command-preview :code="result.ok ? result.code : ''" :can-send="result.ok" :disabled-reason="result.ok ? '' : t('preview_nothing')" @sent="onSent" />
				</template>
				<div class="mo-actions">
					<v-btn v-if="step > 0" small text @click="step--"><v-icon small left>mdi-chevron-left</v-icon>{{ t('look_creator_back') }}</v-btn>
					<v-btn v-if="step < 2" small depressed color="primary" :disabled="!canNext" @click="next">{{ t('look_creator_next') }}<v-icon small right>mdi-chevron-right</v-icon></v-btn>
					<v-btn small text @click="$emit('close')">{{ t('close') }}</v-btn>
				</div>
			</template>
		</v-card-text>
	</v-card>
</template>

<script>
'use strict'

// The guided creator of a global (2026-11-03), three steps in one dialog: the name (checked as it is typed, and against the globals
// that already exist), the type as big choices with one line each and the help fold of the chosen one (globals-quick.js
// CREATOR_TYPES: Number decides int or float by what is typed), and the value with the exact command shown before it goes to the
// board (CommandPreview.vue). Nothing is red until the person typed something wrong (editFeedback). Once sent it says so and offers
// to create another.
import i18n from '../../i18n'
import CommandPreview from './CommandPreview.vue'
import ChoiceHelp from './ChoiceHelp.vue'
import { editCommand, isValidGlobalName } from './globals-typing.js'
import { CREATOR_TYPES, CREATOR_STEPS, creatorKind, editFeedback } from './globals-quick.js'

export default {
	components: { CommandPreview, ChoiceHelp },
	props: {
		canEdit: { type: Boolean, default: true },
		globalsOk: { type: Boolean, default: true },
		existing: { type: Array, default: () => [] }
	},
	data() {
		return { step: 0, name: '', type: 'number', text: '', nameTouched: false, valueTouched: false, done: '', CREATOR_TYPES, CREATOR_STEPS }
	},
	computed: {
		typeChoice() {
			return CREATOR_TYPES.find(c => c.id === this.type) || CREATOR_TYPES[0]
		},
		kind() {
			return creatorKind(this.type, this.text)
		},
		taken() {
			return this.existing.indexOf(this.name.trim()) >= 0
		},
		nameOk() {
			return isValidGlobalName(this.name.trim()) && !this.taken
		},
		nameFeedback() {
			return editFeedback(this.nameTouched, this.nameOk ? { ok: true } : { ok: false, error: 'name' })
		},
		nameText() {
			if (this.taken && this.nameTouched) return this.t('look_creator_name_taken')
			if (this.nameFeedback.level === 'ok') return this.t('look_creator_name_ok')
			return this.nameFeedback.level === 'error' ? this.t('err_name') : this.t('look_creator_name_help')
		},
		result() {
			return editCommand(this.name.trim(), this.kind, this.text, false)
		},
		valueFeedback() {
			return editFeedback(this.valueTouched, this.result)
		},
		canNext() {
			return this.step === 0 ? this.nameOk : this.step === 1 ? !!this.typeChoice : this.result.ok
		}
	},
	methods: {
		t(k, p) {
			return i18n.t('plugins.WorkshopModel.model.' + k, p)
		},
		typeName(v) {
			this.name = v === null || v === undefined ? '' : String(v)
			this.nameTouched = true
		},
		typeValue(v) {
			this.text = v === null || v === undefined ? '' : String(v)
			this.valueTouched = true
		},
		next() {
			if (this.step < 2 && this.canNext) this.step++
			if (this.step === 2 && this.type === 'bool' && this.text !== 'true' && this.text !== 'false') this.text = 'false'
		},
		onSent() {
			this.done = this.name.trim()
			this.$emit('created', this.done)
		},
		again() {
			this.done = ''
			this.step = 0
			this.name = ''
			this.text = ''
			this.nameTouched = false
			this.valueTouched = false
		}
	}
}
</script>
