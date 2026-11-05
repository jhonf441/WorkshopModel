<template>
	<div class="wf-field-label">
		<span>{{ text }}</span>
		<info-tip :choice="choice" :title="text" />
	</div>
</template>

<script>
'use strict'

// A label with its "?" beside it (H1, AYUDAS.md): the name of the thing a choice object describes (a view tab, a mode, a scope) and the shared help
// button with the four lines of that choice. It stands where the old fold of text sat under the control, so the page keeps one short line.
import i18n from '../../i18n'
import InfoTip from './InfoTip.vue'

export default {
	components: { InfoTip },
	props: {
		choice: { type: Object, required: true },
		label: { type: String, default: '' } // the text of the label; empty: the label of the choice
	},
	computed: {
		text() {
			return this.label || i18n.t('plugins.WorkshopModel.model.' + this.choice.label)
		}
	}
}
</script>
