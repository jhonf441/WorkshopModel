<template>
	<div class="mo-usage-scope">
		<div class="mo-part">{{ t('usage_scope_title') }}</div>
		<v-checkbox :input-value="scope.chain" dense hide-details class="mo-usage-check" :label="t(S.chain.label)" @change="set({ chain: !!$event })" />
		<!-- note 3 (2026-11-23): the folders in sub-cards by parent folder, each with its count and "all / none"; a grid, so the columns line up -->
		<div class="mo-usage-groups-title">{{ t(S.folder.label) }}</div>
		<div class="mo-usage-groups">
			<section v-for="g in groups" :key="g.key" class="mo-usage-group" :aria-label="g.title">
				<div class="mo-usage-group-head">
					<span class="mo-usage-group-title">{{ g.title }}</span>
					<span class="mo-usage-group-count">{{ t('usage_group_count', { on: g.on, total: g.rows.length }) }}</span>
					<span class="mo-usage-group-acts">
						<v-btn small text :disabled="g.on === g.rows.length" :aria-label="t('usage_group_all_aria', { group: g.title })" @click="setGroup(g, true)">{{ t('usage_group_all') }}</v-btn>
						<v-btn small text :disabled="g.on === 0" :aria-label="t('usage_group_none_aria', { group: g.title })" @click="setGroup(g, false)">{{ t('usage_group_none') }}</v-btn>
					</span>
				</div>
				<div class="mo-usage-folders">
					<v-checkbox v-for="f in g.rows" :key="f.dir" :input-value="f.on" dense hide-details :class="['mo-usage-folder', { 'is-out': f.excluded }]" :aria-label="f.dir" @change="setDir(f.dir, !!$event)">
						<template #label><span class="mo-usage-path" :title="f.dir">{{ f.name }}</span><span v-if="f.chip" class="mo-usage-chip" :title="f.chipTitle">{{ f.chip }}</span></template>
					</v-checkbox>
				</div>
			</section>
		</div>
		<wf-field :id="uid + '-depth'" class="mo-usage-depth" :label="t(S.depth.label)">
			<v-select :id="uid + '-depth'" :value="scope.depth" :items="depths" dense outlined hide-details :aria-label="t(S.depth.label)" @change="set({ depth: $event })" />
		</wf-field>
		<v-checkbox :input-value="scope.hide" dense hide-details class="mo-usage-check" :label="t(S.hide.label)" @change="set({ hide: !!$event })" />
		<!-- ONE help for the whole block, folded, at its foot (C4): never a "?" floating to the right of a row -->
		<help-fold class="mo-usage-help" :items="helpItems" />
	</div>
</template>

<script>
'use strict'

// What the usage finder reads (usage-scope.js): the M98 chain of config.g, the folders (the two roots and every folder the last scan
// found, an excluded one with its reason, which the person can still switch on), the depth and the switch that leaves out backups, examples and plugin folders.
// The folders come in groups by parent folder (usage-folder-groups.js) and the help of the four settings is ONE fold at the foot of the block.
// It only says what was picked: the section keeps the scope and remembers it in this browser.
import i18n from '../../i18n'
import WfField from './WfField.vue' // vue/_shared36
import HelpFold from './HelpFold.vue' // vue/_shared36
import { SCOPE_SETTINGS, ROOT_DIRS, DEPTH_MIN, DEPTH_MAX, cleanScope, folderOn } from './usage-scope.js'
import { folderGroups, groupDirs } from './usage-folder-groups.js'

let seq = 0

export default {
	components: { WfField, HelpFold },
	props: {
		scope: { type: Object, required: true },
		folders: { type: Array, default: () => [] }
	},
	data() {
		return { uid: 'mo-uscope-' + (seq++), S: SCOPE_SETTINGS, depths: Array.from({ length: DEPTH_MAX - DEPTH_MIN + 1 }, (_, i) => DEPTH_MIN + i) }
	},
	computed: {
		folderRows() {
			const roots = ROOT_DIRS.map(dir => ({ dir, on: !!this.scope.dirs[dir], excluded: false, chip: '', chipTitle: '' }))
			const found = this.folders.map(f => ({
				dir: f.dir,
				on: folderOn(this.scope, f.dir, f.excluded),
				excluded: f.excluded,
				chip: f.excluded ? this.t('usage_folder_excluded_chip') : (f.reached ? '' : this.t('usage_folder_below_chip')),
				chipTitle: f.excluded ? this.t('usage_folder_excluded') : (f.reached ? '' : this.t('usage_folder_below'))
			}))
			return roots.concat(found)
		},
		groups() {
			return folderGroups(this.folderRows)
		},
		helpItems() {
			return ['chain', 'folder', 'depth', 'hide'].map(id => {
				const c = this.S[id]
				return { title: this.t(c.label), what: this.t(c.what), why: this.t(c.why), ifMissing: this.t(c.ifMissing), how: this.t(c.help) }
			})
		}
	},
	methods: {
		t(k, p) {
			return i18n.t('plugins.WorkshopModel.model.' + k, p)
		},
		set(change) {
			this.$emit('update:scope', cleanScope(Object.assign({}, this.scope, change)))
		},
		setDir(dir, on) {
			this.set({ dirs: Object.assign({}, this.scope.dirs, { [dir]: on }) })
		},
		setGroup(group, on) {
			this.set({ dirs: Object.assign({}, this.scope.dirs, groupDirs(group, on)) })
		}
	}
}
</script>

<style>
/* C2/C3 of the design criteria: sub-cards (gray 7 %, radius 8, no line), title 14/600 with its count, a grid of 44 px switches, the path in mono 13 */
.mo-page .mo-usage-check { margin-top: 0; padding-top: 0; }
.mo-page .mo-usage-check .v-input__slot { min-height: var(--wf-size-m); margin-bottom: 0; }
.mo-page .mo-usage-groups-title { margin: 12px 0 8px; font-size: 14px; font-weight: 600; }
.mo-page .mo-usage-groups { display: flex; flex-direction: column; gap: 12px; }
.mo-page .mo-usage-group { padding: 8px 12px; border-radius: 8px; background: rgba(128, 128, 128, 0.07); }
.mo-page .mo-usage-group-head { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 12px; }
.mo-page .mo-usage-group-title { font-family: var(--tp-font-mono, monospace); font-size: 14px; font-weight: 600; word-break: break-all; }
.mo-page .mo-usage-group-count { font-size: 13px; opacity: 0.75; }
.mo-page .mo-usage-group-acts { display: inline-flex; gap: 4px; margin-left: auto; }
.mo-page .mo-usage-folders { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(240px, 100%), 1fr)); gap: 0 16px; }
.mo-page .mo-usage-folder { margin-top: 0; padding-top: 0; min-width: 0; }
.mo-page .mo-usage-folder .v-input__slot { min-height: var(--wf-size-m); margin-bottom: 0; }
.mo-page .mo-usage-folder .v-label { display: flex; flex-wrap: wrap; align-items: center; gap: 2px 8px; min-width: 0; }
.mo-page .mo-usage-path { font-family: var(--tp-font-mono, monospace); font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 100%; }
.mo-page .mo-usage-folder.is-out .mo-usage-path { opacity: 0.6; }
.mo-page .mo-usage-chip { display: inline-flex; align-items: center; min-height: 20px; padding: 0 8px; border: 1px solid var(--wf-line, rgba(128, 128, 128, 0.35)); border-radius: 999px; font-size: 12px; line-height: 1.4; opacity: 0.85; }
.mo-page .mo-usage-depth { max-width: 200px; margin-top: 12px; }
.mo-page .mo-usage-help { margin-top: 8px; }
@media (max-width: 599px) {
	.mo-page .mo-usage-group-acts { margin-left: 0; }
	.mo-page .mo-usage-depth { max-width: none; }
}
</style>
