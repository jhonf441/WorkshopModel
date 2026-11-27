<template>
	<div class="mo-view-switch">
		<!-- on a phone (width under 600) six tabs filled three rows: one selector of the view instead (CSS shows one of the two); the kiosk keeps the tabs -->
		<v-select
			v-if="choices.length > 3" class="mo-view-select" :value="current" :items="selectItems" item-text="text" item-value="id" dense outlined hide-details :label="label || t('view_selector_label')"
			@change="$emit('pick', $event)"
		/>
	<div class="wf-tabs mo-view-tabs" role="tablist" :aria-label="label || t('view_selector_label')">
		<button
			v-for="(c, i) in choices" :key="c.id" type="button" class="wf-tab" role="tab" :aria-selected="c.id === current ? 'true' : 'false'" :tabindex="c.id === current ? 0 : -1"
			@click="$emit('pick', c.id)" @keydown.right.prevent="step(i, 1)" @keydown.left.prevent="step(i, -1)"
		>
			<v-icon :size="16">{{ c.icon }}</v-icon>{{ t(c.label) }}
		</button>
	</div>
	</div>
</template>

<script>
'use strict'

// The selector of the views of the live model (view-choices.js): second-level tabs of the design family (.wf-tabs, DESIGN.md
// section 3), one per view, the open one marked by the color line of the section. The arrow keys move between them. The same tabs
// pick the other choices of the page (what a snapshot keeps, how the tester asks), with their own label.
import i18n from '../../i18n'

export default {
	props: {
		choices: { type: Array, default: () => [] },
		current: { type: String, default: '' },
		label: { type: String, default: '' }
	},
	computed: {
		selectItems() {
			return this.choices.map(c => ({ id: c.id, text: this.t(c.label) }))
		}
	},
	methods: {
		t(k, p) {
			return i18n.t('plugins.WorkshopModel.model.' + k, p)
		},
		step(i, d) {
			const n = this.choices.length
			if (n) this.$emit('pick', this.choices[(i + d + n) % n].id)
		}
	}
}
</script>
