<template>
	<v-card class="mb-3">
		<v-card-text>
			<div class="mo-head">
				<span class="mo-head-icon"><v-icon>mdi-clipboard-text-outline</v-icon></span>
				<div class="mo-head-text">
					<h2 class="mo-head-title">{{ t('report_title') }}</h2>
					<p class="mo-head-lead">{{ t('look_report_lead') }}</p>
				</div>
			</div>
			<details class="wf-more mb-2"><summary>{{ t('help_what') }}</summary><div>{{ t('report_help') }}</div></details>
			<div class="mo-part">{{ t('report_private') }}</div>
			<div class="mo-report-includes">
				<div v-for="c in REPORT_INCLUDES" :key="c.id" class="mo-report-inc">
					<v-checkbox v-model="include[c.id]" dense color="primary" hide-details :label="t(c.label)" />
					<choice-help :choice="c" :title="t('help_how')" />
				</div>
			</div>
			<v-select v-model="dwc" :items="dwcItems" dense outlined hide-details class="mo-field mt-2" :label="t(REPORT_DWC_SETTING.label)" />
			<choice-help :choice="REPORT_DWC_SETTING" :title="t('help_how')" class="mb-2" />
			<div class="mo-actions">
				<v-btn small depressed color="primary" @click="build">{{ text ? t('report_rebuild') : t('report_build') }}</v-btn>
				<v-btn small outlined :disabled="!text" @click="copy">{{ t('report_copy') }}</v-btn>
				<v-btn small outlined :disabled="!text" @click="download">{{ t('report_download') }}</v-btn>
			</div>
			<div class="mo-will-save" role="status"><span>{{ t('look_export_names') }}</span><span class="mo-will-save-name">{{ downloadName }}</span></div>
			<div v-if="stale" class="mo-note warn" role="status"><v-icon small>mdi-alert-outline</v-icon><span class="mo-note-text">{{ t('report_stale') }}</span></div>
			<div v-if="note" class="mo-note" :class="note.ok ? 'ok' : 'warn'" role="status"><v-icon small>{{ note.ok ? 'mdi-check-circle-outline' : 'mdi-alert-outline' }}</v-icon><span class="mo-note-text">{{ note.text }}</span></div>
			<div class="mo-part mt-2">{{ t('report_preview') }}</div>
			<div v-if="!text" class="mo-faint">{{ t('report_empty') }}</div>
			<pre v-else class="mo-result-text mo-sub">{{ text }}</pre>
		</v-card-text>
	</v-card>
</template>

<script>
'use strict'

// The machine report for support (machine-report.js): built on a press from the live model, shown as markdown, copied or downloaded.
// Nothing private goes in unless its tick box is on (report-redact.js); the DWC version is typed when the page cannot tell it. The
// name the download will get is shown before the button is pressed.
import i18n from '../../i18n'
import { liveModel } from './model-host.js'
import ChoiceHelp from './ChoiceHelp.vue'
import { exchangeSaveBlob } from './data-exchange-ui.js'
import { exchangeFileName } from './data-exchange.js'
import { copyText } from './copy-text.js'
import { buildReport, detectDwcVersion } from './machine-report.js'
import { REPORT_INCLUDES, REPORT_DWC_SETTING, cleanIncludes, dwcVersionChoices } from './report-redact.js'

export default {
	components: { ChoiceHelp },
	props: {
		tick: { type: Number, default: 0 }
	},
	data() {
		const detected = typeof window === 'undefined' ? '' : detectDwcVersion(window)
		return { include: cleanIncludes(), dwc: detected, detected, text: '', stale: false, note: null, REPORT_INCLUDES, REPORT_DWC_SETTING }
	},
	computed: {
		// the versions to choose from: what the page detected first when it is new, and "do not state it"
		dwcItems() {
			return [{ text: this.t('report_dwc_none'), value: '' }].concat(dwcVersionChoices(this.detected).map(v => ({ text: v, value: v })))
		},
		// the name the download would get if pressed now
		downloadName() {
			void this.tick
			return exchangeFileName('workshop-model-report', 'md')
		}
	},
	watch: {
		include: { deep: true, handler() { if (this.text) this.stale = true } },
		dwc() {
			if (this.text) this.stale = true
		}
	},
	methods: {
		t(k, p) {
			return i18n.t('plugins.WorkshopModel.model.' + k, p)
		},
		build() {
			this.text = buildReport(liveModel(), { include: cleanIncludes(this.include), dwcVersion: this.dwc })
			this.stale = false
			this.note = null
		},
		async copy() {
			const ok = await copyText(this.text)
			this.note = { ok, text: ok ? this.t('report_copied') : this.t('report_copy_failed') }
		},
		download() {
			const name = exchangeFileName('workshop-model-report', 'md')
			const ok = exchangeSaveBlob(name, this.text, 'text/markdown')
			this.note = { ok, text: ok ? this.t('report_downloaded', { name }) : this.t('report_download_failed') }
		}
	}
}
</script>

<style>
.mo-page .mo-report-includes { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 260px), 1fr)); gap: 0 16px; }
.mo-page .mo-report-inc { min-width: 0; }
</style>
