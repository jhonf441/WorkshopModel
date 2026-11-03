<template>
	<div class="mo-sub">
		<div class="mo-part">{{ exists ? t('edit_title', { name }) : t('globals_create') }}</div>
		<div v-if="!globalsOk" class="mo-faint">{{ t('globals_off_short') }}</div>
		<div v-else-if="!canEdit" class="mo-faint">{{ t('read_only') }}</div>
		<template v-else>
			<div class="mo-form">
				<v-text-field v-if="!exists" v-model="newName" dense outlined hide-details class="mo-field" :label="t('create_name')" :placeholder="t('create_name_hint')" />
				<v-select v-model="kind" :items="typeItems" item-text="title" item-value="value" dense outlined hide-details class="mo-field mo-field-type" :label="t('edit_type')" />
				<v-select v-if="kind === 'bool'" v-model="text" :items="boolItems" item-text="title" item-value="value" dense outlined hide-details class="mo-field mo-field-type" :label="t('edit_value')" />
				<v-text-field v-else v-model="text" dense outlined hide-details class="mo-field" :label="t('edit_value')" :placeholder="t('edit_value_hint_' + kind)" />
			</div>
			<div v-if="result.error" class="mo-error" role="alert">{{ t('err_' + result.error) }}</div>
			<command-preview :code="result.ok ? result.code : ''" :can-send="result.ok" :disabled-reason="result.ok ? '' : t('preview_nothing')" @sent="onSent" />
			<template v-if="showPersist && exists">
				<v-switch :input-value="persistent" dense color="primary" hide-details :label="t('persist_switch')" @change="togglePersist" />
				<div class="mo-faint">{{ t('persist_help') }}</div>
			</template>
			<div v-if="exists" class="mo-faint mt-1">{{ t('cannot_delete_text') }}</div>
		</template>
	</div>
</template>

<script>
'use strict'

// Typed editor of ONE global (globals-typing.js): the person picks the type and writes the value, the plugin writes the RRF
// literal and the command, CommandPreview shows and sends it. With exists=false it creates a new global (name field). The
// "persistent" switch hands the LIVE value of the global to the page, which rewrites the persistence macro.
import i18n from '../../i18n'
import CommandPreview from './CommandPreview.vue'
import { GLOBAL_TYPES, editCommand, editText, rrfLiteral, typeOfValue } from './globals-typing.js'
import { toPlain } from './value-format.js'

export default {
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
		return { kind: 'int', text: '', newName: '' }
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
			}
		}
	},
	methods: {
		t(k, p) {
			return i18n.t('plugins.WorkshopModel.model.' + k, p)
		},
		togglePersist(on) {
			this.$emit('persist', this.name, on ? rrfLiteral(toPlain(this.value)) : null)
		},
		onSent(reply) {
			this.$emit('sent', reply)
			if (!this.exists) {
				this.newName = ''
				this.text = ''
			}
		}
	}
}
</script>
