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
					<v-checkbox v-model="include[c.id]" density="compact" color="primary" hide-details :label="t(c.label)" />
					<choice-help :choice="c" :title="t('help_how')" />
				</div>
			</div>
			<v-select v-model="dwc" :items="dwcItems" item-title="text" item-value="value" density="compact" variant="outlined" hide-details class="mo-field mt-2" :label="t(REPORT_DWC_SETTING.label)" />
			<choice-help :choice="REPORT_DWC_SETTING" :title="t('help_how')" class="mb-2" />
			<div class="mo-actions">
				<v-btn size="small" variant="flat" color="primary" @click="build">{{ text ? t('report_rebuild') : t('report_build') }}</v-btn>
				<v-btn size="small" variant="outlined" :disabled="!text" @click="copy">{{ t('report_copy') }}</v-btn>
				<v-btn size="small" variant="outlined" :disabled="!text" @click="download">{{ t('report_download') }}</v-btn>
			</div>
			<div class="mo-will-save" role="status"><span>{{ t('look_export_names') }}</span><span class="mo-will-save-name">{{ downloadName }}</span></div>
			<div v-if="stale" class="mo-note warn" role="status"><v-icon size="small">mdi-alert-outline</v-icon><span class="mo-note-text">{{ t('report_stale') }}</span></div>
			<div v-if="note" class="mo-note" :class="note.ok ? 'ok' : 'warn'" role="status"><v-icon size="small">{{ note.ok ? 'mdi-check-circle-outline' : 'mdi-alert-outline' }}</v-icon><span class="mo-note-text">{{ note.text }}</span></div>
			<div class="mo-part mt-2">{{ t('report_preview') }}</div>
			<div v-if="!text" class="mo-faint">{{ t('report_empty') }}</div>
			<pre v-else class="mo-result-text mo-sub">{{ text }}</pre>
		</v-card-text>
	</v-card>
</template>

<script setup>
// The machine report for support (machine-report.js): built on a press from the live model, shown as markdown, copied or downloaded.
// Nothing private goes in unless its tick box is on (report-redact.js); the DWC version is typed when the page cannot tell it.
import { computed, reactive, ref, watch } from 'vue'
import { i18n } from './dwc-host.js'
import { liveModel } from './model-host.js'
import ChoiceHelp from './ChoiceHelp.vue'
import { exchangeSaveBlob } from './data-exchange-ui.js'
import { exchangeFileName } from './data-exchange.js'
import { copyText } from './copy-text.js'
import { buildReport, detectDwcVersion } from './machine-report.js'
import { REPORT_INCLUDES, REPORT_DWC_SETTING, cleanIncludes, dwcVersionChoices } from './report-redact.js'

const props = defineProps({
	tick: { type: Number, default: 0 }
})

const t = (k, p) => i18n.t('plugins.WorkshopModel.model.' + k, p)

const include = reactive(cleanIncludes())
const detected = typeof window === 'undefined' ? '' : detectDwcVersion(window)
const dwc = ref(detected)
// the versions to choose from: what the page detected first when it is new, and "do not state it"
const dwcItems = computed(() => [{ text: t('report_dwc_none'), value: '' }].concat(dwcVersionChoices(detected).map(v => ({ text: v, value: v }))))
const text = ref('')
const stale = ref(false)
const note = ref(null)
// the name the download would get if pressed now
const downloadName = computed(() => {
	void props.tick
	return exchangeFileName('workshop-model-report', 'md')
})

watch(include, () => { if (text.value) stale.value = true }, { deep: true })
watch(dwc, () => { if (text.value) stale.value = true })

function build() {
	text.value = buildReport(liveModel(), { include: cleanIncludes(include), dwcVersion: dwc.value })
	stale.value = false
	note.value = null
}

async function copy() {
	const ok = await copyText(text.value)
	note.value = { ok, text: ok ? t('report_copied') : t('report_copy_failed') }
}

function download() {
	const name = exchangeFileName('workshop-model-report', 'md')
	const ok = exchangeSaveBlob(name, text.value, 'text/markdown')
	note.value = { ok, text: ok ? t('report_downloaded', { name }) : t('report_download_failed') }
}
</script>

<style>
.mo-page .mo-report-includes { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 260px), 1fr)); gap: 0 16px; }
.mo-page .mo-report-inc { min-width: 0; }
</style>
