<template>
	<div class="wf-tabs mo-view-tabs" role="tablist" :aria-label="label || t('view_selector_label')">
		<button
			v-for="(c, i) in choices" :key="c.id" type="button" class="wf-tab" role="tab" :aria-selected="c.id === current ? 'true' : 'false'" :tabindex="c.id === current ? 0 : -1"
			@click="emit('pick', c.id)" @keydown.right.prevent="step(i, 1)" @keydown.left.prevent="step(i, -1)"
		>
			<v-icon size="16">{{ c.icon }}</v-icon>{{ t(c.label) }}
		</button>
	</div>
</template>

<script setup>
// The selector of the views of the live model (view-choices.js): second-level tabs of the design family (.wf-tabs, DESIGN.md
// section 3), one per view, the open one marked by the color line of the section. The arrow keys move between them. The same tabs
// pick the other choices of the page (what a snapshot keeps, how the tester asks), with their own label.
import { i18n } from './dwc-host.js'

const props = defineProps({
	choices: { type: Array, default: () => [] },
	current: { type: String, default: '' },
	label: { type: String, default: '' }
})
const emit = defineEmits(['pick'])

const t = (k, p) => i18n.t('plugins.WorkshopModel.model.' + k, p)

function step(i, d) {
	const n = props.choices.length
	if (n) emit('pick', props.choices[(i + d + n) % n].id)
}
</script>
