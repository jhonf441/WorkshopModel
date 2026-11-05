<template>
	<div class="mo-sub mo-editor">
		<div class="mo-part">{{ exists ? t('edit_title', { name }) : t('globals_create') }}</div>
		<div v-if="!globalsOk" class="mo-faint">{{ t('globals_off_short') }}</div>
		<div v-else-if="!canEdit" class="mo-faint">{{ readOnlyLine(t('read_only')) }}</div>
		<template v-else>
			<div class="mo-form">
				<v-text-field v-if="!exists" :value="newName" dense outlined hide-details class="mo-field" :label="t('create_name')" :placeholder="t('create_name_hint')" @input="typeName($event)" />
				<v-select v-model="kind" :items="typeItems" item-text="title" item-value="value" dense outlined hide-details class="mo-field mo-field-type" :label="t('edit_type')" />
				<v-select v-if="kind === 'bool'" :value="text" :items="boolItems" item-text="title" item-value="value" dense outlined hide-details class="mo-field mo-field-type" :label="t('edit_value')" @change="typeValue($event)" />
				<v-text-field v-else :value="text" dense outlined hide-details class="mo-field" :label="t('edit_value')" :placeholder="t('edit_value_hint_' + kind)" @input="typeValue($event)" />
			</div>
			<div v-if="feedback.level === 'error'" class="mo-error" role="alert">{{ t(feedback.key) }}</div>
			<div v-else-if="feedback.level === 'hint'" class="mo-faint" role="status">{{ t(feedback.key) }}</div>
			<command-preview :code="result.ok ? result.code : ''" :can-send="result.ok" :disabled-reason="result.ok ? '' : t('preview_nothing')" @sent="onSent" />
			<template v-if="showPersist && exists">
				<v-switch :input-value="persistent" dense inset color="success" hide-details :label="t('persist_switch')" @change="togglePersist" />
				<div class="mo-faint">{{ t('persist_help') }}</div>
			</template>
			<div v-if="exists" class="mo-faint mt-1">{{ t('cannot_delete_text') }}</div>
		</template>
	</div>
</template>

<script>
'use strict'
import { readOnlyNote } from './read-only-note.js'

// Typed editor of ONE global (globals-typing.js): the person picks the type and writes the value, the plugin writes the RRF
// literal and the command, CommandPreview shows and sends it. With exists=false it creates a new global (name field). The
// "persistent" switch hands the LIVE value of the global to the page, which rewrites the persistence macro. An untouched field is
// never red (globals-quick.js editFeedback): a global without a value gets a calm hint and the Send button simply waits.
import i18n from '../../i18n'
import CommandPreview from './CommandPreview.vue'
import { GLOBAL_TYPES, editCommand, editText, rrfLiteral, typeOfValue } from './globals-typing.js'
import { toPlain } from './value-format.js'
import { editFeedback, hasNoValue } from './globals-quick.js'

export default {
	mixins: [readOnlyNote],
	components: { CommandPreview },
	props: {
		name: { type: String, default: '' },
		exists: { type: Boolean, default: true },
		value: { default: null },
		canEdit: { type: Boolean, default: true },
		globalsOk: { type: Boolean, default: true },
		persistent: { type: Boolean, default: false },
		showPersist: { type: Boolean, default: false }
	},
	data() {
		return { kind: 'int', text: '', newName: '', touched: false }
	},
	computed: {
		typeItems() {
			return GLOBAL_TYPES.map(v => ({ value: v, title: this.t('type_' + v) }))
		},
		boolItems() {
			return [{ value: 'true', title: this.t('bool_true') }, { value: 'false', title: this.t('bool_false') }]
		},
		result() {
			return editCommand(this.exists ? this.name : this.newName.trim(), this.kind, this.text, this.exists)
		},
		feedback() {
			return editFeedback(this.touched, this.result, this.exists ? !hasNoValue(this.value) : undefined)
		}
	},
	watch: {
		// the editor starts from the live value when another global is chosen; while the person types, a poll does not touch the text
		name: {
			immediate: true,
			handler() {
				const k = typeOfValue(this.value)
				this.kind = GLOBAL_TYPES.indexOf(k) >= 0 ? k : 'int'
				this.text = editText(this.value)
				this.touched = false
			}
		}
	},
	methods: {
		t(k, p) {
			return i18n.t('plugins.WorkshopModel.model.' + k, p)
		},
		typeName(v) {
			this.newName = v === null || v === undefined ? '' : String(v)
			this.touched = true
		},
		typeValue(v) {
			this.text = v === null || v === undefined ? '' : String(v)
			this.touched = true
		},
		togglePersist(on) {
			this.$emit('persist', this.name, on ? rrfLiteral(toPlain(this.value)) : null)
		},
		onSent(reply) {
			this.$emit('sent', reply)
			if (!this.exists) {
				this.newName = ''
				this.text = ''
				this.touched = false
			}
		}
	}
}
</script>
