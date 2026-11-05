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
						<span v-if="list.length" class="mo-pill"><v-icon x-small>mdi-camera-outline</v-icon>{{ t('look_snapshots_count', { n: list.length }) }}</span>
						<span class="mo-pill mo-pill-quiet" :title="t('snapshot_budget', { count: budget.count, leaves: budget.leaves })">{{ t('look_budget_short', { count: budget.count, leaves: budget.leaves }) }}</span>
					</div>
				</div>
				<error-notice :error="problem" class="mb-2" />
				<view-tabs :choices="SNAPSHOT_SCOPES" :current="scope" :label="t('snapshot_scope')" class="mb-2" @pick="scope = $event" />
				<choice-help :choice="scopeChoice" :title="t(scopeChoice.label)" class="mb-2" />
				<branch-picker v-if="scope === 'branch'" :model="model" :path="part" :selected="selected" :pinned="pinned" :recent="recent" :tick="tick" class="mb-2" @pick="pickPart" />
				<div class="mo-note mb-2" :class="scopeOk ? 'ok' : 'warn'" role="status" aria-live="polite">
					<v-icon small>{{ scopeOk ? (scopePath ? 'mdi-source-branch' : 'mdi-earth') : 'mdi-alert-outline' }}</v-icon>
					<span class="mo-note-text">{{ scope === 'branch' && !part ? t('look_scope_pick_hint') : t(words.key, words.params) }}</span>
				</div>
				<div class="mo-form">
					<v-text-field :value="shownName" dense outlined hide-details clearable class="mo-field" :label="t('look_snapshot_name_label')" :disabled="!canEdit" @input="typeName($event)" @keydown.enter="canSave && save()" />
					<v-btn small depressed color="primary" :disabled="!canSave" @click="save"><v-icon small left>mdi-camera-outline</v-icon>{{ saving ? t('saving') : t('snapshot_save') }}</v-btn>
				</div>
				<div class="mo-will-save" :class="{ bad: !nameState.valid }" role="status" aria-live="polite">
					<span>{{ t('look_will_save_as') }}</span>
					<span class="mo-will-save-name">{{ nameState.name }}</span>
					<span class="mo-faint">{{ nameState.valid ? t(nameState.custom ? 'look_name_custom_hint' : 'look_name_default_hint') : t('look_name_invalid') }}</span>
				</div>
				<div v-if="!canEdit" class="mo-note mb-2" role="status"><v-icon small>mdi-eye-outline</v-icon><span class="mo-note-text">{{ readOnlyLine(t('read_only')) }}</span></div>
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
								<span><v-icon x-small>{{ s.scope ? 'mdi-source-branch' : 'mdi-earth' }}</v-icon>{{ t('look_item_covers', { what: s.scope || t('snapshot_whole') }) }}</span>
								<span><v-icon x-small>mdi-counter</v-icon>{{ t('snapshot_values_n', { n: s.count }) }}</span>
								<span><v-icon x-small>mdi-clock-outline</v-icon>{{ t('look_item_saved_when', { when: when(s.createdAt) }) }}</span>
							</span>
						</div>
						<div class="mo-item-actions">
							<v-btn small outlined @click="compareWithNow(s.name)"><v-icon small left>mdi-compare-horizontal</v-icon>{{ t('snapshot_with_now') }}</v-btn>
							<v-btn small text :title="t('look_export_as', { name: exportName })" @click="exportOne(s)">{{ t('snapshot_export') }}</v-btn>
							<v-btn small :text="armedName !== s.name" :depressed="armedName === s.name" :color="armedName === s.name ? 'amber darken-3' : 'error'" :disabled="!canEdit || saving" @click="remove(s.name)">{{ armedName === s.name ? t('preview_tap_again_short') : t('preset_delete') }}</v-btn>
						</div>
					</div>
				</div>
				<div class="mo-actions mt-2">
					<v-btn small outlined :disabled="!canEdit || saving" @click="importOne"><v-icon small left>mdi-upload-outline</v-icon>{{ t('snapshot_import') }}</v-btn>
					<span v-if="list.length" class="mo-faint">{{ t('look_export_as', { name: exportName }) }}</span>
				</div>
				<div v-if="notice" class="mo-note ok mt-1" role="status"><v-icon small>mdi-check-circle-outline</v-icon><span class="mo-note-text">{{ notice }}</span></div>
				<details class="wf-more">
					<summary>{{ t('look_snapshots_more') }}</summary>
					<div>{{ t('snapshot_budget', { count: budget.count, leaves: budget.leaves }) }} <span v-if="!tier.extras">{{ t('snapshot_budget_standalone') }}</span></div>
					<div>{{ t('snapshots_help') }} <code>{{ SNAPSHOTS_FILE }}</code></div>
				</details>
			</v-card-text>
		</v-card>
		<snapshot-compare :list="list" :from="from" :to="to" :tick="tick" :max-leaves="budget.leaves" @pick-from="from = $event" @pick-to="to = $event" @select="onSelect" />
	</div>
</template>

<script>
'use strict'
import { readOnlyNote } from './read-only-note.js'

// Snapshots of the model (snapshots.js): save the whole model or the branch selected in the Model section under a name, in the
// plugin's own file through DWC's machine file API (model-host.js; the same on a standalone Duet and in SBC mode), within the budget
// of the tier (tier.js snapshotBudget); compare two of them or one with the model now (SnapshotCompare.vue); export one as a workshop
// JSON envelope and import one back (data-exchange-ui.js, the standard of the presets). What it covers is chosen HERE: the whole
// model, or a part picked in the section (BranchPicker.vue, snapshot-scope.js: chips for what is selected in Model, the favourites,
// the parts used before and the roots, plus a search), and a line always says in words what will be saved and about how many values.
// The name is shown BEFORE saving: the field comes pre-filled with the default (name-default.js), it follows the scope and the clock
// until the person writes their own, and one line repeats what will be stored. Saving and deleting need the edit role.
import i18n from '../../i18n'
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

function storage() {
	return typeof localStorage === 'undefined' ? null : localStorage
}

export default {
	mixins: [readOnlyNote],
	components: { ErrorNotice, ViewTabs, ChoiceHelp, BranchPicker, SnapshotCompare },
	props: {
		tick: { type: Number, default: 0 },
		tier: { type: Object, default: () => ({ extras: false }) },
		canEdit: { type: Boolean, default: true },
		selected: { type: String, default: '' }
	},
	data() {
		// typed: what the person wrote, empty = the default name; part: the part of the model picked here (starts from the Model selection)
		return { list: [], loading: false, saving: false, typed: '', scope: 'all', part: '', recent: readRecentScopes(storage()), pinned: loadPins(storage()), from: '', to: LIVE, notice: '', problem: null, armedName: '', SNAPSHOTS_FILE, SNAPSHOT_SCOPES }
	},
	computed: {
		budget() {
			return snapshotBudget(this.tier)
		},
		model() {
			void this.tick
			return liveModel()
		},
		scopeChoice() {
			return choiceOf(SNAPSHOT_SCOPES, this.scope) || SNAPSHOT_SCOPES[0]
		},
		scopePath() {
			return this.scope === 'branch' ? this.part : ''
		},
		// about how many values the snapshot would hold now, and the sentence that says so
		estimate() {
			void this.tick
			return scopeEstimate(this.model, this.scopePath, this.budget.leaves)
		},
		words() {
			return scopeWords(this.scopePath, this.estimate)
		},
		scopeOk() {
			return this.scope === 'all' || (!!this.part && this.estimate.exists)
		},
		// the default follows the scope, the list and the clock (one tick a second; the name has minutes)
		defaultName() {
			void this.tick
			return defaultSnapshotName(this.t('snapshot_default_prefix'), this.scopePath, new Date(), this.list)
		},
		nameState() {
			return resolveName(this.typed, this.defaultName, SNAPSHOT_NAME_RE)
		},
		shownName() {
			return this.typed || this.defaultName
		},
		exportName() {
			void this.tick
			return exchangeFileName(SNAPSHOT_EXPORT_FORMAT, 'json')
		},
		canSave() {
			return this.canEdit && !this.saving && this.nameState.valid && this.scopeOk
		}
	},
	watch: {
		selected: {
			immediate: true,
			handler(p) {
				if (p && !this.part) this.part = p
			}
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
		pickPart(path) {
			this.part = path
			this.scope = 'branch'
		},
		typeName(v) {
			this.typed = typedName(v, this.defaultName)
		},
		when(iso) {
			const d = new Date(iso)
			return isNaN(d.getTime()) ? '-' : d.toLocaleString()
		},
		onSelect(path) {
			this.$emit('select', path)
		},
		async load() {
			this.loading = true
			this.problem = null
			try {
				const text = await readText(SNAPSHOTS_FILE)
				this.list = text === null ? [] : parseSnapshotsText(text)
				if (!this.from && this.list.length) this.from = this.list[0].name
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
				await writeText(SNAPSHOTS_FILE, snapshotsText(next))
				this.list = next
				this.notice = text
			} catch (e) {
				this.problem = e
			} finally {
				this.saving = false
			}
		},
		async save() {
			const snap = makeSnapshot(this.nameState.name, liveModel(), this.scopePath, new Date(), this.budget.leaves)
			const text = this.t('snapshot_saved', { name: snap.name, n: snap.count }) + (snap.truncated ? ' ' + this.t('snapshot_truncated', { n: snap.count }) : '')
			await this.store(addSnapshot(this.list, snap, this.budget.count), text)
			if (!this.problem) {
				this.typed = ''
				this.from = snap.name
				this.to = LIVE
				if (this.scopePath) {
					this.recent = withRecentScope(this.recent, this.scopePath)
					saveRecentScopes(storage(), this.recent)
				}
			}
		},
		compareWithNow(name) {
			this.from = name
			this.to = LIVE
		},
		remove(name) {
			const r = pressArmed(this.armedState || null, name, Date.now())
			this.armedState = r.state
			this.armedName = r.fire ? '' : name
			clearTimeout(this.armTimer)
			if (r.fire) {
				if (this.from === name) this.from = ''
				if (this.to === name) this.to = LIVE
				return this.store(removeSnapshot(this.list, name), this.t('snapshot_deleted', { name }))
			}
			this.armTimer = setTimeout(() => {
				this.armedState = null
				this.armedName = ''
			}, ARM_MS)
		},
		exportOne(snapshot) {
			const r = exchangeExportJson({ format: SNAPSHOT_EXPORT_FORMAT, version: SNAPSHOTS_VERSION, plugin: 'WorkshopModel', data: { snapshot }, model: liveModel() })
			this.notice = r.ok ? this.t('snapshot_exported', { name: r.name }) : this.t('snapshot_export_failed')
		},
		importOne() {
			return exchangeImport({
				what: this.t('snapshot_what'),
				spec: { format: SNAPSHOT_EXPORT_FORMAT, versions: [SNAPSHOTS_VERSION], plugins: ['WorkshopModel'] },
				model: liveModel(),
				notify: text => { this.notice = text },
				preview: data => {
					const s = importedSnapshot(data)
					if (!s) return { rows: [], blockers: [this.t('snapshot_import_empty')] }
					return { rows: [{ label: this.t('snapshot_import_name'), value: s.name }, { label: this.t('snapshot_import_scope'), value: s.scope || this.t('snapshot_whole') }, { label: this.t('snapshot_import_values'), value: String(s.count) }], blockers: [] }
				},
				apply: async data => {
					const s = importedSnapshot(data)
					await this.store(addSnapshot(this.list, s, this.budget.count), this.t('snapshot_imported', { name: s.name }))
					this.from = s.name
				}
			})
		}
	}
}
</script>
