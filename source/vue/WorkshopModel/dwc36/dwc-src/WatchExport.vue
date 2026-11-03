<template>
	<v-card class="mb-3">
		<v-card-text>
			<div class="mo-head">
				<span class="mo-head-icon"><v-icon>mdi-download-outline</v-icon></span>
				<div class="mo-head-text">
					<h2 class="mo-head-title">{{ t('export_title') }}</h2>
					<p class="mo-head-lead">{{ t('look_export_lead') }}</p>
				</div>
			</div>
			<div v-if="!entries.length" class="mo-faint">{{ t('export_none') }}</div>
			<template v-else>
				<v-select v-model="range" :items="rangeItems" item-text="title" item-value="value" dense outlined hide-details class="mo-field mb-1" :label="t(EXPORT_RANGE_SETTING.label)" />
				<choice-help :choice="EXPORT_RANGE_SETTING" :title="t('help_how')" class="mb-2" />
				<div class="mo-actions">
					<v-btn small outlined :title="t('look_export_as', { name: names.watch })" @click="saveWatchCsv">{{ t('export_watch_csv') }}</v-btn>
					<v-btn small outlined :disabled="!changes.length" :title="t('look_export_as', { name: names.changes })" @click="saveChangesCsv">{{ t('export_changes_csv') }}</v-btn>
					<v-btn small outlined :title="t('look_export_as', { name: names.json })" @click="saveJson">{{ t('export_json') }}</v-btn>
				</div>
				<div class="mo-will-save" role="status"><span>{{ t('look_export_names') }}</span><span class="mo-will-save-name">{{ names.watch }}</span><span class="mo-faint">{{ t('look_export_names_hint') }}</span></div>
				<details class="wf-more"><summary>{{ t('help_what') }}</summary><div>{{ t('export_help') }}</div></details>
				<div v-if="note" class="mo-note mt-1" :class="note.ok ? 'ok' : 'warn'" role="status"><v-icon small>{{ note.ok ? 'mdi-check-circle-outline' : 'mdi-alert-outline' }}</v-icon><span class="mo-note-text">{{ note.text }}</span></div>
			</template>
		</v-card-text>
	</v-card>
</template>

<script>
'use strict'

// Export of the watch (watch-export.js): the watched series as CSV (one column per path) or JSON with ISO times, and the events of the
// Changes view as CSV; the files go through the exchange standard (data-exchange-ui.js). The name each file will get is shown before
// the button is pressed (the same rule as the download, data-exchange.js exchangeFileName).
import i18n from '../../i18n'
import { liveModel } from './model-host.js'
import ChoiceHelp from './ChoiceHelp.vue'
import { exchangeExportJson, exchangeSave } from './data-exchange-ui.js'
import { exchangeFileName } from './data-exchange.js'
import { EXPORT_RANGES, EXPORT_RANGE_SETTING, EXPORT_FORMAT, EXPORT_VERSION, rangeBounds, watchTable, watchCsv, changesCsv, watchJson } from './watch-export.js'

export default {
	components: { ChoiceHelp },
	props: {
		entries: { type: Array, default: () => [] },
		changes: { type: Array, default: () => [] },
		tick: { type: Number, default: 0 }
	},
	data() {
		return { range: 'all', note: null, EXPORT_RANGE_SETTING }
	},
	computed: {
		rangeItems() {
			return EXPORT_RANGES.map(r => ({ title: this.t('export_opt_' + r.id), value: r.id }))
		},
		// the names the files would get if pressed now (the stamp follows the clock)
		names() {
			void this.tick
			return { watch: exchangeFileName('workshop-model-watch', 'csv'), changes: exchangeFileName('workshop-model-changes', 'csv'), json: exchangeFileName(EXPORT_FORMAT, 'json') }
		}
	},
	methods: {
		t(k, p) {
			return i18n.t('plugins.WorkshopModel.model.' + k, p)
		},
		bounds() {
			return rangeBounds(this.range, Date.now())
		},
		done(name, ok) {
			const b = this.bounds()
			const rows = watchTable(this.entries, b).rows.length
			const changes = this.changes.filter(c => (b.from === null || c.t >= b.from)).length
			this.note = { ok, text: ok ? this.t('export_done', { name }) + ' ' + this.t('export_summary', { rows, paths: this.entries.length, changes }) : this.t('export_failed') }
		},
		saveWatchCsv() {
			const name = exchangeFileName('workshop-model-watch', 'csv')
			this.done(name, exchangeSave(name, watchCsv(this.entries, this.bounds()), 'text/csv', true))
		},
		saveChangesCsv() {
			const name = exchangeFileName('workshop-model-changes', 'csv')
			this.done(name, exchangeSave(name, changesCsv(this.changes, this.bounds()), 'text/csv', true))
		},
		saveJson() {
			const data = watchJson(this.entries, this.changes, this.bounds(), Date.now())
			const r = exchangeExportJson({ format: EXPORT_FORMAT, version: EXPORT_VERSION, plugin: 'WorkshopModel', data, model: liveModel() })
			this.done(r.name, r.ok)
		}
	}
}
</script>
