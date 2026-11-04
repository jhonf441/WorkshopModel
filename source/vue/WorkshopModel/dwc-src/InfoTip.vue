<template>
	<v-menu v-if="choice" :close-on-content-click="false" location="bottom end" max-width="380" content-class="workshop-theme mo-page">
		<template #activator="{ props: menu }">
			<v-btn icon="mdi-help-circle-outline" size="x-small" variant="text" class="mo-infotip" :aria-label="t('help_how') + ': ' + title" :title="t('help_how') + ': ' + title" v-bind="menu" />
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

<script setup>
// The help of ONE field as a small "?" button next to it that opens a card with the four lines (DESIGN.md section 7). The DWC 3.7 line is
// paused: this copy only keeps both lines with the same components; the 3.6 line uses it in the alert rule form.
import { i18n } from './dwc-host.js'

defineProps({
	choice: { type: Object, default: null },
	title: { type: String, default: '' }
})

const t = (k, p) => i18n.t('plugins.WorkshopModel.model.' + k, p)
</script>
