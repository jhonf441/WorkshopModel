<template>
	<div class="mo-sub mo-editor">
		<div class="mo-part">{{ exists ? t('edit_title', { name }) : t('globals_create') }}</div>
		<div v-if="!globalsOk" class="mo-faint">{{ t('globals_off_short') }}</div>
		<div v-else-if="!canEdit" class="mo-faint">{{ t('read_only') }}</div>
		<template v-else>
			<div class="mo-form">
				<v-text-field v-if="!exists" :model-value="newName" density="compact" variant="outlined" hide-details class="mo-field" :label="t('create_name')" :placeholder="t('create_name_hint')" @update:model-value="typeName($event)" />
				<v-select v-model="kind" :items="typeItems" item-title="title" item-value="value" density="compact" variant="outlined" hide-details class="mo-field mo-field-type" :label="t('edit_type')" />
				<v-select v-if="kind === 'bool'" :model-value="text" :items="boolItems" item-title="title" item-value="value" density="compact" variant="outlined" hide-details class="mo-field mo-field-type" :label="t('edit_value')" @update:model-value="typeValue($event)" />
				<v-text-field v-else :model-value="text" density="compact" variant="outlined" hide-details class="mo-field" :label="t('edit_value')" :placeholder="t('edit_value_hint_' + kind)" @update:model-value="typeValue($event)" />
			</div>
			<div v-if="feedback.level === 'error'" class="mo-error" role="alert">{{ t(feedback.key) }}</div>
			<div v-else-if="feedback.level === 'hint'" class="mo-faint" role="status">{{ t(feedback.key) }}</div>
			<command-preview :code="result.ok ? result.code : ''" :can-send="result.ok" :disabled-reason="result.ok ? '' : t('preview_nothing')" @sent="onSent" />
			<template v-if="showPersist && exists">
				<v-switch :model-value="persistent" density="compact" color="success" hide-details inset :label="t('persist_switch')" @update:model-value="togglePersist" />
				<div class="mo-faint">{{ t('persist_help') }}</div>
			</template>
			<div v-if="exists" class="mo-faint mt-1">{{ t('cannot_delete_text') }}</div>
		</template>
	</div>
</template>

<script setup>
// Typed editor of ONE global (globals-typing.js): the person picks the type and writes the value, the plugin writes the RRF
// literal and the command, CommandPreview shows and sends it. With exists=false it creates a new global (name field). The
// "persistent" switch hands the LIVE value of the global to the page, which rewrites the persistence macro. An untouched field is
// never red (globals-quick.js editFeedback): a global without a value gets a calm hint and the Send button simply waits.
import { computed, ref, watch } from 'vue'
import { i18n } from './dwc-host.js'
import CommandPreview from './CommandPreview.vue'
import { GLOBAL_TYPES, editCommand, editText, rrfLiteral, typeOfValue } from './globals-typing.js'
import { toPlain } from './value-format.js'
import { editFeedback, hasNoValue } from './globals-quick.js'

const props = defineProps({
	name: { type: String, default: '' },
	exists: { type: Boolean, default: true },
	value: { default: null },
	canEdit: { type: Boolean, default: true },
	globalsOk: { type: Boolean, default: true },
	persistent: { type: Boolean, default: false },
	showPersist: { type: Boolean, default: false }
})
const emit = defineEmits(['persist', 'sent'])

const t = (k, p) => i18n.t('plugins.WorkshopModel.model.' + k, p)

const kind = ref('int')
const text = ref('')
const newName = ref('')
const touched = ref(false)

const typeItems = computed(() => GLOBAL_TYPES.map(v => ({ value: v, title: t('type_' + v) })))
const boolItems = computed(() => [{ value: 'true', title: t('bool_true') }, { value: 'false', title: t('bool_false') }])

// the editor starts from the live value when another global is chosen; while the person types, a poll does not touch the text
watch(() => props.name, () => {
	const k = typeOfValue(props.value)
	kind.value = GLOBAL_TYPES.indexOf(k) >= 0 ? k : 'int'
	text.value = editText(props.value)
	touched.value = false
}, { immediate: true })

const result = computed(() => editCommand(props.exists ? props.name : newName.value.trim(), kind.value, text.value, props.exists))
const feedback = computed(() => editFeedback(touched.value, result.value, props.exists ? !hasNoValue(props.value) : undefined))

function typeName(v) {
	newName.value = v === null || v === undefined ? '' : String(v)
	touched.value = true
}
function typeValue(v) {
	text.value = v === null || v === undefined ? '' : String(v)
	touched.value = true
}
function togglePersist(on) {
	emit('persist', props.name, on ? rrfLiteral(toPlain(props.value)) : null)
}

function onSent(reply) {
	emit('sent', reply)
	if (!props.exists) {
		newName.value = ''
		text.value = ''
		touched.value = false
	}
}
</script>
