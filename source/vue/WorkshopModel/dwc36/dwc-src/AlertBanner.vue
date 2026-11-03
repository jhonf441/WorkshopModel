<template>
	<div v-if="rows.length" class="mo-alert-banner" role="alert">
		<div v-for="r in rows" :key="r.id" class="mo-alert-item">
			<v-icon small class="mo-alert-icon">mdi-bell-ring-outline</v-icon>
			<span class="mo-alert-title">{{ t('alerts_banner_title') }}</span>
			<span class="mo-alert-text">{{ r.text }}</span>
			<v-btn x-small text @click="$emit('dismiss', r.id)">{{ t('alerts_banner_dismiss') }}</v-btn>
		</div>
	</div>
</template>

<script>
'use strict'

// The banner of the in-page alerts: one line per rule that is firing and was not dismissed (alert-monitor.js visibleBanner). It leaves
// by itself when the rule recovers. It exists only while the page is open.
import i18n from '../../i18n'

export default {
	props: {
		items: { type: Array, default: () => [] }
	},
	computed: {
		rows() {
			return this.items.map(b => ({
				id: b.id,
				text: this.t('alerts_event_fire', { path: b.path, op: this.t('alerts_op_' + b.op), limit: b.limit, value: b.value })
			}))
		}
	},
	methods: {
		t(k, p) {
			return i18n.t('plugins.WorkshopModel.model.' + k, p)
		}
	}
}
</script>

<style>
.mo-page .mo-alert-banner { border: 1px solid var(--v-error-base); border-radius: 10px; padding: 6px 12px; margin-bottom: 8px; font-size: 13px; }
.mo-page .mo-alert-item { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 8px; min-height: 32px; }
.mo-page .mo-alert-title { font-weight: 600; }
.mo-page .mo-alert-text { flex: 1 1 auto; font-family: var(--tp-font-mono, monospace); font-size: 12px; word-break: break-all; }
.mo-page .mo-alert-icon { color: var(--v-error-base); }
</style>
