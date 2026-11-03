<template>
	<div class="mo-uscan">
		<div class="mo-actions">
			<v-btn color="primary" variant="flat" :disabled="scanning" @click="emit('scan')"><v-icon size="18" class="mr-1">mdi-magnify-scan</v-icon>{{ scanning ? t('usage_scanning', { i: done, n: total }) : (result ? t('usage_scan_again') : t('usage_scan')) }}</v-btn>
			<v-btn v-if="scanning" size="small" variant="text" @click="emit('cancel')">{{ t('cancel') }}</v-btn>
		</div>
		<div v-if="scanning" class="mo-uprogress mo-ufade">
			<v-progress-linear :model-value="pct" color="primary" height="8" rounded :aria-label="t('usage_progress', { done, total })" />
			<div class="mo-faint mo-uprogress-file" role="status">{{ t('usage_reading_file', { file: current || '...' }) }}</div>
		</div>
		<div v-else-if="result" class="mo-faint mt-1" role="status">{{ t('usage_result', { read: result.read, cached: result.fromCache, skipped: result.skipped }) }}</div>
		<div v-else class="mo-faint mt-1">{{ t('usage_intro') }}</div>
	</div>
</template>

<script setup>
// The button that reads the files and what shows while it does: a progress bar with the file being read, then one line with what
// the last run did (files read, unchanged, left out). The section runs the scan; this only shows it.
import { computed } from 'vue'
import { i18n } from './dwc-host.js'

const props = defineProps({
	scanning: { type: Boolean, default: false },
	done: { type: Number, default: 0 },
	total: { type: Number, default: 0 },
	current: { type: String, default: '' },
	result: { type: Object, default: null }
})
const emit = defineEmits(['scan', 'cancel'])

const t = (k, p) => i18n.t('plugins.WorkshopModel.model.' + k, p)

const pct = computed(() => (props.total ? Math.round((props.done / props.total) * 100) : 0))
</script>
