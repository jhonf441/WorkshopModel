<template>
	<div>
		<v-card class="mb-3">
			<v-card-text>
				<div class="mo-part"><v-icon size="20" class="mr-1">mdi-bookmark-multiple-outline</v-icon>{{ t('presets_title') }}</div>
				<div class="mo-faint mb-2">{{ t('presets_help') }} <code>{{ PRESETS_FILE }}</code></div>
				<div v-if="!support.ok" class="mo-off" role="status">{{ offText }}</div>
				<template v-else>
					<error-notice :error="problem" class="mb-2" />
					<div class="mo-form">
						<v-text-field v-model="newName" density="compact" variant="outlined" hide-details class="mo-field" :label="t('preset_name')" :disabled="!canEdit" />
						<v-btn size="small" variant="flat" color="primary" :disabled="!canEdit || !nameOk || saving || !liveCount" @click="save">{{ saving ? t('saving') : t('preset_save') }}</v-btn>
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
									<v-btn size="x-small" variant="text" @click="chosen = chosen === p.name ? '' : p.name">{{ t('preset_compare') }}</v-btn>
									<v-btn size="x-small" :variant="armedName === p.name ? 'flat' : 'text'" :color="armedName === p.name ? 'amber-darken-3' : undefined" :disabled="!canEdit || saving" @click="remove(p.name)">{{ armedName === p.name ? t('preview_tap_again_short') : t('preset_delete') }}</v-btn>
								</td>
							</tr>
						</tbody>
					</table>
					<div class="mo-actions mt-2">
						<v-btn size="small" variant="outlined" :disabled="!list.length" @click="exportAll">{{ t('preset_export') }}</v-btn>
						<v-btn size="small" variant="outlined" :disabled="!canEdit || saving" @click="importAll">{{ t('preset_import') }}</v-btn>
					</div>
					<div v-if="notice" class="mo-faint mt-1" role="status">{{ notice }}</div>
				</template>
			</v-card-text>
		</v-card>
		<v-card v-if="support.ok && chosenPreset" class="mb-3">
			<v-card-text>
				<div class="mo-part"><v-icon size="20" class="mr-1">mdi-compare-horizontal</v-icon>{{ t('preset_compare_title', { name: chosenPreset.name }) }}</div>
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

<script setup>
// Presets of globals (design item 5): saved in one file of the SD card (presets.js PRESETS_FILE) through DWC's file API, compared
// with the live values, applied through the command preview, exported and imported as a workshop JSON file (data-exchange-ui.js,
// with its preview and confirmation).
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { i18n } from './dwc-host.js'
import { liveModel, readText, writeText } from './model-host.js'
import ErrorNotice from './ErrorNotice.vue'
import CommandPreview from './CommandPreview.vue'
import { childCount } from './model-tree.js'
import { PRESETS_FILE, PRESETS_FORMAT, PRESETS_VERSION, PRESET_NAME_RE, makePreset, parsePresetsText, presetsText, presetDiff, presetCommands, upsertPreset, removePreset, mergePresets } from './presets.js'
import { exchangeExportJson, exchangeImport } from './data-exchange-ui.js'
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
const newName = ref('')
const chosen = ref('')
const notice = ref('')
const problem = ref(null)
const armedName = ref('')
let armedState = null
let armTimer = null

const offText = computed(() => (props.support.known ? t('globals_off_rrf', { version: props.support.version, minimum: props.support.minimum }) : t('globals_off_unknown')))
const nameOk = computed(() => PRESET_NAME_RE.test(newName.value.trim()))
const liveGlobals = () => {
	const m = liveModel()
	return m && m.global
}
const liveCount = computed(() => {
	void props.tick
	return childCount(liveGlobals())
})
const chosenPreset = computed(() => list.value.find(p => p.name === chosen.value) || null)
const diff = computed(() => {
	void props.tick
	return chosenPreset.value ? presetDiff(chosenPreset.value, liveGlobals()) : []
})
const applyCode = computed(() => {
	void props.tick
	return chosenPreset.value ? presetCommands(chosenPreset.value, liveGlobals()).join('\n') : ''
})

function stateText(p) {
	void props.tick
	const d = presetDiff(p, liveGlobals())
	const n = s => d.filter(x => x.state === s).length
	return t('preset_summary', { same: n('same'), differs: n('differs'), missing: n('missing') })
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
	const preset = makePreset(newName.value, liveGlobals())
	return store(upsertPreset(list.value, preset), t('preset_saved', { name: preset.name })).then(() => { newName.value = '' })
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
