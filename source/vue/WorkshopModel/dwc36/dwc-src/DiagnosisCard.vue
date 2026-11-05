<template>
	<section class="mo-topic mo-diag" aria-labelledby="mo-topic-diagnosis">
		<div class="mo-topic-head">
			<v-icon :size="20">{{ card.icon }}</v-icon>
			<span id="mo-topic-diagnosis" class="mo-topic-title">{{ t(card.title) }}</span>
			<span v-if="result.errors || result.warnings" :class="['wf-state', result.errors ? 'err' : 'warn']">{{ t('diag_summary', { errors: result.errors, warnings: result.warnings }) }}</span>
		</div>
		<choice-guide :choice="helpChoice" class="mb-1" />
		<div v-if="result.noData" class="mo-faint" role="status">{{ t('diag_no_data') }}</div>
		<div v-else-if="result.clear" role="status"><span class="wf-state ok">{{ t('diag_all_clear', { n: result.checked }) }}</span></div>
		<div v-for="i in result.items" :key="i.id" class="mo-diag-item">
			<div class="mo-diag-line">
				<span :class="['wf-state', i.level]">{{ t('diag_level_' + i.level) }}</span>
				<span class="mo-diag-text">{{ t(i.key, i.params) }}</span>
				<v-btn x-small text :aria-expanded="openId === i.id ? 'true' : 'false'" @click="toggle(i.id)">{{ t('diag_what_it_means') }}</v-btn>
				<v-btn x-small text :title="t('diag_open_help', { path: i.path })" @click="$emit('open', i.path)">{{ t('diag_open') }}</v-btn>
			</div>
			<div v-if="openId === i.id" class="mo-faint mo-diag-help">{{ t(i.helpKey) }}</div>
		</div>
		<div v-if="result.more" class="mo-faint mt-1">{{ t('diag_more', { n: result.more }) }}</div>
	</section>
</template>

<script>
'use strict'

// The quick diagnosis card of the Topics view (diagnosis.js): everything abnormal in the model in one look, errors first, each line
// with a fold that says what it means and what to check, and Open to jump to the value. Nothing wrong shows an all-clear that says how
// many checks ran. The card comes from topic-catalog.js diagnosisTopic().
import i18n from '../../i18n'
import ChoiceGuide from './ChoiceGuide.vue'
import { DIAGNOSIS_HELP } from './diagnosis.js'

export default {
	components: { ChoiceGuide },
	props: {
		card: { type: Object, required: true }
	},
	data() {
		return { openId: '', helpChoice: DIAGNOSIS_HELP }
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
/* DiagnosisCard: the card spans the whole row of the Topics grid; one line per finding, a thin rule between lines */
.mo-page .mo-diag { grid-column: 1 / -1; }
.mo-page .mo-diag-line { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; padding: 4px 0; border-top: 1px solid rgba(128, 128, 128, 0.2); }
.mo-page .mo-diag-text { flex: 1 1 220px; min-width: 0; overflow-wrap: anywhere; }
.mo-page .mo-diag-help { padding: 2px 0 6px; }
</style>
