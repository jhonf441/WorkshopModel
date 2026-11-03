<template>
	<div>
		<v-card class="mb-3">
			<v-card-text>
				<div class="mo-part"><v-icon :size="20" class="mr-1">mdi-bookmark-multiple-outline</v-icon>{{ t('presets_title') }}</div>
				<div class="mo-faint mb-2">{{ t('presets_help') }} <code>{{ PRESETS_FILE }}</code></div>
				<div v-if="!support.ok" class="mo-off" role="status">{{ offText }}</div>
				<template v-else>
					<error-notice :error="problem" class="mb-2" />
					<div class="mo-form">
						<v-text-field v-model="newName" dense outlined hide-details class="mo-field" :label="t('preset_name')" :disabled="!canEdit" />
						<v-btn small depressed color="primary" :disabled="!canEdit || !nameOk || saving || !liveCount" @click="save">{{ saving ? t('saving') : t('preset_save') }}</v-btn>
					</div>
					<div class="mo-faint mb-2">{{ t('preset_save_help', { n: liveCount }) }}</div>
					<div v-if="loading" class="mo-faint">{{ t('loading') }}</div>
					<div v-else-if="!list.length" class="mo-faint">{{ t('preset_none') }}</div>
					<table v-else class="mo-table">
						<thead><tr><th>{{ t('preset_name') }}</th><th>{{ t('preset_values') }}</th><th>{{ t('preset_state') }}</th><th></th></tr></thead>
						<tbody>
							<tr v-for="p in list" :key="p.name" :class="{ 'mo-selected': p.name === chosen }">
								<td class="mo-key">{{ p.name }}</td>
								<td>{{ t('preset_values_n', { n: Object.keys(p.values).length }) }}</td>
								<td>{{ stateText(p) }}</td>
								<td class="mo-row-actions">
									<v-btn x-small text @click="chosen = chosen === p.name ? '' : p.name">{{ t('preset_compare') }}</v-btn>
									<v-btn x-small :text="armedName !== p.name" :depressed="armedName === p.name" :color="armedName === p.name ? 'amber darken-3' : undefined" :disabled="!canEdit || saving" @click="remove(p.name)">{{ armedName === p.name ? t('preview_tap_again_short') : t('preset_delete') }}</v-btn>
								</td>
							</tr>
						</tbody>
					</table>
					<div class="mo-actions mt-2">
						<v-btn small outlined :disabled="!list.length" @click="exportAll">{{ t('preset_export') }}</v-btn>
						<v-btn small outlined :disabled="!canEdit || saving" @click="importAll">{{ t('preset_import') }}</v-btn>
					</div>
					<div v-if="notice" class="mo-faint mt-1" role="status">{{ notice }}</div>
				</template>
			</v-card-text>
		</v-card>
		<v-card v-if="support.ok && chosenPreset" class="mb-3">
			<v-card-text>
				<div class="mo-part"><v-icon :size="20" class="mr-1">mdi-compare-horizontal</v-icon>{{ t('preset_compare_title', { name: chosenPreset.name }) }}</div>
				<table class="mo-table">
					<thead><tr><th>{{ t('key') }}</th><th>{{ t('preset_value') }}</th><th>{{ t('current_value') }}</th><th>{{ t('preset_state') }}</th></tr></thead>
					<tbody>
						<tr v-for="d in diff" :key="d.name" :class="'mo-state-' + d.state">
							<td class="mo-key">{{ d.name }}</td>
							<td class="mo-value">{{ d.preset }}</td>
							<td class="mo-value">{{ d.current === null ? '-' : d.current }}</td>
							<td>{{ t('preset_' + d.state) }}</td>
						</tr>
					</tbody>
				</table>
				<command-preview class="mt-2" :code="applyCode" :can-send="canEdit && !!applyCode" :disabled-reason="applyCode ? (canEdit ? '' : t('read_only')) : t('preset_nothing_to_apply')" />
			</v-card-text>
		</v-card>
	</div>
</template>

<script>
'use strict'

// Presets of globals (design item 5): saved in one file of the SD card (presets.js PRESETS_FILE) through DWC's file API, compared
// with the live values, applied through the command preview, exported and imported as a workshop JSON file (data-exchange-ui.js,
// with its preview and confirmation).
import i18n from '../../i18n'
import { liveModel, readText, writeText } from './model-host.js'
import ErrorNotice from './ErrorNotice.vue'
import CommandPreview from './CommandPreview.vue'
import { childCount } from './model-tree.js'
import { PRESETS_FILE, PRESETS_FORMAT, PRESETS_VERSION, PRESET_NAME_RE, makePreset, parsePresetsText, presetsText, presetDiff, presetCommands, upsertPreset, removePreset, mergePresets } from './presets.js'
import { exchangeExportJson, exchangeImport } from './data-exchange-ui.js'
import { ARM_MS, pressArmed } from './armed.js'

export default {
	components: { ErrorNotice, CommandPreview },
	props: {
		tick: { type: Number, default: 0 },
		support: { type: Object, default: () => ({ ok: false, known: false }) },
		canEdit: { type: Boolean, default: true }
	},
	data() {
		return { list: [], loading: false, saving: false, newName: '', chosen: '', notice: '', problem: null, armedName: '', PRESETS_FILE }
	},
	computed: {
		offText() {
			return this.support.known ? this.t('globals_off_rrf', { version: this.support.version, minimum: this.support.minimum }) : this.t('globals_off_unknown')
		},
		nameOk() {
			return PRESET_NAME_RE.test(this.newName.trim())
		},
		liveCount() {
			void this.tick
			return childCount(this.liveGlobals())
		},
		chosenPreset() {
			return this.list.find(p => p.name === this.chosen) || null
		},
		diff() {
			void this.tick
			return this.chosenPreset ? presetDiff(this.chosenPreset, this.liveGlobals()) : []
		},
		applyCode() {
			void this.tick
			return this.chosenPreset ? presetCommands(this.chosenPreset, this.liveGlobals()).join('\n') : ''
		}
	},
	mounted() {
		this.load()
	},
	beforeDestroy() {
		clearTimeout(this.armTimer)
	},
	methods: {
		t(k, p) {
			return i18n.t('plugins.WorkshopModel.model.' + k, p)
		},
		liveGlobals() {
			const m = liveModel()
			return m && m.global
		},
		stateText(p) {
			void this.tick
			const d = presetDiff(p, this.liveGlobals())
			const n = s => d.filter(x => x.state === s).length
			return this.t('preset_summary', { same: n('same'), differs: n('differs'), missing: n('missing') })
		},
		async load() {
			this.loading = true
			this.problem = null
			try {
				const text = await readText(PRESETS_FILE)
				this.list = text === null ? [] : parsePresetsText(text)
			} catch (e) {
				this.problem = e
			} finally {
				this.loading = false
			}
		},
		async store(next, text) {
			this.saving = true
			this.problem = null
			try {
				await writeText(PRESETS_FILE, presetsText(next))
				this.list = next
				this.notice = text
			} catch (e) {
				this.problem = e
			} finally {
				this.saving = false
			}
		},
		save() {
			const preset = makePreset(this.newName, this.liveGlobals())
			return this.store(upsertPreset(this.list, preset), this.t('preset_saved', { name: preset.name })).then(() => { this.newName = '' })
		},
		remove(name) {
			const r = pressArmed(this.armedState || null, name, Date.now())
			this.armedState = r.state
			this.armedName = r.fire ? '' : name
			clearTimeout(this.armTimer)
			if (r.fire) {
				if (this.chosen === name) this.chosen = ''
				return this.store(removePreset(this.list, name), this.t('preset_deleted', { name }))
			}
			this.armTimer = setTimeout(() => {
				this.armedState = null
				this.armedName = ''
			}, ARM_MS)
		},
		exportAll() {
			const r = exchangeExportJson({ format: PRESETS_FORMAT, version: PRESETS_VERSION, plugin: 'WorkshopModel', data: { presets: this.list }, model: liveModel() })
			this.notice = r.ok ? this.t('preset_exported', { name: r.name }) : this.t('preset_export_failed')
		},
		importAll() {
			return exchangeImport({
				what: this.t('preset_what'),
				spec: { format: PRESETS_FORMAT, versions: [PRESETS_VERSION], plugins: ['WorkshopModel'] },
				model: liveModel(),
				notify: (text, ok) => { this.notice = text; void ok },
				preview: data => {
					const incoming = Array.isArray(data && data.presets) ? data.presets : []
					const r = mergePresets(this.list, incoming)
					return { rows: [{ label: this.t('preset_import_added'), value: String(r.added) }, { label: this.t('preset_import_replaced'), value: String(r.replaced) }], blockers: incoming.length ? [] : [this.t('preset_import_empty')] }
				},
				apply: async data => {
					const r = mergePresets(this.list, data.presets)
					await this.store(r.list, this.t('preset_import_result', { added: r.added, replaced: r.replaced }))
				}
			})
		}
	}
}
</script>
