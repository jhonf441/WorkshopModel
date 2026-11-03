<template>
	<div>
		<v-card class="mb-3">
			<v-card-text>
				<div class="mo-part"><v-icon size="20" class="mr-1">mdi-camera-outline</v-icon>{{ t('snapshots_title') }}</div>
				<div class="mo-faint mb-2">{{ t('snapshots_help') }} <code>{{ SNAPSHOTS_FILE }}</code></div>
				<error-notice :error="problem" class="mb-2" />
				<view-tabs :choices="SNAPSHOT_SCOPES" :current="scope" :label="t('snapshot_scope')" class="mb-2" @pick="scope = $event" />
				<choice-help :choice="scopeChoice" :title="t(scopeChoice.label)" class="mb-2" />
				<div v-if="scope === 'branch'" class="mo-faint mb-2">{{ selected ? t('snapshot_scope_path', { path: selected }) : t('snapshot_scope_none') }}</div>
				<div class="mo-form">
					<v-text-field v-model="newName" density="compact" variant="outlined" hide-details class="mo-field" :label="t('snapshot_name')" :disabled="!canEdit" />
					<v-btn size="small" variant="flat" color="primary" :disabled="!canSave" @click="save">{{ saving ? t('saving') : t('snapshot_save') }}</v-btn>
				</div>
				<div v-if="!canEdit" class="mo-faint mb-2">{{ t('read_only') }}</div>
				<div class="mo-faint mb-2">{{ t('snapshot_budget', { count: budget.count, leaves: budget.leaves }) }} <span v-if="!tier.extras">{{ t('snapshot_budget_standalone') }}</span></div>
				<div v-if="loading" class="mo-faint">{{ t('loading') }}</div>
				<div v-else-if="!list.length" class="mo-faint">{{ t('snapshot_none') }}</div>
				<table v-else class="mo-table">
					<thead><tr><th>{{ t('snapshot_name') }}</th><th>{{ t('snapshot_col_scope') }}</th><th>{{ t('snapshot_col_values') }}</th><th>{{ t('snapshot_col_when') }}</th><th></th></tr></thead>
					<tbody>
						<tr v-for="s in list" :key="s.name" :class="{ 'mo-selected': s.name === from }">
							<td class="mo-key">{{ s.name }}</td>
							<td class="mo-value">{{ s.scope || t('snapshot_whole') }}</td>
							<td>{{ t('snapshot_values_n', { n: s.count }) }}</td>
							<td>{{ when(s.createdAt) }}</td>
							<td class="mo-row-actions">
								<v-btn size="x-small" variant="text" @click="compareWithNow(s.name)">{{ t('snapshot_with_now') }}</v-btn>
								<v-btn size="x-small" variant="text" @click="exportOne(s)">{{ t('snapshot_export') }}</v-btn>
								<v-btn size="x-small" :variant="armedName === s.name ? 'flat' : 'text'" :color="armedName === s.name ? 'amber-darken-3' : undefined" :disabled="!canEdit || saving" @click="remove(s.name)">{{ armedName === s.name ? t('preview_tap_again_short') : t('preset_delete') }}</v-btn>
							</td>
						</tr>
					</tbody>
				</table>
				<div class="mo-actions mt-2">
					<v-btn size="small" variant="outlined" :disabled="!canEdit || saving" @click="importOne">{{ t('snapshot_import') }}</v-btn>
				</div>
				<div v-if="notice" class="mo-faint mt-1" role="status">{{ notice }}</div>
			</v-card-text>
		</v-card>
		<snapshot-compare :list="list" :from="from" :to="to" :tick="tick" :max-leaves="budget.leaves" @pick-from="from = $event" @pick-to="to = $event" @select="emit('select', $event)" />
	</div>
</template>

<script setup>
// Snapshots of the model (snapshots.js): save the whole model or the branch selected in the Model section under a name, in the
// plugin's own file through DWC's machine file API (model-host.js; the same on a standalone Duet and in SBC mode), within the budget
// of the tier (tier.js snapshotBudget); compare two of them or one with the model now (SnapshotCompare.vue); export one as a workshop
// JSON envelope and import one back (data-exchange-ui.js, the standard of the presets). Saving and deleting need the edit role.
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { i18n } from './dwc-host.js'
import { liveModel, readText, writeText } from './model-host.js'
import ErrorNotice from './ErrorNotice.vue'
import ViewTabs from './ViewTabs.vue'
import ChoiceHelp from './ChoiceHelp.vue'
import SnapshotCompare from './SnapshotCompare.vue'
import { SNAPSHOTS_FILE, SNAPSHOT_EXPORT_FORMAT, SNAPSHOTS_VERSION, SNAPSHOT_NAME_RE, SNAPSHOT_SCOPES, LIVE, makeSnapshot, parseSnapshotsText, snapshotsText, addSnapshot, removeSnapshot, importedSnapshot } from './snapshots.js'
import { snapshotBudget } from './tier.js'
import { choiceOf } from './view-choices.js'
import { exchangeExportJson, exchangeImport } from './data-exchange-ui.js'
import { ARM_MS, pressArmed } from './armed.js'

const props = defineProps({
	tick: { type: Number, default: 0 },
	tier: { type: Object, default: () => ({ extras: false }) },
	canEdit: { type: Boolean, default: true },
	selected: { type: String, default: '' }
})
const emit = defineEmits(['select'])

const t = (k, p) => i18n.t('plugins.WorkshopModel.model.' + k, p)

const list = ref([])
const loading = ref(false)
const saving = ref(false)
const newName = ref('')
const scope = ref('all')
const from = ref('')
const to = ref(LIVE)
const notice = ref('')
const problem = ref(null)
const armedName = ref('')
let armedState = null
let armTimer = null

const budget = computed(() => snapshotBudget(props.tier))
const scopeChoice = computed(() => choiceOf(SNAPSHOT_SCOPES, scope.value) || SNAPSHOT_SCOPES[0])
const scopePath = computed(() => (scope.value === 'branch' ? props.selected : ''))
const canSave = computed(() => props.canEdit && !saving.value && SNAPSHOT_NAME_RE.test(newName.value.trim()) && (scope.value === 'all' || !!props.selected))

function when(iso) {
	const d = new Date(iso)
	return isNaN(d.getTime()) ? '-' : d.toLocaleString()
}

async function load() {
	loading.value = true
	problem.value = null
	try {
		const text = await readText(SNAPSHOTS_FILE)
		list.value = text === null ? [] : parseSnapshotsText(text)
		if (!from.value && list.value.length) from.value = list.value[0].name
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
		await writeText(SNAPSHOTS_FILE, snapshotsText(next))
		list.value = next
		notice.value = text
	} catch (e) {
		problem.value = e
	} finally {
		saving.value = false
	}
}

async function save() {
	const snap = makeSnapshot(newName.value, liveModel(), scopePath.value, new Date(), budget.value.leaves)
	const text = t('snapshot_saved', { name: snap.name, n: snap.count }) + (snap.truncated ? ' ' + t('snapshot_truncated', { n: snap.count }) : '')
	await store(addSnapshot(list.value, snap, budget.value.count), text)
	if (!problem.value) {
		newName.value = ''
		from.value = snap.name
		to.value = LIVE
	}
}

function compareWithNow(name) {
	from.value = name
	to.value = LIVE
}

function remove(name) {
	const r = pressArmed(armedState, name, Date.now())
	armedState = r.state
	armedName.value = r.fire ? '' : name
	clearTimeout(armTimer)
	if (r.fire) {
		if (from.value === name) from.value = ''
		if (to.value === name) to.value = LIVE
		return store(removeSnapshot(list.value, name), t('snapshot_deleted', { name }))
	}
	armTimer = setTimeout(() => {
		armedState = null
		armedName.value = ''
	}, ARM_MS)
}

function exportOne(snapshot) {
	const r = exchangeExportJson({ format: SNAPSHOT_EXPORT_FORMAT, version: SNAPSHOTS_VERSION, plugin: 'WorkshopModel', data: { snapshot }, model: liveModel() })
	notice.value = r.ok ? t('snapshot_exported', { name: r.name }) : t('snapshot_export_failed')
}

function importOne() {
	return exchangeImport({
		what: t('snapshot_what'),
		spec: { format: SNAPSHOT_EXPORT_FORMAT, versions: [SNAPSHOTS_VERSION], plugins: ['WorkshopModel'] },
		model: liveModel(),
		notify: text => { notice.value = text },
		preview: data => {
			const s = importedSnapshot(data)
			if (!s) return { rows: [], blockers: [t('snapshot_import_empty')] }
			return { rows: [{ label: t('snapshot_import_name'), value: s.name }, { label: t('snapshot_import_scope'), value: s.scope || t('snapshot_whole') }, { label: t('snapshot_import_values'), value: String(s.count) }], blockers: [] }
		},
		apply: async data => {
			const s = importedSnapshot(data)
			await store(addSnapshot(list.value, s, budget.value.count), t('snapshot_imported', { name: s.name }))
			from.value = s.name
		}
	})
}

onMounted(load)
onBeforeUnmount(() => clearTimeout(armTimer))
</script>
