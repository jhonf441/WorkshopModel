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
						<span v-if="list.length" class="mo-pill"><v-icon size="x-small">mdi-bookmark-multiple-outline</v-icon>{{ t('look_presets_count', { n: list.length }) }}</span>
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
						<v-text-field :model-value="shownName" density="compact" variant="outlined" hide-details clearable class="mo-field" :label="t('look_preset_name_label')" :disabled="!canEdit" @update:model-value="typeName($event)" @keydown.enter="canSave && save()" />
						<v-btn size="small" variant="flat" color="primary" :disabled="!canSave" @click="save"><v-icon size="small" start>mdi-content-save-outline</v-icon>{{ saving ? t('saving') : t('preset_save') }}</v-btn>
					</div>
					<div class="mo-will-save" :class="{ bad: !nameState.valid }" role="status" aria-live="polite">
						<span>{{ t('look_will_save_as') }}</span>
						<span class="mo-will-save-name">{{ nameState.name }}</span>
						<span class="mo-faint">{{ nameState.valid ? t(nameState.custom ? 'look_name_custom_hint' : 'look_name_default_hint') : t('look_name_invalid') }}</span>
					</div>
					<div class="mo-faint mb-2">{{ liveCount ? t('preset_save_help', { n: liveCount }) : t('look_presets_no_globals') }}</div>
					<div v-if="!canEdit" class="mo-note mb-2" role="status"><v-icon size="small">mdi-eye-outline</v-icon><span class="mo-note-text">{{ t('read_only') }}</span></div>
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
									<span><v-icon size="x-small">mdi-counter</v-icon>{{ t('preset_values_n', { n: p.count }) }}</span>
									<span class="wf-state" :class="p.tone">{{ p.state }}</span>
								</span>
							</div>
							<div class="mo-item-actions">
								<v-btn size="small" variant="outlined" :aria-pressed="p.name === chosen ? 'true' : 'false'" @click="chosen = chosen === p.name ? '' : p.name"><v-icon size="small" start>mdi-compare-horizontal</v-icon>{{ t('preset_compare') }}</v-btn>
								<v-btn size="small" :variant="armedName === p.name ? 'flat' : 'text'" :color="armedName === p.name ? 'amber-darken-3' : 'error'" :disabled="!canEdit || saving" @click="remove(p.name)">{{ armedName === p.name ? t('preview_tap_again_short') : t('preset_delete') }}</v-btn>
							</div>
						</div>
					</div>
					<div class="mo-actions mt-2">
						<v-btn size="small" variant="outlined" :disabled="!list.length" :title="t('look_export_as', { name: exportName })" @click="exportAll"><v-icon size="small" start>mdi-download-outline</v-icon>{{ t('preset_export') }}</v-btn>
						<v-btn size="small" variant="outlined" :disabled="!canEdit || saving" @click="importAll"><v-icon size="small" start>mdi-upload-outline</v-icon>{{ t('preset_import') }}</v-btn>
						<span v-if="list.length" class="mo-faint">{{ t('look_export_as', { name: exportName }) }}</span>
					</div>
					<div v-if="notice" class="mo-note ok mt-1" role="status"><v-icon size="small">mdi-check-circle-outline</v-icon><span class="mo-note-text">{{ notice }}</span></div>
					<details class="wf-more">
						<summary>{{ t('look_presets_more') }}</summary>
						<div>{{ t('presets_help') }} <code>{{ PRESETS_FILE }}</code></div>
					</details>
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
				<command-preview class="mt-2" :code="applyCode" :can-send="canEdit && !!applyCode" :disabled-reason="applyCode ? (canEdit ? '' : t('read_only')) : t('preset_nothing_to_apply')" />
			</v-card-text>
		</v-card>
	</div>
</template>

<script setup>
// Presets of globals (design item 5): saved in one file of the SD card (presets.js PRESETS_FILE) through DWC's file API, compared
// with the live values, applied through the command preview, exported and imported as a workshop JSON file (data-exchange-ui.js,
// with its preview and confirmation). The name is shown BEFORE saving: the field comes pre-filled with a dated default
// (name-default.js) and one line repeats what will be stored.
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { i18n } from './dwc-host.js'
import { liveModel, readText, writeText } from './model-host.js'
import ErrorNotice from './ErrorNotice.vue'
import CommandPreview from './CommandPreview.vue'
import { childCount } from './model-tree.js'
import { PRESETS_FILE, PRESETS_FORMAT, PRESETS_VERSION, PRESET_NAME_RE, makePreset, parsePresetsText, presetsText, presetDiff, presetCommands, upsertPreset, removePreset, mergePresets } from './presets.js'
import { resolveName, typedName, defaultPresetName } from './name-default.js'
import { exchangeExportJson, exchangeImport } from './data-exchange-ui.js'
import { exchangeFileName } from './data-exchange.js'
import { ARM_MS, pressArmed } from './armed.js'

const props = defineProps({
	tick: { type: Number, default: 0 },
	support: { type: Object, default: () => ({ ok: false, known: false }) },
	canEdit: { type: Boolean, default: true }
})

const t = (k, p) => i18n.t('plugins.WorkshopModel.model.' + k, p)

const list = ref([])
const loading = ref(false)
const saving = ref(false)
const typed = ref('') // what the person wrote; empty = the default name
const chosen = ref('')
const notice = ref('')
const problem = ref(null)
const armedName = ref('')
let armedState = null
let armTimer = null

const offText = computed(() => (props.support.known ? t('globals_off_rrf', { version: props.support.version, minimum: props.support.minimum }) : t('globals_off_unknown')))
const liveGlobals = () => {
	const m = liveModel()
	return m && m.global
}
const liveCount = computed(() => {
	void props.tick
	return childCount(liveGlobals())
})
const defaultName = computed(() => {
	void props.tick
	return defaultPresetName(t('look_preset_default_prefix'), new Date(), list.value)
})
const nameState = computed(() => resolveName(typed.value, defaultName.value, PRESET_NAME_RE))
const shownName = computed(() => typed.value || defaultName.value)
const exportName = computed(() => {
	void props.tick
	return exchangeFileName(PRESETS_FORMAT, 'json')
})
const canSave = computed(() => props.canEdit && nameState.value.valid && !saving.value && liveCount.value > 0)
const chosenPreset = computed(() => list.value.find(p => p.name === chosen.value) || null)
const diff = computed(() => {
	void props.tick
	return chosenPreset.value ? presetDiff(chosenPreset.value, liveGlobals()) : []
})
const applyCode = computed(() => {
	void props.tick
	return chosenPreset.value ? presetCommands(chosenPreset.value, liveGlobals()).join('\n') : ''
})
// one line per preset with its state against the machine, as a dot and words
const rows = computed(() => {
	void props.tick
	return list.value.map(p => {
		const d = presetDiff(p, liveGlobals())
		const n = s => d.filter(x => x.state === s).length
		const differs = n('differs') + n('missing')
		return { name: p.name, count: Object.keys(p.values).length, tone: differs ? 'warn' : 'ok', state: differs ? t('preset_summary', { same: n('same'), differs: n('differs'), missing: n('missing') }) : t('look_preset_state_same') }
	})
})

function typeName(v) {
	typed.value = typedName(v, defaultName.value)
}

async function load() {
	loading.value = true
	problem.value = null
	try {
		const text = await readText(PRESETS_FILE)
		list.value = text === null ? [] : parsePresetsText(text)
	} catch (e) {
		problem.value = e
	} finally {
		loading.value = false
	}
}

async function store(next, text) {
	saving.value = true
	problem.value = null
	try {
		await writeText(PRESETS_FILE, presetsText(next))
		list.value = next
		notice.value = text
	} catch (e) {
		problem.value = e
	} finally {
		saving.value = false
	}
}

function save() {
	const preset = makePreset(nameState.value.name, liveGlobals())
	return store(upsertPreset(list.value, preset), t('preset_saved', { name: preset.name })).then(() => { typed.value = '' })
}

function remove(name) {
	const r = pressArmed(armedState, name, Date.now())
	armedState = r.state
	armedName.value = r.fire ? '' : name
	clearTimeout(armTimer)
	if (r.fire) {
		if (chosen.value === name) chosen.value = ''
		return store(removePreset(list.value, name), t('preset_deleted', { name }))
	}
	armTimer = setTimeout(() => {
		armedState = null
		armedName.value = ''
	}, ARM_MS)
}

function exportAll() {
	const r = exchangeExportJson({ format: PRESETS_FORMAT, version: PRESETS_VERSION, plugin: 'WorkshopModel', data: { presets: list.value }, model: liveModel() })
	notice.value = r.ok ? t('preset_exported', { name: r.name }) : t('preset_export_failed')
}

function importAll() {
	return exchangeImport({
		what: t('preset_what'),
		spec: { format: PRESETS_FORMAT, versions: [PRESETS_VERSION], plugins: ['WorkshopModel'] },
		model: liveModel(),
		notify: (text, ok) => { notice.value = text; void ok },
		preview: data => {
			const incoming = Array.isArray(data && data.presets) ? data.presets : []
			const r = mergePresets(list.value, incoming)
			return { rows: [{ label: t('preset_import_added'), value: String(r.added) }, { label: t('preset_import_replaced'), value: String(r.replaced) }], blockers: incoming.length ? [] : [t('preset_import_empty')] }
		},
		apply: async data => {
			const r = mergePresets(list.value, data.presets)
			await store(r.list, t('preset_import_result', { added: r.added, replaced: r.replaced }))
		}
	})
}

onMounted(load)
onBeforeUnmount(() => clearTimeout(armTimer))
</script>
