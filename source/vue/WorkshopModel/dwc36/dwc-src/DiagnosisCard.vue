<template>
	<!-- redesign 2026-11-23 (FAMILIA-REDISENO.md, Model: "diagnosis as a status line, not a sub-card"): ONE line with the name and the state (a dot and the
	     words); a finding is a row of 40 under it with its level, its text, "What it means" and Open. What the diagnosis is lives in the one help of the
	     Model card (TreeSection.vue), not in a fold of its own. -->
	<section class="mo-diag" aria-labelledby="mo-topic-diagnosis">
		<div class="mo-diag-head">
			<v-icon :size="16" class="mo-diag-icon" aria-hidden="true">{{ card.icon }}</v-icon>
			<span id="mo-topic-diagnosis" class="mo-topic-title mo-diag-title">{{ t(card.title) }}</span>
			<span v-if="result.noData" class="wf-state mo-diag-state" role="status">{{ t('diag_no_data') }}</span>
			<span v-else-if="result.clear" class="wf-state ok mo-diag-state" role="status">{{ t('diag_all_clear', { n: result.checked }) }}</span>
			<span v-else :class="['wf-state', 'mo-diag-state', result.errors ? 'err' : 'warn']" role="status">{{ t('diag_summary', { errors: result.errors, warnings: result.warnings }) }}</span>
		</div>
		<div v-for="i in result.items" :key="i.id" class="mo-diag-item">
			<div class="mo-diag-line">
				<span :class="['wf-state', i.level]">{{ t('diag_level_' + i.level) }}</span>
				<span class="mo-diag-text">{{ t(i.key, i.params) }}</span>
				<v-btn x-small text :aria-expanded="openId === i.id ? 'true' : 'false'" @click="toggle(i.id)">{{ t('diag_what_it_means') }}</v-btn>
				<v-btn x-small text :title="t('diag_open_help', { path: i.path })" @click="$emit('open', i.path)">{{ t('diag_open') }}</v-btn>
			</div>
			<div v-if="openId === i.id" class="mo-faint mo-diag-help">{{ t(i.helpKey) }}</div>
		</div>
		<div v-if="result.more" class="mo-faint mo-diag-more">{{ t('diag_more', { n: result.more }) }}</div>
	</section>
</template>

<script>
'use strict'

// The quick diagnosis of the Topics view (diagnosis.js): everything abnormal in the model in one look, errors first, each finding with what it means
// and what to check, and Open to jump to the value. Nothing wrong is one calm line that says how many checks ran. The card comes from
// topic-catalog.js diagnosisTopic(); what the diagnosis is (DIAGNOSIS_HELP) is told by the one help of the Model card.
import i18n from '../../i18n'

export default {
	props: {
		card: { type: Object, required: true }
	},
	data() {
		return { openId: '' }
	},
	computed: {
		result() {
			return this.card.result
		}
	},
	methods: {
		t(k, p) {
			return i18n.t('plugins.WorkshopModel.model.' + k, p)
		},
		toggle(id) {
			this.openId = this.openId === id ? '' : id
		}
	}
}
</script>

<style>
/* DiagnosisCard: a status line over the whole width of the Topics grid (no frame, no grey fill), a divider under it; one row of 40 per finding */
.mo-page .mo-diag { grid-column: 1 / -1; padding-bottom: 4px; border-bottom: 1px solid var(--wf-line); }
.mo-page .mo-diag-head { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 12px; min-height: 40px; }
.mo-page .mo-diag-icon { flex: none; color: var(--wf-icon); }
.mo-page .mo-diag-title { font-size: 13px; font-weight: 600; }
.mo-page .mo-diag-state { font-size: 13px; }
.mo-page .mo-diag-line { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 8px; min-height: 40px; border-top: 1px solid var(--wf-line); }
.mo-page .mo-diag-text { flex: 1 1 220px; min-width: 0; font-size: 13px; overflow-wrap: anywhere; }
.mo-page .mo-diag-help { padding: 2px 0 8px; }
.mo-page .mo-diag-more { padding: 4px 0; }
</style>
