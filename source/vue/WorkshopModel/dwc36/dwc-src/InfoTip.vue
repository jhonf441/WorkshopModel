<template>
	<v-menu v-if="choice" :close-on-content-click="false" offset-y left max-width="380" content-class="workshop-theme mo-page">
		<template v-slot:activator="{ on, attrs }">
			<v-btn icon x-small class="mo-infotip" :aria-label="t('help_how') + ': ' + title" :title="t('help_how') + ': ' + title" v-bind="attrs" v-on="on">
				<v-icon :size="20">mdi-help-circle-outline</v-icon>
			</v-btn>
		</template>
		<v-card class="mo-infotip-card">
			<v-card-text>
				<div class="mo-infotip-title">{{ title }}</div>
				<dl class="mo-help-list">
					<dt>{{ t('help_what') }}</dt><dd>{{ t(choice.what) }}</dd>
					<dt>{{ t('help_why') }}</dt><dd>{{ t(choice.why) }}</dd>
					<dt>{{ t('help_missing') }}</dt><dd>{{ t(choice.ifMissing) }}</dd>
					<dt>{{ t('help_how') }}</dt><dd>{{ t(choice.help) }}</dd>
				</dl>
			</v-card-text>
		</v-card>
	</v-menu>
</template>

<script>
'use strict'

// The help of ONE field as a small "?" button next to it that opens a card with the four lines (what it is, what it is for, what you lose
// without it, how to use it; DESIGN.md section 7). It replaces a fold of text under every input: a form with many fields kept saying
// "How to use it" over and over. The same choice objects as choice-help.vue, so the texts and their tests are the same.
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

<style>
.mo-page .mo-infotip { margin-top: 2px; }
.mo-infotip-card { max-width: 380px; }
.mo-infotip-card .mo-infotip-title { font-size: 14px; font-weight: 600; margin-bottom: 6px; }
</style>
