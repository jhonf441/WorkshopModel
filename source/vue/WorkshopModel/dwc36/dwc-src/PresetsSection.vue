<template>
	<div>
		<v-card class="mb-3">
			<v-card-text>
				<div class="mo-head">
					<span class="mo-head-icon"><v-icon>mdi-bookmark-multiple-outline</v-icon></span>
					<div class="mo-head-text">
						<h2 class="mo-head-title">{{ t('presets_title') }}</h2>
						<p class="mo-head-lead">{{ t('look_presets_lead') }}</p>
					</div>
					<div v-if="support.ok" class="mo-head-right">
						<span v-if="list.length" class="mo-pill"><v-icon x-small>mdi-bookmark-multiple-outline</v-icon>{{ t('look_presets_count', { n: list.length }) }}</span>
						<span class="mo-pill mo-pill-quiet">{{ t('preset_values_n', { n: liveCount }) }}</span>
					</div>
				</div>
				<div v-if="!support.ok" class="mo-empty" role="status">
					<v-icon class="mo-empty-icon">mdi-chip</v-icon>
					<div class="mo-empty-title">{{ t('look_globals_off_title') }}</div>
					<div class="mo-empty-text">{{ offText }}</div>
				</div>
				<template v-else>
					<error-notice :error="problem" class="mb-2" />
					<div class="mo-form">
						<v-text-field :value="shownName" dense outlined hide-details clearable class="mo-field" :label="t('look_preset_name_label')" :disabled="!canEdit" @input="typeName($event)" @keydown.enter="canSave && save()" />
						<v-btn small depressed color="primary" :disabled="!canSave" @click="save"><v-icon small left>mdi-content-save-outline</v-icon>{{ saving ? t('saving') : t('preset_save') }}</v-btn>
					</div>
					<div class="mo-will-save" :class="{ bad: !nameState.valid }" role="status" aria-live="polite">
						<span>{{ t('look_will_save_as') }}</span>
						<span class="mo-will-save-name">{{ nameState.name }}</span>
						<span class="mo-faint">{{ nameState.valid ? t(nameState.custom ? 'look_name_custom_hint' : 'look_name_default_hint') : t('look_name_invalid') }}</span>
					</div>
					<div class="mo-faint mb-2">{{ liveCount ? t('preset_save_help', { n: liveCount }) : t('look_presets_no_globals') }}</div>
					<lock-reason min="technician" class="mb-2" />
					<div v-if="loading" class="mo-skeleton" role="status" aria-live="polite">
						<span class="mo-skeleton-bar"></span><span class="mo-skeleton-bar"></span><span class="mo-skeleton-bar"></span>
						<span class="mo-skeleton-text">{{ t('look_loading_list') }}</span>
					</div>
					<div v-else-if="!list.length" class="mo-empty mo-empty-small">
						<v-icon class="mo-empty-icon">mdi-bookmark-plus-outline</v-icon>
						<div class="mo-empty-title">{{ t('look_presets_empty_title') }}</div>
						<div class="mo-empty-text">{{ t('look_presets_empty_text') }}</div>
					</div>
					<div v-else class="mo-items">
						<div v-for="p in rows" :key="p.name" class="mo-item" :class="{ on: p.name === chosen }">
							<div class="mo-item-main">
								<span class="mo-item-name">{{ p.name }}</span>
								<span class="mo-item-meta">
									<span><v-icon x-small>mdi-counter</v-icon>{{ t('preset_values_n', { n: p.count }) }}</span>
									<span class="wf-state" :class="p.tone">{{ p.state }}</span>
								</span>
							</div>
							<div class="mo-item-actions">
								<v-btn small outlined :aria-pressed="p.name === chosen ? 'true' : 'false'" @click="chosen = chosen === p.name ? '' : p.name"><v-icon small left>mdi-compare-horizontal</v-icon>{{ t('preset_compare') }}</v-btn>
								<v-btn small :text="armedName !== p.name" :depressed="armedName === p.name" :color="armedName === p.name ? 'amber darken-3' : 'error'" :disabled="!canEdit || saving" @click="remove(p.name)">{{ armedName === p.name ? t('preview_tap_again_short') : t('preset_delete') }}</v-btn>
							</div>
						</div>
					</div>
					<div class="mo-actions mt-2">
						<v-btn small outlined :disabled="!list.length" :title="t('look_export_as', { name: exportName })" @click="exportAll"><v-icon small left>mdi-download-outline</v-icon>{{ t('preset_export') }}</v-btn>
						<v-btn small outlined :disabled="!canEdit || saving" @click="importAll"><v-icon small left>mdi-upload-outline</v-icon>{{ t('preset_import') }}</v-btn>
						<span v-if="list.length" class="mo-faint">{{ t('look_export_as', { name: exportName }) }}</span>
					</div>
					<div v-if="notice" class="mo-note ok mt-1" role="status"><v-icon small>mdi-check-circle-outline</v-icon><span class="mo-note-text">{{ notice }}</span></div>
					<help-guide :title="t('look_presets_more')"><p>{{ t('presets_help') }} <code>{{ PRESETS_FILE }}</code></p></help-guide>
				</template>
			</v-card-text>
		</v-card>
		<v-card v-if="support.ok && chosenPreset" class="mb-3 mo-fade-in">
			<v-card-text>
				<div class="mo-head">
					<span class="mo-head-icon"><v-icon>mdi-compare-horizontal</v-icon></span>
					<div class="mo-head-text">
						<h2 class="mo-head-title">{{ t('preset_compare_title', { name: chosenPreset.name }) }}</h2>
						<p class="mo-head-lead">{{ t('look_preset_compare_lead') }}</p>
					</div>
				</div>
				<table class="mo-table">
					<thead><tr><th>{{ t('key') }}</th><th>{{ t('preset_value') }}</th><th>{{ t('current_value') }}</th><th>{{ t('preset_state') }}</th></tr></thead>
					<tbody>
						<tr v-for="d in diff" :key="d.name" :class="'mo-state-' + d.state">
							<td class="mo-key">{{ d.name }}</td>
							<td class="mo-value">{{ d.preset }}</td>
							<td class="mo-value">{{ d.current === null ? '-' : d.current }}</td>
							<td><span class="wf-state" :class="d.state === 'same' ? 'ok' : 'warn'">{{ t('preset_' + d.state) }}</span></td>
						</tr>
					</tbody>
				</table>
				<command-preview class="mt-2" :code="applyCode" :can-send="canEdit && !!applyCode" :disabled-reason="applyCode ? (canEdit ? '' : readOnlyLine(t('read_only'))) : t('preset_nothing_to_apply')" />
			</v-card-text>
		</v-card>
	</div>
</template>

<script>
'use strict'
import { readOnlyNote } from './read-only-note.js'

// Presets of globals (design item 5): saved in one file of the SD card (presets.js PRESETS_FILE) through DWC's file API, compared
// with the live values, applied through the command preview, exported and imported as a workshop JSON file (data-exchange-ui.js,
// with its preview and confirmation). The name is shown BEFORE saving: the field comes pre-filled with a dated default
// (name-default.js) and one line repeats what will be stored.
import i18n from '../../i18n'
import { liveModel, readText, writeText } from './model-host.js'
import ErrorNotice from './ErrorNotice.vue'
import CommandPreview from './CommandPreview.vue'
import HelpGuide from './HelpGuide.vue' // vue/_shared36
import LockReason from './LockReason.vue' // vue/_shared36
import { childCount } from './model-tree.js'
import { PRESETS_FILE, PRESETS_FORMAT, PRESETS_VERSION, PRESET_NAME_RE, makePreset, parsePresetsText, presetsText, presetDiff, presetCommands, upsertPreset, removePreset, mergePresets } from './presets.js'
import { resolveName, typedName, defaultPresetName } from './name-default.js'
import { exchangeExportJson, exchangeImport } from './data-exchange-ui.js'
import { exchangeFileName } from './data-exchange.js'
import { ARM_MS, pressArmed } from './armed.js'

export default {
	mixins: [readOnlyNote],
	components: { ErrorNotice, CommandPreview, HelpGuide, LockReason },
	props: {
		tick: { type: Number, default: 0 },
		support: { type: Object, default: () => ({ ok: false, known: false }) },
		canEdit: { type: Boolean, default: true }
	},
	data() {
		// typed: what the person wrote, empty = the default name
		return { list: [], loading: false, saving: false, typed: '', chosen: '', notice: '', problem: null, armedName: '', PRESETS_FILE }
	},
	computed: {
		offText() {
			return this.support.known ? this.t('globals_off_rrf', { version: this.support.version, minimum: this.support.minimum }) : this.t('globals_off_unknown')
		},
		liveCount() {
			void this.tick
			return childCount(this.liveGlobals())
		},
		defaultName() {
			void this.tick
			return defaultPresetName(this.t('look_preset_default_prefix'), new Date(), this.list)
		},
		nameState() {
			return resolveName(this.typed, this.defaultName, PRESET_NAME_RE)
		},
		shownName() {
			return this.typed || this.defaultName
		},
		exportName() {
			void this.tick
			return exchangeFileName(PRESETS_FORMAT, 'json')
		},
		canSave() {
			return this.canEdit && this.nameState.valid && !this.saving && this.liveCount > 0
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
		},
		// one line per preset with its state against the machine, as a dot and words
		rows() {
			void this.tick
			return this.list.map(p => {
				const d = presetDiff(p, this.liveGlobals())
				const n = s => d.filter(x => x.state === s).length
				const differs = n('differs') + n('missing')
				return { name: p.name, count: Object.keys(p.values).length, tone: differs ? 'warn' : 'ok', state: differs ? this.t('preset_summary', { same: n('same'), differs: n('differs'), missing: n('missing') }) : this.t('look_preset_state_same') }
			})
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
		typeName(v) {
			this.typed = typedName(v, this.defaultName)
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
			const preset = makePreset(this.nameState.name, this.liveGlobals())
			return this.store(upsertPreset(this.list, preset), this.t('preset_saved', { name: preset.name })).then(() => { this.typed = '' })
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
