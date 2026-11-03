<template>
	<details v-if="choice" class="wf-more mo-choice-help">
		<summary>{{ title }}</summary>
		<dl class="mo-help-list">
			<dt>{{ t('help_what') }}</dt><dd>{{ t(choice.what) }}</dd>
			<dt>{{ t('help_why') }}</dt><dd>{{ t(choice.why) }}</dd>
			<dt>{{ t('help_missing') }}</dt><dd>{{ t(choice.ifMissing) }}</dd>
			<dt>{{ t('help_how') }}</dt><dd>{{ t(choice.help) }}</dd>
		</dl>
	</details>
</template>

<script>
'use strict'

// The help of one choice (DESIGN.md section 7: what it is, what it is for, what you lose without it, how to use it) in a fold that
// stays closed until the person opens it, so the page keeps one line of help under each title.
import i18n from '../../i18n'

export default {
	props: {
		choice: { type: Object, default: null },
		title: { type: String, default: '' }
	},
	methods: {
		t(k, p) {
			return i18n.t('plugins.WorkshopModel.model.' + k, p)
		}
	}
}
</script>
