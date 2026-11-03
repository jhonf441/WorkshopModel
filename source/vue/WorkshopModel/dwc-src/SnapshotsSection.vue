<template>
	<div>
		<v-card class="mb-3">
			<v-card-text>
				<div class="mo-head">
					<span class="mo-head-icon"><v-icon>mdi-camera-outline</v-icon></span>
					<div class="mo-head-text">
						<h2 class="mo-head-title">{{ t('snapshots_title') }}</h2>
						<p class="mo-head-lead">{{ t('look_snapshots_lead') }}</p>
					</div>
					<div class="mo-head-right">
						<span v-if="list.length" class="mo-pill"><v-icon size="x-small">mdi-camera-outline</v-icon>{{ t('look_snapshots_count', { n: list.length }) }}</span>
						<span class="mo-pill mo-pill-quiet" :title="t('snapshot_budget', { count: budget.count, leaves: budget.leaves })">{{ t('look_budget_short', { count: budget.count, leaves: budget.leaves }) }}</span>
					</div>
				</div>
				<error-notice :error="problem" class="mb-2" />
				<view-tabs :choices="SNAPSHOT_SCOPES" :current="scope" :label="t('snapshot_scope')" class="mb-2" @pick="scope = $event" />
				<choice-help :choice="scopeChoice" :title="t(scopeChoice.label)" class="mb-2" />
				<branch-picker v-if="scope === 'branch'" :model="model" :path="part" :selected="selected" :pinned="pinned" :recent="recent" :tick="tick" class="mb-2" @pick="pickPart" />
				<div class="mo-note mb-2" :class="scopeOk ? 'ok' : 'warn'" role="status" aria-live="polite">
					<v-icon size="small">{{ scopeOk ? (scopePath ? 'mdi-source-branch' : 'mdi-earth') : 'mdi-alert-outline' }}</v-icon>
					<span class="mo-note-text">{{ scope === 'branch' && !part ? t('look_scope_pick_hint') : t(words.key, words.params) }}</span>
				</div>
				<div class="mo-form">
					<v-text-field :model-value="shownName" density="compact" variant="outlined" hide-details clearable class="mo-field" :label="t('look_snapshot_name_label')" :disabled="!canEdit" @update:model-value="typeName($event)" @keydown.enter="canSave && save()" />
					<v-btn size="small" variant="flat" color="primary" :disabled="!canSave" @click="save"><v-icon size="small" start>mdi-camera-outline</v-icon>{{ saving ? t('saving') : t('snapshot_save') }}</v-btn>
				</div>
				<div class="mo-will-save" :class="{ bad: !nameState.valid }" role="status" aria-live="polite">
					<span>{{ t('look_will_save_as') }}</span>
					<span class="mo-will-save-name">{{ nameState.name }}</span>
					<span class="mo-faint">{{ nameState.valid ? t(nameState.custom ? 'look_name_custom_hint' : 'look_name_default_hint') : t('look_name_invalid') }}</span>
				</div>
				<div v-if="!canEdit" class="mo-note mb-2" role="status"><v-icon size="small">mdi-eye-outline</v-icon><span class="mo-note-text">{{ t('read_only') }}</span></div>
				<div v-if="loading" class="mo-skeleton" role="status" aria-live="polite">
					<span class="mo-skeleton-bar"></span><span class="mo-skeleton-bar"></span><span class="mo-skeleton-bar"></span>
					<span class="mo-skeleton-text">{{ t('look_loading_list') }}</span>
				</div>
				<div v-else-if="!list.length" class="mo-empty mo-empty-small">
					<v-icon class="mo-empty-icon">mdi-camera-plus-outline</v-icon>
					<div class="mo-empty-title">{{ t('look_snapshots_empty_title') }}</div>
					<div class="mo-empty-text">{{ t('look_snapshots_empty_text') }}</div>
				</div>
				<div v-else class="mo-items">
					<div v-for="s in list" :key="s.name" class="mo-item" :class="{ on: s.name === from }">
						<div class="mo-item-main">
							<span class="mo-item-name">{{ s.name }}</span>
							<span class="mo-item-meta">
								<span><v-icon size="x-small">{{ s.scope ? 'mdi-source-branch' : 'mdi-earth' }}</v-icon>{{ t('look_item_covers', { what: s.scope || t('snapshot_whole') }) }}</span>
								<span><v-icon size="x-small">mdi-counter</v-icon>{{ t('snapshot_values_n', { n: s.count }) }}</span>
								<span><v-icon size="x-small">mdi-clock-outline</v-icon>{{ t('look_item_saved_when', { when: when(s.createdAt) }) }}</span>
							</span>
						</div>
						<div class="mo-item-actions">
							<v-btn size="small" variant="outlined" @click="compareWithNow(s.name)"><v-icon size="small" start>mdi-compare-horizontal</v-icon>{{ t('snapshot_with_now') }}</v-btn>
							<v-btn size="small" variant="text" :title="t('look_export_as', { name: exportName })" @click="exportOne(s)">{{ t('snapshot_export') }}</v-btn>
							<v-btn size="small" :variant="armedName === s.name ? 'flat' : 'text'" :color="armedName === s.name ? 'amber-darken-3' : 'error'" :disabled="!canEdit || saving" @click="remove(s.name)">{{ armedName === s.name ? t('preview_tap_again_short') : t('preset_delete') }}</v-btn>
						</div>
					</div>
				</div>
				<div class="mo-actions mt-2">
					<v-btn size="small" variant="outlined" :disabled="!canEdit || saving" @click="importOne"><v-icon size="small" start>mdi-upload-outline</v-icon>{{ t('snapshot_import') }}</v-btn>
					<span v-if="list.length" class="mo-faint">{{ t('look_export_as', { name: exportName }) }}</span>
				</div>
				<div v-if="notice" class="mo-note ok mt-1" role="status"><v-icon size="small">mdi-check-circle-outline</v-icon><span class="mo-note-text">{{ notice }}</span></div>
				<details class="wf-more">
					<summary>{{ t('look_snapshots_more') }}</summary>
					<div>{{ t('snapshot_budget', { count: budget.count, leaves: budget.leaves }) }} <span v-if="!tier.extras">{{ t('snapshot_budget_standalone') }}</span></div>
					<div>{{ t('snapshots_help') }} <code>{{ SNAPSHOTS_FILE }}</code></div>
				</details>
			</v-card-text>
		</v-card>
		<snapshot-compare :list="list" :from="from" :to="to" :tick="tick" :max-leaves="budget.leaves" @pick-from="from = $event" @pick-to="to = $event" @select="emit('select', $event)" />
	</div>
</template>

<script setup>
// Snapshots of the model (snapshots.js): save the whole model or the branch selected in the Model section under a name, in the
// plugin's own file through DWC's machine file API (model-host.js; the same on a standalone Duet and in SBC mode), within the budget
// of the tier (tier.js snapshotBudget); compare two of them or one with the model now (SnapshotCompare.vue); export one as a workshop
// JSON envelope and import one back (data-exchange-ui.js, the standard of the presets). What it covers is chosen HERE: the whole
// model, or a part picked in the section (BranchPicker.vue, snapshot-scope.js: chips for what is selected in Model, the favourites,
// the parts used before and the roots, plus a search), and a line always says in words what will be saved and about how many values.
// The name is shown BEFORE saving: the field comes pre-filled with the default (name-default.js), it follows the scope and the clock
// until the person writes their own, and one line repeats what will be stored. Saving and deleting need the edit role.
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { i18n } from './dwc-host.js'
import { liveModel, readText, writeText } from './model-host.js'
import ErrorNotice from './ErrorNotice.vue'
import ViewTabs from './ViewTabs.vue'
import ChoiceHelp from './ChoiceHelp.vue'
import BranchPicker from './BranchPicker.vue'
import SnapshotCompare from './SnapshotCompare.vue'
import { SNAPSHOTS_FILE, SNAPSHOT_EXPORT_FORMAT, SNAPSHOTS_VERSION, SNAPSHOT_NAME_RE, SNAPSHOT_SCOPES, LIVE, makeSnapshot, defaultSnapshotName, parseSnapshotsText, snapshotsText, addSnapshot, removeSnapshot, importedSnapshot } from './snapshots.js'
import { scopeEstimate, scopeWords, readRecentScopes, withRecentScope, saveRecentScopes } from './snapshot-scope.js'
import { resolveName, typedName } from './name-default.js'
import { loadPins } from './pins.js'
import { snapshotBudget } from './tier.js'
import { choiceOf } from './view-choices.js'
import { exchangeExportJson, exchangeImport } from './data-exchange-ui.js'
import { exchangeFileName } from './data-exchange.js'
import { ARM_MS, pressArmed } from './armed.js'

const props = defineProps({
	tick: { type: Number, default: 0 },
	tier: { type: Object, default: () => ({ extras: false }) },
	canEdit: { type: Boolean, default: true },
	selected: { type: String, default: '' }
})
const emit = defineEmits(['select'])

const t = (k, p) => i18n.t('plugins.WorkshopModel.model.' + k, p)
const storage = () => (typeof localStorage === 'undefined' ? null : localStorage)

const list = ref([])
const loading = ref(false)
const saving = ref(false)
const typed = ref('') // what the person wrote; empty = the default name
const scope = ref('all')
const part = ref('') // the part of the model picked here; starts from what is selected in Model when there is one
const recent = ref(readRecentScopes(storage()))
const pinned = ref(loadPins(storage()))
const from = ref('')
const to = ref(LIVE)
const notice = ref('')
const problem = ref(null)
const armedName = ref('')
let armedState = null
let armTimer = null

const budget = computed(() => snapshotBudget(props.tier))
const model = computed(() => {
	void props.tick
	return liveModel()
})
const scopeChoice = computed(() => choiceOf(SNAPSHOT_SCOPES, scope.value) || SNAPSHOT_SCOPES[0])
const scopePath = computed(() => (scope.value === 'branch' ? part.value : ''))
// about how many values the snapshot would hold now, and the sentence that says so
const estimate = computed(() => {
	void props.tick
	return scopeEstimate(model.value, scopePath.value, budget.value.leaves)
})
const words = computed(() => scopeWords(scopePath.value, estimate.value))
const scopeOk = computed(() => scope.value === 'all' || (!!part.value && estimate.value.exists))
watch(() => props.selected, p => { if (p && !part.value) part.value = p }, { immediate: true })

function pickPart(path) {
	part.value = path
	scope.value = 'branch'
}
// the default follows the scope, the list and the clock (one tick a second; the name has minutes)
const defaultName = computed(() => {
	void props.tick
	return defaultSnapshotName(t('snapshot_default_prefix'), scopePath.value, new Date(), list.value)
})
const nameState = computed(() => resolveName(typed.value, defaultName.value, SNAPSHOT_NAME_RE))
const shownName = computed(() => typed.value || defaultName.value)
const exportName = computed(() => {
	void props.tick
	return exchangeFileName(SNAPSHOT_EXPORT_FORMAT, 'json')
})
const canSave = computed(() => props.canEdit && !saving.value && nameState.value.valid && scopeOk.value)

function typeName(v) {
	typed.value = typedName(v, defaultName.value)
}

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
	const snap = makeSnapshot(nameState.value.name, liveModel(), scopePath.value, new Date(), budget.value.leaves)
	const text = t('snapshot_saved', { name: snap.name, n: snap.count }) + (snap.truncated ? ' ' + t('snapshot_truncated', { n: snap.count }) : '')
	await store(addSnapshot(list.value, snap, budget.value.count), text)
	if (!problem.value) {
		typed.value = ''
		from.value = snap.name
		to.value = LIVE
		if (scopePath.value) {
			recent.value = withRecentScope(recent.value, scopePath.value)
			saveRecentScopes(storage(), recent.value)
		}
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
