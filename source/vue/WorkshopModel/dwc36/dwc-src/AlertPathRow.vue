<template>
	<span class="mo-apf-body">
		<code class="mo-apf-name">{{ row.path }}</code>
		<kind-chip :kind="row.kind" />
		<span v-if="row.branch" class="mo-apf-now">{{ size }}</span>
		<span v-else class="mo-apf-now">{{ row.text }}</span>
		<span v-if="about" class="mo-apf-about">{{ about }}</span>
	</span>
</template>

<script>
'use strict'

// The body of one row of the alert path finder (AlertPathFinder.vue): the path, its kind, its value now (or how many children it has) and what
// the path dictionary says it is. It is a .vue file and not a component with an inline string template: DWC 3.6 ships Vue without the
// template compiler, and such a component renders nothing (the rows of the finder were empty, 2026-11-22; tests/vue-no-template-string.test.js).
import i18n from '../../i18n'
import KindChip from './KindChip.vue'

export default {
	components: { KindChip },
	props: { row: { type: Object, required: true }, about: { type: String, default: '' } },
	computed: {
		size() {
			return i18n.t('plugins.WorkshopModel.model.pick_size', { n: this.row.size })
		}
	}
}
</script>
