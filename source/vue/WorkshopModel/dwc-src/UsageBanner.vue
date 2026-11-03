<template>
	<div v-if="unscanned.length" class="mo-ubanner mo-ufade" role="status">
		<v-icon size="28" class="mo-ubanner-icon">mdi-folder-search-outline</v-icon>
		<div class="mo-ubanner-text">
			<div class="mo-ubanner-title">{{ t('usage_banner_title') }}</div>
			<div class="mo-faint">{{ t('usage_banner_reason', { n: unscanned.length }) }} {{ dirs }}</div>
		</div>
		<v-btn color="primary" size="small" variant="flat" @click="emit('scan-folders', unscanned)">{{ t('usage_banner_button') }}</v-btn>
	</div>
</template>

<script setup>
// One friendly banner for the folders the scan could not read (they could create a global, so some problems are only possible ones):
// a short reason and one button that reads them all and scans again.
import { computed } from 'vue'
import { i18n } from './dwc-host.js'

const SHOWN = 3

const props = defineProps({
	unscanned: { type: Array, default: () => [] }
})
const emit = defineEmits(['scan-folders'])

const t = (k, p) => i18n.t('plugins.WorkshopModel.model.' + k, p)

const dirs = computed(() => {
	const names = props.unscanned.slice(0, SHOWN).map(f => f.dir).join(', ')
	return props.unscanned.length > SHOWN ? names + ' ' + t('usage_banner_more', { n: props.unscanned.length - SHOWN }) : names
})
</script>
