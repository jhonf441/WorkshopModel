<template>
	<div class="mo-uscan">
		<div class="mo-actions">
			<v-btn color="primary" depressed :disabled="scanning" @click="$emit('scan')"><v-icon :size="18" class="mr-1">mdi-magnify-scan</v-icon>{{ scanning ? t('usage_scanning', { i: done, n: total }) : (result ? t('usage_scan_again') : t('usage_scan')) }}</v-btn>
			<v-btn v-if="scanning" small text @click="$emit('cancel')">{{ t('cancel') }}</v-btn>
		</div>
		<div v-if="scanning" class="mo-uprogress mo-ufade">
			<v-progress-linear :value="pct" color="primary" height="8" rounded :aria-label="t('usage_progress', { done, total })" />
			<div class="mo-faint mo-uprogress-file" role="status">{{ t('usage_reading_file', { file: current || '...' }) }}</div>
		</div>
		<div v-else-if="result" class="mo-faint mt-1" role="status">{{ t('usage_result', { read: result.read, cached: result.fromCache, skipped: result.skipped }) }}</div>
		<div v-else class="mo-faint mt-1">{{ t('usage_intro') }}</div>
	</div>
</template>

<script>
'use strict'

// The button that reads the files and what shows while it does: a progress bar with the file being read, then one line with what
// the last run did (files read, unchanged, left out). The section runs the scan; this only shows it.
import i18n from '../../i18n'

export default {
	props: {
		scanning: { type: Boolean, default: false },
		done: { type: Number, default: 0 },
		total: { type: Number, default: 0 },
		current: { type: String, default: '' },
		result: { type: Object, default: null }
	},
	computed: {
		pct() {
			return this.total ? Math.round((this.done / this.total) * 100) : 0
		}
	},
	methods: {
		t(k, p) {
			return i18n.t('plugins.WorkshopModel.model.' + k, p)
		}
	}
}
</script>
