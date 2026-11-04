<template>
	<v-dialog :model-value="true" max-width="820" scrollable content-class="workshop-theme mo-page" @update:model-value="emit('close')">
		<v-card class="workshop-theme mo-page mo-gdetail">
			<div class="mo-rs-head">
				<span class="mo-rs-badge" aria-hidden="true"><v-icon :size="22">mdi-variable</v-icon></span>
				<div class="mo-rs-head-txt">
					<div class="mo-rs-title" role="heading" aria-level="2">{{ item.name }}</div>
					<div class="mo-faint"><code class="mo-key">{{ item.path }}</code></div>
				</div>
				<v-btn icon size="small" variant="text" :aria-label="t('close')" :title="t('close')" @click="emit('close')"><v-icon :size="20">mdi-close</v-icon></v-btn>
			</div>
			<v-card-text class="mo-gdetail-body">
				<global-row :item="item" :pinned="pinned" :can-edit="canEdit" :globals-ok="globalsOk" :tick="tick" :usage-cache="usageCache" />
			</v-card-text>
		</v-card>
	</v-dialog>
</template>

<script setup>
// The detail of one global in a dialog (the 3.6 line shows the list as rows and opens this on a click; the 3.7 line keeps its cards for now and
// this file is here so both lines have the same components). It wraps the card of the row.
import { i18n } from './dwc-host.js'
import GlobalRow from './GlobalRow.vue'

defineProps({
	item: { type: Object, required: true },
	pinned: { type: Array, default: () => [] },
	canEdit: { type: Boolean, default: true },
	globalsOk: { type: Boolean, default: true },
	tick: { type: Number, default: 0 },
	usageCache: { type: Map, default: () => new Map() }
})
const emit = defineEmits(['close'])
const t = (k, p) => i18n.t('plugins.WorkshopModel.model.' + k, p)
</script>
