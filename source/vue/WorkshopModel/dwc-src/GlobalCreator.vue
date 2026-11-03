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
			<div v-if="!globalsOk" class="mo-note warn" role="status"><v-icon size="small">mdi-alert-outline</v-icon><span class="mo-note-text">{{ t('globals_off_short') }}</span></div>
			<div v-else-if="!canEdit" class="mo-note" role="status"><v-icon size="small">mdi-eye-outline</v-icon><span class="mo-note-text">{{ t('look_globals_readonly') }}</span></div>
			<template v-else-if="done">
				<div class="mo-creator-done" role="status"><v-icon>mdi-check-circle-outline</v-icon>{{ t('look_creator_done', { name: done }) }}</div>
				<div class="mo-faint">{{ t('look_creator_keep_hint') }}</div>
				<div class="mo-actions">
					<v-btn size="small" variant="flat" color="primary" @click="again">{{ t('look_creator_another') }}</v-btn>
					<v-btn size="small" variant="text" @click="emit('close')">{{ t('close') }}</v-btn>
				</div>
			</template>
			<template v-else>
				<ol class="mo-creator-steps" :aria-label="t('look_creator_title')">
					<li v-for="(s, i) in CREATOR_STEPS" :key="s" class="mo-creator-step" :class="{ on: i === step, done: i < step }" :aria-current="i === step ? 'step' : null">
						<span class="mo-creator-n">{{ i < step ? '' : i + 1 }}<v-icon v-if="i < step" size="x-small">mdi-check</v-icon></span>{{ t('look_creator_step_' + s) }}
					</li>
				</ol>
				<template v-if="step === 0">
					<v-text-field :model-value="name" density="compact" variant="outlined" hide-details autofocus spellcheck="false" class="mo-creator-field" :label="t('create_name')" :placeholder="t('create_name_hint')" @update:model-value="typeName($event)" @keydown.enter="next" />
					<div :class="nameFeedback.level === 'error' ? 'mo-error' : 'mo-faint'" :role="nameFeedback.level === 'error' ? 'alert' : 'status'">{{ nameText }}</div>
				</template>
				<template v-else-if="step === 1">
					<div class="mo-faint">{{ t('look_creator_type_pick') }}</div>
					<div class="mo-creator-types" role="group" :aria-label="t('look_creator_type_pick')">
						<button v-for="c in CREATOR_TYPES" :key="c.id" type="button" class="mo-creator-type" :aria-pressed="type === c.id ? 'true' : 'false'" @click="type = c.id">
							<v-icon size="small">{{ c.icon }}</v-icon>
							<span class="mo-creator-type-name">{{ t(c.label) }}</span>
							<span class="mo-creator-type-say">{{ t(c.what) }}</span>
						</button>
					</div>
					<choice-help :choice="typeChoice" :title="t(typeChoice.label)" />
				</template>
				<template v-else>
					<label v-if="type === 'bool'" class="mo-gcard-switch mo-creator-field">
						<v-switch :model-value="text === 'true'" density="compact" color="success" hide-details inset :aria-label="t('look_creator_value_label', { name })" @update:model-value="typeValue($event ? 'true' : 'false')" />
						<span class="mo-gcard-value">{{ text === 'true' ? t('look_card_on') : t('look_card_off') }}</span>
					</label>
					<v-text-field v-else :model-value="text" density="compact" variant="outlined" hide-details autofocus spellcheck="false" class="mo-creator-field" :inputmode="type === 'number' ? 'decimal' : 'text'" :label="t('look_creator_value_label', { name })" :placeholder="t('edit_value_hint_' + kind)" @update:model-value="typeValue($event)" />
					<div v-if="valueFeedback.level === 'error'" class="mo-error" role="alert">{{ t(valueFeedback.key) }}</div>
					<div v-else-if="valueFeedback.level === 'hint'" class="mo-faint" role="status">{{ t(valueFeedback.key) }}</div>
					<div class="mo-part mt-2">{{ t('look_creator_command') }}</div>
					<command-preview :code="result.ok ? result.code : ''" :can-send="result.ok" :disabled-reason="result.ok ? '' : t('preview_nothing')" @sent="onSent" />
				</template>
				<div class="mo-actions">
					<v-btn v-if="step > 0" size="small" variant="text" @click="step--"><v-icon size="small" start>mdi-chevron-left</v-icon>{{ t('look_creator_back') }}</v-btn>
					<v-btn v-if="step < 2" size="small" variant="flat" color="primary" :disabled="!canNext" @click="next">{{ t('look_creator_next') }}<v-icon size="small" end>mdi-chevron-right</v-icon></v-btn>
					<v-btn size="small" variant="text" @click="emit('close')">{{ t('close') }}</v-btn>
				</div>
			</template>
		</v-card-text>
	</v-card>
</template>

<script setup>
// The guided creator of a global (2026-11-03), three steps in one dialog: the name (checked as it is typed, and against the globals
// that already exist), the type as big choices with one line each and the help fold of the chosen one (globals-quick.js
// CREATOR_TYPES: Number decides int or float by what is typed), and the value with the exact command shown before it goes to the
// board (CommandPreview.vue). Nothing is red until the person typed something wrong (editFeedback). Once sent it says so and offers
// to create another.
import { computed, ref } from 'vue'
import { i18n } from './dwc-host.js'
import CommandPreview from './CommandPreview.vue'
import ChoiceHelp from './ChoiceHelp.vue'
import { editCommand, isValidGlobalName } from './globals-typing.js'
import { CREATOR_TYPES, CREATOR_STEPS, creatorKind, editFeedback } from './globals-quick.js'

const props = defineProps({
	canEdit: { type: Boolean, default: true },
	globalsOk: { type: Boolean, default: true },
	existing: { type: Array, default: () => [] }
})
const emit = defineEmits(['close', 'created'])

const t = (k, p) => i18n.t('plugins.WorkshopModel.model.' + k, p)

const step = ref(0)
const name = ref('')
const type = ref('number')
const text = ref('')
const nameTouched = ref(false)
const valueTouched = ref(false)
const done = ref('')

const typeChoice = computed(() => CREATOR_TYPES.find(c => c.id === type.value) || CREATOR_TYPES[0])
const kind = computed(() => creatorKind(type.value, text.value))
const taken = computed(() => props.existing.indexOf(name.value.trim()) >= 0)
const nameOk = computed(() => isValidGlobalName(name.value.trim()) && !taken.value)
const nameFeedback = computed(() => editFeedback(nameTouched.value, nameOk.value ? { ok: true } : { ok: false, error: 'name' }))
const nameText = computed(() => {
	if (taken.value && nameTouched.value) return t('look_creator_name_taken')
	if (nameFeedback.value.level === 'ok') return t('look_creator_name_ok')
	return nameFeedback.value.level === 'error' ? t('err_name') : t('look_creator_name_help')
})
const result = computed(() => editCommand(name.value.trim(), kind.value, text.value, false))
const valueFeedback = computed(() => editFeedback(valueTouched.value, result.value))
const canNext = computed(() => (step.value === 0 ? nameOk.value : step.value === 1 ? !!typeChoice.value : result.value.ok))

function typeName(v) {
	name.value = v === null || v === undefined ? '' : String(v)
	nameTouched.value = true
}
function typeValue(v) {
	text.value = v === null || v === undefined ? '' : String(v)
	valueTouched.value = true
}
function next() {
	if (step.value < 2 && canNext.value) step.value++
	if (step.value === 2 && type.value === 'bool' && text.value !== 'true' && text.value !== 'false') text.value = 'false'
}
function onSent() {
	done.value = name.value.trim()
	emit('created', done.value)
}
function again() {
	done.value = ''
	step.value = 0
	name.value = ''
	text.value = ''
	nameTouched.value = false
	valueTouched.value = false
}
</script>
