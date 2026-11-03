<template>
	<div>
		<v-card class="mb-3">
			<v-card-text>
				<div class="mo-part"><v-icon :size="20" class="mr-1">mdi-camera-outline</v-icon>{{ t('snapshots_title') }}</div>
				<div class="mo-faint mb-2">{{ t('snapshots_help') }} <code>{{ SNAPSHOTS_FILE }}</code></div>
				<error-notice :error="problem" class="mb-2" />
				<view-tabs :choices="SNAPSHOT_SCOPES" :current="scope" :label="t('snapshot_scope')" class="mb-2" @pick="scope = $event" />
				<choice-help :choice="scopeChoice" :title="t(scopeChoice.label)" class="mb-2" />
				<div v-if="scope === 'branch'" class="mo-faint mb-2">{{ selected ? t('snapshot_scope_path', { path: selected }) : t('snapshot_scope_none') }}</div>
				<div class="mo-form">
					<v-text-field v-model="newName" dense outlined hide-details class="mo-field" :label="t('snapshot_name')" :disabled="!canEdit" />
					<v-btn small depressed color="primary" :disabled="!canSave" @click="save">{{ saving ? t('saving') : t('snapshot_save') }}</v-btn>
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
								<v-btn x-small text @click="compareWithNow(s.name)">{{ t('snapshot_with_now') }}</v-btn>
								<v-btn x-small text @click="exportOne(s)">{{ t('snapshot_export') }}</v-btn>
								<v-btn x-small :text="armedName !== s.name" :depressed="armedName === s.name" :color="armedName === s.name ? 'amber darken-3' : undefined" :disabled="!canEdit || saving" @click="remove(s.name)">{{ armedName === s.name ? t('preview_tap_again_short') : t('preset_delete') }}</v-btn>
							</td>
						</tr>
					</tbody>
				</table>
				<div class="mo-actions mt-2">
					<v-btn small outlined :disabled="!canEdit || saving" @click="importOne">{{ t('snapshot_import') }}</v-btn>
				</div>
				<div v-if="notice" class="mo-faint mt-1" role="status">{{ notice }}</div>
			</v-card-text>
		</v-card>
		<snapshot-compare :list="list" :from="from" :to="to" :tick="tick" :max-leaves="budget.leaves" @pick-from="from = $event" @pick-to="to = $event" @select="onSelect" />
	</div>
</template>

<script>
'use strict'

// Snapshots of the model (snapshots.js): save the whole model or the branch selected in the Model section under a name, in the
// plugin's own file through DWC's machine file API (model-host.js; the same on a standalone Duet and in SBC mode), within the budget
// of the tier (tier.js snapshotBudget); compare two of them or one with the model now (SnapshotCompare.vue); export one as a workshop
// JSON envelope and import one back (data-exchange-ui.js, the standard of the presets). Saving and deleting need the edit role.
import i18n from '../../i18n'
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

export default {
	components: { ErrorNotice, ViewTabs, ChoiceHelp, SnapshotCompare },
	props: {
		tick: { type: Number, default: 0 },
		tier: { type: Object, default: () => ({ extras: false }) },
		canEdit: { type: Boolean, default: true },
		selected: { type: String, default: '' }
	},
	data() {
		return { list: [], loading: false, saving: false, newName: '', scope: 'all', from: '', to: LIVE, notice: '', problem: null, armedName: '', SNAPSHOTS_FILE, SNAPSHOT_SCOPES }
	},
	computed: {
		budget() {
			return snapshotBudget(this.tier)
		},
		scopeChoice() {
			return choiceOf(SNAPSHOT_SCOPES, this.scope) || SNAPSHOT_SCOPES[0]
		},
		scopePath() {
			return this.scope === 'branch' ? this.selected : ''
		},
		canSave() {
			return this.canEdit && !this.saving && SNAPSHOT_NAME_RE.test(this.newName.trim()) && (this.scope === 'all' || !!this.selected)
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
			const snap = makeSnapshot(this.newName, liveModel(), this.scopePath, new Date(), this.budget.leaves)
			const text = this.t('snapshot_saved', { name: snap.name, n: snap.count }) + (snap.truncated ? ' ' + this.t('snapshot_truncated', { n: snap.count }) : '')
			await this.store(addSnapshot(this.list, snap, this.budget.count), text)
			if (!this.problem) {
				this.newName = ''
				this.from = snap.name
				this.to = LIVE
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
